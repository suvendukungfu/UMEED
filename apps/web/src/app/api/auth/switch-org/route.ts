import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/features/auth/services/auth.service";

export async function POST(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  try {
    const cookieToken = request.cookies.get("umeed_session")?.value;
    const headerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Active session required to switch organization." } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId || typeof organizationId !== "string") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "organizationId is required." } },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const updatedContext = await authService.switchOrganization(token, organizationId);

    if (!updatedContext) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Failed to switch organization." } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Organization switched successfully",
      data: updatedContext,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: err instanceof Error ? err.message : String(err) } },
      { status: 400 }
    );
  }
}

