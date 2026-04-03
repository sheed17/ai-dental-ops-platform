"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileAudio,
  FileText,
  Info,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { CallDuration } from "@/components/call-duration";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

function formatDateTime(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
    time: date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  };
}

function formatPlaybackTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "00:00";
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseTranscript(rawTranscript: string) {
  const normalized = rawTranscript.includes("\nbot:") || rawTranscript.startsWith("bot:")
    ? rawTranscript.slice(Math.max(0, rawTranscript.indexOf("bot:")))
    : rawTranscript.includes("\nuser:") || rawTranscript.startsWith("user:")
      ? rawTranscript.slice(Math.max(0, rawTranscript.indexOf("user:")))
      : rawTranscript;

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const segments: Array<{ speaker: "assistant" | "caller"; body: string }> = [];

  for (const line of lines) {
    const match = /^(bot|assistant|user|caller|customer):\s*(.*)$/i.exec(line);
    if (match) {
      const speaker = /bot|assistant/i.test(match[1]) ? "assistant" : "caller";
      segments.push({ speaker, body: match[2] || "" });
      continue;
    }

    if (segments.length) {
      segments[segments.length - 1].body = `${segments[segments.length - 1].body} ${line}`.trim();
    }
  }

  return segments.filter((segment) => segment.body.length > 0);
}

