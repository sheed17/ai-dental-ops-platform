import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapOperationalEvent } from "@/lib/server-mappers";

export async function GET() {
  try {
    const events = await fetchBackend("/events");
    return NextResponse.json((events as Array<unknown>).map((event) => mapOperationalEvent(event as never)));
  } catch {
    const { events } = await import("@/lib/mock-data");
    return NextResponse.json(events);
  }
}
