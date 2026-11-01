import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/features/auth/services/auth.service";

export async function GET(request: NextRequest) {
  if (process.env.UMEED_BACKEND_URL) {
    const { forwardToBackend } = await import("@/lib/proxy/backend-proxy");
    return forwardToBackend(request, "/v1/auth/session");
  }

  try {
    const cookieToken = request.cookies.get("umeed_session")?.value;
    const headerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "No active session found." } },
        { status: 401 }
      );
    }

    const authService = new AuthService();
    const context = await authService.authenticateToken(token);

    if (!context) {
      const response = NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Session expired or invalid." } },
        { status: 401 }
      );
      response.cookies.delete("umeed_session");
      return response;
    }

    return NextResponse.json({
      status: "success",
      data: context,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to evaluate session." } },
      { status: 500 }
    );
  }
}

