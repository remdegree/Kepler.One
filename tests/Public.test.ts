import { describe, expect, it } from "vitest";
import { Observatory, useKepler } from "../src";

describe("Public API", () => {
  it("exports Observatory", () => {
    expect(Observatory).toBeDefined();
  });

  it("exports useKepler", () => {
    expect(useKepler).toBeDefined();
  });
});