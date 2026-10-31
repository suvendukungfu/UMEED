import { getNGORepository } from "../apps/web/src/features/ngos/repositories";
import { getIncidentRepository } from "../apps/web/src/features/incidents/repositories";
import { seedDemoNGOs } from "../apps/web/src/features/ngos/services/seed.service";
import { DEMO_INCIDENT_CONTROL, DEMO_INCIDENT_TREATMENT } from "../apps/web/src/fixtures/demo";

async function main() {
  console.log("=== UMEED HackCBS 9.0 Demo Seeder ===");
  console.log("Target Mode: Isolated Synthetic Demonstration Fixtures Only");

  const ngoRepo = getNGORepository();
  const seededNgos = await seedDemoNGOs(ngoRepo);
  console.log(`[NGO Registry] Seeded ${seededNgos} synthetic NGOs (total active: 8).`);

  const incidentRepo = getIncidentRepository();
  const existingControl = await incidentRepo.findByPublicReference(DEMO_INCIDENT_CONTROL.public_reference);
  if (!existingControl) {
    await incidentRepo.create(DEMO_INCIDENT_CONTROL);
    console.log(`[Incidents] Seeded Control incident: ${DEMO_INCIDENT_CONTROL.public_reference}`);
  } else {
    console.log(`[Incidents] Control incident already present: ${DEMO_INCIDENT_CONTROL.public_reference}`);
  }

  const existingTreatment = await incidentRepo.findByPublicReference(DEMO_INCIDENT_TREATMENT.public_reference);
  if (!existingTreatment) {
    await incidentRepo.create(DEMO_INCIDENT_TREATMENT);
    console.log(`[Incidents] Seeded Treatment incident: ${DEMO_INCIDENT_TREATMENT.public_reference}`);
  } else {
    console.log(`[Incidents] Treatment incident already present: ${DEMO_INCIDENT_TREATMENT.public_reference}`);
  }

  console.log("=== Demo Seeding Complete [DEMO_ONLY] ===");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
