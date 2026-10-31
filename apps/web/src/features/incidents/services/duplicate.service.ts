import {
  IncidentSubjectType,
  IncidentType,
} from "@umeed/contracts";
import { DuplicateCandidate, IncidentDocument } from "../types";

/**
 * Duplicate Candidate Detection Service
 *
 * Invariant: Non-destructive flagging only. Never automatically deletes or merges incidents.
 */

const DEFAULT_MAX_DISTANCE_METERS = 500; // 500m radius
const DEFAULT_MAX_TIME_WINDOW_HOURS = 24; // 24-hour temporal window

/**
 * Compute the Great Circle distance (in meters) between two GPS points using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Check whether a candidate incident matches duplicate criteria against a target incident.
 */
export function evaluateDuplicateCandidate(
  target: {
    subject_type: IncidentSubjectType;
    incident_type: IncidentType;
    reported_at: string;
    latitude: number | null;
    longitude: number | null;
  },
  candidate: IncidentDocument,
  maxDistanceMeters = DEFAULT_MAX_DISTANCE_METERS,
  maxHours = DEFAULT_MAX_TIME_WINDOW_HOURS
): DuplicateCandidate | null {
  // Hard match on subject type (person vs animal)
  if (target.subject_type !== candidate.subject_type) {
    return null;
  }

  // Calculate temporal distance
  const targetTime = new Date(target.reported_at).getTime();
  const candidateTime = new Date(candidate.reported_at).getTime();
  const timeDeltaHours = Math.abs(targetTime - candidateTime) / (1000 * 60 * 60);

  if (timeDeltaHours > maxHours) {
    return null;
  }

  // If both have GPS coordinates, calculate spatial distance
  if (
    target.latitude !== null &&
    target.longitude !== null &&
    candidate.location.latitude !== null &&
    candidate.location.longitude !== null
  ) {
    const distanceMeters = calculateHaversineDistanceMeters(
      target.latitude,
      target.longitude,
      candidate.location.latitude,
      candidate.location.longitude
    );

    if (distanceMeters <= maxDistanceMeters) {
      return {
        incident_id: candidate._id,
        public_reference: candidate.public_reference,
        incident_type: candidate.incident_type,
        subject_type: candidate.subject_type,
        distance_meters: distanceMeters,
        reported_at: candidate.reported_at,
        reason: `Spatial proximity match (${distanceMeters}m) within ${timeDeltaHours.toFixed(1)} hours of candidate ${candidate.public_reference}`,
      };
    }
  }

  return null;
}
