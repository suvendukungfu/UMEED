"use client";

import React, { useEffect, useRef, useState } from "react";
import { DiscoveryCandidate } from "@umeed/contracts";
import { MapPin, Navigation, Layers, AlertTriangle, Eye, ShieldCheck } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

interface DiscoveryMapProps {
  candidates: DiscoveryCandidate[];
  selectedCandidateId?: string | null;
  onSelectCandidate: (candidate: DiscoveryCandidate) => void;
  className?: string;
}

export function DiscoveryMap({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  className = "",
}: DiscoveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainer.current || mapInstance.current) return;

      try {
        const maplibreglMod = await import("maplibre-gl");
        const maplibregl = (maplibreglMod as any).default || maplibreglMod;

        const map = new maplibregl.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              "osm-raster": {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
              },
            },
            layers: [
              {
                id: "osm-layer",
                type: "raster",
                source: "osm-raster",
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          },
          center: [77.209, 28.6139], // Delhi NCR center
          zoom: 10.2,
          attributionControl: true,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        map.on("load", () => {
          if (isMounted) {
            mapInstance.current = map;
            setMapLoaded(true);
          }
        });

        map.on("error", (e: any) => {
          loggerMapError(e?.error?.message || "Map failed to load tiles");
        });
      } catch (err) {
        if (isMounted) {
          setMapError((err as Error).message);
        }
      }
    }

    function loggerMapError(msg: string) {
      // Non-fatal tile network drop
      console.warn("[MapLibre Warning]", msg);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Sync Markers when candidates or selected candidate changes
  useEffect(() => {
    if (!mapLoaded || !mapInstance.current) return;

    import("maplibre-gl").then((mod: any) => {
      const maplibregl = mod.default || mod;
      // Clear existing markers
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];

      const bounds = new maplibregl.LngLatBounds();
      let hasValidCoords = false;

      for (const cand of candidates) {
        const lat = cand.approximateLocation.latitude;
        const lng = cand.approximateLocation.longitude;
        if (lat === null || lng === null) continue;

        hasValidCoords = true;
        bounds.extend([lng, lat]);

        // Custom HTML Marker Element
        const el = document.createElement("div");
        el.className = "cursor-pointer transition-transform hover:scale-125 focus:outline-none";

        const isSelected = cand.candidateId === selectedCandidateId;
        const isVerified = cand.reviewStatus === "verified" || cand.reviewStatus === "converted_to_incident";
        const isStrong = cand.signalRelevance === "strong_candidate";

        const markerColor = isVerified
          ? "bg-forest-800 text-white border-forest-950"
          : isStrong
          ? "bg-coral-500 text-white border-coral-700"
          : "bg-amber-500 text-white border-amber-700";

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            ${
              isSelected
                ? '<div class="absolute -inset-1.5 rounded-full bg-coral-400/50 animate-ping"></div>'
                : ""
            }
            <div class="h-8 w-8 rounded-full border-2 ${markerColor} flex items-center justify-center font-bold text-xs shadow-md">
              ${cand.candidateCategory.includes("animal") ? "🐾" : "🤝"}
            </div>
          </div>
        `;

        el.addEventListener("click", () => {
          onSelectCandidate(cand);
        });

        // Popup
        const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div class="p-2 max-w-xs font-sans text-forest-800">
            <div class="text-[10px] font-mono uppercase font-bold text-coral-600 mb-0.5">
              ${cand.approximateLocation.district || "Delhi NCR"} • Score ${cand.signalScore}/100
            </div>
            <div class="font-bold text-xs mb-1 line-clamp-2">${cand.sourceTitle}</div>
            <p class="text-[11px] text-forest-600 line-clamp-2 mb-2">${cand.excerpt}</p>
            <div class="text-[10px] text-forest-500 font-mono">
              Status: <span class="font-bold uppercase">${cand.reviewStatus}</span>
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapInstance.current);

        markersRef.current.push(marker);

        if (isSelected) {
          marker.togglePopup();
        }
      }

      // Fit map to candidates if coordinates exist
      if (hasValidCoords && candidates.length > 0) {
        mapInstance.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 13,
          duration: 1000,
        });
      }
    });
  }, [candidates, mapLoaded, selectedCandidateId, onSelectCandidate]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-warm-grey-300 shadow-sm ${className}`}>
      {/* Map Canvas Container */}
      <div ref={mapContainer} className="w-full h-full min-h-[420px] bg-warm-grey-100" />

      {/* Loading Overlay */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-paper-surface/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-forest-800">
            <Navigation className="h-4 w-4 animate-spin text-coral-500" />
            Loading Delhi Humanitarian Discovery Map...
          </div>
        </div>
      )}

      {/* Fallback Error State */}
      {mapError && (
        <div className="absolute inset-0 bg-paper-surface flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-coral-500 mb-2" />
          <div className="font-bold text-sm text-forest-800 mb-1">Geospatial Tile Service Offline</div>
          <p className="text-xs text-forest-600 max-w-sm mb-4">
            Could not initialize MapLibre WebGL context: {mapError}. A tabular view of all coordinates is available below.
          </p>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-warm-grey-200 shadow-sm max-w-[260px] hidden sm:block">
        <div className="text-[10px] font-bold font-mono uppercase text-forest-700 tracking-wider mb-2">
          Signal Legend
        </div>
        <div className="space-y-1.5 text-xs text-forest-800">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-coral-500 shrink-0" />
            <span className="text-[11px] font-medium">Strong Candidate (Score ≥ 80)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[11px] font-medium">Possible Signal (Score 50-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-forest-800 shrink-0" />
            <span className="text-[11px] font-medium">Verified / Ingested Incident</span>
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-warm-grey-200 text-[10px] text-forest-600">
          Approximate district centroids to preserve beneficiary privacy.
        </div>
      </div>
    </div>
  );
}
