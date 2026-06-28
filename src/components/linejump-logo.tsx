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
        {/* Vibrant copper-orange gradient for the jumping arc */}
        <linearGradient id="lj-accent-grad" x1="12" y1="24" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7E5F" />
          <stop offset="100%" stopColor="#FEB47B" />
        </linearGradient>
      </defs>
      {/* Bold horizontal track line segments (theme-adaptive currentColor) */}
      <path
        d="M 6 24 L 15 24"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M 25 24 L 34 24"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Elegant Bezier arc representing the jump path (Vibrant copper-orange gradient) */}
      <path
        d="M 13 24 C 13 10, 27 10, 27 24"
        stroke="url(#lj-accent-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Small motion trail under-arc */}
      <path
        d="M 16 24 C 16 16, 24 16, 24 24"
        stroke="url(#lj-accent-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />

      {/* Glowing packet node at the peak of the jump */}
      <circle
        cx="20"
        cy="10"
        r="3.5"
        fill="#FFD200"
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



