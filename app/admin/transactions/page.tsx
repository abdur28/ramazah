"use client";

import React, { useState, useMemo } from "react";
import {
  RefreshCcw,
  Search,
  MoreHorizontal,
  Eye,
  Download,
  Filter,
  X,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// npx shadcn@latest add table
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Types
type TransactionStatus = 'success' | 'pending' | 'failed' | 'refunded';
type PaymentMethod = 'Credit Card' | 'PayPal' | 'Stripe' | 'Bank Transfer' | 'Cash on Delivery';

interface Transaction {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  date: Date;
  description: string;
}

// Mock transaction data
const generateMockTransactions = (): Transaction[] => {
  const statuses: TransactionStatus[] = ['success', 'pending', 'failed', 'refunded'];
  const paymentMethods: PaymentMethod[] = ['Credit Card', 'PayPal', 'Stripe', 'Bank Transfer', 'Cash on Delivery'];
  const customers = [
    'John Doe', 'Jane Smith', 'Michael Brown', 'Sarah Johnson', 'David Lee',
    'Emma Wilson', 'James Taylor', 'Olivia Martinez', 'William Anderson', 'Sophia Garcia'
  ];
  
  return Array.from({ length: 50 }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = (Math.random() * 500 + 20).toFixed(2);
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    return {
      id: `TXN-${String(10000 + i).padStart(5, '0')}`,
      orderNumber: `ORD-${String(5000 + i).padStart(5, '0')}`,
      customer: customers[Math.floor(Math.random() * customers.length)],
      email: `customer${i}@example.com`,
      amount: parseFloat(amount),
      currency: 'USD',
      status,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      date: date,
      description: status === 'success' ? 'Payment processed successfully' :
                   status === 'pending' ? 'Payment is being processed' :
                   status === 'failed' ? 'Payment declined by bank' :
                   'Payment refunded to customer',
    };
  });
};

export default function AdminTransactionsPage() {
  const [transactions] = useState<Transaction[]>(generateMockTransactions());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const successful = transactions.filter(t => t.status === 'success');
    const successTotal = successful.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalRevenue: total,
      successfulRevenue: successTotal,
      totalTransactions: transactions.length,
      successfulTransactions: successful.length,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length,
      failedTransactions: transactions.filter(t => t.status === 'failed').length,
      refundedTransactions: transactions.filter(t => t.status === 'refunded').length,
    };
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(query) ||
        t.orderNumber.toLowerCase().includes(query) ||
        t.customer.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Payment method filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter(t => t.paymentMethod === paymentFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateFilter) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(t => t.date >= startDate);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, searchQuery, statusFilter, paymentFilter, dateFilter]);

  const getStatusBadge = (status: TransactionStatus) => {
    const configs: Record<TransactionStatus, { 
      variant: "default" | "secondary" | "destructive" | "outline";
      className: string;
      icon: React.ReactNode;
    }> = {
      success: { 
        variant: "default", 
        className: "bg-success hover:bg-success", 
        icon: <CheckCircle2 className="h-3 w-3 mr-1" /> 
      },
      pending: { 
        variant: "secondary", 
        className: "bg-warning/10 text-warning hover:bg-warning", 
        icon: <Clock className="h-3 w-3 mr-1" /> 
      },
      failed: { 
        variant: "destructive", 
        className: "", 
        icon: <XCircle className="h-3 w-3 mr-1" /> 
      },
      refunded: { 
        variant: "outline", 
        className: "border-primary text-primary", 
        icon: <AlertCircle className="h-3 w-3 mr-1" /> 
      }
    };

    const config = configs[status];
    
    return (
      <Badge variant={config.variant} className={`flex items-center w-fit ${config.className}`}>
        {config.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || paymentFilter !== "all" || dateFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading uppercase font-bold tracking-tight">
            Transactions
          </h1>
          <p className="text-muted-foreground">
            Monitor all payment transactions for your ramazah store
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.successfulTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.successfulRevenue, 'USD')} revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats.pendingTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed / Refunded</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.failedTransactions + stats.refundedTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.failedTransactions} failed, {stats.refundedTransactions} refunded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Time" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Methods" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="Credit Card">Credit Card</SelectItem>
              <SelectItem value="PayPal">PayPal</SelectItem>
              <SelectItem value="Stripe">Stripe</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={clearFilters}
              title="Clear all filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by transaction ID, order, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              All Transactions
            </span>
            <Badge variant="secondary">
              {filteredTransactions.length} results
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "Transactions will appear here"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">
                        {transaction.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.customer}</p>
                          <p className="text-sm text-muted-foreground">{transaction.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.orderNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {transaction.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewTransaction(transaction)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download Receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-body">Transaction Details</DialogTitle>
            <DialogDescription>
              Complete information about this transaction
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction ID and Status */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="text-lg font-mono font-semibold">{selectedTransaction.id}</p>
                </div>
                {getStatusBadge(selectedTransaction.status)}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium mb-1">Customer</p>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.customer}</p>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Order Number</p>
                  <p className="text-sm font-mono text-muted-foreground">{selectedTransaction.orderNumber}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Date & Time</p>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedTransaction.date)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Payment Method</p>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.paymentMethod}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Currency</p>
                  <p className="text-sm text-muted-foreground">{selectedTransaction.currency}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{selectedTransaction.description}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
                <Button variant="outline" className="flex-1">
                  View Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}