import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";

// Delhi NCR Pincode mapping
const DELHI_PINCODES: Record<string, { district: string; state: string; lat: number; lng: number }> = {
  "110001": { district: "New Delhi", state: "Delhi", lat: 28.6315, lng: 77.2167 },
  "110002": { district: "Central Delhi", state: "Delhi", lat: 28.6415, lng: 77.2415 },
  "110003": { district: "South Delhi", state: "Delhi", lat: 28.5855, lng: 77.2215 },
  "110016": { district: "South Delhi", state: "Delhi", lat: 28.5494, lng: 77.2001 },
  "110020": { district: "South East Delhi", state: "Delhi", lat: 28.5284, lng: 77.2711 },
  "110029": { district: "South West Delhi", state: "Delhi", lat: 28.5714, lng: 77.1901 },
  "110085": { district: "North West Delhi", state: "Delhi", lat: 28.7154, lng: 77.1145 },
  "110092": { district: "East Delhi", state: "Delhi", lat: 28.6284, lng: 77.3015 },
};

export async function facilityRoutes(fastify: FastifyInstance) {
  // List Facilities
  fastify.get("/v1/facilities", async (request, reply) => {
    const db = await getDatabase();
    const query = request.query as { district?: string; type?: string };
    const filter: Record<string, unknown> = {};

    if (query.district) filter.district = query.district;
    if (query.type) filter.facilityType = query.type;

    const facilities = await db.collection("facilities").find(filter).sort({ name: 1 }).toArray();
    return reply.status(200).send({ facilities, total: facilities.length });
  });

  // Pincode Lookup
  fastify.get("/v1/geo/pincode", async (request, reply) => {
    const { pincode } = request.query as { pincode?: string };
    if (!pincode) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "pincode query parameter is required." },
      });
    }

    const info = DELHI_PINCODES[pincode.trim()];
    if (!info) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Pincode ${pincode} not found in Delhi NCR registry.` },
      });
    }

    return reply.status(200).send({
      pincode: pincode.trim(),
      ...info,
    });
  });
}

