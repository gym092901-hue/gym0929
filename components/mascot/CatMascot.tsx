import type { MascotMood } from "@/components/mascot/types";

type CatMascotProps = {
  mood?: MascotMood;
  className?: string;
  label?: string;
};

const outline = "#44302A";
const fur = "#F7B45A";
const cream = "#FFF5DD";
const stripe = "#CF7C35";
const innerEar = "#FFB6B2";
const cheek = "#FF9B9B";
const ink = "#2B2220";
const berry = "#E85D8B";
const moss = "#6FAE7B";
const persimmon = "#F3A057";

function Sparkles() {
  return (
    <g aria-hidden="true">
      <path d="M44 55l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill={moss} opacity="0.85" />
      <circle cx="199" cy="59" r="6" fill={berry} opacity="0.62" />
      <circle cx="214" cy="84" r="4" fill={persimmon} opacity="0.72" />
      <path d="M200 154c8 2 14 8 16 16-8 2-14 8-16 16-2-8-8-14-16-16 8-2 14-8 16-16z" fill="#FFD36B" opacity="0.85" />
    </g>
  );
}

function SoftTail() {
  return (
    <path
      aria-hidden="true"
      d="M175 164c28-12 31 31 8 31-16 0-20-20-5-27"
      fill="none"
      stroke={outline}
      strokeLinecap="round"
      strokeWidth="17"
    />
  );
}

function ReportCard({ mood }: { mood: MascotMood }) {
  if (!["reading", "holding-card", "payment", "pdf", "star", "curious"].includes(mood)) {
    return null;
  }

  const accent = mood === "pdf" ? moss : mood === "payment" ? persimmon : berry;
  const isBook = mood === "reading";

  if (mood === "curious") {
    return (
      <g aria-hidden="true" transform="translate(154 43)">
        <circle cx="22" cy="22" r="18" fill="#FFFFFF" stroke={outline} strokeWidth="6" />
        <path d="M35 35l18 18" stroke={outline} strokeLinecap="round" strokeWidth="8" />
        <path d="M19 13c3 6 8 9 14 11-6 2-11 6-14 12-2-6-6-10-12-12 6-2 10-6 12-11z" fill={moss} opacity="0.8" />
      </g>
    );
  }

  if (isBook) {
    return (
      <g aria-hidden="true" transform="translate(62 151)">
        <path d="M4 9c18-8 35-8 52 0 17-8 34-8 52 0v53c-18-7-35-7-52 1-17-8-34-8-52-1z" fill="#FFFFFF" stroke={outline} strokeLinejoin="round" strokeWidth="6" />
        <path d="M56 11v50" stroke="#D8C4A5" strokeLinecap="round" strokeWidth="4" />
        <path d="M21 27h22M21 40h17M72 27h22M72 40h15" stroke={accent} strokeLinecap="round" strokeWidth="5" />
      </g>
    );
  }

  return (
    <g aria-hidden="true" transform="translate(66 148)">
      <rect x="4" y="6" width="96" height="62" rx="18" fill="#2B2528" opacity="0.1" />
      <rect x="0" y="0" width="96" height="62" rx="18" fill="#FFFFFF" stroke={outline} strokeWidth="6" />
      <path d="M17 19h42M17 34h30M17 47h58" stroke={accent} strokeLinecap="round" strokeWidth="6" />
      <path d="M68 18c5 2 8 6 10 11 2-5 6-9 11-11-5-2-9-6-11-11-2 5-5 9-10 11z" fill={moss} />
      {mood === "pdf" ? (
        <path d="M73 0v18h18" fill="#F7F1E7" stroke={outline} strokeLinejoin="round" strokeWidth="4" />
      ) : null}
    </g>
  );
}

function SleepyMarks({ mood }: { mood: MascotMood }) {
  if (mood !== "sleepy") {
    return null;
  }

  return (
    <g aria-hidden="true" fill={moss} opacity="0.7">
      <path d="M178 40h24l-15 20h16v7h-29l15-20h-11z" />
      <path d="M200 22h17l-10 14h11v6h-22l10-14h-6z" opacity="0.72" />
    </g>
  );
}

export function CatMascot({
  mood = "happy",
  className = "",
  label,
}: CatMascotProps) {
  return (
    <>
      {label ? <span className="sr-only">{label}</span> : null}
      <svg
        viewBox="0 0 240 240"
        className={className}
        aria-hidden="true"
        focusable="false"
        data-mascot-kind="cat"
      >
        <ellipse cx="120" cy="214" rx="66" ry="14" fill="#2B2528" opacity="0.1" />
        <Sparkles />
        <SoftTail />

        <g aria-hidden="true">
          <path d="M69 77L75 34l34 31c7-2 15-3 23-3s16 1 23 3l34-31 6 43c17 15 26 36 26 61 0 40-28 65-89 65s-89-25-89-65c0-25 9-46 26-61z" fill={fur} stroke={outline} strokeLinejoin="round" strokeWidth="8" />
          <path d="M79 64l3-18 15 15c-6 1-12 2-18 3z" fill={innerEar} />
          <path d="M161 61l15-15 3 18c-6-1-12-2-18-3z" fill={innerEar} />
          <path d="M84 129c0-32 16-53 36-53s36 21 36 53c0 31-14 51-36 51s-36-20-36-51z" fill={cream} opacity="0.78" />
          <path d="M102 64l8 17M120 59v19M138 64l-8 17" stroke={stripe} strokeLinecap="round" strokeWidth="7" opacity="0.7" />

          <ellipse cx="93" cy="123" rx="7" ry="10" fill={ink} />
          <ellipse cx="147" cy="123" rx="7" ry="10" fill={ink} />
          <circle cx="96" cy="119" r="2.5" fill="#FFFFFF" opacity="0.9" />
          <circle cx="150" cy="119" r="2.5" fill="#FFFFFF" opacity="0.9" />
          <path d="M113 139c5-5 11-5 16 0-1 8-15 8-16 0z" fill={ink} />
          <path d="M121 147v8" stroke={ink} strokeLinecap="round" strokeWidth="4" />
          <path d="M107 157c7 7 20 7 27 0" fill="none" stroke={ink} strokeLinecap="round" strokeWidth="5" />
          <circle cx="77" cy="143" r="10" fill={cheek} opacity="0.82" />
          <circle cx="163" cy="143" r="10" fill={cheek} opacity="0.82" />

          <path d="M62 140h28M59 155h30M150 140h28M151 155h30" stroke={outline} strokeLinecap="round" strokeWidth="4" opacity="0.55" />
          <path d="M92 188v15M148 188v15" stroke={outline} strokeLinecap="round" strokeWidth="9" />
          <path d="M92 201h18M130 201h18" stroke={outline} strokeLinecap="round" strokeWidth="7" />
        </g>

        <ReportCard mood={mood} />
        <SleepyMarks mood={mood} />
      </svg>
    </>
  );
}
