export type PetSpecies = "dog" | "cat";

export type Reading = {
  id: string;
  petName: string;
  species: PetSpecies;
  birthDate: string;
  birthTime: string | null;
  metDate: string;
  guardianEmail: string;
  freeSummary: string;
  freeKeywords: string[];
  freeSections: ReadingSection[];
  premiumPreviewSections: ReadingSection[];
  premiumSections: {
    title: string;
    body: string;
  }[];
};

export type ReadingSection = {
  id: string;
  title: string;
  kicker: string;
  body: string;
  icon: string;
};
