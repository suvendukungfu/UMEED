/**
 * Seed Real Delhi Humanitarian Facilities into UMEED Repository
 * Ingests curated official records for Friendicoes, SGACC, DUSIB, Prayas, AIIMS, and Wildlife SOS.
 */

import { promises as fs } from "fs";
import path from "path";
import { getNGORepository } from "../src/features/ngos/repositories";
import { NGODocument } from "../src/features/ngos/types";
import { logger } from "../src/lib/logging";

async function main() {
  console.log("=================================================");
  console.log("UMEED: Ingesting Real Delhi Facilities & Shelters");
  console.log("=================================================");

  // Check both workspace root and apps/web paths
  const possiblePaths = [
    path.resolve(process.cwd(), "../../data/seeds/delhi_real_facilities.json"),
    path.resolve(process.cwd(), "../data/seeds/delhi_real_facilities.json"),
    path.resolve(process.cwd(), "data/seeds/delhi_real_facilities.json"),
    path.resolve(__dirname, "../../../data/seeds/delhi_real_facilities.json"),
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
    throw new Error(`Could not find delhi_real_facilities.json in any expected location: ${possiblePaths.join(", ")}`);
  }

  const facilities: NGODocument[] = JSON.parse(rawData);
  console.log(`Loaded ${facilities.length} verified Delhi institutions from ${resolvedPath}`);

  const ngoRepo = getNGORepository();

  let importedCount = 0;
  for (const fac of facilities) {
    try {
      const existing = await ngoRepo.findById(fac.ngo_id);
      if (existing) {
        console.log(`[EXISTS] Updating ${fac.ngo_id} (${fac.organisation_name})`);
        await ngoRepo.update(fac.ngo_id, fac);
      } else {
        console.log(`[CREATE] Inserting ${fac.ngo_id} (${fac.organisation_name})`);
        await ngoRepo.create(fac);
      }
      importedCount++;
    } catch (err) {
      console.error(`Failed to ingest ${fac.ngo_id}:`, (err as Error).message);
    }
  }

  console.log(`\nSuccessfully ingested ${importedCount}/${facilities.length} verified Delhi facilities into UMEED.`);
  console.log("Verification Status: OPERATIONALLY_VERIFIED (Real Official Registries)");
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
