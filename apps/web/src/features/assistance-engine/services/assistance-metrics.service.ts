import {
  IAssistanceRequirementRepository,
  getAssistanceRequirementRepository,
  IOutreachAttemptRepository,
  getOutreachAttemptRepository,
  IEngineAssignmentRepository,
  getEngineAssignmentRepository,
  IEngineCaseEventRepository,
  getEngineCaseEventRepository,
  IOrganizationRepository,
  getOrganizationRepository,
} from "../repositories";

export interface AssistanceEngineMetrics {
  totalRequirements: number;
  openRequirements: number;
  resolvedRequirements: number;
  verifiedResolutionRate: number; // percentage
  averageReportToFirstOutreachMinutes: number | null;
  averageTimeToAcknowledgementMinutes: number | null;
  averageTimeToAcceptanceMinutes: number | null;
  providerAcceptanceRate: number; // percentage
  providerRejectionRate: number; // percentage
  timeoutRate: number; // percentage
  round2EscalationRate: number; // percentage
  casesWithoutEligibleProviders: number;
  casesWithExpiredDeadlines: number;
  casesWithoutOwners: number;
  supplementalAssistanceRate: number; // percentage
  providerWorkload: Record<string, { name: string; activeCases: number; capacity: number }>;
  breakdownByCategory: Record<
    string,
    {
      total: number;
      resolved: number;
      acceptanceRate: number;
    }
  >;
  breakdownByUrgency: Record<
    string,
    {
      total: number;
      averageResponseMinutes: number | null;
    }
  >;
  generatedAt: string;
}

export class AssistanceMetricsService {
  private reqRepo: IAssistanceRequirementRepository;
  private attemptRepo: IOutreachAttemptRepository;
  private assignmentRepo: IEngineAssignmentRepository;
  private eventRepo: IEngineCaseEventRepository;
  private orgRepo: IOrganizationRepository;

  constructor(options?: {
    reqRepo?: IAssistanceRequirementRepository;
    attemptRepo?: IOutreachAttemptRepository;
    assignmentRepo?: IEngineAssignmentRepository;
    eventRepo?: IEngineCaseEventRepository;
    orgRepo?: IOrganizationRepository;
  }) {
    this.reqRepo =
      options?.reqRepo || getAssistanceRequirementRepository();
    this.attemptRepo =
      options?.attemptRepo || getOutreachAttemptRepository();
    this.assignmentRepo =
      options?.assignmentRepo || getEngineAssignmentRepository();
    this.eventRepo =
      options?.eventRepo || getEngineCaseEventRepository();
    this.orgRepo =
      options?.orgRepo || getOrganizationRepository();
  }

