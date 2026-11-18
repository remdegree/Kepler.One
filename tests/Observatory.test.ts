import { describe, expect, it, vi } from "vitest";
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

    it("emits launch and suspend signals", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const launchCallback = vi.fn();
        const suspendCallback = vi.fn();

        observatory.signals.on("launch", launchCallback);
        observatory.signals.on("suspend", suspendCallback);

        observatory.launch();
        observatory.suspend();

        expect(launchCallback).toHaveBeenCalledOnce();
        expect(suspendCallback).toHaveBeenCalledOnce();
    });

    it("emits drift when changes are detected", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const driftCallback = vi.fn();

        observatory.signals.on("drift", driftCallback);

        observatory.launch();

        observatory.update({
            name: "Kepler",
            department: "Research"
        });

        expect(driftCallback).toHaveBeenCalledOnce();
        expect(driftCallback.mock.calls[0][0].hasDrift).toBe(true);
    });

    it("emits attention when a change requires attention", () => {
        const observatory = new Observatory({
            values,
            observationPlan: {
                mode: "all",
                bodies: [
                    {
                        path: "department",
                        alertWhen: () => true
                    }
                ]
            }
        });

        const attentionCallback = vi.fn();

        observatory.signals.on("attention", attentionCallback);

        observatory.launch();

        observatory.update({
            name: "Kepler",
            department: "Research"
        });

        expect(attentionCallback).toHaveBeenCalledOnce();
        expect(
            attentionCallback.mock.calls[0][0].requiresAttention
        ).toBe(true);
    });

    it("emits clear when all detected drift is resolved", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const clearCallback = vi.fn();

        observatory.signals.on("clear", clearCallback);

        observatory.launch();

        observatory.update({
            name: "Kepler",
            department: "Research"
        });

        observatory.update({
            name: "Kepler",
            department: "Engineering"
        });

        expect(clearCallback).toHaveBeenCalledOnce();
        expect(clearCallback.mock.calls[0][0].hasDrift).toBe(false);
    });

    it("does not emit duplicate launch signals", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const callback = vi.fn();

        observatory.signals.on("launch", callback);

        observatory.launch();
        observatory.launch();

        expect(callback).toHaveBeenCalledOnce();
    });

    it("does not emit duplicate suspend signals", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const callback = vi.fn();

        observatory.signals.on("suspend", callback);

        observatory.launch();
        observatory.suspend();
        observatory.suspend();

        expect(callback).toHaveBeenCalledOnce();
    });

    it("returns the same snapshot reference until state changes", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const first = observatory.getSnapshot();
        const second = observatory.getSnapshot();

        expect(first).toBe(second);
    });

    it("publishes a new snapshot after analysis", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const previousSnapshot = observatory.getSnapshot();

        observatory.launch();

        const nextSnapshot = observatory.getSnapshot();

        expect(nextSnapshot).not.toBe(previousSnapshot);
        expect(nextSnapshot.isObserving).toBe(true);
    });

    it("publishes a new snapshot when suspended", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        observatory.launch();

        const previousSnapshot = observatory.getSnapshot();

        observatory.suspend();

        const nextSnapshot = observatory.getSnapshot();

        expect(nextSnapshot).not.toBe(previousSnapshot);
        expect(nextSnapshot.isObserving).toBe(false);
    });

    it("notifies subscribers when the snapshot changes", () => {
        const observatory = new Observatory({
            values,
            observationPlan
        });

        const callback = vi.fn();

        const unsubscribe = observatory.subscribe(callback);

        observatory.launch();

        expect(callback).toHaveBeenCalledOnce();

        unsubscribe();
        callback.mockClear();

        observatory.suspend();

        expect(callback).not.toHaveBeenCalled();
    });

    it("reanchors both states using confirmed values", () => {
        const observatory = new Observatory({
            values: {name: "Ada"},
            observationPlan: {
                mode: "selected",
                bodies: [{path: "name"}]
            }
        });

        observatory.launch();
        observatory.update({name: "Grace"});
        
        expect(observatory.hasDrift).toBe(true);

        observatory.reanchor({name: "Grace Hopper"});

        expect(observatory.hasDrift).toBe(false);
        expect(observatory.driftCount).toBe(0);
    });

    it("does not retain mutable references to confirmed values", () => {
        const observatory = new Observatory({
            values: {name: "Ada"},
            observationPlan: {
                mode: "selected",
                bodies: [{path: "name"}]
            }
        });

        const confirmedValues = { name: "Grace" };

        observatory.reanchor(confirmedValues);
        
        confirmedValues.name = "Changed externally";

        expect(observatory.hasDrift).toBe(false);
    });
});