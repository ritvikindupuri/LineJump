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
      {/* Bold horizontal track line segments (theme-adaptive currentColor with subtle opacity) */}
      <path
        d="M 6 24 L 15 24"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.25"
      />
      <path
        d="M 25 24 L 34 24"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.25"
      />

      {/* Elegant Bezier arc representing the jump path (monochrome currentColor) */}
      <path
        d="M 13 24 C 13 10, 27 10, 27 24"
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Small motion trail under-arc (subtle opacity) */}
      <path
        d="M 16 24 C 16 16, 24 16, 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.2"
      />

      {/* Glowing packet node at the peak of the jump */}
      <circle
        cx="20"
        cy="10"
        r="3.5"
        fill="currentColor"
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



