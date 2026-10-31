import { runA1Experiment } from '../../../features/context-learning/experiments/a1-runner';

async function main() {
  console.log('Running A1 experiment with useLiveMekoIfAvailable: true...');
  const res = await runA1Experiment({ useLiveMekoIfAvailable: true });
  console.log('A1 Experiment Result:');
  console.log('Execution Mode:', res.executionMode);
  console.log('Control Top Org:', res.controlRun.topCandidateName, 'Score:', res.controlRun.topCandidateScore);
  console.log('Treatment Top Org:', res.treatmentRun.topCandidateName, 'Score:', res.treatmentRun.topCandidateScore);
  console.log('Treatment Recalled Citations:', res.treatmentRun.recalledMemoryCitations.length);
  console.log('Variance Detected:', res.varianceAnalysis.differenceDetected);
  console.log('Variance Requirements:', res.varianceAnalysis.requirementsDifference);
  console.log('Dual Dispatch Planned:', res.varianceAnalysis.dualProviderPlan.isDualDispatchPlanned);
  console.log('Transit Provider:', res.varianceAnalysis.dualProviderPlan.transitProvider.providerName, `[${res.varianceAnalysis.dualProviderPlan.transitProvider.providerId}] Score:`, res.varianceAnalysis.dualProviderPlan.transitProvider.score);
  console.log('Surgical Provider:', res.varianceAnalysis.dualProviderPlan.surgicalProvider?.providerName, `[${res.varianceAnalysis.dualProviderPlan.surgicalProvider?.providerId}] Score:`, res.varianceAnalysis.dualProviderPlan.surgicalProvider?.score);
  console.log('Authoritative Verification:', res.varianceAnalysis.dualProviderPlan.authoritativeVerification);
  console.log('Integrity Verified:', res.varianceAnalysis.integrityVerified);
}

main().catch(console.error);
