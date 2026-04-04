import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend";
import { mapAssistantContext, mapIntegration, mapOperationalEvent, mapPractice, mapRoutingRule, mapSetupChecklistItem, mapSetupPhoneNumber } from "@/lib/server-mappers";

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    return await fetchBackend<T>(path);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPracticeId = searchParams.get("practiceId");
    const currentTime = searchParams.get("currentTime");
    const practices = await fetchBackend("/practice-settings");
    const typedPractices = practices as Array<{ id: string; practice_name: string }>;
    const practice = typedPractices.find((item) => item.id === requestedPracticeId) || typedPractices[0];
    if (!practice) {
      throw new Error("No practice available");
    }

    const [phoneNumbers, onboarding, integrations, rules, events, assistantContext] = await Promise.all([
      fetchBackend(`/practices/${practice.id}/phone-numbers`),
      safeFetch(`/practices/${practice.id}/onboarding`),
      safeFetch(`/practices/${practice.id}/integrations`),
      safeFetch(`/practices/${practice.id}/routing-rules`),
      safeFetch("/operations/feed"),
      safeFetch(
        `/practice-settings/${practice.id}/assistant-context${currentTime ? `?current_time=${encodeURIComponent(currentTime)}` : ""}`,
      ),
    ]);

    const mappedPhoneNumbers = (phoneNumbers as Array<unknown>).map((item) => mapSetupPhoneNumber(item as never));
    const mappedPractice = mapPractice(practice as never, phoneNumbers as never);
    const fallbackAssistantContext = {
      practice_id: practice.id,
      practice_name: practice.practice_name,
      routing_number: mappedPhoneNumbers.find((item) => item.isPrimary)?.phoneNumber || mappedPhoneNumbers[0]?.phoneNumber || null,
      routing_mode: mappedPhoneNumbers.find((item) => item.isPrimary)?.routingMode || mappedPhoneNumbers[0]?.routingMode || null,
      routing_active: true,
      routing_reason: "Live preview route is not available on this backend yet, but the saved number and practice context are loaded.",
      variable_values: {
        practiceName: mappedPractice.name,
        officeHours: mappedPractice.hours,
        address: mappedPractice.address,
        website: mappedPractice.website,
        emergencyNumber: mappedPractice.emergencyNumber,
        servicesSummary: mappedPractice.services.join(", "),
        insuranceSummary: mappedPractice.insuranceSummary,
        sameDayEmergencyPolicy: mappedPractice.sameDayEmergencyPolicy,
        languages: mappedPractice.languages,
        schedulingMode: mappedPractice.schedulingMode,
        insuranceMode: mappedPractice.insuranceMode,
      },
    };

    return NextResponse.json({
      practice: mappedPractice,
      assistantContext: mapAssistantContext((assistantContext || fallbackAssistantContext) as never),
      checklist: ((onboarding as { checklist: Array<unknown> } | null)?.checklist || []).map((item) => mapSetupChecklistItem(item as never)),
      integrations: ((integrations as Array<unknown> | null) || []).map((item) => mapIntegration(item as never)),
      routingRules: ((rules as Array<unknown> | null) || []).map((item) => mapRoutingRule(item as never)),
      phoneNumbers: mappedPhoneNumbers,
      recentActivity: ((events as Array<unknown> | null) || []).slice(0, 5).map((item) => mapOperationalEvent(item as never)),
    });
  } catch {
    const { practices, integrations, routingRules } = await import("@/lib/mock-data");
    const { events } = await import("@/lib/mock-data");
    return NextResponse.json({
      practice: practices[0],
      assistantContext: {
        practiceId: practices[0].id,
        practiceName: practices[0].name,
        routingNumber: practices[0].phoneNumbers[0] || null,
        routingMode: "after_hours_only",
        routingActive: true,
        routingReason: "Preview unavailable while using fallback data.",
        variableValues: [],
      },
      checklist: [],
      integrations,
      routingRules,
      phoneNumbers: [],
      recentActivity: events.slice(0, 5),
    });
  }
}
