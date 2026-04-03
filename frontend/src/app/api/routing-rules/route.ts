import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapRoutingRule } from "@/lib/server-mappers";

export async function GET() {
  try {
    const practices = await fetchBackend("/practice-settings");
    const practice = (practices as Array<{ id: string }>)[0];
    if (!practice) {
      throw new Error("No practice available");
    }
    const rules = await fetchBackend(`/practices/${practice.id}/routing-rules`);
    return NextResponse.json((rules as Array<unknown>).map((rule) => mapRoutingRule(rule as never)));
  } catch {
    const { routingRules } = await import("@/lib/mock-data");
    return NextResponse.json(routingRules);
  }
}
