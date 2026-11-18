import { describe, expect, it, vi } from "vitest";
import { SignalRelay } from "../src/core/signals";
import type { DriftAnalysisResult } from "../src/core/observation/DriftAnalyzer";

function createDriftResult(): DriftAnalysisResult {
  return {
    hasDrift: true,
    requiresAttention: true,
    driftCount: 1,
    constellation: [
      {
        path: "name",
        previousValue: "Alice",
        currentValue: "Bob",
        requiresAttention: true
      }
    ]
  };
}

describe("SignalRelay", () => {
    it("notifies subscribers when an event is emitted", () => {
        const relay = new SignalRelay();
        const callback = vi.fn();

        relay.on("drift", callback);

        const result = createDriftResult();
        relay.emit("drift", result);

        expect(callback).toHaveBeenCalledOnce();
        expect(callback).toHaveBeenCalledWith(result);
    });

    it("supports multiple independent subscriptions of the same callback", () => {
        const relay = new SignalRelay();
        const callback = vi.fn();

        relay.on("drift", callback);
        const unsubscribeSecond = relay.on("drift", callback);

        relay.emit("drift", createDriftResult());

        expect(callback).toHaveBeenCalledTimes(2);

        unsubscribeSecond();
        callback.mockClear();

        relay.emit("drift", createDriftResult());

        expect(callback).toHaveBeenCalledOnce();
    });

    it("unsubscribes an individual registration", () => {
        const relay = new SignalRelay();
        const callback = vi.fn();

        const unsubscribe = relay.on("launch", callback);

        unsubscribe();
        relay.emit("launch", undefined);

        expect(callback).not.toHaveBeenCalled();
    });

    it("supports one-time subscriptions", () => {
        const relay = new SignalRelay();
        const callback = vi.fn();

        relay.once("launch", callback);

        relay.emit("launch", undefined);
        relay.emit("launch", undefined);

        expect(callback).toHaveBeenCalledOnce();
    });

    it("allows a one-time subscription to be cancelled", () => {
        const relay = new SignalRelay();
        const callback = vi.fn();

        const unsubscribe = relay.once("launch", callback);

        unsubscribe();
        relay.emit("launch", undefined);

        expect(callback).not.toHaveBeenCalled();
    });

    it("removes all registrations of a callback with off()", () => {
        const relay = new SignalRelay();
        const callback = vi.fn();

        relay.on("drift", callback);
        relay.on("drift", callback);

        relay.off("drift", callback);
        relay.emit("drift", createDriftResult());

        expect(callback).not.toHaveBeenCalled();
    });

    it("does not remove the same callback from other events", () => {
        const relay = new SignalRelay();
        const callback = vi.fn();

        relay.on("drift", callback);
        relay.on("attention", callback);

        relay.off("drift", callback);

        relay.emit("attention", createDriftResult());

        expect(callback).toHaveBeenCalledOnce();
    });

    it("clears listeners for a specific event", () => {
        const relay = new SignalRelay();
        const driftCallback = vi.fn();
        const launchCallback = vi.fn();

        relay.on("drift", driftCallback);
        relay.on("launch", launchCallback);

        relay.clear("drift");

        relay.emit("drift", createDriftResult());
        relay.emit("launch", undefined);

        expect(driftCallback).not.toHaveBeenCalled();
        expect(launchCallback).toHaveBeenCalledOnce();
    });

    it("clears listeners for all events", () => {
        const relay = new SignalRelay();
        const driftCallback = vi.fn();
        const launchCallback = vi.fn();

        relay.on("drift", driftCallback);
        relay.on("launch", launchCallback);

        relay.clear();

        relay.emit("drift", createDriftResult());
        relay.emit("launch", undefined);

        expect(driftCallback).not.toHaveBeenCalled();
        expect(launchCallback).not.toHaveBeenCalled();
    });

    it("does not invoke a listener removed during emission", () => {
        const relay = new SignalRelay();
        const secondCallback = vi.fn();

        relay.on("launch", () => {
        relay.off("launch", secondCallback);
        });

        relay.on("launch", secondCallback);

        relay.emit("launch", undefined);

        expect(secondCallback).not.toHaveBeenCalled();
    });

    it("removes a once listener before invoking it", () => {
        const relay = new SignalRelay();
        const callback = vi.fn(() => {
        relay.emit("launch", undefined);
        });

        relay.once("launch", callback);

        relay.emit("launch", undefined);

        expect(callback).toHaveBeenCalledOnce();
    });

    it("does not fail when emitting an event with no subscribers", () => {
        const relay = new SignalRelay();

        expect(() => relay.emit("suspend", undefined)).not.toThrow();
    });

    it("continues notifying listeners when one listener throws", () => {
    const relay = new SignalRelay();
    const secondCallback = vi.fn();

    relay.on("launch", () => {
        throw new Error("Listener failed");
    });

    relay.on("launch", secondCallback);

    expect(() => relay.emit("launch", undefined)).toThrow(
        AggregateError
    );

    expect(secondCallback).toHaveBeenCalledOnce();
    });

    it("reports all listener errors after notifying subscribers", () => {
    const relay = new SignalRelay();

    relay.on("launch", () => {
        throw new Error("First failure");
    });

    relay.on("launch", () => {
        throw new Error("Second failure");
    });

    let capturedError: unknown;

    try {
        relay.emit("launch", undefined);
    } catch (error) {
        capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(AggregateError);

    const aggregateError = capturedError as AggregateError;

    expect(aggregateError.errors).toHaveLength(2);
    });
});