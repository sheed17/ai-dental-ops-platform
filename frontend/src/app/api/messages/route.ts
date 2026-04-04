import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapCommunicationsToThreads } from "@/lib/server-mappers";
import { messages } from "@/lib/mock-data";

export async function GET() {
  try {
    const [communications, practices] = await Promise.all([
      fetchBackend("/communications"),
      fetchBackend("/practice-settings"),
    ]);
    const practiceName =
      (practices as Array<{ practice_name: string }>)[0]?.practice_name || "Unknown practice";
    return NextResponse.json(
      mapCommunicationsToThreads(
        communications as Array<{
          id: string;
          direction: string;
          channel: string;
          counterpart: string | null;
          body: string | null;
          created_at: string;
        }>,
        practiceName,
      ),
    );
  } catch {
    return NextResponse.json(messages);
  }
}
