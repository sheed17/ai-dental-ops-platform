import { MessageThread } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function ConversationView({ thread }: { thread: MessageThread }) {
  return (
    <Card className="p-5">
      <div className="border-b border-slate-200 pb-4">
        <div className="text-lg font-semibold text-slate-950">{thread.patient}</div>
        <div className="text-sm text-slate-500">{thread.practice}</div>
      </div>
      <div className="mt-4 space-y-3">
        {thread.messages.map((message) => (
          <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.sender === "ai" ? "bg-slate-100 text-slate-900" : "ml-auto bg-slate-950 text-white"}`}>
            <div>{message.body}</div>
            <div className={`mt-2 text-xs ${message.sender === "ai" ? "text-slate-500" : "text-slate-300"}`}>{message.timestamp}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
