import { PawPattern } from "@/components/mascot/PawPattern";
import { PetMascot } from "@/components/mascot/PetMascot";
import type { MascotType } from "@/components/mascot/types";

type ReportSceneBannerProps = {
  type?: MascotType;
  title?: string;
  bubbleText?: string;
  className?: string;
};

function FloatingCard({
  className = "",
  tone = "berry",
}: {
  className?: string;
  tone?: "berry" | "moss" | "persimmon";
}) {
  const color = {
    berry: "bg-berry/35",
    moss: "bg-moss/35",
    persimmon: "bg-persimmon/35",
  }[tone];

  return (
    <span
      aria-hidden="true"
      className={`rounded-2xl border border-white/70 bg-white/85 p-3 shadow-sm ${className}`}
    >
      <span className={`block h-2 w-14 rounded-full ${color}`} />
      <span className={`mt-2 block h-2 w-9 rounded-full ${color}`} />
    </span>
  );
}

function FloatingMoon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`rounded-full bg-white/70 p-2 shadow-sm ${className}`}
    >
      <span className="block h-7 w-7 rounded-full bg-persimmon/25 shadow-[inset_-8px_0_0_rgba(255,255,255,0.9)]" />
    </span>
  );
}

function FloatingCalendar({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`rounded-2xl border border-white/70 bg-white/85 p-3 shadow-sm ${className}`}
    >
      <span className="mb-2 block h-2 w-16 rounded-full bg-persimmon/35" />
      <span className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index} className="h-2 w-2 rounded-full bg-moss/30" />
        ))}
      </span>
    </span>
  );
}

export function ReportSceneBanner({
  type = "both",
  title,
  bubbleText = "우리 아이 마음결을 살짝 읽어볼까요?",
  className = "",
}: ReportSceneBannerProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-berry/10 bg-[#FFF0D9] p-5 shadow-soft ${className}`}
      aria-label={title}
      data-testid="report-scene-banner"
    >
      <PawPattern className="absolute inset-0 h-full w-full opacity-35" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(232,93,139,0.16),transparent_20rem),radial-gradient(circle_at_90%_10%,rgba(111,174,123,0.14),transparent_18rem)]"
      />
      <FloatingCard className="mascot-bob absolute left-5 top-6 rotate-[-9deg]" />
      <FloatingCard
        tone="moss"
        className="absolute right-6 top-9 hidden rotate-6 sm:block"
      />
      <FloatingCalendar className="absolute bottom-5 right-6 rotate-[-6deg]" />
      <FloatingMoon className="absolute bottom-8 left-8 hidden sm:block" />
      <div className="relative grid min-h-56 place-items-center text-center sm:min-h-72">
        {title ? (
          <p className="mb-3 rounded-full bg-white/75 px-4 py-2 text-xs font-black text-berry shadow-sm">
            {title}
          </p>
        ) : null}
        <PetMascot
          type={type}
          mood="reading"
          size="hero"
          withBubble
          bubbleText={bubbleText}
          label="사주 카드와 리포트를 함께 보는 멍냥사주 캐릭터"
        />
      </div>
    </section>
  );
}
