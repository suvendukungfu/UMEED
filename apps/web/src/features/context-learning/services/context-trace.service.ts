import crypto from "crypto";
import { ContextTraceRecord } from "../types";

/**
 * In-Memory Context Trace Store for the UMEED Case Workspace Context Inspector.
 * Keeps an auditable sliding-window trace of all Meko agent retrievals, actions, and citations.
 */
class ContextTraceService {
  private traces: ContextTraceRecord[] = [];
  private readonly maxTraces = 500;

  public recordTrace(trace: Omit<ContextTraceRecord, "trace_id" | "timestamp">): ContextTraceRecord {
    const fullTrace: ContextTraceRecord = {
      ...trace,
      trace_id: `trc_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    };

    if (this.traces.length >= this.maxTraces) {
      this.traces.shift();
    }
    this.traces.push(fullTrace);
    return fullTrace;
  }

  public getTracesForCase(caseReference: string): ContextTraceRecord[] {
    return this.traces.filter((t) => t.case_reference === caseReference);
  }

  public getTracesForIncident(incidentReference: string): ContextTraceRecord[] {
    return this.traces.filter((t) => t.incident_reference === incidentReference);
  }

  public getAllTraces(limit = 50): ContextTraceRecord[] {
    return [...this.traces].reverse().slice(0, limit);
  }

  public clear(): void {
    this.traces.length = 0;
  }
}

export const contextTraceService = new ContextTraceService();

