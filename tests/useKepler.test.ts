// @vitest-environment jsdom

import React from "react";
import { render, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  useKepler,
  type UseKeplerOptions,
  type UseKeplerResult
} from "../src/react/hooks/useKepler";

interface TestValues {
    name: string;
}

const observationPlan = {
    mode: "selected" as const,
    bodies: [{ path: "name" as const }]
};

function createTestComponent() {
    let result: UseKeplerResult<TestValues> | undefined;

    function TestComponent(props: UseKeplerOptions<TestValues>) {
        result = useKepler(props);
        return null;
    }

    return {
        TestComponent,
        getResult: () => {
            if(!result) {
                throw new Error("Hook has not rendered yet.");
            }

            return result;
        }
    }
}

describe("useKepler", () => {
    it("creates and launches an Observatory on mount", () => {
        const { TestComponent, getResult } = createTestComponent();

        const { unmount } = render(
        React.createElement(TestComponent, {
            values: { name: "Ada" },
            observationPlan
        })
        );

        expect(getResult().observatory).toBeDefined();
        expect(getResult().isObserving).toBe(true);

        unmount();
    });

    it("keeps the same Observatory instance across rerenders", () => {
        const { TestComponent, getResult } = createTestComponent();

        const { rerender, unmount } = render(
            React.createElement(TestComponent, {
            values: { name: "Ada" },
            observationPlan
            })
        );

        const initialObservatory = getResult().observatory;

        rerender(
            React.createElement(TestComponent, {
            values: { name: "Ada" },
            observationPlan
            })
        );

        expect(getResult().observatory).toBe(initialObservatory);

        unmount();
    });

    it("detects drift when values change", () => {
        const { TestComponent, getResult } = createTestComponent();

        const { rerender, unmount } = render(
            React.createElement(TestComponent, {
            values: { name: "Ada" },
            observationPlan
            })
        );

        rerender(
            React.createElement(TestComponent, {
            values: { name: "Grace" },
            observationPlan
            })
        );

        expect(getResult().hasDrift).toBe(true);
        expect(getResult().driftCount).toBe(1);
        expect(getResult().constellation[0].path).toBe("name");

        unmount();
    });

    it("updates the Observation Plan without replacing the Reference Orbit", () => {
        const { TestComponent, getResult } = createTestComponent();

        const disabledObservationPlan = {
            mode: "selected" as const,
            bodies: [{ path: "name" as const, enabled: false }]
        };

        const { rerender, unmount } = render(
            React.createElement(TestComponent, {
            values: { name: "Ada" },
            observationPlan
            })
        );

        const initialObservatory = getResult().observatory;

        // Change the Live Ephemeris.
        rerender(
            React.createElement(TestComponent, {
            values: { name: "Grace" },
            observationPlan
            })
        );

        expect(getResult().hasDrift).toBe(true);

        // Disable observation of the name field.
        rerender(
            React.createElement(TestComponent, {
            values: { name: "Grace" },
            observationPlan: disabledObservationPlan
            })
        );

        expect(getResult().hasDrift).toBe(false);
        expect(getResult().observatory).toBe(initialObservatory);

        // Re-enable observation. The original Reference Orbit should remain Ada.
        rerender(
            React.createElement(TestComponent, {
            values: { name: "Grace" },
            observationPlan
            })
        );

        expect(getResult().hasDrift).toBe(true);
        expect(getResult().constellation[0].previousValue).toBe("Ada");
        expect(getResult().constellation[0].currentValue).toBe("Grace");

        unmount();
    });

    it("suspends observation when the component unmounts", () => {
        const { TestComponent, getResult } = createTestComponent();

        const { unmount } = render(
            React.createElement(TestComponent, {
            values: { name: "Ada" },
            observationPlan
            })
        );

        const observatory = getResult().observatory;

        expect(observatory.isObserving).toBe(true);

        unmount();

        expect(observatory.isObserving).toBe(false);
    });

    it("supports React Strict Mode lifecycle", () => {
        const { TestComponent, getResult } = createTestComponent();

        const { unmount } = render(
            React.createElement(
            React.StrictMode,
            null,
            React.createElement(TestComponent, {
                values: { name: "Ada" },
                observationPlan
            })
            )
        );

        const observatory = getResult().observatory;

        expect(observatory.isObserving).toBe(true);

        unmount();

        expect(observatory.isObserving).toBe(false);
    });

    it("keeps the Observatory active after Strict Mode effect replay", () => {
        const { TestComponent, getResult } = createTestComponent();

        const { unmount } = render(
            React.createElement(
                React.StrictMode,
                null,
                React.createElement(TestComponent, {
                    values: { name: "Ada" },
                    observationPlan
                })
            )
        );

        const observatory = getResult().observatory;

        expect(observatory.isObserving).toBe(true);

        unmount();

        expect(observatory.isObserving).toBe(false);
    });
});