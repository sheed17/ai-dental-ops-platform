import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend";
import { mapIncident } from "@/lib/server-mappers";

export async function POST(
  _: Request,
  context: { params: Promise<{ incidentId: string }> },
) {
  const { incidentId } = await context.params;

  try {
    const [resolvedIncident, calls, practices] = await Promise.all([
      fetch(`${process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/incidents/${incidentId}/resolve`, {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Backend request failed: ${response.status}`);
        }
        return response.json();
      }),
      fetchBackend("/calls"),
      fetchBackend("/practice-settings"),
    ]);

    const practiceMap = new Map(
      (practices as Array<{ id: string; practice_name: string }>).map((item) => [item.id, item.practice_name]),
    );
    const incidentPracticeMap = new Map<string, string>();
    for (const call of calls as Array<{ practice_id: string; incidents: Array<{ id: string }> }>) {
      for (const incident of call.incidents) {
        incidentPracticeMap.set(incident.id, practiceMap.get(call.practice_id) || "Unknown practice");
      }
    }

    return NextResponse.json(
      mapIncident(
        resolvedIncident as {
          id: string;
          incident_type: string;
          severity: string;
          status: string;
          summary: string;
          details?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        },
        incidentPracticeMap.get((resolvedIncident as { id: string }).id) || "Unknown practice",
      ),
    );
  } catch {
    return NextResponse.json({ message: "Unable to resolve incident." }, { status: 500 });
  }
}
