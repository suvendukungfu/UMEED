import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrandLogo } from './BrandLogo';

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
}

export interface FeaturesSectionProps {
  onStartFree?: () => void;
}

const FEATURE_DATA: FeatureItem[] = [
  {
    id: 'feature-ease',
    title: 'Built for ease, not urgency',
    description:
      'Drift strips away the noise that makes organizing feel draining. Every surface is made to be soft, quiet, and intuitive so you can move forward, not get stuck decoding.',
    videoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_102608_5fa1187d-9ac6-44fb-82ab-54376200abc0.mp4',
  },
  {
    id: 'feature-start',
    title: 'The gentlest way to start',
    description:
      'Beginning your day should feel natural, not daunting. Drift eases you into motion with subtle cues and a quiet view of what deserves your energy right now.',
    videoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260625_174131_395bc785-bb21-4e65-abf6-27c56f0764b6.mp4',
  },
  {
    id: 'feature-focus',
    title: 'Deep, undivided focus',
    description:
      'No interruptions, no clutter. Drift holds you in the present task with a stripped-back layout that softens all else until you are truly ready to shift.',
    videoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260525_052706_d2e390fd-1846-4fe7-a4d8-8d2f1c875358.mp4',
  },
];

const BACKGROUND_IMAGE =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260709_082449_46df5cc4-ad98-4541-9236-a2659c1478a4.png&w=1920&q=85';

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onStartFree }) => {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState<number>(0);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false]);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setRevealedCards([true, true, true]);
    }
  }, [prefersReducedMotion]);

  // A. Active Feature Detection (threshold: 0.6)
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    cardRefs.current.forEach((el, index) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveFeatureIndex(index);
            }
          });
        },
        {
          threshold: 0.6,
        }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  // B. Card Reveal Animation (threshold: 0.15)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const observers: IntersectionObserver[] = [];

    cardRefs.current.forEach((el, index) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setRevealedCards((prev) => {
                if (prev[index]) return prev;
                const next = [...prev];
                next[index] = true;
                return next;
              });
              observer.unobserve(el);
            }
          });
        },
        {
          threshold: 0.15,
        }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [prefersReducedMotion]);

  const handleNavClick = (index: number) => {
    const targetCard = cardRefs.current[index];
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <section
      id="features"
      aria-label="Features"
      className="relative z-20 bg-[#0C0C0E] bg-cover bg-center lg:bg-fixed px-5 md:px-10 lg:px-16 py-20 md:py-40 lg:py-48"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.45)), url('${BACKGROUND_IMAGE}')`,
      }}
    >
      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-[400px_1fr] gap-6 xl:gap-12 items-start">
        {/* Left Column — Sticky Navigation (Desktop Only) */}
        <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:justify-between lg:py-32">
          {/* Top: Section Heading */}
          <div>
            <h2 className="text-white text-2xl sm:text-3xl lg:text-[46px] leading-[1.2] font-normal tracking-tight">
              Software that flows with your mind, not over it
            </h2>

            {/* Feature navigation buttons */}
            <div className="flex flex-col gap-3 mt-10" role="tablist" aria-label="Feature Tabs">
              {FEATURE_DATA.map((feature, index) => {
                const isActive = activeFeatureIndex === index;
                return (
                  <button
                    key={feature.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleNavClick(index)}
                    className={`w-full text-left px-5 py-3 rounded-2xl text-sm transition-all duration-300 bg-black/20 ${
                      isActive
                        ? 'text-white font-medium ring-1 ring-white/20'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {feature.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="bg-black/25 backdrop-blur-md rounded-xl p-1.5 pl-4 flex items-center justify-between gap-3 text-xs text-white/80 ring-1 ring-white/10">
            <span className="leading-snug">
              No noise. No complicated systems. Just your day, gently sorted.
            </span>
            <button
              type="button"
              onClick={onStartFree}
              className="bg-white text-black text-xs font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors shrink-0"
            >
              Start for free
            </button>
          </div>
        </div>

        {/* Right Column — Feature Cards */}
        <div className="flex flex-col gap-10 md:gap-16 lg:gap-24">
          {/* Mobile Section Heading */}
          <div className="lg:hidden mb-4">
            <h2 className="text-white text-3xl sm:text-4xl leading-tight font-normal tracking-tight">
              Software that flows with your mind, not over it
            </h2>
          </div>

          {FEATURE_DATA.map((feature, index) => {
            const isRevealed = revealedCards[index] || prefersReducedMotion;

            return (
              <div
                key={feature.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className={`bg-black/20 backdrop-blur-sm rounded-3xl p-6 md:p-10 flex flex-col gap-6 ring-1 ring-white/10 transition-all duration-700 ease-out ${
                  isRevealed
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-16 pointer-events-none'
                }`}
              >
                {/* 1. Brand Logo */}
                <div>
                  <BrandLogo width={40} height={40} fill="rgba(255,255,255,0.8)" />
                </div>

                {/* 2. Feature Title */}
                <h3 className="text-white text-xl md:text-2xl font-medium tracking-tight">
                  {feature.title}
                </h3>

                {/* 3. Video Container */}
                <div className="aspect-video rounded-2xl overflow-hidden bg-black/30 relative w-full ring-1 ring-white/5">
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={feature.title}
                    className="w-full h-full object-cover"
                  >
                    <source src={feature.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* 4. Description */}
                <p className="text-white/60 font-medium text-sm md:text-base leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
