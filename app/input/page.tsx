"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { PetInputSummaryTags } from "@/components/report/PetInputSummaryTags";
import { ReportMobileBar } from "@/components/report/ReportMobileBar";
import {
  aloneTimeOptions,
  dailyActivityOptions,
  favoriteActivityOptions,
  getLifestyleSummaryTags,
  guardianDistanceOptions,
  guardianQuestionOptions,
  livingEnvironmentOptions,
  strangerReactionOptions,
} from "@/lib/readings/lifestyle";
import type {
  AloneTime,
  DailyActivityFrequency,
  FavoriteActivity,
  GuardianDistance,
  GuardianQuestion,
  LivingEnvironment,
  PetLifestyleProfile,
  PetSpecies,
  StrangerReaction,
} from "@/types/reading";

type FieldKey =
  | "petName"
  | "species"
  | "birthDate"
  | "adoptionDate"
  | "guardianEmail"
  | "form";

type FieldErrors = Partial<Record<FieldKey, string>>;

function getTodayDateString() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function isFutureDate(value: string, today: string) {
  return Boolean(value) && value > today;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function ErrorText({ message, id }: { message?: string; id: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="text-xs font-bold leading-5 text-berry">
      {message}
    </p>
  );
}

function MiniScene({
  type,
  mood,
  icon,
  tone = "berry",
}: {
  type: "dog" | "cat";
  mood: "curious" | "holding-card";
  icon: "calendar" | "clock";
  tone?: "berry" | "moss" | "persimmon";
}) {
  const toneClass = {
    berry: "border-berry/15 bg-berry/10 text-berry",
    moss: "border-moss/15 bg-moss/10 text-moss",
    persimmon: "border-persimmon/20 bg-persimmon/10 text-persimmon",
  }[tone];

  return (
    <span
      className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border ${toneClass}`}
      aria-hidden="true"
    >
      <PetMascot
        type={type}
        mood={mood}
        size="sm"
        className="scale-[0.62]"
      />
      <span
        aria-hidden
        className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 shadow-sm"
      >
        {icon === "calendar" ? (
          <span className="grid h-3.5 w-3.5 grid-cols-2 gap-0.5 rounded-[0.2rem] bg-moss/20 p-0.5">
            <span className="col-span-2 h-1 rounded-full bg-moss/55" />
            <span className="rounded-full bg-moss/40" />
            <span className="rounded-full bg-moss/40" />
          </span>
        ) : (
          <span className="relative h-3.5 w-3.5 rounded-full border-2 border-persimmon/55">
            <span className="absolute left-1.5 top-1 h-1.5 w-0.5 rounded-full bg-persimmon/60" />
            <span className="absolute left-1.5 top-1.5 h-0.5 w-1.5 rounded-full bg-persimmon/60" />
          </span>
        )}
      </span>
    </span>
  );
}

function ButtonPaws() {
  return (
    <span
      aria-hidden
      className="mt-3 flex items-center justify-center gap-1.5 text-berry/45"
    >
      <span className="mascot-bob h-2 w-2 rounded-full bg-berry/35" />
      <span className="h-3 w-4 rounded-full bg-berry/25" />
      <span className="mascot-bob h-2 w-2 rounded-full bg-persimmon/35 [animation-delay:160ms]" />
      <span className="h-3 w-4 rounded-full bg-persimmon/25" />
      <span className="mascot-bob h-2 w-2 rounded-full bg-moss/35 [animation-delay:320ms]" />
    </span>
  );
}

function ChipGroup({
  title,
  description,
  options,
  selectedValues,
  onToggle,
  multiple = false,
}: {
  title: string;
  description?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
  multiple?: boolean;
}) {
  return (
    <fieldset className="grid gap-3 rounded-[1.75rem] border border-berry/10 bg-white/70 p-4">
      <legend className="px-1 text-sm font-black text-ink">{title}</legend>
      {description ? (
        <p className="text-xs font-semibold leading-5 text-ink/50">{description}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(option.value)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-black transition ${
                selected
                  ? "scale-[1.02] border-berry/55 bg-berry text-white shadow-soft"
                  : "border-berry/15 bg-white text-ink/65 hover:border-berry/35 hover:bg-berry/10"
              }`}
            >
              {option.label}
              {multiple && selected ? (
                <span aria-hidden="true" className="ml-1">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function toggleArrayValue<T extends string>(values: T[], value: string) {
  return values.includes(value as T)
    ? values.filter((item) => item !== value)
    : [...values, value as T];
}

export default function InputPage() {
  const router = useRouter();
  const today = useMemo(() => getTodayDateString(), []);
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<PetSpecies | "">("");
  const [birthDateUnknown, setBirthDateUnknown] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [adoptionDate, setAdoptionDate] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [livingEnvironment, setLivingEnvironment] = useState<
    LivingEnvironment[]
  >([]);
  const [dailyActivityFrequency, setDailyActivityFrequency] =
    useState<DailyActivityFrequency | null>(null);
  const [aloneTime, setAloneTime] = useState<AloneTime | null>(null);
  const [strangerReaction, setStrangerReaction] =
    useState<StrangerReaction | null>(null);
  const [guardianDistance, setGuardianDistance] =
    useState<GuardianDistance | null>(null);
  const [favoriteActivities, setFavoriteActivities] = useState<
    FavoriteActivity[]
  >([]);
  const [guardianQuestions, setGuardianQuestions] = useState<
    GuardianQuestion[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const summaryErrors = Object.values(errors).filter(Boolean);
  const lifestyle: PetLifestyleProfile = useMemo(
    () => ({
      livingEnvironment,
      dailyActivityFrequency,
      aloneTime,
      strangerReaction,
      guardianDistance,
      favoriteActivities,
      guardianQuestions,
    }),
    [
      aloneTime,
      dailyActivityFrequency,
      favoriteActivities,
      guardianDistance,
      guardianQuestions,
      livingEnvironment,
      strangerReaction,
    ],
  );
  const summaryTags = useMemo(
    () =>
      getLifestyleSummaryTags({
        petName,
        species,
        birthTimeUnknown: timeUnknown,
        lifestyle,
      }),
    [lifestyle, petName, species, timeUnknown],
  );

  function validate(formData: FormData) {
    const nextErrors: FieldErrors = {};
    const name = petName.trim() || String(formData.get("petName") ?? "").trim();
    const submittedSpecies = species || String(formData.get("species") ?? "");
    const submittedBirthDate = birthDateUnknown
      ? ""
      : birthDate || String(formData.get("birthDate") ?? "");
    const submittedAdoptionDate =
      adoptionDate || String(formData.get("adoptionDate") ?? "");
    const guardianEmail = String(formData.get("guardianEmail") ?? "")
      .trim()
      .toLowerCase();

    if (!name) {
      nextErrors.petName = "우리 아이 이름을 입력해 주세요.";
    } else if (name.length > 30) {
      nextErrors.petName = "이름은 30자 이내로 입력해 주세요.";
    }

    if (submittedSpecies !== "dog" && submittedSpecies !== "cat") {
      nextErrors.species = "강아지인지 고양이인지 알려주세요.";
    }

    if (isFutureDate(submittedBirthDate, today)) {
      nextErrors.birthDate = "미래 날짜는 사용할 수 없어요.";
    }

    if (isFutureDate(submittedAdoptionDate, today)) {
      nextErrors.adoptionDate = "미래 날짜는 사용할 수 없어요.";
    }

    if (!submittedBirthDate && !submittedAdoptionDate) {
      const message = birthDateUnknown
        ? "생일을 모른다면 처음 만난 날을 알려주세요."
        : "생년월일 또는 처음 만난 날 중 하나를 알려주세요.";
      nextErrors.birthDate = nextErrors.birthDate ?? message;
      nextErrors.adoptionDate = nextErrors.adoptionDate ?? message;
    }

    if (birthDateUnknown && !submittedAdoptionDate) {
      nextErrors.adoptionDate =
        nextErrors.adoptionDate ?? "생일을 모른다면 처음 만난 날을 알려주세요.";
    }

    if (guardianEmail && !isEmail(guardianEmail)) {
      nextErrors.guardianEmail = "이메일 형식이 올바르지 않아요.";
    } else if (guardianEmail.length > 254) {
      nextErrors.guardianEmail = "이메일 주소가 너무 길어요.";
    }

    return {
      errors: nextErrors,
      values: {
        name,
        species: submittedSpecies,
        birthDate: submittedBirthDate,
        adoptionDate: submittedAdoptionDate,
        guardianEmail,
        birthTime: timeUnknown ? "" : birthTime,
      },
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const { errors: nextErrors, values } = validate(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: values.name,
      type: values.species,
      birth_date: birthDateUnknown ? null : values.birthDate,
      birth_date_unknown: birthDateUnknown,
      birth_time: timeUnknown ? null : values.birthTime,
      birth_time_unknown: timeUnknown,
      adoption_date: values.adoptionDate || null,
      owner_email: values.guardianEmail || null,
      living_environment: lifestyle.livingEnvironment,
      daily_activity_frequency: lifestyle.dailyActivityFrequency,
      alone_time: lifestyle.aloneTime,
      stranger_reaction: lifestyle.strangerReaction,
      guardian_distance: lifestyle.guardianDistance,
      favorite_activities: lifestyle.favoriteActivities,
      guardian_questions: lifestyle.guardianQuestions,
    };

    try {
      const response = await fetch("/api/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        readingId?: string;
        error?: string;
      };

      if (!response.ok || !result.readingId) {
        throw new Error(result.error ?? "무료 결과를 생성하지 못했어요.");
      }

      router.push(`/result/free/${result.readingId}`);
    } catch (submitError) {
      setErrors({
        form:
          submitError instanceof Error
            ? submitError.message
            : "무료 결과를 생성하지 못했어요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      eyebrow="사주 정보 입력"
      title="우리 아이 이야기를 살짝 들려주세요"
      description="생일을 몰라도 괜찮아요. 처음 만난 날도 하나의 소중한 기준이 될 수 있어요."
      narrow
    >
      <ReportMobileBar
        title="정보 입력"
        backHref="/"
        rightLabel="샘플"
        rightHref="/sample"
      />

      <div className="mb-6 overflow-hidden rounded-[2rem] border border-berry/10 bg-white/65 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <PetMascot
            type="both"
            mood="holding-card"
            size="lg"
            withBubble
            bubbleText="차근차근 같이 적어봐요"
          />
          <div>
            <p className="text-sm font-black text-persimmon">입력 도움말</p>
            <p className="mt-2 break-keep text-base font-semibold leading-7 text-ink/68">
              정확한 생일을 몰라도 괜찮아요. 입양일이나 처음 만난 날처럼
              보호자에게 의미 있는 날짜를 기준으로 우리 아이의 성향을
              다정하게 읽어드릴게요.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="warm-panel rounded-[2rem] p-5 sm:p-8"
        noValidate
      >
        {summaryErrors.length > 0 ? (
          <section
            aria-labelledby="input-error-summary"
            className="mb-6 rounded-[1.5rem] border border-berry/20 bg-berry/10 px-4 py-3"
          >
            <p id="input-error-summary" className="text-sm font-black text-berry">
              아래 내용을 한 번만 확인해 주세요.
            </p>
            <ul className="mt-2 grid gap-1 text-xs font-bold leading-5 text-berry">
              {summaryErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {summaryTags.length > 0 ? (
          <section className="mb-6 rounded-[1.5rem] border border-moss/20 bg-moss/10 px-4 py-3">
            <p className="text-sm font-black text-moss">입력 요약</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summaryTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-ink/65 shadow-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : (
          <section className="mb-6 rounded-[1.5rem] border border-oat/70 bg-white/60 px-4 py-3">
            <p className="text-xs font-bold leading-5 text-ink/50">
              선택한 정보는 여기에서 태그로 정리돼요. 생활 패턴은 선택 사항이라
              비워두어도 무료 결과를 볼 수 있습니다.
            </p>
          </section>
        )}

        <div className="grid gap-5">
          <label className="grid gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
              <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-berry/10">
                <PetMascot
                  type="dog"
                  mood="happy"
                  size="sm"
                  className="scale-[0.55]"
                />
              </span>
              이름
            </span>
            <input
              name="petName"
              value={petName}
              onChange={(event) => {
                setPetName(event.target.value);
                setErrors((current) => ({ ...current, petName: undefined }));
              }}
              maxLength={30}
              placeholder="예: 몽이"
              aria-invalid={Boolean(errors.petName)}
              aria-describedby="petName-error"
              className="focus-ring rounded-2xl border border-berry/20 bg-white px-4 py-3 text-base"
            />
            <ErrorText id="petName-error" message={errors.petName} />
          </label>

          <fieldset className="grid gap-3" aria-describedby="species-error">
            <legend className="text-sm font-bold text-ink">강아지/고양이 선택</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="group cursor-pointer rounded-[2rem] border-2 border-berry/15 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-berry/35 hover:shadow-soft focus-within:ring-2 focus-within:ring-berry/30 has-[:checked]:scale-[1.025] has-[:checked]:border-berry/65 has-[:checked]:bg-berry/10 has-[:checked]:shadow-soft sm:p-4">
                <input
                  type="radio"
                  name="species"
                  value="dog"
                  checked={species === "dog"}
                  onChange={() => {
                    setSpecies("dog");
                    setErrors((current) => ({ ...current, species: undefined }));
                  }}
                  className="sr-only peer"
                />
                <span className="relative flex min-h-56 flex-col items-center justify-end overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-berry/10 via-cream/70 to-white px-4 pb-5 pt-6 text-center text-ink shadow-sm transition duration-200 peer-checked:scale-[1.035] peer-checked:bg-white peer-checked:text-berry peer-checked:shadow-soft sm:min-h-64 sm:pb-6 sm:pt-7">
                  <span
                    aria-hidden="true"
                    className="absolute left-5 top-5 h-3 w-3 rounded-full bg-berry/35"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute right-6 top-7 h-5 w-5 rotate-45 rounded bg-persimmon/30"
                  />
                  <span className="relative grid min-h-32 w-full place-items-center transition duration-200 group-hover:scale-105 sm:min-h-36">
                    <PetMascot
                      species="dog"
                      mood="holding-card"
                      size="lg"
                      className="drop-shadow-sm"
                    />
                  </span>
                  <span className="mt-3 inline-flex rounded-full bg-white/90 px-4 py-1.5 text-base font-black shadow-sm">
                    강아지
                  </span>
                  <span className="mt-2 text-sm font-bold leading-5 text-ink/55">
                    산책과 반응을 중심으로 읽어요
                  </span>
                </span>
              </label>
              <label className="group cursor-pointer rounded-[2rem] border-2 border-moss/15 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-moss/35 hover:shadow-soft focus-within:ring-2 focus-within:ring-moss/30 has-[:checked]:scale-[1.025] has-[:checked]:border-moss/65 has-[:checked]:bg-moss/10 has-[:checked]:shadow-soft sm:p-4">
                <input
                  type="radio"
                  name="species"
                  value="cat"
                  checked={species === "cat"}
                  onChange={() => {
                    setSpecies("cat");
                    setErrors((current) => ({ ...current, species: undefined }));
                  }}
                  className="sr-only peer"
                />
                <span className="relative flex min-h-56 flex-col items-center justify-end overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-moss/10 via-cream/70 to-white px-4 pb-5 pt-6 text-center text-ink shadow-sm transition duration-200 peer-checked:scale-[1.035] peer-checked:bg-white peer-checked:text-moss peer-checked:shadow-soft sm:min-h-64 sm:pb-6 sm:pt-7">
                  <span
                    aria-hidden="true"
                    className="absolute left-6 top-7 h-4 w-4 rounded-full bg-moss/30"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute right-5 top-5 h-3 w-8 rounded-full bg-berry/20"
                  />
                  <span className="relative grid min-h-32 w-full place-items-center transition duration-200 group-hover:scale-105 sm:min-h-36">
                    <PetMascot
                      species="cat"
                      mood="holding-card"
                      size="lg"
                      className="drop-shadow-sm"
                    />
                  </span>
                  <span className="mt-3 inline-flex rounded-full bg-white/90 px-4 py-1.5 text-base font-black shadow-sm">
                    고양이
                  </span>
                  <span className="mt-2 text-sm font-bold leading-5 text-ink/55">
                    영역과 거리감을 중심으로 읽어요
                  </span>
                </span>
              </label>
            </div>
            <ErrorText id="species-error" message={errors.species} />
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-bold text-ink">생년월일</span>
                <label className="flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold text-ink/65 shadow-sm sm:min-h-12">
                  <MiniScene
                    type="cat"
                    mood="holding-card"
                    tone="moss"
                    icon="calendar"
                  />
                  <input
                    type="checkbox"
                    checked={birthDateUnknown}
                    onChange={(event) => {
                      const isChecked = event.target.checked;
                      setBirthDateUnknown(isChecked);
                      if (isChecked) {
                        setBirthDate("");
                      }
                      setErrors((current) => ({
                        ...current,
                        birthDate: undefined,
                      }));
                    }}
                    className="h-5 w-5 rounded border-berry/30 text-berry"
                  />
                  생일을 몰라요
                </label>
              </div>
              <input
                name="birthDate"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                max={today}
                disabled={birthDateUnknown}
                aria-invalid={Boolean(errors.birthDate)}
                aria-describedby="birthDate-help birthDate-error"
                className="focus-ring rounded-2xl border border-berry/20 bg-white px-4 py-3 text-base disabled:bg-oat/30 disabled:text-ink/40"
              />
              <p id="birthDate-help" className="text-xs font-semibold leading-5 text-ink/50">
                생일을 모르면 입양일 또는 처음 만난 날을 기준으로 읽어드려요.
              </p>
              <ErrorText id="birthDate-error" message={errors.birthDate} />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">태어난 시간</span>
              <input
                name="birthTime"
                type="time"
                value={birthTime}
                onChange={(event) => setBirthTime(event.target.value)}
                disabled={timeUnknown}
                className="focus-ring rounded-2xl border border-berry/20 bg-white px-4 py-3 text-base disabled:bg-oat/30 disabled:text-ink/40"
              />
            </label>
          </div>

          <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-moss/20 bg-white px-4 py-3 shadow-sm">
            <MiniScene
              type="dog"
              mood="curious"
              tone="persimmon"
              icon="clock"
            />
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(event) => {
                setTimeUnknown(event.target.checked);
                if (event.target.checked) {
                  setBirthTime("");
                }
              }}
              className="h-5 w-5 rounded border-berry/30 text-berry"
            />
            <span className="text-sm font-semibold text-ink">태어난 시간을 몰라요</span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-ink">
              입양일 또는 처음 만난 날
              {birthDateUnknown ? (
                <span className="ml-2 text-xs font-black text-berry">필수</span>
              ) : null}
            </span>
            <input
              name="adoptionDate"
              type="date"
              value={adoptionDate}
              onChange={(event) => {
                setAdoptionDate(event.target.value);
                setErrors((current) => ({
                  ...current,
                  adoptionDate: undefined,
                }));
              }}
              max={today}
              aria-invalid={Boolean(errors.adoptionDate)}
              aria-describedby="adoptionDate-error"
              className="focus-ring rounded-2xl border border-berry/20 bg-white px-4 py-3 text-base"
            />
            <ErrorText id="adoptionDate-error" message={errors.adoptionDate} />
          </label>

          <section className="grid gap-4 rounded-[2rem] border border-moss/15 bg-moss/5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-moss">생활 패턴</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/50">
                  선택 사항이에요. 알려주신 내용은 보호자 교감과 루틴 조언을
                  더 개인화하는 데만 사용됩니다.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-moss shadow-sm">
                선택 입력
              </span>
            </div>

            <ChipGroup
              title="생활 환경"
              description="여러 개를 골라도 괜찮아요."
              options={livingEnvironmentOptions}
              selectedValues={livingEnvironment}
              multiple
              onToggle={(value) =>
                setLivingEnvironment((current) =>
                  toggleArrayValue<LivingEnvironment>(current, value),
                )
              }
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ChipGroup
                title="하루 산책/놀이 횟수"
                options={dailyActivityOptions}
                selectedValues={
                  dailyActivityFrequency ? [dailyActivityFrequency] : []
                }
                onToggle={(value) =>
                  setDailyActivityFrequency((current) =>
                    current === value ? null : (value as DailyActivityFrequency),
                  )
                }
              />
              <ChipGroup
                title="혼자 있는 시간"
                options={aloneTimeOptions}
                selectedValues={aloneTime ? [aloneTime] : []}
                onToggle={(value) =>
                  setAloneTime((current) =>
                    current === value ? null : (value as AloneTime),
                  )
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ChipGroup
                title="낯선 사람 반응"
                options={strangerReactionOptions}
                selectedValues={strangerReaction ? [strangerReaction] : []}
                onToggle={(value) =>
                  setStrangerReaction((current) =>
                    current === value ? null : (value as StrangerReaction),
                  )
                }
              />
              <ChipGroup
                title="보호자와의 거리감"
                options={guardianDistanceOptions}
                selectedValues={guardianDistance ? [guardianDistance] : []}
                onToggle={(value) =>
                  setGuardianDistance((current) =>
                    current === value ? null : (value as GuardianDistance),
                  )
                }
              />
            </div>

            <ChipGroup
              title="좋아하는 활동"
              description="우리 아이가 자주 좋아하는 것을 골라주세요."
              options={favoriteActivityOptions}
              selectedValues={favoriteActivities}
              multiple
              onToggle={(value) =>
                setFavoriteActivities((current) =>
                  toggleArrayValue<FavoriteActivity>(current, value),
                )
              }
            />

            <ChipGroup
              title="보호자가 궁금한 점"
              description="심층 리포트에서 더 보고 싶은 방향을 골라주세요."
              options={guardianQuestionOptions}
              selectedValues={guardianQuestions}
              multiple
              onToggle={(value) =>
                setGuardianQuestions((current) =>
                  toggleArrayValue<GuardianQuestion>(current, value),
                )
              }
            />
          </section>

          <label className="grid gap-2">
            <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
              보호자 이메일
              <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-black text-moss">
                선택이에요
              </span>
            </span>
            <input
              name="guardianEmail"
              type="email"
              maxLength={254}
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.guardianEmail)}
              aria-describedby="guardianEmail-help guardianEmail-error"
              className="focus-ring rounded-2xl border border-berry/20 bg-white px-4 py-3 text-base"
            />
            <div
              id="guardianEmail-help"
              className="rounded-[1.25rem] border border-moss/15 bg-moss/10 px-4 py-3"
            >
              <p className="text-xs font-semibold leading-5 text-ink/60">
                결과 링크를 다시 확인할 때만 사용돼요. 입력하지 않아도 무료
                결과를 볼 수 있어요.
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-ink/45">
                보유기간과 삭제 기준은{" "}
                <Link
                  href="/privacy"
                  className="font-black text-moss underline decoration-moss/30 underline-offset-4 transition hover:text-moss/80"
                >
                  개인정보처리방침
                </Link>
                에서 확인할 수 있습니다.
              </p>
            </div>
            <ErrorText id="guardianEmail-error" message={errors.guardianEmail} />
          </label>

          <section className="rounded-[1.75rem] border border-moss/20 bg-moss/10 p-4">
            <p className="text-sm font-black text-moss">개인정보 안내</p>
            <ul className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-ink/60">
              <li>리포트 생성을 위해 필요한 최소 정보만 입력받습니다.</li>
              <li>카드 번호, CVV 같은 결제 정보는 멍냥사주 서버에 저장하지 않습니다.</li>
              <li>생일을 모르는 경우에는 처음 만난 날만으로도 무료 결과를 만들 수 있습니다.</li>
            </ul>
          </section>

          {species === "dog" || species === "cat" ? (
            <PetInputSummaryTags
              petName={petName}
              species={species}
              birthDate={birthDateUnknown ? null : birthDate}
              birthTime={timeUnknown ? null : birthTime}
              birthTimeUnknown={timeUnknown}
              adoptionDate={adoptionDate || null}
              livingEnvironment={livingEnvironment}
              activityLevel={dailyActivityFrequency}
              aloneTime={aloneTime}
              strangerReaction={strangerReaction}
              guardianDistance={guardianDistance}
              favoriteActivities={favoriteActivities}
            />
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-berry px-6 py-3 text-sm font-black text-white shadow-soft transition hover:bg-berry/90 disabled:cursor-not-allowed disabled:bg-ink/30"
        >
          {isSubmitting ? "무료 결과 생성 중" : "무료 사주 맛보기 보기"}
        </button>
        <ButtonPaws />
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-berry/10 bg-cream/95 px-4 py-3 shadow-[0_-12px_40px_rgba(62,44,38,0.12)] backdrop-blur sm:hidden">
          <button
            type="submit"
            disabled={isSubmitting}
            className="focus-ring mx-auto flex min-h-14 w-full max-w-md items-center justify-center rounded-full bg-berry px-5 py-3 text-center text-sm font-black text-white shadow-soft transition hover:bg-berry/90 disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            {isSubmitting ? "무료 결과 생성 중" : "무료 사주 맛보기 보기"}
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </button>
        </div>
      </form>
    </PageShell>
  );
}
