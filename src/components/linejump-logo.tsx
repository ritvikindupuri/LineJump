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
      {/* Top half of the split circle (offset to the right, y-separated) */}
      <path
        d="M 10 18 C 10 11.5, 15.5 6, 22 6 C 28.5 6, 34 11.5, 34 18 Z"
        fill="currentColor"
      />
      {/* Bottom half of the split circle (offset to the left, y-separated) */}
      <path
        d="M 6 22 C 6 28.5, 11.5 34, 18 34 C 24.5 34, 30 28.5, 30 22 Z"
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



