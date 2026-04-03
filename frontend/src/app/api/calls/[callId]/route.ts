import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapCall } from "@/lib/server-mappers";

export async function GET(_: Request, context: { params: Promise<{ callId: string }> }) {
  const { callId } = await context.params;
  try {
    const [call, practices] = await Promise.all([
      fetchBackend(`/calls/${callId}`),
      fetchBackend("/practice-settings"),
    ]);
    const practice = (practices as Array<{ id: string; practice_name: string }>).find(
      (item) => item.id === (call as { practice_id: string }).practice_id,
    );
    return NextResponse.json(mapCall(call as never, practice?.practice_name || "Unknown practice"));
  } catch {
    const { calls } = await import("@/lib/mock-data");
    const call = calls.find((item) => item.id === callId);
    if (!call) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return NextResponse.json(call);
  }
}
