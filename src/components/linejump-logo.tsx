import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function LinejumpLogo({ size = 40, className, ...props }: LogoProps) {
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
        {/* Premium Charcoal-to-Stone gradient background */}
        <linearGradient id="lj-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.35 0.03 55)" />
          <stop offset="100%" stopColor="oklch(0.22 0.02 55)" />
        </linearGradient>
      </defs>
      {/* Background card */}
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#lj-grad)" />

      {/* Single clean horizontal line */}
      <line
        x1="10"
        y1="23"
        x2="30"
        y2="23"
        stroke="oklch(0.955 0.018 80)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Single bold jumping arc */}
      <path
        d="M 14 23 C 14 11, 26 11, 26 23"
        stroke="oklch(0.78 0.08 55)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LinejumpWordmark({ height = 24 }: { height?: number }) {
  return (
    <div className="flex items-center gap-2">
      <LinejumpLogo size={height * 1.5} />
      <span className="font-semibold tracking-tight text-foreground transition-colors" style={{ fontSize: height * 0.7, lineHeight: 1 }}>
        LineJump
      </span>
    </div>
  );
}



