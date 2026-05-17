"use client";

import { useState, type FormEvent } from "react";

type FeedbackState =
  | { status: "idle"; message: string }
  | { status: "submitting"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function AnonymousFeedbackForm() {
  const [state, setState] = useState<FeedbackState>({
    status: "idle",
    message: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setState({
      status: "submitting",
      message: "피드백을 저장하고 있어요.",
    });

    const payload = {
      testerName: String(formData.get("testerName") ?? ""),
      contact: String(formData.get("contact") ?? ""),
      petType: String(formData.get("petType") ?? ""),
      page: "test",
      rating: Number(formData.get("rating")),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "피드백을 저장하지 못했어요.");
      }

      event.currentTarget.reset();
      setState({
        status: "success",
        message: "고마워요. 남겨주신 의견은 출시 전 점검에 반영할게요.",
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "피드백 저장 중 문제가 발생했어요.",
      });
    }
  }

  const isSubmitting = state.status === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 grid gap-4 rounded-[2rem] border border-berry/10 bg-white/85 p-5 shadow-sm"
      data-testid="anonymous-feedback-form"
    >
      <div>
        <p className="text-sm font-black text-persimmon">익명 피드백 남기기</p>
        <h3 className="mt-1 break-keep text-2xl font-black text-ink">
          써보면서 느낀 점을 편하게 알려주세요
        </h3>
        <p className="mt-2 break-keep text-sm font-semibold leading-6 text-ink/60">
          이름과 연락처는 선택이에요. 입력하지 않아도 피드백을 남길 수
          있습니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black uppercase text-ink/65">
            이름 또는 닉네임 선택
          </span>
          <input
            name="testerName"
            maxLength={80}
            className="mt-2 w-full rounded-2xl border border-berry/15 bg-cream/60 px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-berry"
            placeholder="예: 몽이 보호자"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-ink/65">
            연락처 선택
          </span>
          <input
            name="contact"
            maxLength={120}
            className="mt-2 w-full rounded-2xl border border-berry/15 bg-cream/60 px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-berry"
            placeholder="답변을 원할 때만 입력"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black uppercase text-ink/65">
            함께 본 반려동물
          </span>
          <select
            name="petType"
            className="mt-2 w-full rounded-2xl border border-berry/15 bg-cream/60 px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-berry"
          >
            <option value="">선택하지 않음</option>
            <option value="dog">강아지</option>
            <option value="cat">고양이</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-ink/65">
            전체 만족도
          </span>
          <select
            name="rating"
            required
            defaultValue="5"
            className="mt-2 w-full rounded-2xl border border-berry/15 bg-cream/60 px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-berry"
          >
            <option value="5">5점 아주 좋아요</option>
            <option value="4">4점 좋아요</option>
            <option value="3">3점 보통이에요</option>
            <option value="2">2점 조금 아쉬워요</option>
            <option value="1">1점 많이 아쉬워요</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-black uppercase text-ink/65">
          피드백 내용
        </span>
        <textarea
          name="message"
          required
          minLength={5}
          maxLength={2000}
          rows={6}
          className="mt-2 w-full resize-y rounded-2xl border border-berry/15 bg-cream/60 px-4 py-3 text-sm font-semibold leading-6 text-ink outline-none transition focus:border-berry"
          placeholder="어색한 문장, 헷갈린 버튼, 결제 전 불안했던 부분 등을 자유롭게 적어주세요."
        />
      </label>

      <p className="rounded-2xl bg-moss/10 px-4 py-3 text-xs font-bold leading-5 text-ink/65">
        피드백은 서비스 개선 목적으로만 확인합니다. 연락처는 선택 입력이며,
        보관과 삭제 기준은 개인정보처리방침을 따릅니다.
      </p>

      {state.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            state.status === "error"
              ? "bg-berry/10 text-berry"
              : "bg-moss/10 text-moss"
          }`}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full bg-berry px-6 py-3 text-sm font-black text-white shadow-soft transition hover:bg-berry/90 disabled:cursor-not-allowed disabled:bg-ink/20"
      >
        {isSubmitting ? "저장 중" : "익명 피드백 보내기"}
      </button>
    </form>
  );
}
