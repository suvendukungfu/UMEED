import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AboutSection } from './components/AboutSection';
import { FeaturesSection } from './components/FeaturesSection';
import { X } from 'lucide-react';

const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260711_090308_1dd0cea7-f9ba-4db4-8147-c7d746061c9e.mp4';

export const App: React.FC = () => {
  const [notification, setNotification] = useState<string | null>(null);

  const handleStartFree = () => {
    setNotification(
      'Early access wave active: We are onboarding small cohorts to maintain calm, individual focus. Enter your email or say hello to reserve a private seat.'
    );
  };

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-white selection:bg-[#321C04] selection:text-[#FFF9F2] relative">
      {/* Toast Notification for honest interactions */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[100] max-w-md bg-white text-[#321C04] rounded-2xl p-4 shadow-2xl flex items-start gap-3 border border-black/5 animate-fade-in-down"
        >
          <div className="flex-1 text-xs md:text-sm leading-relaxed font-medium">
            {notification}
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
            className="text-black/40 hover:text-black p-1 rounded-lg transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Floating Navbar */}
      <Navbar onNotify={(msg) => setNotification(msg)} />

      <main>
        {/* SECTION ONE — CINEMATIC HERO */}
        <section
          aria-label="Hero"
          className="relative h-screen overflow-hidden mb-[-25px] flex flex-col justify-end"
        >
          {/* Background Video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/20" aria-hidden="true" />

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col justify-end pb-12 md:pb-16 px-4 text-center items-center">
            {/* Heading */}
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[96px] font-normal text-white leading-[1.1] tracking-tight">
              <span>Own your time</span>
              <br />
              <span>without </span>
              <em
                className="not-italic"
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: 'italic',
                }}
              >
                the stress
              </em>
            </h1>

            {/* Subtitle */}
            <p className="text-white/80 text-sm md:text-base font-medium max-w-[420px] mx-auto mt-6 text-center leading-relaxed">
              Drift is a calm, ADHD-friendly planner that turns scattered ideas into a
              clear path
            </p>

            {/* Hero CTA Bar */}
            <div className="mt-8 bg-black/25 backdrop-blur-md rounded-xl flex flex-row items-center pl-6 pr-1 py-1 gap-4 max-w-xl mx-auto ring-1 ring-white/10">
              <span className="hidden sm:inline text-white/90 text-sm font-normal text-left">
                No noise. No complicated systems. Just your day, gently sorted.
              </span>
              <span className="sm:hidden text-white/90 text-xs font-normal text-left">
                No noise. Just your day, gently sorted.
              </span>

              <button
                type="button"
                onClick={handleStartFree}
                className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Start for free
              </button>
            </div>
          </div>
        </section>

        {/* SECTION TWO — ABOUT */}
        <AboutSection onNotify={(msg) => setNotification(msg)} />

        {/* SECTION THREE — FEATURES */}
        <FeaturesSection onStartFree={handleStartFree} />
      </main>
    </div>
  );
};

export default App;
