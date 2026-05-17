import type { MascotMood } from "@/components/mascot/types";

type DogMascotProps = {
  mood?: MascotMood;
  className?: string;
  label?: string;
};

const outline = "#3A2418";
const fur = "#FFF0CB";
const lightFur = "#FFF8E6";
const ear = "#C87934";
const cheek = "#FF9B92";
const ink = "#171313";

function MoodItem({ mood }: { mood: MascotMood }) {
  if (mood === "sleepy") {
    return (
      <g fill="#A53D62" opacity="0.72">
        <rect x="162" y="44" width="16" height="6" />
        <rect x="172" y="50" width="6" height="6" />
        <rect x="162" y="56" width="16" height="6" />
        <rect x="188" y="30" width="11" height="5" />
        <rect x="194" y="35" width="5" height="5" />
        <rect x="188" y="40" width="11" height="5" />
      </g>
    );
  }

  if (mood === "reading") {
    return (
      <g transform="translate(58 150)">
        <rect x="7" y="7" width="100" height="50" fill="#2B2528" opacity="0.12" />
        <rect x="0" y="0" width="50" height="42" fill={outline} />
        <rect x="8" y="8" width="34" height="26" fill="#FFF7EC" />
        <rect x="50" y="0" width="50" height="42" fill={outline} />
        <rect x="58" y="8" width="34" height="26" fill="#FFFDF8" />
        <rect x="47" y="6" width="6" height="36" fill="#8F5A55" />
        <rect x="16" y="18" width="18" height="4" fill="#A53D62" />
        <rect x="66" y="18" width="18" height="4" fill="#4B7B5A" />
      </g>
    );
  }

  if (mood === "holding-card" || mood === "payment" || mood === "pdf") {
    const accentFill =
      mood === "payment" ? "#F6B65C" : mood === "pdf" ? "#4B7B5A" : "#A53D62";

    return (
      <g transform="translate(66 148)">
        <rect x="6" y="6" width="88" height="52" fill="#2B2528" opacity="0.12" />
        <rect x="0" y="0" width="88" height="52" fill={outline} />
        <rect x="8" y="8" width="72" height="36" fill="#FFFDF8" />
        <rect x="16" y="17" width="12" height="12" fill="#E9774D" />
        <rect x="36" y="17" width="32" height="5" fill="#4B7B5A" />
        <rect x="16" y="34" width="52" height="5" fill="#A53D62" />
        <rect x="58" y="26" width="12" height="12" fill={accentFill} />
        <rect x="62" y="22" width="4" height="20" fill="#FFFDF8" opacity="0.68" />
      </g>
    );
  }

  if (mood === "star") {
    return (
      <g fill="#E9774D">
        <rect x="182" y="54" width="8" height="8" />
        <rect x="174" y="62" width="24" height="8" />
        <rect x="182" y="70" width="8" height="8" />
        <rect x="52" y="66" width="7" height="7" />
      </g>
    );
  }

  if (mood === "curious") {
    return (
      <g>
        <rect x="164" y="46" width="30" height="30" fill={outline} />
        <rect x="171" y="53" width="16" height="16" fill="#FFFDF8" />
        <rect x="176" y="56" width="8" height="5" fill="#A53D62" />
        <rect x="181" y="61" width="5" height="5" fill="#A53D62" />
        <rect x="176" y="67" width="5" height="5" fill="#A53D62" />
      </g>
    );
  }

  return null;
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
      shapeRendering="crispEdges"
    >
      <ellipse cx="120" cy="210" rx="56" ry="10" fill="#2B2528" opacity="0.07" />

      <g>
        <path
          d="M76 62h88v10h18v24h10v70h-10v18h-24v14h-22v-14h-32v14H82v-14H58v-18H48V96h10V72h18z"
          fill={outline}
        />
        <path
          d="M84 72h72v10h18v22h10v54h-10v16h-26v14h-10v-14h-36v14H92v-14H66v-16H56v-54h10V82h18z"
          fill={fur}
        />

        <rect x="48" y="80" width="28" height="58" fill={outline} />
        <rect x="56" y="88" width="18" height="44" fill={ear} />
        <rect x="164" y="80" width="28" height="58" fill={outline} />
        <rect x="166" y="88" width="18" height="44" fill={ear} />
        <rect x="84" y="58" width="72" height="16" fill={outline} />
        <rect x="94" y="58" width="52" height="10" fill={ear} />

        <rect x="78" y="86" width="32" height="44" fill={lightFur} />
        <rect x="130" y="86" width="32" height="44" fill={lightFur} />
        <rect x="95" y="128" width="50" height="40" fill={lightFur} />

        <rect x="90" y="118" width="9" height="12" fill={ink} />
        <rect x="141" y="118" width="9" height="12" fill={ink} />
        <rect x="116" y="135" width="12" height="8" fill={ink} />
        <rect x="108" y="148" width="8" height="7" fill={ink} />
        <rect x="128" y="148" width="8" height="7" fill={ink} />
        <rect x="116" y="155" width="12" height="5" fill={ink} />
        <rect x="77" y="137" width="12" height="12" fill={cheek} opacity="0.82" />
        <rect x="151" y="137" width="12" height="12" fill={cheek} opacity="0.82" />

        <rect x="72" y="172" width="20" height="22" fill={outline} />
        <rect x="78" y="172" width="12" height="14" fill={fur} />
        <rect x="148" y="172" width="20" height="22" fill={outline} />
        <rect x="150" y="172" width="12" height="14" fill={fur} />

        <rect className="mascot-tail" x="180" y="130" width="16" height="38" fill={outline} />
        <rect className="mascot-tail" x="194" y="116" width="16" height="18" fill={outline} />
        <rect className="mascot-tail" x="202" y="134" width="14" height="14" fill={outline} />
        <rect className="mascot-tail" x="186" y="136" width="8" height="26" fill={ear} />
        <rect className="mascot-tail" x="198" y="122" width="8" height="10" fill={ear} />
      </g>

      <MoodItem mood={mood} />
    </svg>
    </>
  );
}
