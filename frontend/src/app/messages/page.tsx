"use client";

import { useQuery } from "@tanstack/react-query";
import { ConversationView } from "@/components/conversation-view";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function MessagesPage() {
  const { data } = useQuery({ queryKey: ["messages"], queryFn: api.messages });

  return (
    <div>
      <PageHeader title="Messages" description="SMS thread view for patient conversations and AI receptionist follow-up messaging." />
      <div className="grid gap-6 lg:grid-cols-2">
        {data?.map((thread) => <ConversationView key={thread.id} thread={thread} />)}
      </div>
    </div>
  );
}
