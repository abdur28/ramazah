"use client";

import { Bell, Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/admin/ui/PageHeader";
import CampaignsTab from "@/components/admin/mailer/CampaignsTab";
import NotificationsTab from "@/components/admin/mailer/NotificationsTab";

/**
 * The mailer, in two halves.
 *
 * **Notifications** is the transactional side — the emails the shop sends by
 * itself when an order is placed, a payment lands or a quote goes out. None of
 * it existed: every one of those was a function nothing called, so the shop had
 * no record of anything it had ever told a customer.
 *
 * **Campaigns** is writing to more than one person. It used to fire one `fetch`
 * per recipient straight at SMTP from the browser — no record once the dialog
 * closed, no retries, no dedupe, and it stopped halfway if the tab was closed.
 * Both halves now go through the same outbox.
 *
 * This page is a header and two tabs because both halves own their own state.
 * It was 363 lines of recipient checkboxes and a results dialog that died on
 * refresh.
 */
export default function AdminMailerPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reach"
        title="Mailer"
        description="What the shop sends by itself, and what you send by hand. Nobody who has not opted in receives a campaign."
      />

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList data-lenis-prevent className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Megaphone className="mr-2 h-4 w-4" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
