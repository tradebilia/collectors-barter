import { describe, expect, it, vi } from "vitest";
import { getTestedComicScenePrompts, isProviderSceneSafetyRejection, runTestedComicScenePromptLadder } from "./comicSocialScenePrompts";

const spider = {
  category: "comics",
  itemTitle: "Amazing Spider-Man #300 CGC 9.6 Signed by Stan Lee",
  facts: [{ label: "Title", value: "The Amazing Spider-Man" }, { label: "Issue No.", value: "300" }],
};
const xmen = {
  category: "comics",
  itemTitle: "X-Men #137 CGC 9.8",
  facts: [{ label: "Title", value: "The Uncanny X-Men" }, { label: "Issue No.", value: "137" }],
};

describe("tested comic scene prompts", () => {
  it("keeps an issue-specific spider-comic context before a less-specific visual motif prompt", () => {
    const prompts = getTestedComicScenePrompts(spider);
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain("The Amazing Spider-Man issue 300");
    expect(prompts[0]).toContain("web-like window shadows");
    expect(prompts[1]).not.toContain("Spider-Man");
    expect(prompts[1]).toContain("red and blue accent lighting");
    expect(prompts.every(prompt => prompt.includes("original listing photograph") && prompt.includes("background art only"))).toBe(true);
    expect(prompts.join(" ")).not.toContain("Stan Lee");
  });

  it("keeps an issue-specific X-Men context and preserves the same compositing safe areas", () => {
    const prompts = getTestedComicScenePrompts(xmen);
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain("The Uncanny X-Men issue 137");
    expect(prompts[1]).not.toContain("X-Men");
    expect(prompts[1]).toContain("star-like reflections");
    expect(prompts.every(prompt => prompt.includes("upper half calm") && prompt.includes("lower-left unobstructed"))).toBe(true);
  });

  it("does not apply item-specific comic prompts to wrong issues or other categories", () => {
    expect(getTestedComicScenePrompts({ ...spider, itemTitle: "Amazing Spider-Man #301", facts: [] })).toEqual([]);
    expect(getTestedComicScenePrompts({ ...xmen, itemTitle: "X-Men #138", facts: [] })).toEqual([]);
    expect(getTestedComicScenePrompts({ ...xmen, category: "video_games" })).toEqual([]);
  });

  it("moves to the less-specific variant only after a provider safety rejection", async () => {
    const prompts = getTestedComicScenePrompts(spider);
    const generate = vi.fn()
      .mockRejectedValueOnce(new Error("Your request was rejected by the safety system"))
      .mockResolvedValueOnce({ url: "/manus-storage/generated/accepted.png" });
    await expect(runTestedComicScenePromptLadder(prompts, generate)).resolves.toEqual({ url: "/manus-storage/generated/accepted.png" });
    expect(generate.mock.calls.map(call => call[0])).toEqual(prompts);
    expect(isProviderSceneSafetyRejection(new Error("Your request was rejected by the safety system"))).toBe(true);
  });

  it("does not hide transient or unrelated failures behind additional generation calls", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("Temporary service failure"));
    await expect(runTestedComicScenePromptLadder(getTestedComicScenePrompts(xmen), generate)).rejects.toThrow("Temporary service failure");
    expect(generate).toHaveBeenCalledTimes(1);
    await expect(runTestedComicScenePromptLadder([], generate)).rejects.toThrow("No verified comic scene prompt");
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
