export type PetSpecies = "dog" | "cat";

export type LivingEnvironment =
  | "single_household"
  | "with_family"
  | "with_other_pets"
  | "mostly_indoor"
  | "active_outdoor";

export type DailyActivityFrequency =
  | "rarely"
  | "once"
  | "twice"
  | "three_plus";

export type AloneTime = "almost_none" | "one_to_three" | "four_to_six" | "seven_plus";

export type StrangerReaction =
  | "approaches_quickly"
  | "observes_carefully"
  | "barks_or_guards"
  | "hides_or_avoids";

export type GuardianDistance =
  | "always_close"
  | "moderately_close"
  | "independent"
  | "depends_on_mood";

export type FavoriteActivity =
  | "walk"
  | "ball_play"
  | "treat_search"
  | "petting"
  | "sleeping"
  | "window_watch"
  | "short_hunt_play";

export type GuardianQuestion =
  | "personality"
  | "bond"
  | "routine"
  | "sensitive_moments"
  | "year_flow"
  | "two_pet_match";

export type PetLifestyleProfile = {
  livingEnvironment: LivingEnvironment[];
  dailyActivityFrequency: DailyActivityFrequency | null;
  aloneTime: AloneTime | null;
  strangerReaction: StrangerReaction | null;
  guardianDistance: GuardianDistance | null;
  favoriteActivities: FavoriteActivity[];
  guardianQuestions: GuardianQuestion[];
};

export type Reading = {
  id: string;
  petName: string;
  species: PetSpecies;
  birthDate: string;
  birthTime: string | null;
  adoptionDate: string;
  metDate: string;
  guardianEmail: string;
  freeSummary: string;
  freeKeywords: string[];
  freeSections: ReadingSection[];
  premiumPreviewSections: ReadingSection[];
  lifestyle: PetLifestyleProfile;
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
