import type { MascotMood } from "@/components/mascot/types";

type CatMascotProps = {
  mood?: MascotMood;
  className?: string;
  label?: string;
};

const outline = "#3A2418";
const fur = "#F6B65C";
const lightFur = "#FFF3DB";
const innerEar = "#FFB2AA";
const cheek = "#FF9B92";
const ink = "#171313";

function MoodItem({ mood }: { mood: MascotMood }) {
  if (mood === "sleepy") {
    return (
      <g fill="#4B7B5A" opacity="0.72">
        <rect x="164" y="44" width="16" height="6" />
        <rect x="174" y="50" width="6" height="6" />
        <rect x="164" y="56" width="16" height="6" />
        <rect x="190" y="30" width="11" height="5" />
        <rect x="196" y="35" width="5" height="5" />
        <rect x="190" y="40" width="11" height="5" />
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
        <rect x="47" y="6" width="6" height="36" fill="#6F6762" />
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
        <rect x="16" y="17" width="50" height="5" fill="#4B7B5A" />
        <rect x="16" y="34" width="42" height="5" fill="#A53D62" />
        <rect x="62" y="24" width="12" height="12" fill={accentFill} />
        <rect x="66" y="20" width="4" height="20" fill="#FFFDF8" opacity="0.68" />
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
        <rect x="176" y="56" width="8" height="5" fill="#4B7B5A" />
        <rect x="181" y="61" width="5" height="5" fill="#4B7B5A" />
        <rect x="176" y="67" width="5" height="5" fill="#4B7B5A" />
      </g>
    );
  }

  return null;
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
      shapeRendering="crispEdges"
    >
      <ellipse cx="120" cy="210" rx="56" ry="10" fill="#2B2528" opacity="0.07" />

      <g>
        <path
          d="M70 82h-12V62h10V48h20v12h18v20h28V60h18V48h20v14h10v20h-12v82h-12v18h-22v14h-18v-14h-34v14H86v-14H64v-18H52V82z"
          fill={outline}
        />
        <path
          d="M76 88H66V72h10V62h8v10h22v18h28V72h22V62h8v10h10v16h-10v68h-12v18h-26v12h-10v-12H94v12H84v-12H58v-18H60V88z"
          fill={fur}
        />
        <rect x="76" y="66" width="8" height="14" fill={innerEar} />
        <rect x="154" y="66" width="8" height="14" fill={innerEar} />

        <rect x="78" y="94" width="32" height="42" fill={lightFur} />
        <rect x="130" y="94" width="32" height="42" fill={lightFur} />
        <rect x="102" y="126" width="36" height="44" fill={lightFur} />

        <rect x="88" y="120" width="9" height="12" fill={ink} />
        <rect x="143" y="120" width="9" height="12" fill={ink} />
        <rect x="116" y="140" width="12" height="8" fill={ink} />
        <rect x="110" y="154" width="8" height="7" fill={ink} />
        <rect x="128" y="154" width="8" height="7" fill={ink} />
        <rect x="118" y="161" width="12" height="5" fill={ink} />
        <rect x="76" y="140" width="12" height="12" fill={cheek} opacity="0.82" />
        <rect x="152" y="140" width="12" height="12" fill={cheek} opacity="0.82" />

        <rect x="50" y="138" width="24" height="4" fill={outline} opacity="0.72" />
        <rect x="50" y="152" width="24" height="4" fill={outline} opacity="0.72" />
        <rect x="166" y="138" width="24" height="4" fill={outline} opacity="0.72" />
        <rect x="166" y="152" width="24" height="4" fill={outline} opacity="0.72" />

        <rect x="72" y="172" width="20" height="22" fill={outline} />
        <rect x="78" y="172" width="12" height="14" fill={fur} />
        <rect x="148" y="172" width="20" height="22" fill={outline} />
        <rect x="150" y="172" width="12" height="14" fill={fur} />

        <rect className="mascot-tail" x="180" y="130" width="16" height="38" fill={outline} />
        <rect className="mascot-tail" x="194" y="116" width="16" height="18" fill={outline} />
        <rect className="mascot-tail" x="202" y="134" width="14" height="14" fill={outline} />
        <rect className="mascot-tail" x="186" y="136" width="8" height="26" fill={fur} />
        <rect className="mascot-tail" x="198" y="122" width="8" height="10" fill={fur} />
      </g>

      <MoodItem mood={mood} />
    </svg>
    </>
  );
}