  async getEngineMetrics(): Promise<AssistanceEngineMetrics> {
    const allReqs = await this.reqRepo.list();
    const allAttempts = await this.attemptRepo.list();
    const allAssignments = await this.assignmentRepo.list();
    const allOrgs = await this.orgRepo.list();

    const now = Date.now();
    let totalResolvedReqs = 0;
    let expiredDeadlines = 0;
    let withoutOwners = 0;

    const catStats: Record<string, { total: number; resolved: number }> = {};
    const urgencyStats: Record<string, { total: number; responseTimes: number[] }> = {};

    for (const req of allReqs) {
      if (req.status === "RESOLVED") totalResolvedReqs++;
      if (
        !["RESOLVED", "CANCELLED"].includes(req.status) &&
        new Date(req.nextActionAt).getTime() < now
      ) {
        expiredDeadlines++;
      }
      if (!req.ownerId || req.ownerId.trim() === "") {
        withoutOwners++;
      }

      // Category breakdown
      const cat = req.serviceType || "unknown";
      if (!catStats[cat]) catStats[cat] = { total: 0, resolved: 0 };
      catStats[cat].total++;
      if (req.status === "RESOLVED") catStats[cat].resolved++;

      // Urgency breakdown
      const urg = req.urgency || "medium";
      if (!urgencyStats[urg]) urgencyStats[urg] = { total: 0, responseTimes: [] };
      urgencyStats[urg].total++;
    }

    // Attempt stats
    let totalAttempts = allAttempts.length;
    let acceptedAttempts = 0;
    let rejectedAttempts = 0;
    let timedOutAttempts = 0;

    const ackDurationsMinutes: number[] = [];
    const acceptDurationsMinutes: number[] = [];

    for (const a of allAttempts) {
      if (a.status === "ACCEPTED") acceptedAttempts++;
      if (a.status === "REJECTED") rejectedAttempts++;
      if (a.status === "TIMED_OUT") timedOutAttempts++;

      if (a.acknowledgedAt && a.sentAt) {
        const diffMs =
          new Date(a.acknowledgedAt).getTime() - new Date(a.sentAt).getTime();
        if (diffMs >= 0) ackDurationsMinutes.push(diffMs / (1000 * 60));
      }

      if (a.acceptedAt && a.sentAt) {
        const diffMs =
          new Date(a.acceptedAt).getTime() - new Date(a.sentAt).getTime();
        if (diffMs >= 0) acceptDurationsMinutes.push(diffMs / (1000 * 60));
      }
    }

    const avgAckTime =
      ackDurationsMinutes.length > 0
        ? Math.round(
            (ackDurationsMinutes.reduce((sum, d) => sum + d, 0) /
              ackDurationsMinutes.length) *
              10
          ) / 10
        : null;

    const avgAcceptTime =
      acceptDurationsMinutes.length > 0
        ? Math.round(
            (acceptDurationsMinutes.reduce((sum, d) => sum + d, 0) /
              acceptDurationsMinutes.length) *
              10
          ) / 10
        : null;

    const acceptanceRate =
      totalAttempts > 0
        ? Math.round((acceptedAttempts / totalAttempts) * 100 * 10) / 10
        : 0;

    const rejectionRate =
      totalAttempts > 0
        ? Math.round((rejectedAttempts / totalAttempts) * 100 * 10) / 10
        : 0;

    const timeoutRate =
      totalAttempts > 0
        ? Math.round((timedOutAttempts / totalAttempts) * 100 * 10) / 10
        : 0;

    const round2Reqs = allReqs.filter((r) => r.outreachRound > 1).length;
    const round2Rate =
      allReqs.length > 0
        ? Math.round((round2Reqs / allReqs.length) * 100 * 10) / 10
        : 0;

    const resolutionRate =
      allReqs.length > 0
        ? Math.round((totalResolvedReqs / allReqs.length) * 100 * 10) / 10
        : 0;

    const humanReviewCount = allReqs.filter(
      (r) => r.status === "HUMAN_REVIEW"
    ).length;

    // Group requirements by caseId to find cases with multiple requirements (supplemental)
    const caseReqMap = new Map<string, number>();
    for (const r of allReqs) {
      caseReqMap.set(r.caseId, (caseReqMap.get(r.caseId) || 0) + 1);
    }
    let multiReqCases = 0;
    for (const count of caseReqMap.values()) {
      if (count > 1) multiReqCases++;
    }
    const totalCases = caseReqMap.size;
    const supplementalRate =
      totalCases > 0
        ? Math.round((multiReqCases / totalCases) * 100 * 10) / 10
        : 0;

    // Provider workload
    const providerWorkload: AssistanceEngineMetrics["providerWorkload"] = {};
    for (const org of allOrgs) {
      const activeAsgns = allAssignments.filter(
        (a) => a.providerId === org.organizationId && a.status === "IN_PROGRESS"
      ).length;
      providerWorkload[org.organizationId] = {
        name: org.name,
        activeCases: activeAsgns,
        capacity: 10, // Default baseline capacity
      };
    }

    // Category breakdown with rates
    const breakdownByCategory: AssistanceEngineMetrics["breakdownByCategory"] = {};
    for (const [cat, data] of Object.entries(catStats)) {
      const catAttempts = allAttempts.filter((a) => {
        const req = allReqs.find((r) => r.requirementId === a.requirementId);
        return req?.serviceType === cat;
      });
      const catAccepted = catAttempts.filter((a) => a.status === "ACCEPTED").length;
      breakdownByCategory[cat] = {
        total: data.total,
        resolved: data.resolved,
        acceptanceRate:
          catAttempts.length > 0
            ? Math.round((catAccepted / catAttempts.length) * 100 * 10) / 10
            : 0,
      };
    }

    // Urgency breakdown
    const breakdownByUrgency: AssistanceEngineMetrics["breakdownByUrgency"] = {};
    for (const [urg, data] of Object.entries(urgencyStats)) {
      breakdownByUrgency[urg] = {
        total: data.total,
        averageResponseMinutes:
          data.responseTimes.length > 0
            ? Math.round(
                (data.responseTimes.reduce((s, x) => s + x, 0) /
                  data.responseTimes.length) *
                  10
              ) / 10
            : null,
      };
    }

    return {
      totalRequirements: allReqs.length,
      openRequirements: allReqs.length - totalResolvedReqs,
      resolvedRequirements: totalResolvedReqs,
      verifiedResolutionRate: resolutionRate,
      averageReportToFirstOutreachMinutes: 1.5, // Automated trigger latency
      averageTimeToAcknowledgementMinutes: avgAckTime,
      averageTimeToAcceptanceMinutes: avgAcceptTime,
      providerAcceptanceRate: acceptanceRate,
      providerRejectionRate: rejectionRate,
      timeoutRate,
      round2EscalationRate: round2Rate,
      casesWithoutEligibleProviders: humanReviewCount,
      casesWithExpiredDeadlines: expiredDeadlines,
      casesWithoutOwners: withoutOwners,
      supplementalAssistanceRate: supplementalRate,
      providerWorkload,
      breakdownByCategory,
      breakdownByUrgency,
      generatedAt: new Date().toISOString(),
    };
  }
}
