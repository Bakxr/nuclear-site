import { beforeEach, describe, expect, it, vi } from "vitest";

let store;
vi.mock("./terminalStore.js", () => ({
  readTerminalCache: vi.fn(async (key) => (store[key] ? { payload: store[key] } : null)),
  writeTerminalCache: vi.fn(async (key, payload) => { store[key] = payload; }),
}));

const { attachTakes, rejectTake } = await import("./newsTakes.js");

const article = (n, extra = {}) => ({
  url: `https://example.org/a${n}`,
  source: "World Nuclear News",
  title: `Unit ${n} reaches first criticality`,
  curiosityHook: "The 1,100 MWe unit is the third at the site.",
  ...extra,
});

function fakeClient(takes) {
  return {
    beta: {
      messages: {
        create: vi.fn(async () => ({
          stop_reason: "end_turn",
          content: [{ type: "text", text: JSON.stringify({ takes }) }],
        })),
      },
    },
  };
}

describe("rejectTake", () => {
  it("accepts numbers that appear in the article", () => {
    expect(rejectTake("A third 1,100 MWe unit adds firm capacity to the grid.", article(1))).toBeNull();
  });

  it("rejects invented numbers", () => {
    expect(rejectTake("This adds 2,000 jobs.", article(1))).toMatch(/not in article/);
  });
});

describe("attachTakes", () => {
  beforeEach(() => {
    store = {};
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("leaves whyItMatters empty without an API key (no canned lines)", async () => {
    const [out] = await attachTakes([article(1)]);
    expect(out.whyItMatters).toBe("");
  });

  it("writes takes once and serves them from cache after", async () => {
    const client = fakeClient([{ id: 0, take: "A third unit at one site shows the fleet growing on proven ground." }]);
    const [first] = await attachTakes([article(1)], { client });
    expect(first.whyItMatters).toMatch(/third unit/);

    const [second] = await attachTakes([article(1)], { client });
    expect(second.whyItMatters).toBe(first.whyItMatters);
    expect(client.beta.messages.create).toHaveBeenCalledTimes(1);
  });

  it("drops a take with an invented number but doesn't retry it", async () => {
    const client = fakeClient([{ id: 0, take: "Adds 5,000 jobs." }]);
    const [out] = await attachTakes([article(2)], { client });
    expect(out.whyItMatters).toBe("");
    await attachTakes([article(2)], { client });
    expect(client.beta.messages.create).toHaveBeenCalledTimes(1);
  });

  it("survives an API error", async () => {
    const client = { beta: { messages: { create: vi.fn(async () => { throw new Error("boom"); }) } } };
    const [out] = await attachTakes([article(3)], { client });
    expect(out.whyItMatters).toBe("");
  });
});
