"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Edit,
  ExternalLink,
  Home,
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
import { describeError } from "@/lib/admin/errors";

/**
 * Collections — the curated groupings that cut across categories.
 *
 * These now have a storefront: `/collections`, `/collections/[slug]`, a rail on
 * the home page, and a line on every product that belongs to one. Until that
 * existed a collection was strictly worse than a tag — the same grouping, plus
 * the admin work, minus any way for a shopper to reach it — and this screen
 * carried a warning saying so.
 *
 * The banner and description are worth filling in: they are the page, not
 * decoration. A collection answers "why are these together", which is the one
 * thing a category cannot.
 */
export default function AdminCollectionsPage() {
  const { fetchCollections, deleteCollection, setHomeCollection, collections, loading, error,
          resetCollections } = useAdmin();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pickingHome, setPickingHome] = useState<string | null>(null);

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
      toast.error("Could not load collections. Check your connection and try again.");
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

  const homeCollection = collections.find((collection) => collection.isFeatured) ?? null;

  /**
   * Only one collection can be on the home page, so this is a choice between
   * them rather than a switch on each — turning one on turns the previous one
   * off, in the database, in one call.
   */
  const chooseHome = async (collection: Collection) => {
    const next = collection.isFeatured ? null : collection.id;
    setPickingHome(collection.id);
    try {
      await setHomeCollection(next);
      toast.success(
        next
          ? `${collection.name} is on the home page.`
          : "The home page no longer shows a collection."
      );
      const fetchedCounts = await getCollectionProductCounts();
      setCounts(fetchedCounts);
    } catch (err: any) {
      toast.error(describeError(err, "Could not change the home page collection."));
    } finally {
      setPickingHome(null);
    }
  };

  const handleDelete = async () => {
    if (!collectionToDelete) return;
    setProcessing(true);
    try {
      await deleteCollection(collectionToDelete.id);
      toast.success(`${collectionToDelete.name} deleted.`);
      setCollectionToDelete(null);
      loadCollections();
    } catch (err: any) {
      toast.error(describeError(err, "Could not delete the collection."));
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collections" value={formatNumber(collections.length)} icon={Layers} />
        <StatCard
          label="Empty"
          value={formatNumber(emptyCount)}
          hint="nothing assigned to them"
          tone={emptyCount > 0 ? "attention" : "default"}
        />
        <StatCard
          label="On the home page"
          value={homeCollection?.name ?? "None"}
          hint={
            homeCollection
              ? `${formatNumber(counts.get(homeCollection.id) ?? 0)} products`
              : "the band is hidden until one is chosen"
          }
          icon={Home}
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

                  {/* Named, not just coloured — which one is on the home page is
                      the whole point of the control below it. */}
                  {collection.isFeatured && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-sm bg-sage-deep px-2 py-1 font-body text-[11px] text-background">
                      <Home className="h-3 w-3" />
                      On the home page
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
                        <DropdownMenuItem
                          onClick={() => chooseHome(collection)}
                          disabled={pickingHome !== null}
                        >
                          <Home className="mr-2 h-4 w-4" />
                          {collection.isFeatured
                            ? "Take off the home page"
                            : "Show on the home page"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <a
                            href={`/collections/${collection.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View on shop
                          </a>
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

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p
                      className={`inline-block rounded-sm px-2 py-0.5 font-body text-[11px] tabular-nums ${
                        count === 0 ? "bg-terra/10 text-terra-ink" : "bg-wash/60 text-ink-muted"
                      }`}
                    >
                      {count === 0 ? "empty" : `${count} products`}
                    </p>

                    {/*
                      A radio in behaviour, not a switch: choosing this one
                      releases whichever held it. An empty collection is barred
                      because the band renders nothing without products, which
                      would read as the setting having failed.
                    */}
                    <button
                      type="button"
                      onClick={() => chooseHome(collection)}
                      disabled={pickingHome !== null || (count === 0 && !collection.isFeatured)}
                      title={
                        count === 0 && !collection.isFeatured
                          ? "Add products before putting this on the home page"
                          : undefined
                      }
                      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-body text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        collection.isFeatured
                          ? "text-sage-deep hover:bg-wash/60"
                          : "text-ink-muted hover:bg-wash/60 hover:text-foreground"
                      }`}
                    >
                      {pickingHome === collection.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Home className="h-3 w-3" />
                      )}
                      {collection.isFeatured ? "On the home page" : "Show on the home page"}
                    </button>
                  </div>
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
