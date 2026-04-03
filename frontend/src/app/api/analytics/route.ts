import { NextResponse } from "next/server";
import { analytics } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(analytics);
}
