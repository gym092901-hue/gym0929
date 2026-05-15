import { describe, expect, it } from "vitest";
import { postposition, withPostposition } from "@/lib/korean/postposition";

describe("korean postposition", () => {
  const cases = [
    ["몽이", "몽이는", "몽이가", "몽이를", "몽이의", "몽이에게"],
    ["초코", "초코는", "초코가", "초코를", "초코의", "초코에게"],
    ["나비", "나비는", "나비가", "나비를", "나비의", "나비에게"],
    ["구름이", "구름이는", "구름이가", "구름이를", "구름이의", "구름이에게"],
    ["콩이", "콩이는", "콩이가", "콩이를", "콩이의", "콩이에게"],
    ["루루", "루루는", "루루가", "루루를", "루루의", "루루에게"],
  ] as const;

  it.each(cases)(
    "attaches natural particles to %s",
    (name, topic, subject, object, possessive, to) => {
      expect(postposition.topic(name)).toBe(topic);
      expect(postposition.subject(name)).toBe(subject);
      expect(postposition.object(name)).toBe(object);
      expect(postposition.possessive(name)).toBe(possessive);
      expect(postposition.to(name)).toBe(to);
    },
  );

  it("uses batchim-aware particles for 받침 names", () => {
    expect(withPostposition("별", "은/는")).toBe("별은");
    expect(withPostposition("별", "이/가")).toBe("별이");
    expect(withPostposition("별", "을/를")).toBe("별을");
    expect(withPostposition("별", "으로/로")).toBe("별로");
    expect(withPostposition("밤", "으로/로")).toBe("밤으로");
  });

  it("does not create duplicated 이이 around names ending with 이", () => {
    for (const name of ["몽이", "구름이", "콩이"]) {
      const rendered = [
        postposition.topic(name),
        postposition.subject(name),
        postposition.object(name),
        postposition.possessive(name),
        postposition.to(name),
      ].join(" ");

      expect(rendered).not.toContain(`${name}이이`);
    }
  });
});
