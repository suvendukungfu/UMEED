import { tryForwardToBackend } from "@/lib/proxy/proxy-forwarder";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Delhi Circle Pincode to District mapping table for immediate zero-latency fallback
const DELHI_PIN_PREFIX_MAP: Record<string, string> = {
  "110001": "Central Delhi",
  "110002": "Central Delhi",
  "110003": "South Delhi",
  "110005": "Central Delhi",
  "110006": "North Delhi",
  "110007": "North Delhi",
  "110008": "Central Delhi",
  "110014": "South East Delhi",
  "110016": "South Delhi",
  "110017": "South Delhi",
  "110018": "West Delhi",
  "110019": "South East Delhi",
  "110020": "South East Delhi",
  "110024": "South Delhi",
  "110025": "South East Delhi",
  "110027": "West Delhi",
  "110034": "North West Delhi",
  "110052": "North West Delhi",
  "110054": "North Delhi",
  "110085": "North West Delhi",
  "110088": "North West Delhi",
  "110091": "East Delhi",
  "110092": "East Delhi",
  "110093": "North East Delhi",
  "110094": "North East Delhi",
  "110095": "Shahdara",
};

export async function GET(request: NextRequest) {
  const proxyRes = await tryForwardToBackend(request);
  if (proxyRes) return proxyRes;

  const { searchParams } = new URL(request.url);
  const pincode = searchParams.get("pincode")?.trim();

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { error: "A valid 6-digit Indian postal PIN code is required" },
      { status: 400 }
    );
  }

  try {
    // Call zero-key public mirror API
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { "User-Agent": "UMEED-Humanitarian-Platform/1.0" },
      next: { revalidate: 86400 }, // Cache 24 hours
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && Array.isArray(data[0]?.PostOffice)) {
        const postOffices = data[0].PostOffice;
        const first = postOffices[0];
        return NextResponse.json({
          status: "success",
          data: {
            pincode,
            state: first.State,
            district: first.District,
            offices: postOffices.map((po: any) => po.Name),
            source: "api.postalpincode.in",
          },
        });
      }
    }
  } catch {
    // Network fallback below
  }

  // Fast offline fallback for Delhi PIN codes
  const fallbackDistrict = DELHI_PIN_PREFIX_MAP[pincode];
  if (fallbackDistrict) {
    return NextResponse.json({
      status: "success",
      data: {
        pincode,
        state: "Delhi",
        district: fallbackDistrict,
        offices: [],
        source: "offline_delhi_pincode_cache",
      },
    });
  }

  return NextResponse.json(
    { error: "Postal PIN code details not found" },
    { status: 404 }
  );
}

