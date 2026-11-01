import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/features/auth/services/auth.service";

export async function POST(request: NextRequest) {
  if (process.env.UMEED_BACKEND_URL) {
    const { forwardToBackend } = await import("@/lib/proxy/backend-proxy");
    return forwardToBackend(request, "/v1/auth/sign-out");
  }

  try {
    const cookieToken = request.cookies.get("umeed_session")?.value;
    const headerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;

    if (token) {
      const authService = new AuthService();
      await authService.signOut(token);
    }

    const response = NextResponse.json({
      status: "success",
      message: "Signed out successfully",
    });

    response.cookies.delete("umeed_session");
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to sign out cleanly." } },
      { status: 500 }
    );
  }
}

