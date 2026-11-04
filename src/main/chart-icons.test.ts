import { Main } from "@freelensapp/extensions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { failureTtlMs, fetchChartIcon } from "./chart-icons";

const fetchMock = vi.mocked(Main.Util.fetch);

describe("fetchChartIcon", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("inlines the logo as a data URL, fetched with the HTTP client of Freelens", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("logo", { status: 200, headers: { "content-type": "image/svg+xml" } }),
    );

    expect(await fetchChartIcon("https://example.com/inline.svg")).toEqual({
      icon: `data:image/svg+xml;base64,${Buffer.from("logo").toString("base64")}`,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/inline.svg",
      expect.objectContaining({ headers: expect.objectContaining({ "user-agent": "freelens-sveltos-extension" }) }),
    );
  });

  it("reports a response that is not 200, and asks again for the same URL only after a while", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));

    expect(await fetchChartIcon("https://example.com/missing.png")).toEqual({
      reason: "https://example.com/missing.png responded 404",
    });
    expect(await fetchChartIcon("https://example.com/missing.png")).toEqual({
      reason: "https://example.com/missing.png responded 404",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(failureTtlMs + 1);
    fetchMock.mockResolvedValueOnce(new Response("logo", { status: 200 }));

    expect((await fetchChartIcon("https://example.com/missing.png")).icon).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a network failure with its cause, and asks again next time", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed", { cause: new Error("ECONNREFUSED") }));

    expect(await fetchChartIcon("https://example.com/offline.png")).toEqual({
      reason: "TypeError: fetch failed (Error: ECONNREFUSED)",
    });

    // A body that is not a string carries no content type: the data URL falls back to PNG.
    fetchMock.mockResolvedValueOnce(new Response(new TextEncoder().encode("logo"), { status: 200 }));

    expect(await fetchChartIcon("https://example.com/offline.png")).toEqual({
      icon: `data:image/png;base64,${Buffer.from("logo").toString("base64")}`,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
