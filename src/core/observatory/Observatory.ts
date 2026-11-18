import { ObservationPlan } from "../observation";
import { analyzeDrift } from "../observation/DriftAnalyzer";
import type { DriftAnalysisResult, OrbitalDrift } from "../observation/DriftAnalyzer";
import { SignalRelay } from "../signals";
import { StarChart } from "../snapshots";

export interface ObservatoryOptions<TValues> {
    values: TValues;
    observationPlan: ObservationPlan<TValues>
}

export interface ObservatorySnapshot {
    readonly isObserving: boolean;
    readonly hasDrift: boolean;
    readonly requiresAttention: boolean;
    readonly driftCount: number;
    readonly constellation: readonly OrbitalDrift[];
}

export class Observatory<TValues> {
    private readonly starChart: StarChart<TValues>;
    private liveEphemeris: TValues;
    private referenceOrbit: TValues;
    private observationPlan: ObservationPlan<TValues>;
    private observing = false;
    private analysisResult: DriftAnalysisResult;
    private originChartId: string;
    private readonly signalRelay = new SignalRelay();
    private readonly storeListeners = new Set<() => void>();
    private snapshot: ObservatorySnapshot;

    constructor(options: ObservatoryOptions<TValues>) {
        this.starChart = new StarChart<TValues>();
        
        const originChart = this.starChart.capture(options.values, {
            label: "Origin Chart"
        });

        this.liveEphemeris = this.starChart.clone(originChart.values);
        this.referenceOrbit = this.starChart.clone(originChart.values);
        this.observationPlan = options.observationPlan;

        this.analysisResult = analyzeDrift(
            this.referenceOrbit,
            this.liveEphemeris,
            this.observationPlan
        );

        this.originChartId = originChart.id;

        this.snapshot = this.createSnapshot();
    }

    get hasDrift(): boolean {
        return this.analysisResult.hasDrift;
    }

    get requiresAttention(): boolean {
        return this.analysisResult.requiresAttention;
    }

    get driftCount(): number {
        return this.analysisResult.driftCount;
    }

    get constellation(): OrbitalDrift[] {
        return this.analysisResult.constellation.map((drift) => ({
            ...drift
        }));
    }

    get isObserving(): boolean {
        return this.observing;
    }

    get signals(): SignalRelay {
        return this.signalRelay;
    }

    setObservationPlan(
    observationPlan: ObservationPlan<TValues>
    ): DriftAnalysisResult {
        this.observationPlan = observationPlan;
        return this.analyze();
    }

    analyze(): DriftAnalysisResult {
        const previousResult = this.analysisResult;

        const nextResult = analyzeDrift(
            this.referenceOrbit,
            this.liveEphemeris,
            this.observationPlan
        );

        this.analysisResult = nextResult;
        this.publishSnapshot();

        if (!previousResult.hasDrift && nextResult.hasDrift) {
            this.signalRelay.emit("drift", nextResult);
        }

        if (
            !previousResult.requiresAttention &&
            nextResult.requiresAttention
        ) {
            this.signalRelay.emit("attention", nextResult);
        }

        if (previousResult.hasDrift && !nextResult.hasDrift) {
            this.signalRelay.emit("clear", nextResult);
        }

        return nextResult;
    }

    update(values: TValues): DriftAnalysisResult {
        this.liveEphemeris = this.starChart.clone(values);

        if(this.observing) {
            return this.analyze();
        }

        return this.analysisResult;
    }

    launch(): void {
        if(this.observing) return;

        this.observing = true;
        this.analyze();
        this.signalRelay.emit("launch", undefined);
    }

    suspend(): void {
        if(!this.observing) return;

        this.observing = false;
        this.publishSnapshot();
        this.signalRelay.emit("suspend", undefined);
    }

    reanchor(values?: TValues): DriftAnalysisResult {
        if (values !== undefined) {
            this.liveEphemeris = this.starChart.clone(values);
        }

        this.referenceOrbit = this.starChart.clone(this.liveEphemeris);

        return this.analyze();
    }

    returnToOrigin(): void {
        this.referenceOrbit = this.starChart.restore(this.originChartId);
        this.analyze();
    }

    recalibrate(): DriftAnalysisResult {
        return this.analyze();
    }

    subscribe = (callback: () => void): (() => void) => {
        this.storeListeners.add(callback);

        return () => {
            this.storeListeners.delete(callback);
        };
    };

    getSnapshot = (): ObservatorySnapshot => {
        return this.snapshot;
    };

    private createSnapshot(): ObservatorySnapshot {
        const constellation = Object.freeze(
            this.analysisResult.constellation.map((drift) =>
                Object.freeze({ ...drift })
            )
        );

        return Object.freeze({
            isObserving: this.observing,
            hasDrift: this.analysisResult.hasDrift,
            requiresAttention: this.analysisResult.requiresAttention,
            driftCount: this.analysisResult.driftCount,
            constellation
        });
    }

    private publishSnapshot(): void {
        this.snapshot = this.createSnapshot();

        for (const callback of [...this.storeListeners]) {
            callback();
        }
    }
}