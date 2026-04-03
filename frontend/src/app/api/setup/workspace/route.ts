import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend";
import { mapIntegration, mapOperationalEvent, mapPractice, mapRoutingRule, mapSetupChecklistItem, mapSetupPhoneNumber } from "@/lib/server-mappers";

export async function GET() {
  try {
    const practices = await fetchBackend("/practice-settings");
    const practice = (practices as Array<{ id: string }>)[0];
    if (!practice) {
      throw new Error("No practice available");
    }

    const [phoneNumbers, onboarding, integrations, rules, events] = await Promise.all([
      fetchBackend(`/practices/${practice.id}/phone-numbers`),
      fetchBackend(`/practices/${practice.id}/onboarding`),
      fetchBackend(`/practices/${practice.id}/integrations`),
      fetchBackend(`/practices/${practice.id}/routing-rules`),
      fetchBackend("/operations/feed"),
    ]);

    return NextResponse.json({
      practice: mapPractice(practice as never, phoneNumbers as never),
      checklist: (onboarding as { checklist: Array<unknown> }).checklist.map((item) => mapSetupChecklistItem(item as never)),
      integrations: (integrations as Array<unknown>).map((item) => mapIntegration(item as never)),
      routingRules: (rules as Array<unknown>).map((item) => mapRoutingRule(item as never)),
      phoneNumbers: (phoneNumbers as Array<unknown>).map((item) => mapSetupPhoneNumber(item as never)),
      recentActivity: (events as Array<unknown>).slice(0, 5).map((item) => mapOperationalEvent(item as never)),
    });
  } catch {
    const { practices, integrations, routingRules } = await import("@/lib/mock-data");
    const { events } = await import("@/lib/mock-data");
    return NextResponse.json({
      practice: practices[0],
      checklist: [],
      integrations,
      routingRules,
      phoneNumbers: [],
      recentActivity: events.slice(0, 5),
    });
  }
}
