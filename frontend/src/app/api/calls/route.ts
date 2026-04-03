import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapCall } from "@/lib/server-mappers";

export async function GET() {
  try {
    const [calls, practices] = await Promise.all([
      fetchBackend("/calls"),
      fetchBackend("/practice-settings"),
    ]);
    const practiceMap = new Map((practices as Array<{ id: string; practice_name: string }>).map((item) => [item.id, item.practice_name]));
    return NextResponse.json((calls as Array<{ practice_id: string }>).map((call) => mapCall(call as never, practiceMap.get(call.practice_id) || "Unknown practice")));
  } catch {
    const { calls } = await import("@/lib/mock-data");
    return NextResponse.json(calls);
  }
}
