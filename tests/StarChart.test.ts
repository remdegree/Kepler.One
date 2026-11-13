import { describe, it, expect } from "vitest";
import { StarChart } from "../src/core/snapshots";

describe("StarChart", () => {
  it("captures and restores a snapshot", () => {
    const starChart = new StarChart<{
      name: string;
      salary: number;
    }>();

    const employee = {
      name: "Alex",
      salary: 50000
    };

    const snapshot = starChart.capture(employee);

    employee.salary = 60000;

    const restored = starChart.restore(snapshot.id);

    expect(restored).toEqual({
      name: "Alex",
      salary: 50000
    });
  });

  it("keeps snapshots independent from restored copies", () => {
    const starChart = new StarChart<{ count: number }>();

    const snapshot = starChart.capture({ count: 10 });

    const restored = starChart.restore(snapshot.id);
    restored.count = 99;

    expect(starChart.restore(snapshot.id).count).toBe(10);
  });

  it("retrieves a snapshot by ID", () => {
    const starChart = new StarChart<{ active: boolean }>();

    const snapshot = starChart.capture({ active: true });

    expect(starChart.get(snapshot.id)?.values).toEqual({
      active: true
    });
  });

  it("checks whether a snapshot exists", () => {
    const starChart = new StarChart<{ value: number }>();

    const snapshot = starChart.capture({ value: 1 });

    expect(starChart.has(snapshot.id)).toBe(true);
    expect(starChart.has("unknown-id")).toBe(false);
  });

  it("lists available snapshots", () => {
    const starChart = new StarChart<{ value: number }>();

    starChart.capture({ value: 1 });
    starChart.capture({ value: 2 });

    expect(starChart.list()).toHaveLength(2);
  });

  it("removes a snapshot", () => {
    const starChart = new StarChart<{ value: number }>();

    const snapshot = starChart.capture({ value: 1 });

    expect(starChart.remove(snapshot.id)).toBe(true);
    expect(starChart.has(snapshot.id)).toBe(false);
  });

  it("clears all snapshots", () => {
    const starChart = new StarChart<{ value: number }>();

    starChart.capture({ value: 1 });
    starChart.capture({ value: 2 });

    starChart.clear();

    expect(starChart.list()).toHaveLength(0);
  });

  it("throws when restoring an unknown snapshot", () => {
    const starChart = new StarChart<{ value: number }>();

    expect(() => starChart.restore("unknown-id")).toThrow(
      'StarChart: Snapshot "unknown-id" was not found.'
    );
  });
});