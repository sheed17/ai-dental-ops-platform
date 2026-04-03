import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Account, notification, and platform defaults. This page is scaffolded for future configuration work." />
      <Card className="p-6">
        <div className="text-sm text-slate-600">Settings scaffolding is in place. Next pass can wire real preferences and role controls.</div>
      </Card>
    </div>
  );
}
