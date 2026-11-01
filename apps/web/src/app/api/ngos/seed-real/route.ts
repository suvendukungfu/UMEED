import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getNGORepository } from "@/features/ngos/repositories";
import { NGODocument } from "@/features/ngos/types";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { logger } from "@/lib/logging";

export async function POST(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  // 1. Strict Server-Side Authorization: Must be an authenticated Platform Admin or Lead Coordinator
  const auth = verifyCoordinatorAuth(request);
  if (!auth.authorized) {
    logger.warn("Unauthorized seed ingestion attempt rejected", "SEED_SECURITY");
    return NextResponse.json(
      { error: "Forbidden: Administrative credentials required to execute registry ingestion" },
      { status: 403 }
    );
  }

  try {
    const possiblePaths = [
      path.resolve(process.cwd(), "data/seeds/delhi_real_facilities.json"),
      path.resolve(process.cwd(), "../data/seeds/delhi_real_facilities.json"),
      path.resolve(process.cwd(), "../../data/seeds/delhi_real_facilities.json"),
      path.resolve(__dirname, "../../../../../data/seeds/delhi_real_facilities.json"),
    ];

    let rawData = "";
    let resolvedPath = "";

    for (const p of possiblePaths) {
      try {
        rawData = await fs.readFile(p, "utf-8");
        resolvedPath = p;
        break;
      } catch {
        // Continue search
      }
    }

    if (!rawData) {
      return NextResponse.json(
        { error: "Seed source file delhi_real_facilities.json not found" },
        { status: 500 }
      );
    }

    const facilities: NGODocument[] = JSON.parse(rawData);
    const repo = getNGORepository();

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const fac of facilities) {
      const existing = await repo.findById(fac.ngo_id);
      if (existing) {
        // Enforce provenance & prevent auto-partner onboarding
        await repo.update(fac.ngo_id, {
          ...fac,
          verification_status: "SOURCE_VERIFIED" as any,
          is_demo: false,
        });
        updatedCount++;
      } else {
        await repo.create({
          ...fac,
          verification_status: "SOURCE_VERIFIED" as any,
          is_demo: false,
        });
        createdCount++;
      }
    }

    logger.info("Admin-authorized facility ingestion job completed", "ADMIN_SEED_JOB", {
      adminUserId: auth.coordinatorId || "admin",
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: facilities.length,
      provenanceFile: resolvedPath,
    });

    return NextResponse.json({
      status: "success",
      message: `Controlled Administrative Ingestion Complete: ${facilities.length} verified records processed`,
      summary: {
        createdCount,
        updatedCount,
        skippedCount,
        total: facilities.length,
        statusAssigned: "SOURCE_VERIFIED",
        partnerOnboarded: false,
        notice: "Records verified from official sources; partner onboarding requires explicit bilateral onboarding."
      },
    });
  } catch (err) {
    logger.error("Admin seed ingestion failed", err as Error, "ADMIN_SEED_JOB");
    return NextResponse.json(
      { error: "Administrative ingestion operation failed", details: (err as Error).message },
      { status: 500 }
    );
  }
}
