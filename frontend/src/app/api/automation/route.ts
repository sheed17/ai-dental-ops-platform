import { NextResponse } from "next/server";
import { automations } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(automations);
}
