"use client";

import React, { useEffect, useState } from "react";
import { Plus, RefreshCcw, Search, MoreHorizontal, Edit, Trash2, Loader2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "sonner";
import { Collection } from "@/types/admin";
import useAdmin from "@/hooks/admin/useAdmin";
import CollectionDialog from "@/components/admin/CollectionDialog";

export default function AdminCollectionsPage() {
  const { fetchCollections, deleteCollection, collections, loading, error, resetCollections } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (!collections) return;
    let filtered = [...collections];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query));
    }
    setFilteredCollections(filtered);
  }, [collections, searchQuery]);

  const loadCollections = async () => {
    setRefreshing(true);
    resetCollections();
    try {
      await fetchCollections({ limit: 100, orderByField: 'name', orderDirection: 'asc' });
    } catch (err) {
      toast.error("Failed to load collections");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!collectionToDelete) return;
    setProcessingAction(true);
    try {
      await deleteCollection(collectionToDelete.id);
      toast.success("Collection deleted");
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading.collections && !refreshing && collections.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p>Loading Collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading uppercase">Collections</h1>
          <p className="text-muted-foreground">Manage product collections</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCollections} variant="outline" disabled={refreshing}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => { setSelectedCollection(null); setDialogMode('create'); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Collection
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Total Collections: {collections.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

          {filteredCollections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No collections found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Banner</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>
                      {collection.bannerImage ? (
                        <div className="relative w-20 h-10 rounded overflow-hidden">
                          <Image src={collection.bannerImage.secureUrl} alt="" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-10 bg-muted rounded flex items-center justify-center">
                          <Layers className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{collection.name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{collection.slug}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{collection.description || 'No description'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { setSelectedCollection(collection); setDialogMode('edit'); setDialogOpen(true); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setCollectionToDelete(collection); setDeleteDialogOpen(true); }} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CollectionDialog open={dialogOpen} onOpenChange={setDialogOpen} collection={selectedCollection} mode={dialogMode} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{collectionToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={processingAction}>
              {processingAction ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}