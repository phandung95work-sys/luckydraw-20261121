import React from 'react';

interface BrandHeaderProps {
  compact?: boolean;
}

export const AgribankLogoMark: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <img
    src="./agribank-logo.png"
    alt="Logo Agribank"
    className={`${className} object-contain select-none`}
    draggable={false}
  />
);

export const BrandHeader: React.FC<BrandHeaderProps> = ({ compact = false }) => {
  return (
    <header className={`relative z-10 flex flex-col items-center text-center select-none transition-all duration-500 px-4 ${compact ? 'pt-1.5 sm:pt-2 pb-0.5' : 'pt-2 sm:pt-3 pb-1'}`}>
      {/* Agribank IT Center lockup */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <AgribankLogoMark className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          <span
            className="text-xl sm:text-[26px] font-normal tracking-[0.04em] leading-none text-white"
            style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
          >
            AGRIBANK
          </span>
        </div>
        <div className="mt-1 border-b border-[#a81832]/85 pb-0.5 px-2">
          <p className="text-[9px] sm:text-[11px] font-semibold tracking-[0.14em] text-slate-100/95 uppercase">
            TRUNG TÂM CÔNG NGHỆ THÔNG TIN
          </p>
        </div>
      </div>

      {/* Main Title: GALA NIGHT */}
      <h1
        className={`font-display-gold font-extrabold tracking-[0.06em] leading-none mt-1.5 transition-all duration-500 ${
          compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl lg:text-[2.75rem]'
        }`}
      >
        GALA NIGHT
      </h1>

      {/* Subtitle: NGÀY HỘI CÔNG NGHỆ THÔNG TIN */}
      <h2
        className={`font-subtitle-gold font-extrabold tracking-[0.06em] uppercase mt-0.5 transition-all duration-500 ${
          compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base lg:text-lg'
        }`}
      >
        NGÀY HỘI CÔNG NGHỆ THÔNG TIN
      </h2>

      {/* Crimson Ribbon Tagline */}
      <div className={`agribank-ribbon px-4 sm:px-7 py-0.5 sm:py-1 mt-1.5 ${compact ? 'scale-90' : ''}`}>
        <p className="text-[10px] sm:text-xs font-semibold tracking-wide text-amber-50 drop-shadow">
          Công nghệ dẫn lối – Chuyển đổi số bứt phá – Agribank vươn xa
        </p>
      </div>
    </header>
  );
};
