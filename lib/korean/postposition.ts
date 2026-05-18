export type KoreanPostposition =
  | "은/는"
  | "이/가"
  | "을/를"
  | "과/와"
  | "으로/로"
  | "의"
  | "에게";

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const FINAL_CONSONANT_COUNT = 28;
const RIEUL_FINAL_INDEX = 8;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLastChar(value: string) {
  return Array.from(value.trim()).at(-1) ?? "";
}

function getFinalConsonantIndex(value: string) {
  const char = getLastChar(value);
  const code = char.charCodeAt(0);

  if (Number.isNaN(code) || code < HANGUL_START || code > HANGUL_END) {
    return 0;
  }

  return (code - HANGUL_START) % FINAL_CONSONANT_COUNT;
}

export function hasBatchim(value: string) {
  return getFinalConsonantIndex(value) > 0;
}

export function withPostposition(
  value: string,
  postposition: KoreanPostposition,
) {
  const trimmedValue = value.trim();
  const finalConsonantIndex = getFinalConsonantIndex(trimmedValue);
  const hasFinalConsonant = finalConsonantIndex > 0;

  switch (postposition) {
    case "은/는":
      return `${trimmedValue}${hasFinalConsonant ? "은" : "는"}`;
    case "이/가":
      return `${trimmedValue}${hasFinalConsonant ? "이" : "가"}`;
    case "을/를":
      return `${trimmedValue}${hasFinalConsonant ? "을" : "를"}`;
    case "과/와":
      return `${trimmedValue}${hasFinalConsonant ? "과" : "와"}`;
    case "으로/로":
      return `${trimmedValue}${
        hasFinalConsonant && finalConsonantIndex !== RIEUL_FINAL_INDEX
          ? "으로"
          : "로"
      }`;
    case "의":
      return `${trimmedValue}의`;
    case "에게":
      return `${trimmedValue}에게`;
  }
}

export const postposition = {
  topic: (value: string) => withPostposition(value, "은/는"),
  subject: (value: string) => withPostposition(value, "이/가"),
  object: (value: string) => withPostposition(value, "을/를"),
  with: (value: string) => withPostposition(value, "과/와"),
  direction: (value: string) => withPostposition(value, "으로/로"),
  possessive: (value: string) => withPostposition(value, "의"),
  to: (value: string) => withPostposition(value, "에게"),
};

export function normalizePostpositionSpacing(text: string, name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return text;
  }

  const escapedName = escapeRegExp(trimmedName);

  return text
    .replace(new RegExp(`${escapedName}\\s+이의`, "g"), `${trimmedName}의`)
    .replace(new RegExp(`${escapedName}\\s+이에게`, "g"), `${trimmedName}에게`)
    .replace(
      new RegExp(`${escapedName}\\s+이를`, "g"),
      postposition.object(trimmedName),
    )
    .replace(
      new RegExp(`${escapedName}\\s+이는`, "g"),
      postposition.topic(trimmedName),
    )
    .replace(new RegExp(`${escapedName}\\s+의`, "g"), `${trimmedName}의`)
    .replace(new RegExp(`${escapedName}\\s+에게`, "g"), `${trimmedName}에게`)
    .replace(
      new RegExp(`${escapedName}\\s+이(?=\\s|[,.!?]|$)`, "g"),
      postposition.subject(trimmedName),
    )
    .replace(
      new RegExp(`${escapedName}\\s+가(?=\\s|[,.!?]|$)`, "g"),
      postposition.subject(trimmedName),
    )
    .replace(
      new RegExp(`${escapedName}\\s+은(?=\\s|[,.!?]|$)`, "g"),
      postposition.topic(trimmedName),
    )
    .replace(
      new RegExp(`${escapedName}\\s+는(?=\\s|[,.!?]|$)`, "g"),
      postposition.topic(trimmedName),
    )
    .replace(
      new RegExp(`${escapedName}\\s+을(?=\\s|[,.!?]|$)`, "g"),
      postposition.object(trimmedName),
    )
    .replace(
      new RegExp(`${escapedName}\\s+를(?=\\s|[,.!?]|$)`, "g"),
      postposition.object(trimmedName),
    );
}
