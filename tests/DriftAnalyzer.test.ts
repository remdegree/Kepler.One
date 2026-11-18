import { describe, expect, it } from "vitest";
import { analyzeDrift } from "../src/core/observation/DriftAnalyzer";

describe("analyzeDrift", () => {
    it("detects changes in selected fields", () => {
        const result = analyzeDrift(
        { name: "Alex", department: "Engineering" },
        { name: "Alex", department: "Product" },
        {
            mode: "selected",
            bodies: [
            { path: "name" },
            { path: "department" }
            ]
        }
        );

        expect(result.hasDrift).toBe(true);
        expect(result.driftCount).toBe(1);
        expect(result.constellation[0].path).toBe("department");
    });

    it("returns no drift when values are unchanged", () => {
        const values = { name: "Alex", salary: 50000 };

        const result = analyzeDrift(
        values,
        { ...values },
        {
            mode: "selected",
            bodies: [
            { path: "name" },
            { path: "salary" }
            ]
        }
        );

        expect(result.hasDrift).toBe(false);
        expect(result.driftCount).toBe(0);
    });

    it("detects changes recursively in all mode", () => {
        const result = analyzeDrift(
        {
            employee: {
            name: "Alex",
            department: "Engineering"
            }
        },
        {
            employee: {
            name: "Alex",
            department: "Product"
            }
        },
        { mode: "all" }
        );

        expect(result.hasDrift).toBe(true);
        expect(result.constellation).toHaveLength(1);
        expect(result.constellation[0].path).toBe(
        "employee.department"
        );
    });

    it("sets requiresAttention when alertWhen returns true", () => {
        const result = analyzeDrift(
            { salary: 50000 },
            { salary: 60000 },
            {
            mode: "selected",
            bodies: [
                {
                path: "salary",
                alertWhen: (previousValue, currentValue) =>
                    currentValue > previousValue
                }
            ]
            }
        );

        expect(result.requiresAttention).toBe(true);
        expect(result.constellation[0].requiresAttention).toBe(true);
    });

    it("does not require attention when alertWhen returns false", () => {
        const result = analyzeDrift(
            { salary: 60000 },
            { salary: 50000 },
            {
            mode: "selected",
            bodies: [
                {
                path: "salary",
                alertWhen: (previousValue, currentValue) =>
                    currentValue > previousValue
                }
            ]
            }
        );

        expect(result.hasDrift).toBe(true);
        expect(result.requiresAttention).toBe(false);
    });

    it("ignores fields when observeWhen returns false", () => {
        const result = analyzeDrift(
            { salary: 50000 },
            { salary: 0 },
            {
                mode: "selected",
                bodies: [
                    {
                        path: "salary",
                        enabled: true,
                        observeWhen: (value) => value > 0
                    }
                ]
            }
        );

        expect(result.hasDrift).toBe(false);
        expect(result.driftCount).toBe(0);
    });

    it("ignores disabled observation rules", () => {
        const result = analyzeDrift(
            { salary: 50000 },
            { salary: 60000 },
            {
                mode: "selected",
                bodies: [
                    {
                        path: "salary",
                        enabled: false
                    }
                ]
            }
        );

        expect(result.hasDrift).toBe(false);
    });

    it("ignores metadata when using value-only comparison", () => {
        const result = analyzeDrift(
            {
            name: {
                value: "Alex",
                isValid: true,
                isPresent: true,
                isTouched: false
            }
            },
            {
            name: {
                value: "Alex",
                isValid: false,
                isPresent: true,
                isTouched: true
            }
            },
            {
            mode: "selected",
            comparison: {
                strategy: "deep",
                valueProperty: "value",
                valueStrategy: "deep"
            },
            bodies: [
                {
                path: "name",
                comparison: {
                    strategy: "value-only"
                }
                }
            ]
            }
        );

        expect(result.hasDrift).toBe(false);
    });

    it("detects changes to the actual value while ignoring metadata", () => {
    const result = analyzeDrift(
        {
        name: {
            value: "Alex",
            isValid: true
        }
        },
        {
        name: {
            value: "Alexander",
            isValid: false
        }
        },
        {
        mode: "selected",
        comparison: {
            strategy: "deep",
            valueProperty: "value"
        },
        bodies: [
            {
            path: "name",
            comparison: {
                strategy: "value-only"
            }
            }
        ]
        }
    );

    expect(result.hasDrift).toBe(true);
    expect(result.constellation[0].path).toBe("name");
    });

    it("uses reference comparison for selected values", () => {
        const previousValue = { id: 1 };
        const currentValue = { id: 1 };

        const result = analyzeDrift(
            { name: { value: previousValue } },
            { name: { value: currentValue } },
            {
            mode: "selected",
            bodies: [
                {
                path: "name",
                comparison: {
                    strategy: "value-only",
                    valueStrategy: "reference"
                }
                }
            ]
            }
        );

        expect(result.hasDrift).toBe(true);
    });

    it("uses deep comparison for selected object values", () => {
    const result = analyzeDrift(
        { name: { value: { first: "Alex", last: "Smith" } } },
        { name: { value: { first: "Alex", last: "Smith" } } },
        {
        mode: "selected",
        bodies: [
            {
            path: "name",
            comparison: {
                strategy: "value-only",
                valueStrategy: "deep"
            }
            }
        ]
        }
    );

    expect(result.hasDrift).toBe(false);
    });

    it("detects nested reference changes with shallow comparison", () => {
            const result = analyzeDrift(
                {
                profile: {
                    name: "Alex",
                    settings: { theme: "dark" }
                }
                },
                {
                profile: {
                    name: "Alex",
                    settings: { theme: "dark" }
                }
                },
                {
                mode: "selected",
                bodies: [
                    {
                    path: "profile",
                    comparison: {
                        strategy: "shallow"
                    }
                    }
                ]
                }
            );

            expect(result.hasDrift).toBe(true);
    });

    it("supports shallow comparison inside value-only strategy", () => {
    const result = analyzeDrift(
        {
        profile: {
            value: { name: "Alex", settings: { theme: "dark" } },
            isValid: true
        }
        },
        {
        profile: {
            value: { name: "Alex", settings: { theme: "dark" } },
            isValid: false
        }
        },
        {
        mode: "selected",
        bodies: [
            {
            path: "profile",
            comparison: {
                strategy: "value-only",
                valueStrategy: "shallow"
            }
            }
        ]
        }
    );

    expect(result.hasDrift).toBe(true);
    });

    it("allows per-path comparison to override global comparison", () => {
        const result = analyzeDrift(
            {
            profile: {
                value: "Alex",
                isValid: true
            }
            },
            {
            profile: {
                value: "Alex",
                isValid: false
            }
            },
            {
            mode: "selected",
            comparison: {
                strategy: "deep"
            },
            bodies: [
                {
                path: "profile",
                comparison: {
                    strategy: "value-only"
                }
                }
            ]
            }
        );

        expect(result.hasDrift).toBe(false);
    });

    it("treats a missing value property in both objects as equivalent", () => {
        const result = analyzeDrift(
            { name: { isValid: true } },
            { name: { isValid: false } },
            {
            mode: "selected",
            bodies: [
                {
                path: "name",
                comparison: {
                    strategy: "value-only",
                    valueProperty: "value"
                }
                }
            ]
            }
        );

        expect(result.hasDrift).toBe(false);
    });

    it("distinguishes an undefined value property from a missing property", () => {
    const result = analyzeDrift(
        { name: { value: undefined } },
        { name: { isValid: true } },
        {
        mode: "selected",
        bodies: [
            {
            path: "name",
            comparison: {
                strategy: "value-only",
                valueProperty: "value"
            }
            }
        ]
        }
    );

    expect(result.hasDrift).toBe(true);
    });

    it("applies per-path comparison overrides in all mode", () => {
        const result = analyzeDrift(
            {
            name: {
                value: "Alex",
                isValid: true,
                isTouched: false
            },
            department: "Engineering"
            },
            {
            name: {
                value: "Alex",
                isValid: false,
                isTouched: true
            },
            department: "Product"
            },
            {
            mode: "all",
            comparison: {
                strategy: "deep"
            },
            bodies: [
                {
                path: "name",
                comparison: {
                    strategy: "value-only"
                }
                }
            ]
            }
        );

        expect(result.hasDrift).toBe(true);
        expect(result.driftCount).toBe(1);
        expect(result.constellation[0].path).toBe("department");
    });
});