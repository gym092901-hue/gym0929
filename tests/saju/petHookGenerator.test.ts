import { describe, expect, it } from "vitest";
import {
  generatePetHook,
  generatePetHookFromSajuInput,
} from "@/lib/saju/petHookGenerator";
import { calculatePetFiveElements, type PetSajuInput } from "@/lib/saju/petSajuEngine";

const mongInput: PetSajuInput = {
  name: "몽이",
  type: "dog",
  birthDate: "2021-05-14",
  birthTime: null,
  birthTimeUnknown: true,
  adoptionDate: "2021-08-20",
};

const forbiddenTerms = ["나쁜 운", "부족", "결핍", "사고", "질병", "수명"];

describe("pet hook generator", () => {
  it("creates a named dog hook with natural Korean postposition", () => {
    const hook = generatePetHookFromSajuInput(mongInput);

    expect(hook.hookSentence).toMatch(/^몽이는 .+야\.$/);
    expect(hook.hookSentence).not.toContain("몽이이");
    expect(hook.hookSentence.length).toBeLessThanOrEqual(66);
    expect(hook.hookKeyword.length).toBeGreaterThan(0);
    expect(hook.highlightWords.length).toBeGreaterThan(0);

    for (const term of forbiddenTerms) {
      expect(`${hook.hookSentence} ${hook.hookSubcopy}`).not.toContain(term);
    }
  });

  it("creates a cat hook when pet name is missing", () => {
    const scores = calculatePetFiveElements({
      ...mongInput,
      name: "",
      type: "cat",
    }).scores;

    const hook = generatePetHook({
      petName: "",
      species: "cat",
      dominantElement: "metal",
      secondaryElement: "fire",
      scores,
      birthTimeUnknown: true,
      adoptionDate: "2021-08-20",
    });

    expect(hook.hookSentence).toBe(
      "우리 고양이는 도도하게 거리를 보다가 믿는 순간 짧고 진하게 표현하는 선택적 애교러야.",
    );
    expect(hook.highlightWords).toContain("선택적 애교러");
  });

  it("uses the requested metal and fire combination for dogs", () => {
    const profile = calculatePetFiveElements(mongInput);
    const hook = generatePetHook({
      petName: "몽이",
      species: "dog",
      dominantElement: "metal",
      secondaryElement: "fire",
      scores: profile.scores,
      birthTimeUnknown: true,
      adoptionDate: "2021-08-20",
    });

    expect(hook.hookSentence).toContain("신중하게");
    expect(hook.hookSentence).toContain("섬세한 애교쟁이");
    expect(hook.hookSubcopy).toContain("금");
    expect(hook.hookSubcopy).toContain("화");
  });
});
