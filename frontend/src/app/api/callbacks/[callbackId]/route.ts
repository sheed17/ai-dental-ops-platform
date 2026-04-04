import { NextRequest, NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend";
import { mapCallback } from "@/lib/server-mappers";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ callbackId: string }> },
) {
  const { callbackId } = await context.params;
  const payload = await request.json();

  try {
    const [updatedTask, practices, calls] = await Promise.all([
      fetch(`${process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/callback-tasks/${callbackId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Backend request failed: ${response.status}`);
        }
        return response.json();
      }),
      fetchBackend("/practice-settings"),
      fetchBackend("/calls"),
    ]);

    const practiceMap = new Map(
      (practices as Array<{ id: string; practice_name: string }>).map((item) => [item.id, item.practice_name]),
    );
    const taskPracticeMap = new Map<string, string>();
    for (const call of calls as Array<{ practice_id: string; callback_tasks: Array<{ id: string }> }>) {
      for (const task of call.callback_tasks) {
        taskPracticeMap.set(task.id, practiceMap.get(call.practice_id) || "Unknown practice");
      }
    }

    return NextResponse.json(
      mapCallback(
        updatedTask as {
          id: string;
          callback_name: string | null;
          callback_phone?: string | null;
          reason: string;
          status: string;
          priority: string;
          created_at: string;
          assigned_to?: string | null;
          internal_notes?: string | null;
          outcome?: string | null;
          due_note?: string | null;
          practice_id?: string;
        },
        taskPracticeMap.get((updatedTask as { id: string }).id) ||
          practiceMap.get((updatedTask as { practice_id?: string }).practice_id || "") ||
          "Unknown practice",
      ),
    );
  } catch {
    return NextResponse.json({ message: "Unable to update callback task." }, { status: 500 });
  }
}
