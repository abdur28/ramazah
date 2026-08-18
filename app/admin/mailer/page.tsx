"use client";

import React, { useEffect, useState } from "react";
import {
  Mail,
  Send,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Plus,
  Sparkles,
  TrendingUp,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import useAdmin from "@/hooks/admin/useAdmin";
import PromotionEmailComposer from "@/components/admin/PromotionEmailComposer";
import NewArrivalsEmailComposer from "@/components/admin/NewArrivalsEmailComposer";
import NewsletterEmailComposer from "@/components/admin/NewsletterEmailComposer";

interface EmailResult {
  email: string;
  name: string;
  success: boolean;
  error?: string;
}

export default function AdminMailerPage() {
  const {
    fetchEmailRecipients,
    fetchEmailStats,
    emailRecipients,
    emailStats,
    loading,
    error
  } = useAdmin();

  const [refreshing, setRefreshing] = useState(false);
  const [emailType, setEmailType] = useState<'promotions' | 'newArrivals' | 'newsletter'>('promotions');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Results dialog
  const [showResults, setShowResults] = useState(false);
  const [emailResults, setEmailResults] = useState<EmailResult[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // When email type changes, reload recipients
    loadRecipients();
  }, [emailType]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchEmailStats(),
        loadRecipients()
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load email data");
    } finally {
      setRefreshing(false);
    }
  };

  const loadRecipients = async () => {
    try {
      await fetchEmailRecipients(emailType);
    } catch (err) {
      console.error("Error loading recipients:", err);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRecipients([]);
      setSelectAll(false);
    } else {
      setSelectedRecipients(emailRecipients.map(r => r.id));
      setSelectAll(true);
    }
  };

  const handleRecipientToggle = (recipientId: string) => {
    if (selectedRecipients.includes(recipientId)) {
      setSelectedRecipients(selectedRecipients.filter(id => id !== recipientId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedRecipients, recipientId];
      setSelectedRecipients(newSelected);
      if (newSelected.length === emailRecipients.length) {
        setSelectAll(true);
      }
    }
  };

  const handleEmailSent = (results: { successCount: number; failedCount: number; results: any[] }) => {
    setSuccessCount(results.successCount);
    setTotalCount(results.successCount + results.failedCount);
    setEmailResults(results.results);
    setShowResults(true);
    setSelectedRecipients([]);
    setSelectAll(false);
    
    // Refresh stats
    fetchEmailStats();
  };

  const getEmailTypeIcon = () => {
    switch (emailType) {
      case 'promotions':
        return <Sparkles className="h-5 w-5" />;
      case 'newArrivals':
        return <Package className="h-5 w-5" />;
      case 'newsletter':
        return <Mail className="h-5 w-5" />;
    }
  };

  const getEmailTypeLabel = () => {
    switch (emailType) {
      case 'promotions':
        return 'Promotions';
      case 'newArrivals':
        return 'New Arrivals';
      case 'newsletter':
        return 'Newsletter';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-wider ">
            EMAIL CAMPAIGNS
          </h1>
          <p className="text-gray-400 font-body">
            Send targeted emails to your customers
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing || loading.users}
          variant="outline"
          className="border-gray-300"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing || loading.users ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {emailStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className=" border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium ">Total Users</CardTitle>
              <Users className="h-4 w-4 " />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">{emailStats.totalUsers}</div>
              <p className="text-xs text-gray-400">
                {emailStats.totalOptedIn} opted-in
              </p>
            </CardContent>
          </Card>

          <Card className=" border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium ">Promotions</CardTitle>
              <Sparkles className="h-4 w-4 " />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">{emailStats.promotionsOptedIn}</div>
              <p className="text-xs text-gray-400">
                Active subscribers
              </p>
            </CardContent>
          </Card>

          <Card className=" border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium ">New Arrivals</CardTitle>
              <Package className="h-4 w-4 " />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">{emailStats.newArrivalsOptedIn}</div>
              <p className="text-xs text-gray-400">
                Active subscribers
              </p>
            </CardContent>
          </Card>

          <Card className=" border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium ">Newsletter</CardTitle>
              <Mail className="h-4 w-4 " />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">{emailStats.newsletterOptedIn}</div>
              <p className="text-xs text-gray-400">
                Active subscribers
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Composer */}
        <div className="lg:col-span-2">
          <Card className=" border-gray-300">
            <CardHeader>
              <CardTitle className="font-body">
                Compose Compaign
              </CardTitle>
              <CardDescription className="text-gray-400">
                Create and send email campaigns to your customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={emailType} onValueChange={(value) => setEmailType(value as any)}>
                <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                  <TabsTrigger value="promotions" className="data-[state=active]:bg-[#F8E231] data-[state=active]:text-black">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Promotion
                  </TabsTrigger>
                  <TabsTrigger value="newArrivals" className="data-[state=active]:bg-[#F8E231] data-[state=active]:text-black">
                    <Package className="h-4 w-4 mr-2" />
                    New Arrivals
                  </TabsTrigger>
                  <TabsTrigger value="newsletter" className="data-[state=active]:bg-[#F8E231] data-[state=active]:text-black">
                    <Mail className="h-4 w-4 mr-2" />
                    Newsletter
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="promotions" className="mt-6">
                  <PromotionEmailComposer 
                    recipients={selectedRecipients}
                    onEmailSent={handleEmailSent}
                  />
                </TabsContent>

                <TabsContent value="newArrivals" className="mt-6">
                  <NewArrivalsEmailComposer 
                    recipients={selectedRecipients}
                    onEmailSent={handleEmailSent}
                  />
                </TabsContent>

                <TabsContent value="newsletter" className="mt-6">
                  <NewsletterEmailComposer 
                    recipients={selectedRecipients}
                    onEmailSent={handleEmailSent}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Recipients Panel */}
        <div className="space-y-6">
          {/* Recipient Stats */}
          <Card className=" border-gray-300">
            <CardHeader>
              <CardTitle className=" font-body flex items-center">
                 Recipients
              </CardTitle>
              <CardDescription>
                Recipients who opted-in for this type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm ">Available Recipients</span>
                <Badge variant="secondary" >
                  {emailRecipients.length}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm ">Selected</span>
                <Badge variant="secondary" >
                  {selectedRecipients.length}
                </Badge>
              </div>

              <Button 
                onClick={handleSelectAll}
                variant="outline"
                className="w-full border-gray-300"
                disabled={emailRecipients.length === 0}
              >
                {selectAll ? "Deselect All" : "Select All"}
              </Button>
            </CardContent>
          </Card>

          {/* Recipients List */}
          <Card className=" border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm font-body ">
                Recipient List
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.users ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#F8E231]" />
                </div>
              ) : emailRecipients.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto mb-4 " />
                  <p className="text-sm text-gray-400">
                    No recipients opted-in for {getEmailTypeLabel()}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {emailRecipients.map((recipient) => (
                    <label
                      key={recipient.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedRecipients.includes(recipient.id)}
                        onCheckedChange={() => handleRecipientToggle(recipient.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium  truncate">
                          {recipient.displayName || "Unnamed User"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {recipient.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl  border-gray-300">
          <DialogHeader>
            <DialogTitle className=" font-body tracking-wider">
              Campaign Results
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Email delivery summary
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Success Summary */}
            <div className="flex items-center justify-between p-4  rounded-lg border border-gray-300">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium ">
                    {successCount} of {totalCount} sent successfully
                  </p>
                  <p className="text-xs text-gray-400">
                    {Math.round((successCount / totalCount) * 100)}% success rate
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {emailResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-200/20 border-green-500/30' 
                      : 'bg-red-200/20 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium  truncate">
                        {result.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {result.email}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={result.success ? "default" : "destructive"}
                    className={result.success ? "bg-green-600" : ""}
                  >
                    {result.success ? "Sent" : "Failed"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={() => setShowResults(false)}
              className="bg-[#F8E231] hover:bg-[#ffd700] text-black"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}