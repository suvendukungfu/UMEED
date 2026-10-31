import React from 'react';
import { Mail, Plus } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const CONTACT_EMAIL = 'hello@driftplanner.com';

export interface AboutSectionProps {
  onNotify?: (message: string) => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onNotify }) => {
  const handleSayHello = () => {
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=Hello%20Drift`;
  };

  const handleStayInformed = () => {
    if (onNotify) {
      onNotify(
        'Mailing list is currently offline while we finalize our privacy-first dispatch engine. Check back soon or reach out via hello@driftplanner.com.'
      );
    }
  };

  return (
    <section
      aria-label="About Drift"
      className="relative z-10 rounded-t-[25px] py-20 md:py-32 px-6 bg-[#F6E4CF]"
    >
      <div className="max-w-6xl mx-auto">
        {/* Top Content */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#321C04] text-base md:text-lg text-center leading-relaxed max-w-lg mx-auto font-normal">
            We craft tools that move with your rhythm, not over it. Designed for ease,
            presence, and flow.
          </p>

          {/* About Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {/* Say hello button */}
            <button
              type="button"
              onClick={handleSayHello}
              className="bg-[#321C04] text-[#FFF9F2] rounded-full uppercase tracking-wide font-medium px-6 py-3 text-xs md:text-sm flex items-center gap-3 hover:bg-[#1F1003] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#321C04]"
            >
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                <Mail size={16} className="text-[#321C04]" aria-hidden="true" />
              </span>
              <span>Say hello</span>
            </button>

            {/* Stay informed button */}
            <button
              type="button"
              onClick={handleStayInformed}
              className="bg-[#D9C4AA] text-[#321C04] rounded-full uppercase tracking-wide font-medium px-6 py-3 text-xs md:text-sm flex items-center gap-3 hover:bg-[#CEBA9E] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#321C04]"
            >
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                <Plus size={16} className="text-[#321C04]" aria-hidden="true" />
              </span>
              <span>Stay informed</span>
            </button>
          </div>
        </div>

        {/* Decorative Divider */}
        <div
          aria-hidden="true"
          className="my-16 md:my-24 flex items-center gap-0.5"
        >
          <div className="w-2 h-2 rounded-full bg-[#D9C4AA] shrink-0" />
          <div className="flex-1 h-[2px] bg-[#D9C4AA]" />
          <div className="w-2 h-2 rounded-full bg-[#D9C4AA] shrink-0" />
        </div>

        {/* Bottom Editorial Area */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
          {/* Left Column: Brand Logo & Label */}
          <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 shrink-0 md:w-48">
            <BrandLogo width={40} height={40} fill="#321C04" />
            <span className="text-xs uppercase tracking-widest font-semibold text-[#321C04]/70 md:mt-6 leading-relaxed">
              Calm /<br className="hidden md:inline" /> Amplified
            </span>
          </div>

          {/* Right Column: Large Editorial Statement */}
          <div className="flex-1">
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] leading-[1.3] font-normal text-[#321C04]">
              We make AI tools and assistants. But, most importantly, we help you remember
              what gentle productivity looks like when software moves with you, not over you.
              We create systems that carry the cognitive weight, so you can attend to what
              truly counts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
