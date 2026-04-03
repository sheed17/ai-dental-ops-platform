import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapIntegration } from "@/lib/server-mappers";

export async function GET() {
  try {
    const practices = await fetchBackend("/practice-settings");
    const practice = (practices as Array<{ id: string }>)[0];
    if (!practice) {
      throw new Error("No practice available");
    }
    const settings = await fetchBackend(`/practices/${practice.id}/integrations`);
    return NextResponse.json((settings as Array<unknown>).map((setting) => mapIntegration(setting as never)));
  } catch {
    const { integrations } = await import("@/lib/mock-data");
    return NextResponse.json(integrations);
  }
}
