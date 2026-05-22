import React from "react";

export function AppsScriptLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Mask to create transparent cutout circles at the end of each pill */}
        <mask id="as-logo-mask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <circle cx="14" cy="5.5" r="1.1" fill="black" transform="rotate(-90, 14, 18)" />
          <circle cx="14" cy="5.5" r="1.1" fill="black" transform="rotate(-52, 14, 18)" />
          <circle cx="14" cy="5.5" r="1.1" fill="black" transform="rotate(-15, 14, 18)" />
          <circle cx="14" cy="5.5" r="1.1" fill="black" transform="rotate(22, 14, 18)" />
        </mask>
      </defs>

      {/* The 4 radiating pills of the Apps Script logo structure in purple shades */}
      <g mask="url(#as-logo-mask)">
        {/* Pill 1 (Bottom Left - Horizontal) */}
        <rect
          x="12"
          y="3"
          width="4"
          height="15"
          rx="2"
          fill="#c084fc"
          transform="rotate(-90, 14, 18)"
        />
        {/* Pill 2 (Tilted Left) */}
        <rect
          x="12"
          y="3"
          width="4"
          height="15"
          rx="2"
          fill="#a855f7"
          transform="rotate(-52, 14, 18)"
        />
        {/* Pill 3 (Tilted Center) */}
        <rect
          x="12"
          y="3"
          width="4"
          height="15"
          rx="2"
          fill="#8b5cf6"
          transform="rotate(-15, 14, 18)"
        />
        {/* Pill 4 (Top Right - Vertical-ish) */}
        <rect
          x="12"
          y="3"
          width="4"
          height="15"
          rx="2"
          fill="#6366f1"
          transform="rotate(22, 14, 18)"
        />
      </g>
    </svg>
  );
}
