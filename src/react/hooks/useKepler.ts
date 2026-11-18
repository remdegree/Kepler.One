import { useEffect, useRef, useSyncExternalStore } from "react";

import { Observatory } from "../../core/observatory";
import type {
  ObservatoryOptions,
  ObservatorySnapshot
} from "../../core/observatory";

export interface UseKeplerOptions<TValues>
  extends ObservatoryOptions<TValues> {}

export interface UseKeplerResult<TValues>
  extends ObservatorySnapshot {
  observatory: Observatory<TValues>;
}

export function useKepler<TValues>(
  options: UseKeplerOptions<TValues>
): UseKeplerResult<TValues> {
  const observatoryRef = useRef<Observatory<TValues> | null>(null);

  if (observatoryRef.current === null) {
    observatoryRef.current = new Observatory<TValues>(options);
  }

  const observatory = observatoryRef.current;

  const previousValuesRef = useRef(options.values);
  const previousPlanRef = useRef(options.observationPlan);

  useEffect(() => {
    if (!Object.is(previousValuesRef.current, options.values)) {
      previousValuesRef.current = options.values;
      observatory.update(options.values);
    }

    if (!Object.is(previousPlanRef.current, options.observationPlan)) {
      previousPlanRef.current = options.observationPlan;
      observatory.setObservationPlan(options.observationPlan);
    }
  }, [options.values, options.observationPlan, observatory]);

  useEffect(() => {
    observatory.launch();

    return () => {
      observatory.suspend();
    };
  }, [observatory]);

  const snapshot = useSyncExternalStore(
    observatory.subscribe,
    observatory.getSnapshot,
    observatory.getSnapshot
  );

  return {
    ...snapshot,
    observatory
  };
}