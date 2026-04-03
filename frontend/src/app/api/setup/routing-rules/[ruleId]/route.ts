import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend";

export async function PUT(request: Request, context: { params: Promise<{ ruleId: string }> }) {
  try {
    const { ruleId } = await context.params;
    const body = await request.json();
    const practices = await fetchBackend("/practice-settings");
    const practice = (practices as Array<{ id: string }>)[0];
    if (!practice) {
      return NextResponse.json({ message: "No practice found" }, { status: 404 });
    }

    const response = await fetch(`${process.env.API_BASE_URL}/practices/${practice.id}/routing-rules/${ruleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}
