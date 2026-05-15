"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";

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

export default function InputPage() {
  const router = useRouter();
  const today = useMemo(() => getTodayDateString(), []);
  const [birthDateUnknown, setBirthDateUnknown] = useState(false);
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const summaryErrors = Object.values(errors).filter(Boolean);

  function validate(formData: FormData) {
    const nextErrors: FieldErrors = {};
    const name = String(formData.get("petName") ?? "").trim();
    const species = String(formData.get("species") ?? "");
    const birthDate = birthDateUnknown
      ? ""
      : String(formData.get("birthDate") ?? "");
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

    if (isFutureDate(birthDate, today)) {
      nextErrors.birthDate = "미래 날짜는 사용할 수 없어요.";
    }

    if (isFutureDate(adoptionDate, today)) {
      nextErrors.adoptionDate = "미래 날짜는 사용할 수 없어요.";
    }

    if (!birthDate && !adoptionDate) {
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
        birthDate,
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
      title="아이의 기본 정보를 알려주세요"
      description="정확한 생일을 모르는 경우에는 입양일 또는 처음 만난 날을 기준으로 부드럽게 해석합니다."
      narrow
    >
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
            <span className="text-sm font-bold text-ink">이름</span>
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
            <div className="grid grid-cols-2 gap-3">
              <label className="focus-within:ring-2 focus-within:ring-berry/30 rounded-2xl border border-berry/20 bg-white p-4">
                <input
                  type="radio"
                  name="species"
                  value="dog"
                  className="sr-only peer"
                />
                <span className="block text-center text-sm font-black text-ink peer-checked:text-berry">
                  강아지
                </span>
              </label>
              <label className="focus-within:ring-2 focus-within:ring-berry/30 rounded-2xl border border-berry/20 bg-white p-4">
                <input type="radio" name="species" value="cat" className="sr-only peer" />
                <span className="block text-center text-sm font-black text-ink peer-checked:text-moss">
                  고양이
                </span>
              </label>
            </div>
            <ErrorText id="species-error" message={errors.species} />
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-bold text-ink">생년월일</span>
                <label className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-bold text-ink/65">
                  <input
                    type="checkbox"
                    checked={birthDateUnknown}
                    onChange={(event) => {
                      setBirthDateUnknown(event.target.checked);
                      setErrors((current) => ({
                        ...current,
                        birthDate: undefined,
                      }));
                    }}
                    className="h-4 w-4 rounded border-berry/30 text-berry"
                  />
                  생일을 몰라요
                </label>
              </div>
              <input
                name="birthDate"
                type="date"
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

          <label className="flex items-center gap-3 rounded-2xl border border-moss/20 bg-white px-4 py-3">
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
            <span className="text-sm font-bold text-ink">
              보호자 이메일
              <span className="ml-2 text-xs font-black text-ink/40">선택</span>
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
              <ul className="grid gap-1 text-xs font-semibold leading-5 text-ink/60">
                <li>결과 링크 재확인 목적으로만 사용됩니다.</li>
                <li>선택 입력이므로 입력하지 않아도 무료 결과를 볼 수 있습니다.</li>
                <li>보유기간과 삭제 기준은 개인정보처리방침에서 확인할 수 있습니다.</li>
              </ul>
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
          {isSubmitting ? "무료 결과 생성 중" : "무료 사주 결과 보기"}
        </button>
      </form>
    </PageShell>
  );
}
