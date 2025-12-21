import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  username: string;
  wallet_balance: number;
  created_at: string | null;
}

interface Transaction {
  id: string;
  food_item_id: string;
  recipient_id: string;
  item_price: number;
  service_fee: number;
  total_amount: number;
  currency: string;
  status: string | null;
  buyer_email: string | null;
  buyer_note: string | null;
  created_at: string | null;
  food_items?: {
    name: string;
  };
  profiles?: {
    email: string;
    username: string;
  };
}

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingDisputes: number;
}

const Admin = () => {
  const { isAdmin, isLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingDisputes: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch transactions with food items
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          food_items (name)
        `)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Calculate stats
      const allTransactions = transactionsData || [];
      const completedTransactions = allTransactions.filter(t => t.status === 'completed');
      const disputedTransactions = allTransactions.filter(t => t.status === 'disputed');

      setStats({
        totalUsers: usersData?.length || 0,
        totalTransactions: allTransactions.length,
        totalRevenue: completedTransactions.reduce((sum, t) => sum + (t.service_fee || 0), 0),
        pendingDisputes: disputedTransactions.length
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin data',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleUpdateTransactionStatus = async (transactionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Transaction marked as ${newStatus}`
      });

      fetchData();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to update transaction status',
        variant: 'destructive'
      });
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency?.toUpperCase()) {
      case 'NGN': return '₦';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-accent text-accent-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'disputed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Disputed</Badge>;
      case 'refunded':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">Manage users, transactions, and platform</p>
            </div>
          </div>
          <Badge variant="outline" className="text-primary border-primary">Admin</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From service fees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Disputes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDisputes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>View and manage all platform transactions</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-xs">
                            {transaction.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{transaction.buyer_email || 'N/A'}</TableCell>
                          <TableCell>
                            {getCurrencySymbol(transaction.currency)}{transaction.total_amount}
                          </TableCell>
                          <TableCell>
                            {getCurrencySymbol(transaction.currency)}{transaction.service_fee}
                          </TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell>
                            {transaction.created_at 
                              ? new Date(transaction.created_at).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateTransactionStatus(transaction.id, 'completed')}
                                >
                                  Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateTransactionStatus(transaction.id, 'disputed')}
                                >
                                  Mark Disputed
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateTransactionStatus(transaction.id, 'refunded')}
                                  className="text-destructive"
                                >
                                  Mark Refunded
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>Manage platform users and their accounts</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-[250px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Wallet Balance</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">@{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.full_name || 'Not set'}</TableCell>
                          <TableCell>${user.wallet_balance.toFixed(2)}</TableCell>
                          <TableCell>
                            {user.created_at 
                              ? new Date(user.created_at).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>Disputed Transactions</CardTitle>
                <CardDescription>Handle and resolve transaction disputes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.filter(t => t.status === 'disputed').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No disputed transactions
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.filter(t => t.status === 'disputed').map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-xs">
                            {transaction.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{transaction.buyer_email || 'N/A'}</TableCell>
                          <TableCell>
                            {getCurrencySymbol(transaction.currency)}{transaction.total_amount}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {transaction.buyer_note || 'No message'}
                          </TableCell>
                          <TableCell>
                            {transaction.created_at 
                              ? new Date(transaction.created_at).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateTransactionStatus(transaction.id, 'completed')}
                              >
                                Resolve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleUpdateTransactionStatus(transaction.id, 'refunded')}
                              >
                                Refund
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