export default function CallDetailPage() {
  const params = useParams<{ callId: string }>();
  const callId = params.callId;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "review">("review");
  const { data: call, isLoading } = useQuery({
    queryKey: ["call", callId],
    queryFn: () => api.call(callId),
    enabled: Boolean(callId),
  });

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return <Skeleton className="h-[34rem]" />;
  }

  if (!call) {
    return (
      <Card className="p-8">
        <div className="text-lg font-semibold text-slate-950">Call not found</div>
        <p className="mt-2 text-sm text-slate-500">This call record is not available anymore, or the backend did not return a matching record.</p>
        <Button asChild className="mt-5">
          <Link href="/calls">Back to calls</Link>
        </Button>
      </Card>
    );
  }

  const created = formatDateTime(call.time);
  const transcriptSegments = parseTranscript(call.transcript);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      void audio.play();
      return;
    }
    audio.pause();
  }

  function seekBy(deltaSeconds: number) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = Math.max(0, Math.min((audio.duration || 0), audio.currentTime + deltaSeconds));
  }

  function handleScrub(nextValue: string) {
    const audio = audioRef.current;
    const nextTime = Number(nextValue);
    setCurrentTime(nextTime);
    if (audio) {
      audio.currentTime = nextTime;
    }
  }

  function startPlaybackLoop() {
    const tick = () => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }
      setCurrentTime(audio.currentTime || 0);
      if (!audio.paused && !audio.ended) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(tick);
  }

  const followUpPrompt = call.incident
    ? "Urgent follow-up needed"
    : call.callbackStatus === "open"
      ? "Staff callback needed"
      : "No follow-up needed";
  const followUpDetail = call.incident
    ? "This call triggered an incident and should be reviewed by a human immediately."
    : call.callbackStatus === "open"
      ? "This call created callback work for staff follow-up."
      : "The assistant handled the call and no staff action was requested.";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost">
          <Link href="/calls" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to calls
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_38%),linear-gradient(135deg,#ffffff_0%,#f8fbff_45%,#eff6ff_100%)] p-8">
          <PageHeader title={call.caller} description="Use this page to decide whether anyone on the team needs to do something next." />

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={call.outcome.toLowerCase().replaceAll(" ", "_")} />
                <StatusBadge value={`callback_${call.callbackStatus}`} />
                <StatusBadge value={call.incident ? "incident_urgent" : `incident_${call.incidentStatus}`} />
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    <Info className="h-3.5 w-3.5" />
                    What to do
                  </div>
                  <div className="mt-3 text-xl font-semibold text-slate-950">{followUpPrompt}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">{followUpDetail}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-slate-50">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-sky-200">Call summary</div>
                  <div className="mt-3 text-sm leading-7 text-slate-100">{call.summary}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Practice</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{call.practice}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Caller</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{call.phone}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Started</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{created.date}</div>
                  <div className="text-xs text-slate-500">{created.time}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Duration</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    <CallDuration duration={call.duration} recordingUrl={call.recordingUrl} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Ended</div>
                  <div className="mt-2 text-sm font-semibold capitalize text-slate-950">{call.endedReason}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Caller history</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">{call.repeatCallerCount} prior {call.repeatCallerCount === 1 ? "call" : "calls"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-2">
        <div className="flex gap-2 border-b border-slate-200 px-3 py-3">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={activeTab === "overview"
              ? "rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
              : "rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={activeTab === "review"
              ? "rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
              : "rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"}
          >
            Conversation review
          </button>
        </div>

        {activeTab === "overview" ? (
          <div className="grid gap-6 p-4 xl:grid-cols-[minmax(0,1.25fr)_380px]">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">Structured intake</div>
                    <div className="text-sm text-slate-500">The extracted details behind this call.</div>
                  </div>
                </div>

                {call.structuredOutput.length ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {call.structuredOutput.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                        <div className="mt-2 text-sm font-semibold capitalize text-slate-950">{item.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No structured outputs were captured for this call.
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">Automation timeline</div>
                    <div className="text-sm text-slate-500">What the platform already handled after this conversation finished.</div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {call.automationEvents.map((event, index) => (
                    <div key={`${event}-${index}`} className="flex gap-4">
                      <div className="flex w-6 justify-center">
                        <div className="mt-1 h-3 w-3 rounded-full bg-sky-500" />
                      </div>
                      <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="text-sm font-semibold text-slate-950">{event}</div>
                        <div className="mt-1 text-sm text-slate-500">Recorded automatically on the call workflow timeline.</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">Follow-up posture</div>
                    <div className="text-sm text-slate-500">Whether this call produced callback or incident work for the team.</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Callback</div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-600">Staff callback needed</div>
                      <StatusBadge value={call.callbackStatus} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Incident</div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-600">Urgent escalation</div>
                      <StatusBadge value={call.incident ? "urgent" : call.incidentStatus} />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">Recent caller history</div>
                    <div className="text-sm text-slate-500">Quick context for repeat callers without opening separate records.</div>
                  </div>
                </div>

                {call.recentRelatedCalls.length ? (
                  <div className="mt-5 space-y-3">
                    {call.recentRelatedCalls.map((related) => {
                      const relatedDate = formatDateTime(related.createdAt);
                      return (
                        <div key={related.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-950">{related.caller}</div>
                            <div className="text-xs text-slate-500">
                              {relatedDate.date} at {relatedDate.time}
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-slate-500">{related.phone}</div>
                          <div className="mt-3 text-sm leading-6 text-slate-600">{related.summary}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No recent related calls were found for this caller.
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <FileAudio className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-950">Conversation review</div>
                  <div className="text-sm text-slate-500">Listen back and review the actual call transcript in one place.</div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-900 bg-[#07111f] text-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
                <div className="border-b border-white/10 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Recording and transcript</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {call.recordingStatus === "available"
                        ? "Real call audio is available. Transcript is rendered from the stored call record."
                        : "No recording URL is available yet. Transcript remains reviewable below."}
                    </div>
                  </div>
                </div>

                <div className="border-b border-white/10 px-5 py-5">
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#0d1b2c_0%,#09111c_100%)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">Call audio</div>
                      <div className="text-xs text-slate-400">
                        {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => seekBy(-10)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                      >
                        <SkipBack className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={togglePlayback}
                        disabled={!call.recordingUrl}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => seekBy(10)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                      >
                        <SkipForward className="h-4 w-4" />
                      </button>
                      <div className="ml-2 flex-1">
                        <input
                          type="range"
                          min={0}
                          max={duration || 0}
                          step={0.1}
                          value={Math.min(currentTime, duration || 0)}
                          onChange={(event) => handleScrub(event.target.value)}
                          disabled={!call.recordingUrl || !duration}
                          className="h-2 w-full cursor-pointer accent-cyan-300 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {call.recordingUrl ? (
                      <audio
                        ref={audioRef}
                        preload="metadata"
                        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
                        onPlay={() => {
                          setIsPlaying(true);
                          startPlaybackLoop();
                        }}
                        onPause={() => {
                          setIsPlaying(false);
                          if (frameRef.current) {
                            cancelAnimationFrame(frameRef.current);
                          }
                        }}
                        onEnded={() => {
                          setIsPlaying(false);
                          setCurrentTime(0);
                          if (frameRef.current) {
                            cancelAnimationFrame(frameRef.current);
                          }
                        }}
                      >
                        <source src={call.recordingUrl} />
                      </audio>
                    ) : null}
                  </div>
                </div>

                <div className="px-5 py-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-100">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Call transcript</div>
                      <div className="mt-1 text-xs text-slate-400">
                        The system prompt is hidden here. This view shows just the caller and assistant exchange.
                      </div>
                    </div>
                  </div>

                  {transcriptSegments.length ? (
                    <div className="space-y-4">
                      {transcriptSegments.map((segment, index) => (
                        <div
                          key={`${segment.speaker}-${index}`}
                          className={segment.speaker === "assistant" ? "mr-10" : "ml-10 flex justify-end"}
                        >
                          <div
                            className={
                              segment.speaker === "assistant"
                                ? "max-w-[85%] rounded-[20px] rounded-tl-md border border-white/10 bg-white/6 px-4 py-3"
                                : "max-w-[85%] rounded-[20px] rounded-tr-md border border-cyan-400/30 bg-cyan-400/10 px-4 py-3"
                            }
                          >
                            <div
                              className={
                                segment.speaker === "assistant"
                                  ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300"
                                  : "text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300"
                              }
                            >
                              {segment.speaker === "assistant" ? "Assistant" : "Caller"}
                            </div>
                            <div className="mt-2 text-sm leading-7 text-slate-100">{segment.body}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : call.transcriptAvailable ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200">
                      {call.transcript}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                      No transcript was captured for this call.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
