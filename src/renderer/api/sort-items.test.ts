import { describe, expect, it } from "vitest";
import { sortItems } from "./sort-items";

describe("sortItems", () => {
  const items = [
    { name: "b", n: 1 },
    { name: "a", n: 2 },
    { name: "b", n: 0 },
  ];

  it("sorts ascending and keeps equal keys in input order", () => {
    expect(sortItems(items, (item) => item.name, "asc").map((item) => item.n)).toEqual([2, 1, 0]);
  });

  it("sorts descending", () => {
    expect(sortItems(items, (item) => item.n, "desc").map((item) => item.n)).toEqual([2, 1, 0]);
  });
});
