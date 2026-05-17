type PawPatternProps = {
  className?: string;
};

export function PawPattern({ className = "" }: PawPatternProps) {
  return (
    <svg
      className={className}
      aria-hidden
      focusable="false"
      viewBox="0 0 320 220"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id="paw-pattern"
          width="80"
          height="72"
          patternUnits="userSpaceOnUse"
        >
          <g fill="#A53D62" opacity="0.13">
            <ellipse cx="38" cy="42" rx="12" ry="10" />
            <circle cx="23" cy="27" r="6" />
            <circle cx="36" cy="20" r="6" />
            <circle cx="50" cy="27" r="6" />
            <circle cx="58" cy="39" r="5" />
          </g>
        </pattern>
      </defs>
      <rect width="320" height="220" fill="url(#paw-pattern)" />
    </svg>
  );
}
