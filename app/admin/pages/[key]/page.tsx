"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, ExternalLink, Loader2, RotateCcw, Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import PolicyEditor from "@/components/admin/content/PolicyEditor";
import HomeEditor from "@/components/admin/content/HomeEditor";
import useScrollLock from "@/hooks/useScrollLock";
import {
  PAGES, getPageContent, resetPageContent, savePageContent,
} from "@/lib/admin/content";
import { formatDateTime } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";
import type { ContentKey } from "@/lib/content-defaults";

/**
 * Editing one page.
 *
 * It always opens on something: the stored row if there is one, and the words
 * currently in the code if there is not. An empty form would be a trap — save it
 * once and the page goes blank on the live site.
 *
 * "Back to the original" deletes the row rather than writing today's defaults
 * into it. The point of the fallback is that an unedited page tracks the code,
 * and freezing a copy would quietly break that the next time the code changed.
 */
export default function EditPageContent() {
  const params = useParams();
  const key = params.key as ContentKey;
  const page = PAGES.find((p) => p.key === key);

  const [value, setValue] = useState<any>(null);
  const [stored, setStored] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [editor, setEditor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [resetting, setResetting] = useState(false);

  useScrollLock(resetting);

  const load = useCallback(async () => {
    setLoading(true);
    const row = await getPageContent(key);
    setValue(row.value);
    setStored(row.stored);
    setUpdatedAt(row.updatedAt);
    setEditor(row.editor);
    setDirty(false);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    if (page) load();
    else setLoading(false);
  }, [page, load]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await savePageContent(key, value);
      if (error) throw new Error(error);
      toast.success("Saved. The page is live with these words now.");
      load();
    } catch (err) {
      toast.error(describeError(err, "Could not save the page."));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    try {
      const { error } = await resetPageContent(key);
      if (error) throw new Error(error);
      toast.success("Back to the original words.");
      setResetting(false);
      load();
    } catch (err) {
      toast.error(describeError(err, "Could not reset the page."));
    }
  };

  if (!page) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No such page"
        description="That is not one of the pages you can edit."
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/pages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to pages
            </Link>
          </Button>
        }
      />
    );
  }

  if (loading || !value) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-24 font-body text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the page…
      </div>
    );
  }

  const change = (next: any) => {
    setValue(next);
    setDirty(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/pages"
          className="mb-4 inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All pages
        </Link>

        <PageHeader
          eyebrow="The shop"
          title={page.label}
          description={
            stored
              ? `Last changed ${formatDateTime(updatedAt)}${editor ? ` by ${editor}` : ""}.`
              : "Showing the words that are in the code. Nothing has been edited yet."
          }
          actions={
            <>
              <Button variant="outline" asChild>
                <a href={page.href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View
                </a>
              </Button>
              {stored && (
                <Button variant="outline" onClick={() => setResetting(true)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Back to the original
                </Button>
              )}
              <Button onClick={save} disabled={saving || !dirty}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />Save</>
                )}
              </Button>
            </>
          }
        />
      </div>

      {key === "home" ? (
        <HomeEditor value={value} onChange={change} />
      ) : (
        <PolicyEditor value={value} onChange={change} />
      )}

      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={save} disabled={saving} className="shadow-lg">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save changes</>
            )}
          </Button>
        </div>
      )}

      <AlertDialog open={resetting} onOpenChange={setResetting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">
              Go back to the original words?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Everything typed here is discarded and the page shows what is written in the
              code again. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my edits</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); reset(); }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard them
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
