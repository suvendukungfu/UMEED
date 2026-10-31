import React, { useState, useEffect, useRef } from 'react';

export interface NavbarProps {
  onNotify?: (message: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNotify }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLinkClick = (targetId?: string, fallbackMessage?: string) => {
    setIsOpen(false);
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (fallbackMessage && onNotify) {
      onNotify(fallbackMessage);
    }
  };

  return (
    <div
      ref={navRef}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
    >
      {/* Floating Pill Navbar */}
      <nav
        aria-label="Main Navigation"
        className="bg-white rounded-full shadow-lg px-6 py-2.5 flex items-center gap-6 select-none"
      >
        <a
          href="#"
          className="text-lg font-bold tracking-tight text-black hover:opacity-80 transition-opacity"
          aria-label="Drift Home"
        >
          Drift.
        </a>

        {/* Hamburger Toggle Button */}
        <button
          type="button"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
          aria-controls="nav-dropdown-menu"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-8 h-8 flex flex-col justify-center items-center gap-[5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-full"
        >
          <span
            className={`w-5 h-[2px] bg-black rounded-full transform transition-transform duration-300 ${
              isOpen ? 'translate-y-[3.5px] rotate-45' : 'translate-y-0 rotate-0'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.77, 0, 0.175, 1)',
            }}
          />
          <span
            className={`w-5 h-[2px] bg-black rounded-full transform transition-transform duration-300 ${
              isOpen ? '-translate-y-[3.5px] -rotate-45' : 'translate-y-0 rotate-0'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.77, 0, 0.175, 1)',
            }}
          />
        </button>
      </nav>

      {/* Navigation Dropdown */}
      <div
        id="nav-dropdown-menu"
        role="region"
        aria-label="Dropdown links"
        className={`absolute top-full mt-2 w-48 bg-white rounded-2xl shadow-xl p-2 flex flex-col gap-1 transition-all duration-300 transform origin-top ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none invisible'
        }`}
      >
        <button
          type="button"
          onClick={() => handleLinkClick('features')}
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-black/80 hover:text-black hover:bg-black/5 transition-colors focus:outline-none focus-visible:bg-black/5"
        >
          Features
        </button>
        <button
          type="button"
          onClick={() =>
            handleLinkClick(
              undefined,
              'Drift AI: Currently in private laboratory testing. Soft intelligent assistance coming soon.'
            )
          }
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-black/80 hover:text-black hover:bg-black/5 transition-colors focus:outline-none focus-visible:bg-black/5 flex items-center justify-between"
        >
          <span>Drift AI</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 text-black/50">
            Preview
          </span>
        </button>
        <button
          type="button"
          onClick={() =>
            handleLinkClick(
              undefined,
              'FAQ: Full product guides and ADHD workflow documentation will be released with v1.0.'
            )
          }
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-black/80 hover:text-black hover:bg-black/5 transition-colors focus:outline-none focus-visible:bg-black/5 flex items-center justify-between"
        >
          <span>FAQ</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 text-black/50">
            Soon
          </span>
        </button>
      </div>
    </div>
  );
};
