import { Badge, Button, cn } from '@motiadev/ui';
import { 
  CreditCard, 
  DollarSign, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface PaymentStats {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalRevenue: number;
  recentPayments: RecentPayment[];
}

interface RecentPayment {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  createdAt: string;
  customerId?: string;
}

export const PaymentDashboard = () => {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/__motia/payment-stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch payment stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      succeeded: 'default',
      failed: 'destructive',
      pending: 'secondary',
    } as const;
    const labels = {
      succeeded: 'Success',
      failed: 'Failed',
      pending: 'Pending',
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
      {labels[status as keyof typeof labels] || status}
    </Badge>;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6 bg-background">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Payment Dashboard</h1>
            <p className="text-sm text-muted-foreground">Monitor your payment activity in real-time</p>
          </div>
        </div>
        <Button onClick={fetchStats} disabled={isLoading} variant="outline" size="sm">
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : isLoading && !stats ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="p-6 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue, 'usd') : '$0.00'}
                  </p>
                </div>
              </div>

              {/* Total Payments */}
              <div className="p-6 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">Total Payments</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalPayments}</p>
                </div>
              </div>

              {/* Successful */}
              <div className="p-6 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.successfulPayments}</p>
                </div>
              </div>

              {/* Failed */}
              <div className="p-6 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.failedPayments}</p>
                </div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="p-6 rounded-lg border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Success Rate</h2>
                <Badge>
                  {stats.totalPayments > 0
                    ? Math.round((stats.successfulPayments / stats.totalPayments) * 100)
                    : 0}
                  %
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{
                    width: stats.totalPayments > 0
                      ? `${(stats.successfulPayments / stats.totalPayments) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>

            {/* Recent Payments */}
            <div className="p-6 rounded-lg border border-border bg-card shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
              <div className="space-y-3">
                {stats.recentPayments.length > 0 ? (
                  stats.recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(payment.status)}
                        <div>
                          <p className="font-mono text-sm">{payment.id}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(payment.status)}
                        <p className="font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">No payments yet</p>
                    <p className="text-sm">Click "Test Payment" below to create your first transaction!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 bg-card rounded-lg border border-border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <Button 
                variant="default" 
                className="w-full"
                size="lg"
                onClick={async () => {
                  try {
                    const response = await fetch('/create-checkout-session', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        amount: 2999,
                        currency: 'usd',
                        productName: 'Premium Plan Test',
                      }),
                    });
                    const data = await response.json();
                    if (data.url) {
                      window.open(data.url, '_blank');
                    }
                  } catch (err) {
                    console.error('Failed to create checkout:', err);
                  }
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Test Payment
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-muted/30 text-center text-sm text-muted-foreground">
        <p>
          Powered by{' '}
          <span className="font-semibold text-primary">Motia</span>
          {' + '}
          <span className="font-semibold text-primary">Stripe</span>
        </p>
      </div>
    </div>
  );
};

