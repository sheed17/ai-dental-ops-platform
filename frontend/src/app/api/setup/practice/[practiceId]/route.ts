import { NextResponse } from "next/server";

export async function PATCH(request: Request, context: { params: Promise<{ practiceId: string }> }) {
  try {
    const { practiceId } = await context.params;
    const body = await request.json();

    const response = await fetch(`${process.env.API_BASE_URL}/practice-settings/${practiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}
