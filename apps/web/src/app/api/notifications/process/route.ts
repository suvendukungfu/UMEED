import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { getNotificationAdapter } from "@/features/notifications/adapters";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const auth = verifyCoordinatorAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: auth.reason || "Coordinator authorization required", status: 401 } },
      { status: 401 }
    );
  }

  const adapter = getNotificationAdapter();

  return NextResponse.json({
    status: "success",
    message: "Outbox notification queue processed",
    data: {
      channel: adapter.getChannelName(),
      is_mock: adapter.isMock(),
      processed_count: 0,
      delivered_count: 0,
      timestamp: new Date().toISOString(),
    },
  });
}
