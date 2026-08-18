"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  Package,
  Heart,
  Shield,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/types/types";
import useAdmin from "@/hooks/admin/useAdmin";

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export default function UserDetailsDialog({ 
  open, 
  onOpenChange, 
  userId 
}: UserDetailsDialogProps) {
  const { getUserById, updateUser, assignUserRole, loading } = useAdmin();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<UserProfile>>({});

  // Load user data when dialog opens
  useEffect(() => {
    if (open && userId) {
      loadUserData();
    }
  }, [open, userId]);

  const loadUserData = async () => {
    if (!userId) return;
    
    try {
      const userData = await getUserById(userId);
      if (userData) {
        setUser(userData);
        setEditedUser({
          displayName: userData.displayName,
          email: userData.email,
          address: userData.address
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error("Failed to load user details");
    }
  };

  const handleSave = async () => {
    if (!userId || !editedUser) return;
    
    try {
      setIsSaving(true);
      await updateUser(userId, editedUser);
      toast.success("User details updated successfully");
      setIsEditing(false);
      await loadUserData(); // Reload to get fresh data
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (newRole: 'user' | 'admin') => {
    if (!userId) return;
    
    try {
      await assignUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      await loadUserData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update user role");
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
    }
    return <Badge variant="outline">User</Badge>;
  };

  if (!user && loading.adminAction) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Not Found</DialogTitle>
            <DialogDescription>
              The requested user could not be found.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-body">User Details</DialogTitle>
          <DialogDescription>
            View and manage user information
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Information</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* User Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.photoURL} alt={user.displayName} />
                <AvatarFallback>
                  {user.displayName?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-body font-semibold">
                    {user.displayName || 'Unnamed User'}
                  </h3>
                  {getRoleBadge(user.role)}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  {user.emailVerified && (
                    <Badge variant="outline" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-body font-medium">Basic Information</h4>
                {/* {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                )} */}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  {isEditing ? (
                    <Input
                      value={editedUser.displayName || ''}
                      onChange={(e) =>
                        setEditedUser({ ...editedUser, displayName: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-sm">{user.displayName || 'Not set'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editedUser.email || ''}
                      onChange={(e) =>
                        setEditedUser({ ...editedUser, email: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-sm">{user.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sign-in Method</Label>
                  <p className="text-sm capitalize">{user.signInMethod}</p>
                </div>

                <div className="space-y-2">
                  <Label>User Role</Label>
                  {isEditing ? (
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(value as 'user' | 'admin')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm capitalize">{user.role}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            {user.address && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-sm font-medium font-body flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Full Name</Label>
                      <p>{user.address.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <p>{user.address.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Street</Label>
                      <p>{user.address.street}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">City</Label>
                      <p>{user.address.city}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">State</Label>
                      <p>{user.address.state}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">ZIP Code</Label>
                      <p>{user.address.zipCode}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Country</Label>
                      <p>{user.address.country}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Statistics */}
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Total Orders</span>
                </div>
                <p className="text-2xl font-bold">{user.orders?.length || 0}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">Wishlist Items</span>
                </div>
                <p className="text-2xl font-bold">{user.wishlistItems?.length || 0}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-sm">Account Status</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <div className="rounded-lg border p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium font-body mb-2">No Orders Yet</h3>
              <p className="text-sm text-muted-foreground">
                This user hasn't placed any orders yet.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{new Date(user.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Account Created</span>
                <span>{new Date(user.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email Verified</span>
                <span>{user.emailVerified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditedUser({
                    displayName: user.displayName,
                    email: user.email,
                    address: user.address
                  });
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}