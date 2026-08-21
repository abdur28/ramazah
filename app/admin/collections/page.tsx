"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Edit,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import CollectionDialog from "@/components/admin/CollectionDialog";
import useAdmin from "@/hooks/admin/useAdmin";
import { getCollectionProductCounts } from "@/lib/admin/catalogue";
import { formatNumber } from "@/lib/admin/format";
import type { Collection } from "@/types/admin";

/**
 * Collections — the curated groupings that cut across categories.
 *
 * Each one now carries how many products it holds, which the list never showed.
 *
 * Worth knowing while editing here: **the storefront has no collection route.**
 * `app/` has `/categories/[...slug]` and `/product/[slug]` and nothing for
 * collections, so a collection is currently data with no page — it can be built
 * and filled, and no shopper can reach it. The banner image and description are
 * being collected for a page that does not exist yet. Said plainly on the screen
 * rather than left for someone to discover after curating one.
 */
export default function AdminCollectionsPage() {
  const { fetchCollections, deleteCollection, collections, loading, error, resetCollections } =
    useAdmin();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setRefreshing(true);
    resetCollections();
    try {
      const [, fetchedCounts] = await Promise.all([
        fetchCollections({ limit: 100, orderByField: "name", orderDirection: "asc" }),
        getCollectionProductCounts(),
      ]);
      setCounts(fetchedCounts);
    } catch {
      toast.error("Could not load collections.");
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return collections;

    return collections.filter(
      (collection) =>
        collection.name.toLowerCase().includes(query) ||
        collection.slug.toLowerCase().includes(query)
    );
  }, [collections, searchQuery]);

  const emptyCount = collections.filter(
    (collection) => (counts.get(collection.id) ?? 0) === 0
  ).length;

  const handleDelete = async () => {
    if (!collectionToDelete) return;
    setProcessing(true);
    try {
      await deleteCollection(collectionToDelete.id);
      toast.success(`${collectionToDelete.name} deleted.`);
      setCollectionToDelete(null);
      loadCollections();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the collection.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalogue"
        title="Collections"
        description="Curated groupings that cut across categories — a Ramadan edit, a gifting selection."
        actions={
          <>
            <Button
              variant="outline"
              onClick={loadCollections}
              disabled={refreshing || loading.collections}
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${refreshing || loading.collections ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setSelectedCollection(null);
                setDialogMode("create");
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add collection
            </Button>
          </>
        }
      />

      {/* Better said here than discovered after building one. */}
      <p className="flex items-start gap-2 rounded-sm border border-terra/30 bg-terra/[0.04] p-3 font-body text-sm text-terra-ink">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        The shop has no collection page yet. You can build collections here and assign products to
        them, but shoppers cannot browse one until that route exists.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Collections" value={formatNumber(collections.length)} icon={Layers} />
        <StatCard
          label="Empty"
          value={formatNumber(emptyCount)}
          hint="nothing assigned to them"
          tone={emptyCount > 0 ? "attention" : "default"}
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          placeholder="Search collections…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-wash/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error.collections ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load collections"
          description={error.collections}
          action={
            <Button variant="outline" onClick={loadCollections}>
              Try again
            </Button>
          }
        />
      ) : loading.collections && collections.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading collections…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={searchQuery ? "Nothing matches that search" : "No collections yet"}
          description={
            searchQuery
              ? undefined
              : "A collection groups products that belong together for a season or an occasion, whatever category they sit in."
          }
          action={
            searchQuery ? (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSelectedCollection(null);
                  setDialogMode("create");
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add the first one
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((collection) => {
            const count = counts.get(collection.id) ?? 0;

            return (
              <li
                key={collection.id}
                className="overflow-hidden rounded-sm border border-rule bg-card"
              >
                <div className="relative aspect-[16/7] bg-wash">
                  {collection.bannerImage?.secureUrl ? (
                    <Image
                      src={collection.bannerImage.secureUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Layers className="h-6 w-6 text-ink-faint" />
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-body text-sm font-medium text-foreground">
                        {collection.name}
                      </h2>
                      <p className="truncate font-body text-xs text-ink-muted">
                        /{collection.slug}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="-mr-2 -mt-1 h-8 w-8 shrink-0 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions for {collection.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedCollection(collection);
                            setDialogMode("edit");
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setCollectionToDelete(collection)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {collection.description && (
                    <p className="mt-2 line-clamp-2 font-body text-sm text-ink-muted">
                      {collection.description}
                    </p>
                  )}

                  <p
                    className={`mt-3 inline-block rounded-sm px-2 py-0.5 font-body text-[11px] tabular-nums ${
                      count === 0 ? "bg-terra/10 text-terra-ink" : "bg-wash/60 text-ink-muted"
                    }`}
                  >
                    {count === 0 ? "empty" : `${count} products`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CollectionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedCollection(null);
            loadCollections();
          }
        }}
        collection={selectedCollection}
        mode={dialogMode}
      />

      <AlertDialog
        open={Boolean(collectionToDelete)}
        onOpenChange={(open) => !open && setCollectionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">
              Delete {collectionToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The products in it stay in the catalogue — they just stop being grouped. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete collection"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
