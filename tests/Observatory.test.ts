import { describe, expect, it } from "vitest";
import { Observatory } from "../src/core/observatory/Observatory";
import { StarChart } from "../src/core/snapshots";

describe("Observatory", () => {
    const values = {
        name: "Kepler",
        department: "Engineering"
    };

    const observationPlan = {
        mode: "all" as const
    };

    it("initializes with an Origin Chart and no drift", () => {
        const observatory = new Observatory({
        values,
        observationPlan
        });

        expect(observatory.isObserving).toBe(false);
        expect(observatory.hasDrift).toBe(false);
        expect(observatory.requiresAttention).toBe(false);
        expect(observatory.driftCount).toBe(0);
        expect(observatory.constellation).toEqual([]);
    });

    it("updates Live Ephemeris without analyzing while suspended", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        observatory.update({
            name: "Kepler",
            department: "Research"
        });

        expect(observatory.isObserving).toBe(false);
        expect(observatory.hasDrift).toBe(false);

        const result = observatory.analyze();

        expect(result.hasDrift).toBe(true);
        expect(result.driftCount).toBe(1);
        expect(result.constellation[0].path).toBe("department");
    });

    it("automatically analyzes updates after launch", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        observatory.launch();

        expect(observatory.isObserving).toBe(true);

        const result = observatory.update({
            name: "Kepler",
            department: "Research"
        });

        expect(result.hasDrift).toBe(true);
        expect(result.driftCount).toBe(1);
        expect(result.constellation[0].path).toBe("department");
    });

    it("stops automatic analysis after suspend", () => {
        const observatory = new Observatory({
        values,
        observationPlan
        });

        observatory.launch();

        observatory.update({
        name: "Kepler",
        department: "Research"
        });

        expect(observatory.hasDrift).toBe(true);

        observatory.suspend();

        expect(observatory.isObserving).toBe(false);

        observatory.update({
        name: "Kepler",
        department: "Finance"
        });

        // The previous analysis remains unchanged until recalculated.
        expect(observatory.constellation[0].currentValue).toBe("Research");

        const result = observatory.analyze();

        expect(result.constellation[0].currentValue).toBe("Finance");
    });

    it("uses current Live Ephemeris as the new Reference Orbit", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        observatory.launch();

        observatory.update({
            name: "Kepler",
            department: "Research"
        });

        expect(observatory.hasDrift).toBe(true);

        observatory.reanchor();

        expect(observatory.hasDrift).toBe(false);
        expect(observatory.driftCount).toBe(0);
        expect(observatory.isObserving).toBe(true);
    });

    it("restores the original Reference Orbit after reanchoring", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        observatory.launch();

        observatory.update({
            name: "Kepler",
            department: "Research"
        });

        observatory.reanchor();

        expect(observatory.hasDrift).toBe(false);

        observatory.returnToOrigin();

        expect(observatory.hasDrift).toBe(true);
        expect(observatory.driftCount).toBe(1);
        expect(observatory.constellation[0].path).toBe("department");
        expect(observatory.constellation[0].previousValue).toBe("Engineering");
        expect(observatory.constellation[0].currentValue).toBe("Research");
    });

    it("recalculates drift without changing the Reference Orbit", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        observatory.update({
            name: "Kepler",
            department: "Research"
        });

        const result = observatory.recalibrate();

        expect(result.hasDrift).toBe(true);
        expect(result.driftCount).toBe(1);
        expect(result.constellation[0].previousValue).toBe("Engineering");
        expect(result.constellation[0].currentValue).toBe("Research");
        expect(observatory.isObserving).toBe(false);
    });

    it("isolates internal values from external mutations", () => {
        const input = {
            name: "Kepler",
            department: "Engineering"
        };

        const observatory = new Observatory({
            values: input,
            observationPlan
        });

        input.department = "Finance";

        expect(observatory.hasDrift).toBe(false);

        const result = observatory.update({
            name: "Kepler",
            department: "Research"
        });

        expect(result.hasDrift).toBe(false);

        expect(observatory.analyze().hasDrift).toBe(true);
    });

    it("clones values without creating a new snapshot", () => { 
        const chart = new StarChart<{ name: string }>();

        const origin = chart.capture(
            { name: "Kepler" },
            { label: "Origin Chart" }
        );

        const cloned = chart.clone(origin.values);

        expect(cloned).toEqual(origin.values);
        expect(cloned).not.toBe(origin.values);
        expect(chart.list()).toHaveLength(1);
    });

    it("protects internal analysis from constellation mutations", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        observatory.launch();

        observatory.update({
            name: "Kepler",
            department: "Research"
        });

        const constellation = observatory.constellation;

        constellation.length = 0;

        expect(observatory.hasDrift).toBe(true);
        expect(observatory.driftCount).toBe(1);
    });

    it("does not accumulate snapshots during repeated updates", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const internal = observatory as any;
        const initialCount = internal.starChart.list().length;

        for (let index = 0; index < 10; index++) {
            observatory.update({
            name: "Kepler",
            department: `Department ${index}`
            });
        }

        expect(internal.starChart.list()).toHaveLength(initialCount);
    });
});