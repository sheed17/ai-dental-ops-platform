import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapPractice } from "@/lib/server-mappers";

export async function GET() {
  try {
    const practices = await fetchBackend("/practice-settings");
    const mapped = await Promise.all(
      (practices as Array<{ id: string }>).map(async (practice) => {
        const phoneNumbers = await fetchBackend(`/practices/${practice.id}/phone-numbers`);
        return mapPractice(practice as never, phoneNumbers as never);
      }),
    );
    return NextResponse.json(mapped);
  } catch {
    const { practices } = await import("@/lib/mock-data");
    return NextResponse.json(practices);
  }
}
