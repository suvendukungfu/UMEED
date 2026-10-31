import { NextRequest, NextResponse } from "next/server";
import { KnowledgeCurator } from "@/features/context-learning/services/knowledge-curator";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * POST /api/context-learning/promote
 * Promotes private memory to shared knowledge via Meko memory_promote.
 * Requires explicit coordinator confirmation notes.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = verifyCoordinatorAuth(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Unauthorized: Coordinator privileges required to promote memory.", reason: auth.reason },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { memory_id, coordinator_id, confirmation_notes } = body;

    if (!memory_id || typeof memory_id !== "string") {
      return NextResponse.json({ error: "Missing or invalid memory_id" }, { status: 400 });
    }
    if (!coordinator_id || typeof coordinator_id !== "string") {
      return NextResponse.json({ error: "Missing or invalid coordinator_id" }, { status: 400 });
    }
    if (!confirmation_notes || typeof confirmation_notes !== "string" || confirmation_notes.trim().length < 10) {
      return NextResponse.json(
        { error: "Promotion requires explicit confirmation notes (minimum 10 characters) justifying shared visibility." },
        { status: 400 }
      );
    }

    const curator = new KnowledgeCurator();
    const result = await curator.confirmAndPromoteLesson(
      memory_id,
      coordinator_id,
      confirmation_notes
    );

    logger.info("Memory promoted to shared knowledge", "PROMOTION_API", {
      memory_id,
      coordinator_id,
    });

    return NextResponse.json(
      {
        success: true,
        status: result.status,
        promoted_ids: result.promoted_ids,
        message: "Memory successfully promoted to shared knowledge via Meko memory_promote.",
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error("Failed to promote memory", err, "PROMOTION_API");
    return NextResponse.json(
      { error: "Failed to promote memory", details: (err as Error)?.message },
      { status: 500 }
    );
  }
}
