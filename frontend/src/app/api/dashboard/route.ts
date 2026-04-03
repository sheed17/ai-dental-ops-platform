import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapDashboard } from "@/lib/server-mappers";

export async function GET() {
  try {
    const summary = await fetchBackend("/dashboard/summary");
    return NextResponse.json(mapDashboard(summary as never));
  } catch {
    const { dashboardSummary } = await import("@/lib/mock-data");
    return NextResponse.json(dashboardSummary);
  }
}
