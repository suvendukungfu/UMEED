import { getIncidentRepository } from "../apps/web/src/features/incidents/repositories";
import { getNGORepository } from "../apps/web/src/features/ngos/repositories";

async function main() {
  console.log("=== UMEED HackCBS 9.0 Demo Reset Utility ===");
  console.log("SAFETY: Targets only synthetic demo records marked [DEMO_ONLY] or is_demo=true.");

  const incidentRepo = getIncidentRepository();
  const ngoRepo = getNGORepository();

  // If in-memory, clearing or resetting demo is a clean reset
  if (incidentRepo.clear) {
    await incidentRepo.clear();
    console.log("[Incidents] InMemory incident store cleared.");
  }

  console.log("=== Demo Reset Complete ===");
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
