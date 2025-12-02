'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Tv, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/use-wallet';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const cableSchema = z.object({
  provider: z.enum(['DSTV', 'GOTV', 'STARTIMES']),
  smartCardNumber: z.string().min(10, 'Smart card number must be at least 10 digits'),
  plan: z.string().min(1, 'Please select a plan'),
});

type CableFormValues = z.infer<typeof cableSchema>;

export default function CableTVPage() {
  const { toast } = useToast();
  const { balance, refreshWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number>(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const form = useForm<CableFormValues>({
    resolver: zodResolver(cableSchema),
    defaultValues: {
      provider: 'DSTV',
      smartCardNumber: '',
      plan: '',
    },
  });

  const provider = form.watch('provider');
  const smartCardNumber = form.watch('smartCardNumber');

  // Fetch plans when provider changes
  useEffect(() => {
    const fetchPlans = async () => {
      if (!provider) return;
      
      try {
        const response = await api.get(`/bills/cable/variations?provider=${provider}`);
        if (response.data) {
          setPlans(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        toast({
          title: 'Error',
          description: 'Failed to load cable plans',
          variant: 'destructive',
        });
      }
    };

    fetchPlans();
    form.setValue('plan', ''); // Reset plan when provider changes
    setSelectedPlanAmount(0);
  }, [provider, form, toast]);

  const handleVerify = async () => {
    if (!smartCardNumber || smartCardNumber.length < 10) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid smart card number',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setVerifiedName(null);

    try {
      const response = await api.post('/bills/cable/verify', {
        provider,
        smartCardNumber,
      });

      if (response.data?.customerName) {
        setVerifiedName(response.data.customerName);
        toast({
          title: 'Verified',
          description: `Customer: ${response.data.customerName}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.response?.data?.message || 'Could not verify smart card',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (data: CableFormValues) => {
    if (!verifiedName) {
      toast({
        title: 'Verification Required',
        description: 'Please verify the smart card number first',
        variant: 'destructive',
      });
      return;
    }

    if (balance < selectedPlanAmount) {
      toast({
        title: 'Insufficient Balance',
        description: 'Please fund your wallet to continue',
        variant: 'destructive',
      });
      return;
    }

    setShowPinModal(true);
  };

  const handlePurchase = async () => {
    if (pin.length !== 4) return;

    setIsPurchasing(true);
    const data = form.getValues();

    try {
      const response = await api.post('/bills/cable', {
        ...data,
        amount: selectedPlanAmount,
        customerName: verifiedName,
      });

      toast({
        title: 'Purchase Successful',
        description: 'Your cable subscription has been processed',
      });

      refreshWallet();
      form.reset({
        provider: 'DSTV',
        smartCardNumber: '',
        plan: '',
      });
      setVerifiedName(null);
      setPin('');
      setShowPinModal(false);

    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.response?.data?.message || 'Transaction failed',
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cable TV Subscription</h1>
        <p className="text-muted-foreground">Pay for DSTV, GOTV, and Startimes</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>Enter your smart card details and select a plan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  onValueChange={(value: any) => form.setValue('provider', value)}
                  defaultValue={form.getValues('provider')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DSTV">DSTV</SelectItem>
                    <SelectItem value="GOTV">GOTV</SelectItem>
                    <SelectItem value="STARTIMES">Startimes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Smart Card / IUC Number</Label>
                <div className="flex gap-2">
                  <Input
                    {...form.register('smartCardNumber')}
                    placeholder="Enter number"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleVerify}
                    disabled={isVerifying || !smartCardNumber}
                  >
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                  </Button>
                </div>
                {verifiedName && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{verifiedName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Package / Plan</Label>
                <Select
                  onValueChange={(value) => {
                    form.setValue('plan', value);
                    const plan = plans.find(p => p.id === value);
                    if (plan) setSelectedPlanAmount(plan.amount);
                  }}
                  disabled={plans.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(plan.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !verifiedName || !form.formState.isValid}
                >
                  Pay {selectedPlanAmount > 0 && formatCurrency(selectedPlanAmount)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your recent cable TV subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Tv className="h-12 w-12 mb-4 opacity-20" />
              <p>No recent transactions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Enter your 4-digit PIN to confirm payment of {formatCurrency(selectedPlanAmount)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={setPin}
              render={({ slots }) => (
                <InputOTPGroup>
                  {slots.map((slot, index) => (
                    <InputOTPSlot key={index} {...slot} index={index} />
                  ))}
                </InputOTPGroup>
              )}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinModal(false)}>Cancel</Button>
            <Button 
              onClick={handlePurchase} 
              disabled={pin.length !== 4 || isPurchasing}
            >
              {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
