"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  RefreshCcw,
  Search,
  ChevronRight,
  MoreHorizontal,
  UserCog,
  UserX,
  Shield,
  X,
  AlertTriangle,
  Check,
  Loader2,
  Eye
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserProfile } from "@/types/types";
import useAdmin from "@/hooks/admin/useAdmin";
import UserDetailsDialog from "@/components/admin/UserDetailsDialog";

// Note: Install shadcn components
// npx shadcn@latest add avatar button input badge dropdown-menu select table alert-dialog

export default function AdminCustomersPage() {
  const router = useRouter();
  const {
    fetchUsers,
    toggleUserStatus,
    assignUserRole,
    users,
    loading,
    error,
    pagination,
    resetUsers
  } = useAdmin();

  // State variables
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [processingAction, setProcessingAction] = useState(false);
  
  // Dialogs state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Load users when component mounts
  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users based on search and role
  useEffect(() => {
    if (!users) return;

    let filtered = [...users];

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.displayName?.toLowerCase().includes(query)) ||
        (user.email?.toLowerCase().includes(query))
      );
    }

    setFilteredUsers(filtered);
  }, [users, roleFilter, searchQuery]);

  const loadUsers = async (options = {}) => {
    try {
      setRefreshing(true);
      resetUsers();
      await fetchUsers({
        limit: 50,
        ...options
      });
    } catch (err) {
      console.error("Error loading users:", err);
      toast.error("Failed to load customers");
    } finally {
      setRefreshing(false);
    }
  };

  const loadMoreUsers = async () => {
    if (!pagination.users.hasMore) return;
    
    try {
      await fetchUsers({
        limit: 50,
        startAfter: pagination.users.lastDoc
      });
    } catch (err) {
      console.error("Error loading more users:", err);
      toast.error("Failed to load more customers");
    }
  };

  const handleRefresh = () => {
    loadUsers();
  };

  const handleToggleStatus = async (user: UserProfile) => {
    if (!user.uid) return;
    
    try {
      setSelectedUser(user);
      setProcessingAction(true);
      
      // Toggle between active and inactive
      const newStatus = 'active'; // Simplified for now
      
      await toggleUserStatus(user.uid, newStatus);
      toast.success(`Customer status updated successfully`);
      
      setBlockDialogOpen(false);
    } catch (err) {
      console.error("Error toggling user status:", err);
      toast.error("Failed to update customer status");
    } finally {
      setProcessingAction(false);
      setSelectedUser(null);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser?.uid || !selectedRole) return;
    
    try {
      setProcessingAction(true);
      
      await assignUserRole(selectedUser.uid, selectedRole);
      toast.success(`User role updated to ${selectedRole}`);
      
      setRoleDialogOpen(false);
    } catch (err) {
      console.error("Error assigning user role:", err);
      toast.error("Failed to update user role");
    } finally {
      setProcessingAction(false);
      setSelectedUser(null);
    }
  };

  const getUserRoleBadge = (user: UserProfile) => {
    switch (user.role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Admin</Badge>;
      default:
        return <Badge variant="outline">Customer</Badge>;
    }
  };

  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId);
    setDetailsDialogOpen(true);
  };

  // Loading state
  if (loading.users && !refreshing && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-tight">Customer Management</h1>
            <p className="text-muted-foreground">
              Manage all customers registered on ramazah.
            </p>
          </div>
          <Button 
            className="self-start sm:self-auto"
            disabled={true}
          >
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>

        <div className="rounded-lg border border-dashed p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-lg font-medium">Loading Customers</p>
          <p className="text-sm text-muted-foreground">
            Please wait while we fetch the customer data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading uppercase tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage all customers registered on ramazah.
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing || loading.users} 
          className="self-start sm:self-auto"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing || loading.users ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-2">
          <Select 
            value={roleFilter} 
            onValueChange={setRoleFilter}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Customers</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>

          {(roleFilter !== "all" || searchQuery) && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setRoleFilter("all");
                setSearchQuery("");
              }}
              title="Clear filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Error state */}
      {error.users && (
        <div className="rounded-lg border border-destructive p-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium font-body">Error loading customers</h3>
              <p className="text-sm text-muted-foreground">{error.users}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing || loading.users}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading.users && !error.users && filteredUsers.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Users className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No customers found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery || roleFilter !== "all" 
              ? "Try changing your search or filter criteria"
              : "No customers have registered on ramazah yet"}
          </p>
          {(searchQuery || roleFilter !== "all") && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setRoleFilter("all");
                setSearchQuery("");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Users table */}
      {filteredUsers.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL} alt={user.displayName || "User"} />
                        <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.displayName || "Unnamed User"}</div>
                        <div className="text-xs text-muted-foreground capitalize">{user.signInMethod}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.email || "No email"}
                      {user.emailVerified && (
                        <Badge variant="outline" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getUserRoleBadge(user)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.orders?.length || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem 
                          onClick={() => handleViewDetails(user.uid)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedRole(user.role as 'user' | 'admin' || 'user');
                            setRoleDialogOpen(true);
                          }}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedUser(user);
                            setBlockDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Suspend Customer
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

      {/* Pagination/Load more */}
      {filteredUsers.length > 0 && pagination.users.hasMore && (
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={loadMoreUsers}
            disabled={loading.users}
          >
            {loading.users ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More 
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Suspend Customer Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">Suspend Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend {selectedUser?.displayName || 'this customer'}? They will lose access to placing orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleToggleStatus(selectedUser!)}
              className="bg-destructive hover:bg-destructive"
              disabled={processingAction}
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Suspend'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <AlertDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">Change User Role</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new role for {selectedUser?.displayName || 'this user'}. This will change their permissions and access level.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select 
              value={selectedRole} 
              onValueChange={(value) => setSelectedRole(value as 'user' | 'admin')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Customer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="mt-4 text-sm">
              {selectedRole === 'admin' && (
                <div className="flex items-start gap-2 text-warning bg-warning/10 p-3 rounded">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <strong>Warning:</strong> Admins have full access to the admin panel and can manage all aspects of the store. Only assign this role to trusted individuals.
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssignRole}
              disabled={processingAction || (selectedUser?.role === selectedRole)}
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <UserDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        userId={selectedUserId}
      />
    </div>
  );
}