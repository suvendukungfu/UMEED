import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { contextTraceService } from "@/features/context-learning/services/context-trace.service";
import { MekoHttpClient } from "@/lib/ai/meko/client";
import { verifyCoordinatorAuth } from "@/lib/security/authorization";
import { validateOperationalMemoryText } from "@/lib/ai/meko/schemas";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * GET /api/context-learning/memories
 * Returns context learning traces and Meko connection status for the Context Inspector.
 */
export async function GET(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const { searchParams } = new URL(request.url);
    const caseRef = searchParams.get("caseReference");
    const incidentRef = searchParams.get("incidentReference");

    const client = new MekoHttpClient();
    const isConfigured = client.isConfigured();

    let traces = [];
    if (caseRef) {
      traces = contextTraceService.getTracesForCase(caseRef);
    } else if (incidentRef) {
      traces = contextTraceService.getTracesForIncident(incidentRef);
    } else {
      traces = contextTraceService.getAllTraces(50);
    }

    return NextResponse.json(
      {
        meko_connection: {
          status: isConfigured ? "CONNECTED" : "UNCONFIGURED",
          endpoint: "https://mcp.mekodata.ai/mcp",
          active_product_datapack: client.productDatapackId || "unconfigured",
          protocol: "MCP Streamable HTTP / 2024-11-05",
        },
        traces,
        total_traces: traces.length,
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error("Failed to fetch context memories", err, "CONTEXT_API");
    return NextResponse.json(
      { error: "Failed to fetch context memory records", details: (err as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/context-learning/memories
 * Corrects/updates an existing operational memory via Meko memory_update.
 * Protected: Coordinator Authorization Required.
 */
export async function PATCH(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Unauthorized: Coordinator privileges required to update memory.", reason: auth.reason },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memory_id, new_text, case_reference, coordinator_id } = body;

    if (!memory_id || typeof memory_id !== "string") {
      return NextResponse.json({ error: "Missing or invalid memory_id" }, { status: 400 });
    }
    if (!new_text || typeof new_text !== "string") {
      return NextResponse.json({ error: "Missing or invalid new_text" }, { status: 400 });
    }

    // PII Audit on edited text
    const piiCheck = validateOperationalMemoryText(new_text);
    if (!piiCheck.isValid) {
      return NextResponse.json(
        { error: `PII validation failed: ${piiCheck.violation}` },
        { status: 400 }
      );
    }

    const client = new MekoHttpClient();
    if (!client.isConfigured()) {
      return NextResponse.json(
        { error: "Meko client is unconfigured. Cannot update memory on remote server." },
        { status: 503 }
      );
    }

    const result = await client.updateMemory(memory_id, new_text);

    contextTraceService.recordTrace({
      case_reference: case_reference || "system_edit",
      incident_reference: "manual_edit",
      agent_id: "umeed_knowledge_curator",
      operation: "UPDATE",
      datapack_id: client.productDatapackId || "umeed-product-context",
      datapack_name: "umeed-product-context",
      recalled_memory_id: memory_id,
      memory_content: new_text,
      influence_summary: `Coordinator '${coordinator_id || "auth_coordinator"}' corrected memory content via memory_update.`,
      is_shared_knowledge: false,
      latency_ms: 0,
    });

    return NextResponse.json(
      { success: true, memory: result, message: "Memory corrected successfully via Meko memory_update." },
      { status: 200 }
    );
  } catch (err) {
    logger.error("Failed to update memory", err, "CONTEXT_API");
    return NextResponse.json(
      { error: "Failed to update memory", details: (err as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/context-learning/memories
 * Purges/forgets an operational memory via Meko memory_delete_by_id.
 * Protected: Coordinator Authorization Required.
 */
export async function DELETE(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const auth = verifyCoordinatorAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Unauthorized: Coordinator privileges required to delete memory.", reason: auth.reason },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memory_id, case_reference, coordinator_id, reason } = body;

    if (!memory_id || typeof memory_id !== "string") {
      return NextResponse.json({ error: "Missing or invalid memory_id" }, { status: 400 });
    }

    const client = new MekoHttpClient();
    if (!client.isConfigured()) {
      return NextResponse.json(
        { error: "Meko client is unconfigured. Cannot delete memory on remote server." },
        { status: 503 }
      );
    }

    const success = await client.deleteMemoryById(memory_id);

    contextTraceService.recordTrace({
      case_reference: case_reference || "system_delete",
      incident_reference: "manual_delete",
      agent_id: "umeed_knowledge_curator",
      operation: "DELETE",
      datapack_id: client.productDatapackId || "umeed-product-context",
      datapack_name: "umeed-product-context",
      recalled_memory_id: memory_id,
      memory_content: `Deleted memory ID: ${memory_id}`,
      influence_summary: `Coordinator '${coordinator_id || "auth_coordinator"}' deleted memory via memory_delete_by_id. Reason: "${reason || "Coordinator deletion request"}".`,
      is_shared_knowledge: false,
      latency_ms: 0,
    });

    return NextResponse.json(
      { success, memory_id, message: "Memory deleted successfully via Meko memory_delete_by_id." },
      { status: 200 }
    );
  } catch (err) {
    logger.error("Failed to delete memory", err, "CONTEXT_API");
    return NextResponse.json(
      { error: "Failed to delete memory", details: (err as Error)?.message },
      { status: 500 }
    );
  }
}
