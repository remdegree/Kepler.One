import { describe, expect, it } from "vitest";
import { areEquivalent } from "../src/core/observation/EquivalenceRule";

describe("areEquivalent", () => {
    it("compares primitive values", () => {
        expect(areEquivalent(10, 10)).toBe(true);
        expect(areEquivalent("hello", "hello")).toBe(true);
        expect(areEquivalent(true, false)).toBe(false);
    });

    it("compares nested objects", () => {
        const previous = {
        user: {
            name: "Alex",
            settings: {
            notifications: true
            }
        }
        };

        const current = {
        user: {
            name: "Alex",
            settings: {
            notifications: true
            }
        }
        };

        expect(areEquivalent(previous, current)).toBe(true);

        current.user.settings.notifications = false;

        expect(areEquivalent(previous, current)).toBe(false);
    });

    it("compares arrays and their contents", () => {
        expect(areEquivalent([1, 2, 3], [1, 2, 3])).toBe(true);
        expect(areEquivalent([1, 2, 3], [1, 2])).toBe(false);
        expect(
        areEquivalent([{ id: 1 }], [{ id: 2 }])
        ).toBe(false);
    });

    it("compares null and undefined correctly", () => {
        expect(areEquivalent(null, null)).toBe(true);
        expect(areEquivalent(undefined, undefined)).toBe(true);
        expect(areEquivalent(null, undefined)).toBe(false);
    });

    it("compares Date values", () => {
    expect(
        areEquivalent(
        new Date("2025-01-01T00:00:00Z"),
        new Date("2025-01-01T00:00:00Z")
        )
    ).toBe(true);

    expect(
        areEquivalent(
        new Date("2025-01-01T00:00:00Z"),
        new Date("2025-01-02T00:00:00Z")
        )
    ).toBe(false);
    });

    it("compares RegExp values", () => {
    expect(areEquivalent(/hello/gi, /hello/gi)).toBe(true);
    expect(areEquivalent(/hello/i, /hello/g)).toBe(false);
    });

    it("compares circular references", () => {
    const previous: { name: string; self?: unknown } = {
        name: "Kepler"
    };
    previous.self = previous;

    const current: { name: string; self?: unknown } = {
        name: "Kepler"
    };
    current.self = current;

    expect(areEquivalent(previous, current)).toBe(true);
    });

    it("compares deeply nested application data", () => {
        const previous = {
            order: {
                id: "order-001",
                status: "pending",
                customer: {
                    name: "Alex",
                    address: {
                    city: "Bengaluru",
                    postalCode: "560001"
                    }
                },
                tests: {
                    selectedTests: [
                        {
                            id: "test-001",
                            name: "Blood Panel",
                            subTests: [
                            { id: "sub-001", enabled: true },
                            { id: "sub-002", enabled: false }
                            ]
                        }
                    ]
                },
                notes: null
            }
        };

        const current = structuredClone(previous);
        expect(areEquivalent(previous, current)).toBe(true);
        current.order.tests.selectedTests[0].subTests[1].enabled = true;
        expect(areEquivalent(previous, current)).toBe(false);
    });

    it("distinguishes sparse arrays from arrays with undefined elements", () => {
        const sparse = new Array(2);
        const withUndefined = [undefined, undefined];

        expect(areEquivalent(sparse, withUndefined)).toBe(false);
    });

    it("does not treat seperate Map and Set instances as equivalent", () => {
        expect(
            areEquivalent(new Map([["a", 1]]), new Map([["a", 1]]))
        ).toBe(false);

        expect(
            areEquivalent(new Set([1, 2]), new Set([1, 2]))
        ).toBe(false);
    });
});