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
      {/* Minimal monochrome mark: two parallel lines with an arc "jumping" the gap */}
      <line x1="6" y1="26" x2="16" y2="26" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="24" y1="26" x2="34" y2="26" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M14 26 C 16 12, 24 12, 26 26"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
        className={animated ? "lj-arc" : ""}
      />
      <circle cx="20" cy="13" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function LinejumpWordmark({ height = 24, animated = false }: { height?: number; animated?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <LinejumpLogo size={height * 1.4} animated={animated} />
      <span
        className="font-medium tracking-tight"
        style={{ fontSize: height * 0.72, lineHeight: 1, letterSpacing: "-0.02em" }}
      >
        Linejump
      </span>
    </div>
  );
}
