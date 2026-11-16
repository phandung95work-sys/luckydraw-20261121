import React from 'react';

interface BrandHeaderProps {
  compact?: boolean;
}

export const AgribankLogoMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    {/* Agribank signature green/crimson diagonal emblem */}
    <rect x="2" y="2" width="60" height="60" rx="8" fill="#ffffff" />
    <rect x="6" y="6" width="52" height="52" rx="5" fill="#0d5b34" />
    <path d="M6 42 L42 6 L58 6 L58 22 L22 58 L6 58 Z" fill="#a81832" />
    <path d="M16 50 C28 38, 36 26, 48 14" stroke="#f7e39c" strokeWidth="3.5" strokeLinecap="round" fill="none" />
  </svg>
);

export const BrandHeader: React.FC<BrandHeaderProps> = ({ compact = false }) => {
  return (
    <header className={`relative z-10 flex flex-col items-center text-center select-none transition-all duration-500 px-4 ${compact ? 'pt-2 sm:pt-3 pb-1' : 'pt-2 sm:pt-5 pb-2'}`}>
      {/* Agribank IT Center lockup */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2.5">
          <AgribankLogoMark className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          <span
            className="text-lg sm:text-2xl font-bold tracking-[0.14em] text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            AGRIBANK
          </span>
        </div>
        <div className="mt-0.5 border-b border-[#a81832]/85 pb-1 px-4">
          <p className="text-[10px] sm:text-xs font-semibold tracking-[0.22em] text-slate-100/95 uppercase">
            TRUNG TÂM CÔNG NGHỆ THÔNG TIN
          </p>
        </div>
      </div>

      {/* Main Title: GALA NIGHT */}
      <h1
        className={`font-display-gold font-extrabold tracking-[0.06em] leading-none mt-2 transition-all duration-500 ${
          compact ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl lg:text-6xl'
        }`}
      >
        GALA NIGHT
      </h1>

      {/* Subtitle: NGÀY HỘI CÔNG NGHỆ THÔNG TIN */}
      <h2
        className={`font-subtitle-gold font-extrabold tracking-[0.06em] uppercase mt-1 transition-all duration-500 ${
          compact ? 'text-sm sm:text-lg' : 'text-base sm:text-xl lg:text-2xl'
        }`}
      >
        NGÀY HỘI CÔNG NGHỆ THÔNG TIN
      </h2>

      {/* Crimson Ribbon Tagline */}
      <div className={`agribank-ribbon px-5 sm:px-9 py-1 sm:py-1.5 mt-2 ${compact ? 'scale-90' : ''}`}>
        <p className="text-[11px] sm:text-sm font-semibold tracking-wide text-amber-50 drop-shadow">
          Công nghệ dẫn lối – Chuyển đổi số bứt phá – Agribank vươn xa
        </p>
      </div>
    </header>
  );
};
