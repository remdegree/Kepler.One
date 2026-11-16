import { ObservationPlan } from "../observation";
import { analyzeDrift } from "../observation/DriftAnalyzer";
import type { DriftAnalysisResult, OrbitalDrift } from "../observation/DriftAnalyzer";
import { StarChart } from "../snapshots";

export interface ObservatoryOptions<TValues> {
    values: TValues;
    observationPlan: ObservationPlan<TValues>
}

export class Observatory<TValues> {
    private readonly starChart: StarChart<TValues>;
    private liveEphemeris: TValues;
    private referenceOrbit: TValues;
    private readonly observationPlan: ObservationPlan<TValues>;
    private observing = false;
    private analysisResult: DriftAnalysisResult;
    private originChartId: string;

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

    analyze(): DriftAnalysisResult {
        this.analysisResult = analyzeDrift(
            this.referenceOrbit,
            this.liveEphemeris,
            this.observationPlan
        );

        return this.analysisResult;
    }

    update(values: TValues): DriftAnalysisResult {
        this.liveEphemeris = this.starChart.clone(values);

        if(this.observing) {
            return this.analyze();
        }

        return this.analysisResult;
    }

    launch(): void {
        this.observing = true;
        this.analyze();
    }

    suspend(): void {
        this.observing = false;
    }

    reanchor(): void{
        this.referenceOrbit = this.starChart.clone(this.liveEphemeris);
        this.analyze();
    }

    returnToOrigin(): void {
        this.referenceOrbit = this.starChart.restore(this.originChartId);
        this.analyze();
    }

    recalibrate(): DriftAnalysisResult {
        return this.analyze();
    }


}