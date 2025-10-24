/**
 * Provider Service Manager
 * Handles smart routing, health checks, failover logic, and pricing comparison
 */
import { 
  BaseProvider,
  ServiceProvider,
  DataPlan,
  BillService,
  TransactionRequest,
  TransactionResponse,
  ProviderHealth,
  PricingComparison,
  ProviderServiceConfig
} from './types';
import { QuickSubProvider } from './quicksub';
import { PayGoldProvider } from './paygold';
import VTUProvider from './vtu';

export class ProviderServiceManager {
  private providers: Map<string, BaseProvider> = new Map();
  private healthStatus: Map<string, ProviderHealth> = new Map();
  private config: ProviderServiceConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ProviderServiceConfig) {
    this.config = config;
    this.initializeProviders();
    this.startHealthChecks();
  }

  private initializeProviders(): void {
    // Initialize QuickSub provider
    if (process.env.QUICKSUB_API_KEY) {
      const quicksub = new QuickSubProvider();
      this.providers.set('quicksub', quicksub);
    }

    // Initialize PayGold provider
    if (process.env.PAYGOLD_API_KEY) {
      const paygold = new PayGoldProvider();
      this.providers.set('paygold', paygold);
    }

    // Initialize VTU.NG provider
    if (process.env.VTU_USERNAME && process.env.VTU_PASSWORD && process.env.VTU_USER_PIN) {
      const vtu = new VTUProvider();
      this.providers.set('vtu', vtu);
    }

    console.log(`Initialized ${this.providers.size} providers`);
  }

  private startHealthChecks(): void {
    // Perform initial health checks
    this.performHealthChecks();

    // Schedule regular health checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckInterval
    );
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.providers.entries()).map(
      async ([providerId, provider]) => {
        try {
          const health = await provider.healthCheck();
          this.healthStatus.set(providerId, health);
          console.log(`Health check for ${providerId}:`, health.status);
        } catch (error) {
          console.error(`Health check failed for ${providerId}:`, error);
          this.healthStatus.set(providerId, {
            provider: providerId,
            status: 'offline',
            lastChecked: new Date(),
            errorRate: 100,
          });
        }
      }
    );

    await Promise.allSettled(healthCheckPromises);
  }

  public async getDataPlans(): Promise<DataPlan[]> {
    const allPlans: DataPlan[] = [];
    const activeProviders = this.getActiveProviders();

    for (const [providerId, provider] of activeProviders) {
      try {
        const plans = await provider.getDataPlans();
        allPlans.push(...plans);
      } catch (error) {
        console.error(`Failed to get data plans from ${providerId}:`, error);
        this.markProviderAsOffline(providerId);
      }
    }

    // Remove duplicates and sort by price
    const uniquePlans = this.removeDuplicatePlans(allPlans);
    return uniquePlans.sort((a, b) => a.price - b.price);
  }

  public async getBillServices(): Promise<BillService[]> {
    const allServices: BillService[] = [];
    const activeProviders = this.getActiveProviders();

    for (const [providerId, provider] of activeProviders) {
      try {
        const services = await provider.getBillServices();
        allServices.push(...services);
      } catch (error) {
        console.error(`Failed to get bill services from ${providerId}:`, error);
        this.markProviderAsOffline(providerId);
      }
    }

    // Remove duplicates
    const uniqueServices = this.removeDuplicateServices(allServices);
    return uniqueServices;
  }

  public async processTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    const bestProvider = await this.selectBestProvider(request);
    
    if (!bestProvider) {
      throw new Error('No available providers for this transaction');
    }

    let attempts = 0;
    const maxAttempts = this.config.maxRetries + 1;

    while (attempts < maxAttempts) {
      try {
        const response = await bestProvider.provider.processTransaction(request);
        
        if (response.success) {
          // Update provider health on success
          this.updateProviderSuccess(bestProvider.providerId);
          return response;
        } else {
          throw new Error(response.message || 'Transaction failed');
        }
      } catch (error) {
        attempts++;
        console.error(`Transaction attempt ${attempts} failed for ${bestProvider.providerId}:`, error);
        
        // Mark provider as degraded on failure
        this.markProviderAsDegraded(bestProvider.providerId);
        
        if (attempts < maxAttempts) {
          // Try with next best provider
          const nextProvider = await this.selectBestProvider(request, [bestProvider.providerId]);
          if (nextProvider) {
            bestProvider.provider = nextProvider.provider;
            bestProvider.providerId = nextProvider.providerId;
          } else {
            break;
          }
        }
      }
    }

    throw new Error(`Transaction failed after ${attempts} attempts`);
  }

  public async verifyTransaction(reference: string, providerId?: string): Promise<TransactionResponse> {
    if (providerId && this.providers.has(providerId)) {
      const provider = this.providers.get(providerId)!;
      return await provider.verifyTransaction(reference);
    }

    // Try all providers if no specific provider is specified
    const activeProviders = this.getActiveProviders();
    
    for (const [providerKey, provider] of activeProviders) {
      try {
        const response = await provider.verifyTransaction(reference);
        if (response.success) {
          return response;
        }
      } catch (error) {
        console.error(`Verification failed for ${providerKey}:`, error);
        continue;
      }
    }

    throw new Error(`Transaction verification failed for reference: ${reference}`);
  }

  public async comparePrices(planId: string): Promise<PricingComparison | null> {
    if (!this.config.enablePriceComparison) {
      return null;
    }

    const allPlans = await this.getDataPlans();
    const matchingPlans = allPlans.filter(plan => 
      plan.id === planId || plan.name === planId
    );

    if (matchingPlans.length === 0) {
      return null;
    }

    const providers = matchingPlans.map(plan => ({
      provider: plan.id.split('_')[0], // Extract provider from plan ID
      price: plan.price,
      commission: plan.commission || 0,
      profit: plan.commission || 0,
      availability: true,
      responseTime: this.healthStatus.get(plan.id.split('_')[0])?.responseTime || 0,
    }));

    // Recommend provider with best profit margin and availability
    const recommended = providers
      .filter(p => p.availability)
      .sort((a, b) => (b.profit - a.profit) || (a.responseTime - b.responseTime))[0]?.provider || '';

    return {
      planId,
      providers,
      recommended,
    };
  }

  private async selectBestProvider(
    request: TransactionRequest, 
    excludeProviders: string[] = []
  ): Promise<{ provider: BaseProvider; providerId: string } | null> {
    const activeProviders = this.getActiveProviders()
      .filter(([providerId]) => !excludeProviders.includes(providerId));

    if (activeProviders.length === 0) {
      return null;
    }

    if (this.config.enableLoadBalancing) {
      // Select based on health score and response time
      const scored = activeProviders.map(([providerId, provider]) => {
        const health = this.healthStatus.get(providerId);
        const score = this.calculateProviderScore(health);
        return { provider, providerId, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return { provider: scored[0].provider, providerId: scored[0].providerId };
    } else {
      // Use priority-based selection
      const [providerId, provider] = activeProviders[0];
      return { provider, providerId };
    }
  }

  private calculateProviderScore(health?: ProviderHealth): number {
    if (!health) return 0;
    
    let score = 0;
    
    // Status weight (40%)
    if (health.status === 'online') score += 40;
    else if (health.status === 'degraded') score += 20;
    
    // Response time weight (30%)
    if (health.responseTime) {
      const responseScore = Math.max(0, 30 - (health.responseTime / 100));
      score += responseScore;
    }
    
    // Error rate weight (30%)
    if (health.errorRate !== undefined) {
      const errorScore = Math.max(0, 30 - health.errorRate);
      score += errorScore;
    }
    
    return score;
  }

  private getActiveProviders(): Array<[string, BaseProvider]> {
    return Array.from(this.providers.entries())
      .filter(([providerId]) => {
        const health = this.healthStatus.get(providerId);
        return health?.status === 'online' || health?.status === 'degraded';
      })
      .sort(([aId], [bId]) => {
        // Sort by priority (lower number = higher priority)
        const aConfig = this.config.providers.find(p => p.id === aId);
        const bConfig = this.config.providers.find(p => p.id === bId);
        return (aConfig?.priority || 999) - (bConfig?.priority || 999);
      });
  }

  private removeDuplicatePlans(plans: DataPlan[]): DataPlan[] {
    const unique = new Map<string, DataPlan>();
    
    plans.forEach(plan => {
      const key = `${plan.network}_${plan.size}_${plan.validity}`;
      const existing = unique.get(key);
      
      if (!existing || plan.price < existing.price) {
        unique.set(key, plan);
      }
    });
    
    return Array.from(unique.values());
  }

  private removeDuplicateServices(services: BillService[]): BillService[] {
    const unique = new Map<string, BillService>();
    
    services.forEach(service => {
      const key = `${service.category}_${service.name}`;
      const existing = unique.get(key);
      
      if (!existing) {
        unique.set(key, service);
      }
    });
    
    return Array.from(unique.values());
  }

  private markProviderAsOffline(providerId: string): void {
    this.healthStatus.set(providerId, {
      provider: providerId,
      status: 'offline',
      lastChecked: new Date(),
      errorRate: 100,
    });
  }

  private markProviderAsDegraded(providerId: string): void {
    const current = this.healthStatus.get(providerId);
    if (current) {
      this.healthStatus.set(providerId, {
        ...current,
        status: 'degraded',
        errorRate: Math.min(100, (current.errorRate || 0) + 10),
      });
    }
  }

  private updateProviderSuccess(providerId: string): void {
    const current = this.healthStatus.get(providerId);
    if (current) {
      this.healthStatus.set(providerId, {
        ...current,
        status: 'online',
        errorRate: Math.max(0, (current.errorRate || 0) - 5),
      });
    }
  }

  public getProviderHealth(): Map<string, ProviderHealth> {
    return new Map(this.healthStatus);
  }

  public async getProviderBalances(): Promise<Record<string, number>> {
    const balances: Record<string, number> = {};
    const activeProviders = this.getActiveProviders();

    await Promise.allSettled(
      activeProviders.map(async ([providerId, provider]) => {
        try {
          balances[providerId] = await provider.getBalance();
        } catch (error) {
          console.error(`Failed to get balance for ${providerId}:`, error);
          balances[providerId] = 0;
        }
      })
    );

    return balances;
  }

  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Default configuration
const defaultConfig: ProviderServiceConfig = {
  providers: [
    {
      id: 'quicksub',
      name: 'QuickSub',
      type: 'data',
      isActive: true,
      priority: 1,
      baseUrl: process.env.QUICKSUB_BASE_URL || '',
      credentials: {},
    },
    {
      id: 'paygold',
      name: 'PayGold',
      type: 'data',
      isActive: true,
      priority: 2,
      baseUrl: process.env.PAYGOLD_BASE_URL || '',
      credentials: {},
    },
    {
      id: 'vtu',
      name: 'VTU.NG',
      type: 'multi',
      isActive: true,
      priority: 3,
      baseUrl: 'https://vtu.ng/wp-json/api/v2',
      credentials: {
        username: process.env.VTU_USERNAME || '',
        password: process.env.VTU_PASSWORD || '',
        pin: process.env.VTU_USER_PIN || '',
      },
    },
  ],
  defaultCommissionRate: 5,
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 2,
  enableLoadBalancing: true,
  enablePriceComparison: true,
};

// Export singleton instance
export const providerServiceManager = new ProviderServiceManager(defaultConfig);
