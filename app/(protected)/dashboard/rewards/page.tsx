'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Gift, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useWallet } from '@/hooks/use-wallet';

interface Target {
  id: string;
  title: string;
  description: string;
  type: string;
  period: string;
  targetValue: number;
  rewardAmount: number;
  progress: number;
  isClaimed: boolean;
  canClaim: boolean;
  periodEnd?: string;
}

export default function RewardsPage() {
  const { toast } = useToast();
  const { refreshWallet } = useWallet();
  const [targets, setTargets] = useState<Target[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchTargets = async () => {
    try {
      const response = await api.get('/marketing/targets');
      if (response.data) {
        setTargets(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch targets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rewards',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleClaim = async (targetId: string) => {
    setClaimingId(targetId);
    try {
      await api.post('/marketing/targets/claim', { targetId });
      toast({
        title: 'Reward Claimed!',
        description: 'The bonus has been added to your wallet.',
      });
      refreshWallet();
      fetchTargets(); // Refresh list
    } catch (error: any) {
      toast({
        title: 'Claim Failed',
        description: error.response?.data?.message || 'Could not claim reward',
        variant: 'destructive',
      });
    } finally {
      setClaimingId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'DATA_VOLUME': return <Gift className="h-6 w-6 text-blue-500" />;
      case 'AMOUNT_SPENT': return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 'TRANSACTION_COUNT': return <Calendar className="h-6 w-6 text-green-500" />;
      default: return <Trophy className="h-6 w-6" />;
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(100, (current / target) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rewards & Targets</h1>
        <p className="text-muted-foreground">Complete targets to earn bonus credits</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {targets.map((target) => (
          <Card key={target.id} className={target.isClaimed ? 'opacity-75 bg-muted/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {target.period} Target
              </CardTitle>
              {getIcon(target.type)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{target.title}</div>
              <p className="text-xs text-muted-foreground mb-4">
                {target.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.floor(getProgressPercentage(target.progress, target.targetValue))}%</span>
                </div>
                <Progress value={getProgressPercentage(target.progress, target.targetValue)} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{target.progress} / {target.targetValue}</span>
                  <span>Reward: {formatCurrency(target.rewardAmount)}</span>
                </div>
              </div>

              <div className="mt-4">
                {target.isClaimed ? (
                  <Button disabled className="w-full" variant="outline">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Claimed
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    disabled={!target.canClaim || claimingId === target.id}
                    onClick={() => handleClaim(target.id)}
                  >
                    {claimingId === target.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Gift className="mr-2 h-4 w-4" />
                    )}
                    {target.canClaim ? 'Claim Reward' : 'In Progress'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
