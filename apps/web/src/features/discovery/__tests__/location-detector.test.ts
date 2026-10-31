import { describe, it, expect } from "vitest";
import {
  detectLocationFromText,
  coarsenCoordinates,
  DELHI_DISTRICT_CENTROIDS,
} from "../extraction/location-detector";

describe("Phase 11: Geospatial Location Detection & Privacy Coarsening", () => {
  it("detects Delhi districts from local area names", () => {
    const rohiniRes = detectLocationFromText("Urgent rescue needed near Rohini Sector 16 market");
    expect(rohiniRes.approximateLocation.district).toBe("North West Delhi");
    expect(rohiniRes.confidence).toBeGreaterThanOrEqual(0.75);

    const kashmereRes = detectLocationFromText("Elderly citizen lying on pavement near Kashmere Gate ISBT");
    expect(kashmereRes.approximateLocation.district).toBe("North Delhi");

    const saketRes = detectLocationFromText("Injured puppies found outside Saket Metro");
    expect(saketRes.approximateLocation.district).toBe("South Delhi");

    const dwarkaRes = detectLocationFromText("Night shelter full in Dwarka Sector 10");
    expect(dwarkaRes.approximateLocation.district).toBe("South West Delhi");
  });

  it("coarsens coordinates to 2 decimal places to protect beneficiary privacy", () => {
    const exactLat = 28.732749;
    const exactLng = 77.118123;
    const coarsened = coarsenCoordinates(exactLat, exactLng);

    expect(coarsened.latitude).toBe(28.73);
    expect(coarsened.longitude).toBe(77.12);
  });

  it("covers all 11 Delhi revenue districts in reference centroids", () => {
    expect(DELHI_DISTRICT_CENTROIDS.length).toBe(11);
    const districtNames = DELHI_DISTRICT_CENTROIDS.map((c) => c.district);
    expect(districtNames).toContain("Central Delhi");
    expect(districtNames).toContain("East Delhi");
    expect(districtNames).toContain("New Delhi");
    expect(districtNames).toContain("North Delhi");
    expect(districtNames).toContain("North East Delhi");
    expect(districtNames).toContain("North West Delhi");
    expect(districtNames).toContain("Shahdara");
    expect(districtNames).toContain("South Delhi");
    expect(districtNames).toContain("South East Delhi");
    expect(districtNames).toContain("South West Delhi");
    expect(districtNames).toContain("West Delhi");
  });
});
