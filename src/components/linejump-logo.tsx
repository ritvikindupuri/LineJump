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
      {/* Three vertical anchor bars (representing the line structure) */}
      {/* Left Anchor */}
      <line
        x1="12"
        y1="30"
        x2="12"
        y2="20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Right Anchor */}
      <line
        x1="28"
        y1="30"
        x2="28"
        y2="20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Center Jump Anchor (Elevated, representing the Leap) */}
      <line
        x1="20"
        y1="18"
        x2="20"
        y2="8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Dotted/dashed curve tracing the Leap path */}
      <path
        d="M 12 20 C 12 10, 20 2, 20 8 C 20 14, 28 10, 28 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 3"
        fill="none"
        opacity="0.7"
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



