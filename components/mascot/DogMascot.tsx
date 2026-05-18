import type { MascotMood } from "@/components/mascot/types";

type DogMascotProps = {
  mood?: MascotMood;
  className?: string;
  label?: string;
};

const outline = "#4A2F24";
const fur = "#FFE3A8";
const cream = "#FFF7E5";
const ear = "#C97938";
const cheek = "#FF9B9B";
const ink = "#2B2220";
const berry = "#E85D8B";
const moss = "#6FAE7B";
const persimmon = "#F3A057";

function Sparkles() {
  return (
    <g aria-hidden="true">
      <path d="M42 51l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill={persimmon} opacity="0.9" />
      <circle cx="198" cy="58" r="6" fill={berry} opacity="0.65" />
      <circle cx="214" cy="82" r="4" fill={moss} opacity="0.65" />
      <path d="M206 153c8 2 14 8 16 16-8 2-14 8-16 16-2-8-8-14-16-16 8-2 14-8 16-16z" fill="#FFD36B" opacity="0.85" />
    </g>
  );
}

function PawPrints() {
  return (
    <g aria-hidden="true" fill={outline} opacity="0.16">
      <circle cx="42" cy="177" r="4" />
      <circle cx="55" cy="171" r="4" />
      <circle cx="65" cy="181" r="4" />
      <ellipse cx="55" cy="187" rx="10" ry="7" />
    </g>
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
      <g aria-hidden="true" transform="translate(156 42)">
        <circle cx="21" cy="21" r="18" fill="#FFFFFF" stroke={outline} strokeWidth="6" />
        <path d="M34 34l18 18" stroke={outline} strokeLinecap="round" strokeWidth="8" />
        <path d="M18 13c3 6 8 9 14 11-6 2-11 6-14 12-2-6-6-10-12-12 6-2 10-6 12-11z" fill={berry} opacity="0.75" />
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
      <path d="M67 18c5 2 8 6 10 11 2-5 6-9 11-11-5-2-9-6-11-11-2 5-5 9-10 11z" fill={persimmon} />
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
    <g aria-hidden="true" fill={berry} opacity="0.7">
      <path d="M178 40h24l-15 20h16v7h-29l15-20h-11z" />
      <path d="M200 22h17l-10 14h11v6h-22l10-14h-6z" opacity="0.72" />
    </g>
  );
}

export function DogMascot({
  mood = "happy",
  className = "",
  label,
}: DogMascotProps) {
  return (
    <>
      {label ? <span className="sr-only">{label}</span> : null}
      <svg
        viewBox="0 0 240 240"
        className={className}
        aria-hidden="true"
        focusable="false"
        data-mascot-kind="dog"
      >
        <ellipse cx="120" cy="214" rx="66" ry="14" fill="#2B2528" opacity="0.1" />
        <Sparkles />
        <PawPrints />

        <g aria-hidden="true">
          <path d="M50 111c-16-34-4-70 27-76 22-4 35 10 37 29-9 18-28 37-49 50z" fill={ear} stroke={outline} strokeLinejoin="round" strokeWidth="8" />
          <path d="M190 111c16-34 4-70-27-76-22-4-35 10-37 29 9 18 28 37 49 50z" fill={ear} stroke={outline} strokeLinejoin="round" strokeWidth="8" />
          <path d="M59 120c0-47 27-80 61-80s61 33 61 80c0 44-25 74-61 74s-61-30-61-74z" fill={fur} stroke={outline} strokeWidth="8" />
          <path d="M78 111c0-35 18-59 42-59s42 24 42 59c0 34-17 55-42 55s-42-21-42-55z" fill={cream} opacity="0.72" />
          <path d="M54 126c-15 7-25 24-20 43 5 20 24 30 44 22" fill="none" stroke={outline} strokeLinecap="round" strokeWidth="8" />
          <path d="M186 130c22 5 31 24 25 41-5 15-20 23-37 18" fill="none" stroke={outline} strokeLinecap="round" strokeWidth="8" />
          <path d="M205 165c9-3 15-11 14-20" fill="none" stroke={ear} strokeLinecap="round" strokeWidth="8" />

          <ellipse cx="94" cy="121" rx="7" ry="10" fill={ink} />
          <ellipse cx="146" cy="121" rx="7" ry="10" fill={ink} />
          <circle cx="97" cy="117" r="2.5" fill="#FFFFFF" opacity="0.9" />
          <circle cx="149" cy="117" r="2.5" fill="#FFFFFF" opacity="0.9" />
          <path d="M112 137c5-5 11-5 16 0-1 8-15 8-16 0z" fill={ink} />
          <path d="M120 145v8" stroke={ink} strokeLinecap="round" strokeWidth="4" />
          <path d="M106 155c7 8 21 8 28 0" fill="none" stroke={ink} strokeLinecap="round" strokeWidth="5" />
          <circle cx="78" cy="142" r="10" fill={cheek} opacity="0.8" />
          <circle cx="162" cy="142" r="10" fill={cheek} opacity="0.8" />
          <path d="M91 185v16M149 185v16" stroke={outline} strokeLinecap="round" strokeWidth="9" />
          <path d="M91 199h18M131 199h18" stroke={outline} strokeLinecap="round" strokeWidth="7" />
        </g>

        <ReportCard mood={mood} />
        <SleepyMarks mood={mood} />
      </svg>
    </>
  );
}
