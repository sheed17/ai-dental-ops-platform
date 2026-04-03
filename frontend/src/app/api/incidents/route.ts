import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapIncident } from "@/lib/server-mappers";

export async function GET() {
  try {
    const [incidents, calls, practices] = await Promise.all([
      fetchBackend("/incidents"),
      fetchBackend("/calls"),
      fetchBackend("/practice-settings"),
    ]);
    const practiceMap = new Map((practices as Array<{ id: string; practice_name: string }>).map((item) => [item.id, item.practice_name]));
    const incidentPracticeMap = new Map<string, string>();
    for (const call of calls as Array<{ practice_id: string; incidents: Array<{ id: string }> }>) {
      for (const incident of call.incidents) {
        incidentPracticeMap.set(incident.id, practiceMap.get(call.practice_id) || "Unknown practice");
      }
    }
    return NextResponse.json(
      (incidents as Array<{ id: string }>).map((incident) => mapIncident(incident as never, incidentPracticeMap.get(incident.id) || "Unknown practice")),
    );
  } catch {
    const { incidents } = await import("@/lib/mock-data");
    return NextResponse.json(incidents);
  }
}
