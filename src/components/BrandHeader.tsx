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
    <header
      className={`brand-header-responsive relative z-10 flex flex-col items-center text-center select-none transition-all duration-500 safe-px px-3 sm:px-4 ${
        compact
          ? 'pt-2 sm:pt-3 pb-1.5 sm:pb-2 gap-0.5 sm:gap-1'
          : 'pt-3 sm:pt-5 lg:pt-7 pb-2 sm:pb-3 gap-1 sm:gap-1.5 lg:gap-2'
      }`}
    >
      {/* Agribank IT Center lockup */}
      <div className="flex flex-col items-center gap-1 sm:gap-1.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <AgribankLogoMark className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          <span
            className="text-xl sm:text-2xl md:text-[28px] font-normal tracking-[0.04em] leading-none text-white"
            style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
          >
            AGRIBANK
          </span>
        </div>
        <div className="border-b border-[#a81832]/85 pb-0.5 sm:pb-1 px-2 sm:px-3 max-w-[min(100%,22rem)]">
          <p className="text-[9px] sm:text-[10px] md:text-xs font-semibold tracking-[0.1em] sm:tracking-[0.16em] text-slate-100/95 uppercase leading-tight">
            TRUNG TÂM CÔNG NGHỆ THÔNG TIN
          </p>
        </div>
      </div>

      {/* Main Title: GALA NIGHT */}
      <h1
        className={`font-display-gold font-extrabold tracking-[0.06em] leading-none transition-all duration-500 ${
          compact
            ? 'mt-0.5 text-xl sm:text-2xl md:text-3xl'
            : 'mt-1 sm:mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-[3rem] xl:text-[3.25rem]'
        }`}
      >
        GALA NIGHT
      </h1>

      {/* Subtitle: NGÀY HỘI CÔNG NGHỆ THÔNG TIN */}
      <h2
        className={`font-subtitle-gold font-extrabold tracking-[0.06em] sm:tracking-[0.08em] uppercase transition-all duration-500 px-2 ${
          compact
            ? 'mt-0.5 text-[10px] sm:text-xs md:text-sm'
            : 'mt-1 text-xs sm:text-sm md:text-base lg:text-lg'
        }`}
      >
        NGÀY HỘI CÔNG NGHỆ THÔNG TIN
      </h2>

      {/* Crimson Ribbon Tagline */}
      <div
        className={`agribank-ribbon px-3 sm:px-5 md:px-8 py-1 sm:py-1.5 ${
          compact ? 'mt-1 scale-90 origin-top' : 'mt-1.5 sm:mt-2.5 md:mt-3'
        }`}
      >
        <p className="text-[9px] sm:text-[10px] md:text-xs font-semibold tracking-wide text-amber-50 drop-shadow leading-snug">
          Công nghệ dẫn lối – Chuyển đổi số bứt phá – Agribank vươn xa
        </p>
      </div>
    </header>
  );
};
