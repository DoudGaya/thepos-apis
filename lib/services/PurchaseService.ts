/**
 * PurchaseService - Orchestrates purchase flow
 * Handles validation, wallet ded      // Step 6: Call vendor API
      const vendorRequest: PurchaseDataRequest = {
        network: network.toUpperCase(),
        phoneNumber,
        planId: planCode,
        amount,
        reference,
      };vendor API calls, and error handling
 */

import { TransactionType, TransactionStatus } from '@prisma/client';
import { walletService, WalletTransactionData } from './WalletService';
import { IVendorAdapter, PurchaseDataRequest, PurchaseAirtimeRequest } from './VendorAdapter';
import { vtuNGAdapter } from './VTUNGAdapter';
import { prisma } from '../prisma';

export interface DataPurchaseRequest {
  userId: string;
  network: string;
  phoneNumber: string;
  planCode: string;
  amount: number;
}

export interface AirtimePurchaseRequest {
  userId: string;
  network: string;
  phoneNumber: string;
  amount: number;
}

export interface PurchaseResult {
  success: boolean;
  transactionId: string;
  reference: string;
  message: string;
  data?: any;
}

class PurchaseService {
  private vendorAdapter: IVendorAdapter;

  constructor(vendorAdapter: IVendorAdapter) {
    this.vendorAdapter = vendorAdapter;
  }

  /**
   * Purchase data bundle
   * Flow: Validate → Deduct from wallet → Call vendor API → Update transaction
   * Automatically refunds on failure
   */
  async purchaseData(request: DataPurchaseRequest): Promise<PurchaseResult> {
    const { userId, network, phoneNumber, planCode, amount } = request;

    try {
      // Step 1: Validate phone number
      if (!this.validatePhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format. Must be 11 digits starting with 0');
      }

      // Step 2: Validate network
      const validNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
      if (!validNetworks.includes(network.toUpperCase())) {
        throw new Error(`Invalid network. Must be one of: ${validNetworks.join(', ')}`);
      }

      // Step 3: Get user balance
      const balance = await walletService.getBalance(userId);
      if (balance.available < amount) {
        throw new Error(
          `Insufficient balance. Required: ₦${amount.toLocaleString()}, Available: ₦${balance.available.toLocaleString()}`
        );
      }

      // Step 4: Deduct from wallet (creates transaction record)
      const reference = this.generateReference('DATA');
      const walletData: WalletTransactionData = {
        userId,
        amount,
        type: TransactionType.DATA,
        reference,
        description: `${network} ${planCode} data purchase for ${phoneNumber}`,
        metadata: {
          network,
          phoneNumber,
          planCode,
          serviceType: 'DATA',
        },
      };

      const { transaction: walletTransaction } = await walletService.deductBalance(walletData);

      // Step 5: Call vendor API
      const vendorRequest: PurchaseDataRequest = {
        network: network.toUpperCase(),
        phoneNumber,
        planId: planCode,
        amount,
        reference,
      };

      const vendorResult = await this.vendorAdapter.purchaseData(vendorRequest);

      // Step 5: Handle vendor response
      if (vendorResult.success) {
        // Update transaction status
        const transactionDetails = walletTransaction.details as any;
        await prisma.transaction.update({
          where: { id: walletTransaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            details: {
              ...transactionDetails,
              vendorReference: vendorResult.vendorReference,
              vendorResponse: vendorResult.data,
              completedAt: new Date().toISOString(),
            },
          },
        });

        return {
          success: true,
          transactionId: walletTransaction.id,
          reference,
          message: 'Data purchase successful',
          data: vendorResult.data,
        };
      } else {
        // Vendor failed - refund and mark transaction as failed
        await this.handlePurchaseFailure(
          userId,
          walletTransaction.id,
          vendorResult.error || 'Vendor API failed'
        );

        return {
          success: false,
          transactionId: walletTransaction.id,
          reference,
          message: vendorResult.error || 'Purchase failed',
        };
      }
    } catch (error: any) {
      console.error('Data purchase error:', error);
      throw error;
    }
  }

