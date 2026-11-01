import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { runA1Experiment } from "@/features/context-learning/experiments/a1-runner";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * POST /api/context-learning/experiment-a1
 * Executes the A1 Controlled Meko ON/OFF Experiment.
 * Protected by coordinator authorization.
 */
export async function POST(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Unauthorized: Coordinator authorization required to run A1 experiment." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const useLive = Boolean(body.useLiveMekoIfAvailable ?? true);

    const result = await runA1Experiment({ useLiveMekoIfAvailable: useLive });

    logger.info("A1 Meko ON/OFF Experiment executed successfully", "EXPERIMENT_A1", {
      experimentId: result.experimentId,
      executionMode: result.executionMode,
      differenceDetected: result.varianceAnalysis.differenceDetected,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    logger.error("Failed to execute A1 experiment", err, "EXPERIMENT_A1");
    return NextResponse.json(
      { error: "Internal server error executing A1 experiment", details: (err as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/context-learning/experiment-a1
 * Returns current experiment specification and latest result status.
 */
export async function GET(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const auth = verifyCoordinatorAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: "Unauthorized: Coordinator authorization required." },
      { status: 401 }
    );
  }

  // Run with safe evaluation
  const result = await runA1Experiment({ useLiveMekoIfAvailable: false });
  return NextResponse.json(result, { status: 200 });
}
