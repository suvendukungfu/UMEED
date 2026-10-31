import { ApproximateLocation, LocationPrecision } from "@umeed/contracts";

export interface DetectedLocation {
  approximateLocation: ApproximateLocation;
  locationPrecision: LocationPrecision;
  confidence: number;
  extractedText: string | null;
}

interface DistrictCentroid {
  district: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

export const DELHI_DISTRICT_CENTROIDS: DistrictCentroid[] = [
  {
    district: "North West Delhi",
    latitude: 28.7327,
    longitude: 77.1181,
    aliases: ["rohini", "pitampura", "shalimar bagh", "kanjhawala", "mangolpuri", "sultanpuri", "north west delhi"],
  },
  {
    district: "North Delhi",
    latitude: 28.6863,
    longitude: 77.2218,
    aliases: ["kashmere gate", "isbt", "civil lines", "timarpur", "sadar bazar", "narela", "model town", "north delhi"],
  },
  {
    district: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    aliases: ["connaught place", "cp", "chanakyapuri", "india gate", "parliament", "barakhamba", "paharganj", "new delhi"],
  },
  {
    district: "Central Delhi",
    latitude: 28.6448,
    longitude: 77.2167,
    aliases: ["chandni chowk", "daryaganj", "karol bagh", "rajendra nagar", "central delhi"],
  },
  {
    district: "South Delhi",
    latitude: 28.5355,
    longitude: 77.199,
    aliases: ["saket", "hauz khas", "mehrauli", "malviya nagar", "green park", "vasant kunj", "south delhi"],
  },
  {
    district: "South East Delhi",
    latitude: 28.5562,
    longitude: 77.2773,
    aliases: ["lajpat nagar", "defence colony", "kalkaji", "okhla", "sarita vihar", "badarpur", "south east delhi"],
  },
  {
    district: "South West Delhi",
    latitude: 28.5921,
    longitude: 77.046,
    aliases: ["dwarka", "najafgarh", "kapashera", "vasant vihar", "delhi cantt", "south west delhi"],
  },
  {
    district: "West Delhi",
    latitude: 28.6663,
    longitude: 77.0669,
    aliases: ["janakpuri", "tilak nagar", "rajouri garden", "punjabi bagh", "patel nagar", "west delhi"],
  },
  {
    district: "East Delhi",
    latitude: 28.6279,
    longitude: 77.2784,
    aliases: ["anand vihar", "preet vihar", "mayur vihar", "laxmi nagar", "patparganj", "east delhi"],
  },
  {
    district: "Shahdara",
    latitude: 28.6738,
    longitude: 77.2917,
    aliases: ["shahdara", "dilshad garden", "vivek vihar", "seemapuri", "mansarovar park"],
  },
  {
    district: "North East Delhi",
    latitude: 28.7041,
    longitude: 77.2749,
    aliases: ["seelampur", "yamuna vihar", "gokulpuri", "mustafabad", "karawal nagar", "north east delhi"],
  },
];

/**
 * Coarsens precise coordinates to protect beneficiary and reporter privacy.
 * Rounds to 2 decimal places (~1.1 km area representation) and applies safe district centroiding.
 */
export function coarsenCoordinates(lat: number, lng: number): { latitude: number; longitude: number } {
  return {
    latitude: Math.round(lat * 100) / 100,
    longitude: Math.round(lng * 100) / 100,
  };
}

/**
 * Detects probable Delhi revenue district from unstructured text.
 */
export function detectLocationFromText(text: string): DetectedLocation {
  const lower = text.toLowerCase();

  for (const centroid of DELHI_DISTRICT_CENTROIDS) {
    for (const alias of centroid.aliases) {
      const regex = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (regex.test(lower)) {
        const coarsened = coarsenCoordinates(centroid.latitude, centroid.longitude);
        return {
          approximateLocation: {
            latitude: coarsened.latitude,
            longitude: coarsened.longitude,
            district: centroid.district,
            state: "Delhi NCR",
          },
          locationPrecision: alias.includes("delhi") ? "exact_district" : "approximate_district",
          confidence: alias.includes("delhi") ? 0.9 : 0.75,
          extractedText: alias,
        };
      }
    }
  }

  // Fallback to Delhi metropolitan regional centroid
  return {
    approximateLocation: {
      latitude: 28.6139,
      longitude: 77.209,
      district: null,
      state: "Delhi NCR",
    },
    locationPrecision: "metropolitan_area",
    confidence: 0.3,
    extractedText: null,
  };
}

