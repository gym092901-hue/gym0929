"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { ReportMobileBar } from "@/components/report/ReportMobileBar";

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

export default function InputPage() {
  const router = useRouter();
  const today = useMemo(() => getTodayDateString(), []);
  const [birthDateUnknown, setBirthDateUnknown] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const summaryErrors = Object.values(errors).filter(Boolean);

  function validate(formData: FormData) {
    const nextErrors: FieldErrors = {};
    const name = String(formData.get("petName") ?? "").trim();
    const species = String(formData.get("species") ?? "");
    const submittedBirthDate = birthDateUnknown
      ? ""
      : birthDate || String(formData.get("birthDate") ?? "");
    const adoptionDate = String(formData.get("adoptionDate") ?? "");
    const guardianEmail = String(formData.get("guardianEmail") ?? "")
      .trim()
      .toLowerCase();

    if (!name) {
      nextErrors.petName = "우리 아이 이름을 입력해 주세요.";
    } else if (name.length > 30) {
      nextErrors.petName = "이름은 30자 이내로 입력해 주세요.";
    }

    if (species !== "dog" && species !== "cat") {
      nextErrors.species = "강아지인지 고양이인지 알려주세요.";
    }

    if (isFutureDate(submittedBirthDate, today)) {
      nextErrors.birthDate = "미래 날짜는 사용할 수 없어요.";
    }

    if (isFutureDate(adoptionDate, today)) {
      nextErrors.adoptionDate = "미래 날짜는 사용할 수 없어요.";
    }

    if (!submittedBirthDate && !adoptionDate) {
      const message = birthDateUnknown
        ? "생일을 모른다면 처음 만난 날을 알려주세요."
        : "생년월일 또는 처음 만난 날 중 하나를 알려주세요.";
      nextErrors.birthDate = nextErrors.birthDate ?? message;
      nextErrors.adoptionDate = nextErrors.adoptionDate ?? message;
    }

    if (birthDateUnknown && !adoptionDate) {
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
        species,
        birthDate: submittedBirthDate,
        adoptionDate,
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="group cursor-pointer rounded-[1.75rem] border border-berry/20 bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:border-berry/35 focus-within:ring-2 focus-within:ring-berry/30 has-[:checked]:scale-[1.015] has-[:checked]:border-berry/55 has-[:checked]:bg-berry/10 has-[:checked]:shadow-soft sm:p-4">
                <input
                  type="radio"
                  name="species"
                  value="dog"
                  className="sr-only peer"
                />
                <span className="flex min-h-40 flex-col items-center justify-center rounded-[1.5rem] bg-cream/60 px-3 py-5 text-center text-ink shadow-sm transition duration-200 peer-checked:scale-[1.03] peer-checked:bg-white/85 peer-checked:text-berry peer-checked:shadow-soft sm:min-h-36 sm:py-4">
                  <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white/80 ring-1 ring-berry/10 transition group-hover:scale-105">
                    <PetMascot
                      type="dog"
                      mood="happy"
                      size="sm"
                      className="scale-95"
                    />
                  </span>
                  <span className="mt-2 block text-sm font-black">
                    강아지
                  </span>
                  <span className="mt-1 text-xs font-bold text-ink/45">
                    산책과 반응을 중심으로 읽어요
                  </span>
                </span>
              </label>
              <label className="group cursor-pointer rounded-[1.75rem] border border-moss/20 bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:border-moss/35 focus-within:ring-2 focus-within:ring-moss/30 has-[:checked]:scale-[1.015] has-[:checked]:border-moss/55 has-[:checked]:bg-moss/10 has-[:checked]:shadow-soft sm:p-4">
                <input type="radio" name="species" value="cat" className="sr-only peer" />
                <span className="flex min-h-40 flex-col items-center justify-center rounded-[1.5rem] bg-cream/60 px-3 py-5 text-center text-ink shadow-sm transition duration-200 peer-checked:scale-[1.03] peer-checked:bg-white/85 peer-checked:text-moss peer-checked:shadow-soft sm:min-h-36 sm:py-4">
                  <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white/80 ring-1 ring-moss/10 transition group-hover:scale-105">
                    <PetMascot
                      type="cat"
                      mood="happy"
                      size="sm"
                      className="scale-95"
                    />
                  </span>
                  <span className="mt-2 block text-sm font-black">
                    고양이
                  </span>
                  <span className="mt-1 text-xs font-bold text-ink/45">
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
              max={today}
              aria-invalid={Boolean(errors.adoptionDate)}
              aria-describedby="adoptionDate-error"
              className="focus-ring rounded-2xl border border-berry/20 bg-white px-4 py-3 text-base"
            />
            <ErrorText id="adoptionDate-error" message={errors.adoptionDate} />
          </label>

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
