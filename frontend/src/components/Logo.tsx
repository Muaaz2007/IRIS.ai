/**
 * IRIS.ai brand mark — a stylized painted eye (from the user's artwork).
 * Pure SVG so it scales anywhere and inherits theme colors via CSS variables.
 * Warm amber-brown iris, dark pupil, bright catchlight, soft lash strokes.
 */
export function IrisEyeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Ball of the eye — warm skin/aperture ring tones */}
      <circle cx="32" cy="32" r="30" fill="url(#irisRing)" />
      <circle cx="32" cy="32" r="26" fill="url(#irisCore)" />
      {/* Brushy striations around the iris */}
      <g stroke="#8A4A1B" strokeWidth="2.4" strokeLinecap="round" opacity="0.55">
        <path d="M32 10v7" />
        <path d="M42 12.5l-3.4 6.2" />
        <path d="M50.5 20l-5.7 4.4" />
        <path d="M22 12.5l3.4 6.2" />
        <path d="M13.5 20l5.7 4.4" />
        <path d="M32 54v-7" />
        <path d="M50.5 44l-5.7-4.4" />
        <path d="M13.5 44l5.7-4.4" />
      </g>
      <g stroke="#C97A3A" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <path d="M38 15l-1.8 5.4" />
        <path d="M26 15l1.8 5.4" />
        <path d="M47 26l-5.2 2" />
        <path d="M17 26l5.2 2" />
      </g>
      {/* Warm amber lower-iris reflections */}
      <path d="M20 40c3.5 6.5 12 9.5 20 7-4 6-16 5.5-20-7z" fill="#E8A24B" opacity="0.85" />
      <path d="M27 44c4 2.6 9.5 2 12-1.4-2.6 4.6-10 4.6-12 1.4z" fill="#F3C878" opacity="0.9" />
      {/* Pupil */}
      <circle cx="32" cy="29" r="12.5" fill="#1A120C" />
      <circle cx="32" cy="29" r="12.5" stroke="#3A2414" strokeWidth="1.4" opacity="0.9" />
      {/* Catchlight */}
      <g fill="#E9F2FB">
        <path d="M38.5 20.5l5.5-5.5 3 3-5.5 5.5c-1.2-.6-2.4-1.6-3-3z" opacity="0.95" />
        <rect x="46" y="17" width="2.4" height="6.2" rx="1.2" transform="rotate(45 46 17)" opacity="0.9" />
        <rect x="43.4" y="13.4" width="2.4" height="6.2" rx="1.2" transform="rotate(45 43.4 13.4)" opacity="0.85" />
      </g>
      {/* Eyelid shadow at top of globe */}
      <path d="M6 30c2-14 14-24 26-24s24 10 26 24c-4-10-14-16-26-16S10 20 6 30z" fill="#5B3A28" opacity="0.28" />
      <defs>
        <radialGradient id="irisRing" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#E9B37E" />
          <stop offset="0.7" stopColor="#C97A3A" />
          <stop offset="1" stopColor="#7A4520" />
        </radialGradient>
        <radialGradient id="irisCore" cx="0.5" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#B05F24" />
          <stop offset="0.75" stopColor="#8A4A1B" />
          <stop offset="1" stopColor="#4E2A10" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Sidebar / header logo: the eye mark inside a warm rounded tile. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#E9B37E] via-accent to-accent-hover shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <IrisEyeMark className="h-[78%] w-[78%]" />
    </span>
  );
}

/** Small assistant avatar shown next to every model reply. */
export function AssistantAvatar() {
  return (
    <span
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#E9B37E] via-accent to-accent-hover shadow-sm"
      aria-hidden
    >
      <IrisEyeMark className="h-[76%] w-[76%]" />
    </span>
  );
}
