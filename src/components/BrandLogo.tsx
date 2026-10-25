"use client";

import Image from "next/image";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
};

export default function BrandLogo({
  size = "md",
  showText = true,
  className = "",
}: BrandLogoProps) {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  const badgeSizes = {
    sm: "text-[8px] tracking-wider",
    md: "text-[9px] tracking-widest",
    lg: "text-[11px] tracking-widest",
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 via-accent/15 to-amber-950/30 p-1 border border-accent/40 shadow-md shadow-amber-950/20 group-hover:scale-105 transition-transform duration-200`}>
        <Image
          src="/assets/images/logo.png"
          alt="MazI"
          width={64}
          height={64}
          priority
          className="h-full w-full object-contain filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]"
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-none" dir="ltr">
          <span className={`font-black ${textSizes[size]} tracking-tight bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent filter drop-shadow-[0_2px_10px_rgba(245,158,11,0.25)] font-sans`}>
            MazI
          </span>
          <span className={`${badgeSizes[size]} font-extrabold uppercase text-amber-400/70 mt-0.5`}>
            PLAY & CHAT
          </span>
        </div>
      )}
    </div>
  );
}
