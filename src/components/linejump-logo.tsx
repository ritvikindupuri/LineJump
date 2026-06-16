import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
  animated?: boolean;
}

export function LinejumpLogo({ size = 40, animated = false, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="lj-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C5CE7" />
          <stop offset="50%" stopColor="#00CEC9" />
          <stop offset="100%" stopColor="#6C5CE7" />
        </linearGradient>
        <linearGradient id="lj-grad-hover" x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A29BFE" />
          <stop offset="50%" stopColor="#55EFC4" />
          <stop offset="100%" stopColor="#FDCB6E" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#lj-grad)" className={animated ? "animate-pulse" : ""} />
      <path
        d="M12 20 L20 8 L28 20 L20 14 Z"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M12 28 L20 16 L28 28 L20 22 Z"
        fill="white"
        opacity="0.6"
      />
      <path
        d="M12 24 L20 12 L28 24"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <circle cx="20" cy="14" r="2" fill="white" opacity="0.8" />
      <text x="20" y="36" textAnchor="middle" fontSize="4" fill="white" fontWeight="700" opacity="0.4" fontFamily="system-ui">
        LJ
      </text>
    </svg>
  );
}

export function LinejumpWordmark({ height = 24, animated = false }: { height?: number; animated?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <LinejumpLogo size={height * 1.5} animated={animated} />
      <span className={`font-semibold tracking-tight ${animated ? "bg-gradient-to-r from-[#6C5CE7] via-[#00CEC9] to-[#6C5CE7] bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient" : ""}`} style={{ fontSize: height * 0.7, lineHeight: 1 }}>
        linejump
      </span>
    </div>
  );
}
