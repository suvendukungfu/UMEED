import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/features/auth/services/auth.service";
import { extractClientIp } from "@/lib/security/authorization";
import { logger } from "@/lib/logging";

export async function POST(request: NextRequest) {
  if (process.env.UMEED_BACKEND_URL) {
    const { forwardToBackend } = await import("@/lib/proxy/backend-proxy");
    return forwardToBackend(request, "/v1/auth/sign-in");
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Email and password are required strings." } },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const clientIp = extractClientIp(request);
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await authService.signInWithPassword(email.trim(), password, {
      ipAddress: clientIp,
      userAgent,
    });

    if (!result) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      status: "success",
      message: "Authentication successful",
      data: result.context,
    });

    // Set HttpOnly, Secure (in production), SameSite=Lax cookie
    response.cookies.set("umeed_session", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    logger.info("User signed in successfully", "AUTH", {
      userId: result.context.user.userId,
      email: result.context.user.email,
      role: result.context.session.activeRole,
    });

    return response;
  } catch (err) {
    logger.error("Authentication error during sign-in", err, "AUTH");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during sign-in." } },
      { status: 500 }
    );
  }
}
