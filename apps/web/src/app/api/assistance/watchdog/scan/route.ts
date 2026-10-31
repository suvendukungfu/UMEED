import { NextRequest, NextResponse } from "next/server";
import { NoColdCaseWatchdog } from "@/features/assistance-engine/services/watchdog.service";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = verifyCoordinatorAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: auth.reason || "Coordinator authorization required",
          status: 401,
        },
      },
      { status: 401 }
    );
  }

  const watchdog = new NoColdCaseWatchdog();
  const summary = await watchdog.runWatchdogCycle();

  return NextResponse.json({
    status: "success",
    message: `Watchdog scan completed: ${summary.totalIssuesResolved} issues remediated`,
    data: summary,
  });
}

