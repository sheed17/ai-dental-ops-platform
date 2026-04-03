import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend";
import { mapCallback } from "@/lib/server-mappers";

export async function GET() {
  try {
    const [tasks, calls, practices] = await Promise.all([
      fetchBackend("/callback-tasks"),
      fetchBackend("/calls"),
      fetchBackend("/practice-settings"),
    ]);
    const practiceMap = new Map((practices as Array<{ id: string; practice_name: string }>).map((item) => [item.id, item.practice_name]));
    const taskPracticeMap = new Map<string, string>();
    for (const call of calls as Array<{ practice_id: string; callback_tasks: Array<{ id: string }> }>) {
      for (const task of call.callback_tasks) {
        taskPracticeMap.set(task.id, practiceMap.get(call.practice_id) || "Unknown practice");
      }
    }
    return NextResponse.json(
      (tasks as Array<{ id: string; practice_id?: string }>).map((task) =>
        mapCallback(task as never, taskPracticeMap.get(task.id) || practiceMap.get(task.practice_id || "") || "Unknown practice"),
      ),
    );
  } catch {
    const { callbacks } = await import("@/lib/mock-data");
    return NextResponse.json(callbacks);
  }
}
