import { PetMascot } from "@/components/mascot/PetMascot";
import type { TabInsight } from "@/lib/report/tabInsightGenerator";
import type { PetSpecies } from "@/types/reading";

type TabInsightCardProps = {
  species: PetSpecies;
  insight: TabInsight;
};

export function TabInsightCard({ species, insight }: TabInsightCardProps) {
  return (
    <aside
      className="rounded-[1.75rem] border border-moss/20 bg-moss/10 p-4 shadow-sm sm:p-5"
      data-testid="tab-insight-card"
      data-tab-insight={insight.tabId}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-black text-moss">{insight.title}</p>
          <p className="mt-2 break-keep text-sm font-bold leading-7 text-ink/72 sm:text-base">
            {insight.body}
          </p>
        </div>
        <div className="justify-self-start sm:justify-self-end">
          <PetMascot
            species={species}
            mood={insight.mood}
            size="sm"
            decorative
            className="rounded-full bg-white/70 p-1"
          />
        </div>
      </div>
    </aside>
  );
}
