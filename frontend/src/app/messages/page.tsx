"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Send, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";

function formatThreadTime(value?: string) {
  if (!value) {
    return "No activity yet";
  }
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["messages"], queryFn: api.messages });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const threads = useMemo(() => data || [], [data]);

  const activeThread = useMemo(() => {
    const selected = threads.find((thread) => thread.id === activeThreadId);
    return selected || threads[0] || null;
  }, [activeThreadId, threads]);

  const summary = {
    active: threads.length,
    needsReply: threads.filter((thread) => thread.status === "needs_reply").length,
    waiting: threads.filter((thread) => thread.status === "waiting").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Monitor patient SMS threads, see where automation left off, and be ready to take over when Twilio goes live."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Active threads</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.active}</div>
          <div className="mt-2 text-sm text-slate-500">Conversation threads currently tracked by the platform.</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Needs reply</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{summary.needsReply}</div>
          <div className="mt-2 text-sm text-slate-500">Patient messages that may need a human response.</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Twilio readiness</div>
          <div className="mt-3 text-lg font-semibold text-slate-950">Workspace ready</div>
          <div className="mt-2 text-sm text-slate-500">Custom send is staged in the UI and can be activated once transport is approved.</div>
        </Card>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading messages…</div>
      ) : threads.length ? (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-sm font-semibold text-slate-950">Thread queue</div>
              <div className="mt-1 text-sm text-slate-500">Missed-call recovery and follow-up threads appear here.</div>
            </div>
            <div className="divide-y divide-slate-200">
              {threads.map((thread) => {
                const isActive = activeThread?.id === thread.id;
                const lastMessage = thread.messages[thread.messages.length - 1];
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveThreadId(thread.id)}
                    className={isActive ? "w-full bg-slate-50 px-5 py-4 text-left" : "w-full px-5 py-4 text-left transition hover:bg-slate-50"}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{thread.patient}</div>
                        <div className="mt-1 text-sm text-slate-500">{thread.phone || thread.practice}</div>
                      </div>
                      <StatusBadge value={thread.status === "needs_reply" ? "warning" : "healthy"} />
                    </div>
                    <div className="mt-3 text-sm font-medium text-slate-900">{thread.triggerLabel || "Follow-up thread"}</div>
                    <div className="mt-2 line-clamp-2 text-sm text-slate-500">{lastMessage?.body || "No messages yet."}</div>
                    <div className="mt-3 text-xs text-slate-400">{formatThreadTime(thread.lastMessageAt)}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          {activeThread ? (
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-slate-950">{activeThread.patient}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {activeThread.phone || "No phone captured"} · {activeThread.practice}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={activeThread.status === "needs_reply" ? "warning" : "healthy"} />
                    <StatusBadge value="connected" />
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{activeThread.triggerLabel || "Follow-up thread"}</span>
                  {" "}
                  is the source for this conversation. Use this workspace to watch the thread now, then send custom replies once Twilio transport is enabled.
                </div>
              </div>

              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    {activeThread.messages.map((message) => (
                      <div
                        key={message.id}
                        className={message.sender === "ai" ? "mr-12" : "ml-12 flex justify-end"}
                      >
                        <div
                          className={
                            message.sender === "ai"
                              ? "max-w-[85%] rounded-[20px] rounded-tl-md bg-slate-100 px-4 py-3 text-sm text-slate-900"
                              : "max-w-[85%] rounded-[20px] rounded-tr-md bg-slate-950 px-4 py-3 text-sm text-white"
                          }
                        >
                          <div className={message.sender === "ai" ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600" : "text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300"}>
                            {message.sender === "ai" ? "Automation" : "Patient"}
                          </div>
                          <div className="mt-2 leading-7">{message.body}</div>
                          <div className={message.sender === "ai" ? "mt-2 text-xs text-slate-500" : "mt-2 text-xs text-slate-300"}>
                            {message.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-l border-slate-200 bg-slate-50 px-6 py-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-950">Manual reply</div>
                      <div className="text-sm text-slate-500">Twilio-ready compose surface for live takeover.</div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Sparkles className="h-4 w-4 text-sky-500" />
                      Current state
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      The platform can already show the thread and who said what. Outbound custom send is intentionally staged here so it can turn on once Twilio approval is complete.
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-medium text-slate-700">Draft message</label>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Reply drafting will go live once Twilio transport is approved."
                      className="mt-2 h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Button disabled className="inline-flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send custom message
                    </Button>
                    <div className="text-xs text-slate-500">Disabled until Twilio sender approval is live.</div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          No message threads yet. Once missed-call recovery or patient replies start flowing, they will appear here.
        </div>
      )}
    </div>
  );
}