  /**
   * Purchase airtime
   * Flow: Validate → Deduct from wallet → Call vendor API → Update transaction
   * Automatically refunds on failure
   */
  async purchaseAirtime(request: AirtimePurchaseRequest): Promise<PurchaseResult> {
    const { userId, network, phoneNumber, amount } = request;

    try {
      // Step 1: Validate phone number
      if (!this.validatePhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format. Must be 11 digits starting with 0');
      }

      // Step 2: Validate network
      const validNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
      if (!validNetworks.includes(network.toUpperCase())) {
        throw new Error(`Invalid network. Must be one of: ${validNetworks.join(', ')}`);
      }

      // Step 3: Validate amount (₦50 - ₦10,000)
      if (amount < 50 || amount > 10000) {
        throw new Error('Airtime amount must be between ₦50 and ₦10,000');
      }

      // Step 4: Get user balance
      const balance = await walletService.getBalance(userId);
      if (balance.available < amount) {
        throw new Error(
          `Insufficient balance. Required: ₦${amount.toLocaleString()}, Available: ₦${balance.available.toLocaleString()}`
        );
      }

      // Step 5: Deduct from wallet (creates transaction record)
      const reference = this.generateReference('AIRTIME');
      const walletData: WalletTransactionData = {
        userId,
        amount,
        type: TransactionType.AIRTIME,
        reference,
        description: `${network} ₦${amount} airtime for ${phoneNumber}`,
        metadata: {
          network,
          phoneNumber,
          serviceType: 'AIRTIME',
        },
      };

      const { transaction: walletTransaction } = await walletService.deductBalance(walletData);

      // Step 6: Call vendor API
      const vendorRequest: PurchaseAirtimeRequest = {
        network: network.toUpperCase(),
        phoneNumber,
        amount,
        reference,
      };

      const vendorResult = await this.vendorAdapter.purchaseAirtime(vendorRequest);

      // Step 7: Handle vendor response
      if (vendorResult.success) {
        // Update transaction status
        const transactionDetails = walletTransaction.details as any;
        await prisma.transaction.update({
          where: { id: walletTransaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            details: {
              ...transactionDetails,
              vendorReference: vendorResult.vendorReference,
              vendorResponse: vendorResult.data,
              completedAt: new Date().toISOString(),
            },
          },
        });

        return {
          success: true,
          transactionId: walletTransaction.id,
          reference,
          message: 'Airtime purchase successful',
          data: vendorResult.data,
        };
      } else {
        // Vendor failed - refund and mark transaction as failed
        await this.handlePurchaseFailure(
          userId,
          walletTransaction.id,
          vendorResult.error || 'Vendor API failed'
        );

        return {
          success: false,
          transactionId: walletTransaction.id,
          reference,
          message: vendorResult.error || 'Purchase failed',
        };
      }
    } catch (error: any) {
      console.error('Airtime purchase error:', error);
      throw error;
    }
  }

  /**
   * Handle purchase failure - refund wallet and mark transaction failed
   */
  private async handlePurchaseFailure(
    userId: string,
    transactionId: string,
    reason: string
  ): Promise<void> {
    try {
      // Refund the wallet
      await walletService.refundBalance(userId, transactionId, reason);

      // Mark transaction as failed
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (transaction) {
        const transactionDetails = transaction.details as any;
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: TransactionStatus.FAILED,
            details: {
              ...transactionDetails,
              failureReason: reason,
              failedAt: new Date().toISOString(),
            },
          },
        });
      }
    } catch (error) {
      console.error('Error handling purchase failure:', error);
      throw error;
    }
  }

  /**
   * Retry a failed transaction
   */
  async retryTransaction(transactionId: string): Promise<PurchaseResult> {
    try {
      // Get the failed transaction
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== TransactionStatus.FAILED) {
        throw new Error('Only failed transactions can be retried');
      }

      // Extract details from transaction
      const details = transaction.details as any;

      // Determine service type and retry
      if ((details as any).serviceType === 'DATA') {
        return await this.purchaseData({
          userId: transaction.userId,
          network: details.network,
          phoneNumber: details.phoneNumber,
          planCode: details.planCode,
          amount: transaction.amount,
        });
      } else if ((details as any).serviceType === 'AIRTIME') {
        return await this.purchaseAirtime({
          userId: transaction.userId,
          network: details.network,
          phoneNumber: details.phoneNumber,
          amount: transaction.amount,
        });
      } else {
        throw new Error('Unknown service type');
      }
    } catch (error: any) {
      console.error('Retry transaction error:', error);
      throw error;
    }
  }

  /**
   * Validate Nigerian phone number
   * Must be 11 digits starting with 0
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // Remove any spaces or dashes
    const cleaned = phoneNumber.replace(/[\s-]/g, '');

    // Check if it's 11 digits starting with 0
    const nigerianPattern = /^0[789][01]\d{8}$/;
    return nigerianPattern.test(cleaned);
  }

  /**
   * Generate unique transaction reference
   */
  private generateReference(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Get transaction status from vendor
   */
  async checkTransactionStatus(reference: string): Promise<any> {
    try {
      return await this.vendorAdapter.checkTransactionStatus({ reference });
    } catch (error) {
      console.error('Error checking transaction status:', error);
      throw error;
    }
  }
}

// Create singleton instance with VTU.NG adapter
export const purchaseService = new PurchaseService(vtuNGAdapter);
