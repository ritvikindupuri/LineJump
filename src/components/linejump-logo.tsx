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
        {/* Transparent LED cutout masks */}
        <mask id="top-drawer-mask">
          <rect x="9" y="10" width="22" height="5" rx="1.5" fill="white" />
          <circle cx="13" cy="12.5" r="1.2" fill="black" />
        </mask>
        <mask id="mid-drawer-mask">
          <rect x="14" y="17.5" width="22" height="5" rx="1.5" fill="white" />
          <circle cx="18" cy="20" r="1.2" fill="black" />
        </mask>
        <mask id="bot-drawer-mask">
          <rect x="9" y="25" width="22" height="5" rx="1.5" fill="white" />
          <circle cx="13" cy="27.5" r="1.2" fill="black" />
        </mask>
      </defs>

      {/* Top Server Drawer (Centered) */}
      <rect
        x="9"
        y="10"
        width="22"
        height="5"
        rx="1.5"
        fill="currentColor"
        mask="url(#top-drawer-mask)"
      />

      {/* Middle Server Drawer (Shifted/Jumped to the right) */}
      <rect
        x="14"
        y="17.5"
        width="22"
        height="5"
        rx="1.5"
        fill="currentColor"
        mask="url(#mid-drawer-mask)"
      />

      {/* Bottom Server Drawer (Centered) */}
      <rect
        x="9"
        y="25"
        width="22"
        height="5"
        rx="1.5"
        fill="currentColor"
        mask="url(#bot-drawer-mask)"
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



