import { NextResponse } from "next/server";
import { messages } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(messages);
}
