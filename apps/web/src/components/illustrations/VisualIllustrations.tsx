import React from "react";

export function HeroIllustration({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="UMEED Humanitarian Intelligence Network"
    >
      <rect width="800" height="400" rx="24" fill="#F4F1EA" />
      {/* Background Grid Pattern */}
      <defs>
        <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E0D5" strokeWidth="0.75" />
        </pattern>
        <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E36F50" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#E36F50" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="400" fill="url(#hero-grid)" />

      {/* Discovery Signal Wave Radii */}
      <circle cx="400" cy="200" r="180" stroke="#D8E2D8" strokeWidth="1.5" strokeDasharray="6 6" />
      <circle cx="400" cy="200" r="130" stroke="#18392F" strokeWidth="1.5" strokeOpacity="0.3" />
      <circle cx="400" cy="200" r="80" stroke="#E36F50" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="400" cy="200" r="40" fill="url(#radar-glow)" />

      {/* Central Hub */}
      <circle cx="400" cy="200" r="26" fill="#18392F" />
      <text x="400" y="206" textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="bold" fontFamily="sans-serif">
        U
      </text>

      {/* Radial Signal Nodes */}
      {/* Node 1: Public Signal Discovery */}
      <line x1="400" y1="200" x2="220" y2="120" stroke="#18392F" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="220" cy="120" r="22" fill="#FFFFFF" stroke="#E36F50" strokeWidth="2" />
      <text x="220" y="126" textAnchor="middle" fontSize="14">📡</text>
      <text x="220" y="156" textAnchor="middle" fill="#18392F" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
        Public Discovery
      </text>

      {/* Node 2: Gemini Multimodal Triage */}
      <line x1="400" y1="200" x2="580" y2="110" stroke="#18392F" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="580" cy="110" r="22" fill="#FFFFFF" stroke="#18392F" strokeWidth="2" />
      <text x="580" y="116" textAnchor="middle" fontSize="14">✨</text>
      <text x="580" y="146" textAnchor="middle" fill="#18392F" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
        Gemini 2.5 Triage
      </text>

      {/* Node 3: Meko Shared Memory */}
      <line x1="400" y1="200" x2="610" y2="280" stroke="#18392F" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="610" cy="280" r="22" fill="#FFFFFF" stroke="#18392F" strokeWidth="2" />
      <text x="610" y="286" textAnchor="middle" fontSize="14">🧠</text>
      <text x="610" y="316" textAnchor="middle" fill="#18392F" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
        Meko Memory Loop
      </text>

      {/* Node 4: Field Responder Dispatch */}
      <line x1="400" y1="200" x2="200" y2="290" stroke="#18392F" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="200" cy="290" r="22" fill="#FFFFFF" stroke="#E36F50" strokeWidth="2" />
      <text x="200" y="296" textAnchor="middle" fontSize="14">🚑</text>
      <text x="200" y="326" textAnchor="middle" fill="#18392F" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
        Field Rescue
      </text>

      {/* Node 5: Receiving Handoff Gate */}
      <line x1="400" y1="200" x2="400" y2="340" stroke="#18392F" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="400" cy="340" r="20" fill="#18392F" />
      <text x="400" y="346" textAnchor="middle" fontSize="12">🏥</text>
      <text x="400" y="375" textAnchor="middle" fill="#18392F" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
        Verified Handoff Gate
      </text>
    </svg>
  );
}

export function DiscoveryRadarVisual({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Discovery Radar Visual"
    >
      <rect width="600" height="340" rx="16" fill="#18392F" />
      <defs>
        <radialGradient id="radar-sweep" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E36F50" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E36F50" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Radar Circles */}
      <circle cx="300" cy="170" r="140" stroke="#D8E2D8" strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="300" cy="170" r="100" stroke="#D8E2D8" strokeWidth="1" strokeOpacity="0.3" />
      <circle cx="300" cy="170" r="60" stroke="#E36F50" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="300" cy="170" r="20" fill="#E36F50" fillOpacity="0.4" />

      {/* Grid Lines */}
      <line x1="160" y1="170" x2="440" y2="170" stroke="#D8E2D8" strokeWidth="0.75" strokeOpacity="0.2" />
      <line x1="300" y1="30" x2="300" y2="310" stroke="#D8E2D8" strokeWidth="0.75" strokeOpacity="0.2" />

      {/* Discovered Signal Blips */}
      {/* Blip 1: Rohini */}
      <circle cx="230" cy="110" r="6" fill="#E36F50" />
      <circle cx="230" cy="110" r="12" stroke="#E36F50" strokeWidth="1" strokeOpacity="0.6" />
      <text x="245" y="114" fill="#F4F1EA" fontSize="10" fontFamily="monospace" fontWeight="bold">
        NW-Rohini [Score 88]
      </text>

      {/* Blip 2: Kashmere Gate */}
      <circle cx="340" cy="120" r="6" fill="#E36F50" />
      <text x="355" y="124" fill="#F4F1EA" fontSize="10" fontFamily="monospace" fontWeight="bold">
        N-Kashmere Gate [Score 92]
      </text>

      {/* Blip 3: Okhla */}
      <circle cx="370" cy="230" r="5" fill="#E5B94F" />
      <text x="385" y="234" fill="#F4F1EA" fontSize="10" fontFamily="monospace">
        SE-Okhla [Score 74]
      </text>

      {/* Blip 4: Dwarka */}
      <circle cx="210" cy="240" r="6" fill="#E36F50" />
      <text x="140" y="258" fill="#F4F1EA" fontSize="10" fontFamily="monospace" fontWeight="bold">
        SW-Dwarka [Score 84]
      </text>
    </svg>
  );
}
