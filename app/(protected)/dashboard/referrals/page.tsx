'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, DollarSign, Copy, Share2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  recentReferrals: Array<{
    name: string;
    date: string;
    status: string;
  }>;
}

export default function ReferralsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/marketing/referrals');
        if (response.data) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch referral stats:', error);
        toast({
          title: 'Error',
          description: 'Failed to load referral data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const copyToClipboard = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(`https://thepos.app/register?ref=${stats.referralCode}`);
      toast({
        title: 'Copied!',
        description: 'Referral link copied to clipboard',
      });
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
        <p className="text-muted-foreground">Invite friends and earn commissions</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Friends who joined using your code
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalEarnings || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Commissions earned from referrals
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
            <CardDescription>Share this link to earn rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex space-x-2">
              <Input 
                readOnly 
                value={`https://thepos.app/register?ref=${stats?.referralCode || '...'}`} 
              />
              <Button size="icon" variant="outline" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button className="w-full" variant="secondary">
              <Share2 className="mr-2 h-4 w-4" />
              Share Link
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Referrals</CardTitle>
          <CardDescription>Latest users who joined with your code</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentReferrals.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No referrals yet. Start sharing your link!
              </div>
            ) : (
              stats?.recentReferrals.map((referral, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{referral.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(referral.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-sm px-2 py-1 rounded-full ${
                    referral.status === 'Active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {referral.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
