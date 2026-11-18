export interface OrbitalDrift {
    path: string;
    previousValue: unknown;
    currentValue: unknown;
    requiresAttention: boolean;
}

export interface DriftAnalysisResult {
    hasDrift: boolean;
    requiresAttention: boolean;
    driftCount: number;
    constellation: OrbitalDrift[];
}

import {
  resolvePath
} from "../coordinates/CoordinateMapper";

import {
  areEquivalent,
  areShallowEquivalent
} from "./EquivalenceRule";

import type {
  ObservationPlan,
  ObservationRule
} from "./ObservationPlan";

function collectPaths(
  value: unknown,
  currentPath = ""
): string[] {
  if (
    value === null ||
    typeof value !== "object" ||
    value instanceof Date ||
    value instanceof RegExp
  ) {
    return currentPath ? [currentPath] : [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return currentPath ? [currentPath] : [];
    }

    return value.flatMap((item, index) =>
      collectPaths(item, `${currentPath}[${index}]`)
    );
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    return currentPath ? [currentPath] : [];
  }

  return entries.flatMap(([key, item]) => {
    const path = currentPath
      ? `${currentPath}.${key}`
      : key;

    return collectPaths(item, path);
  });
}

export function analyzeDrift<TValues>(
  referenceOrbit: TValues,
  liveEphemeris: TValues,
  observationPlan: ObservationPlan<TValues>
): DriftAnalysisResult {

  const rules = observationPlan.bodies ?? [];
  const activeRules = rules.filter((rule) => {
    if (rule.enabled === false) {
      return false;
    }

    if (rule.observeWhen) {
      const currentValue = resolvePath(liveEphemeris, rule.path);
      return rule.observeWhen(currentValue as never);
    }

    return true;
  });
  
  const paths = observationPlan.mode === "all"
    ? (() => {
        const collectedPaths = collectPaths(liveEphemeris);

        const configuredPaths = rules
          .filter((rule) => rule.enabled !== false)
          .map((rule) => rule.path);

        const filteredPaths = collectedPaths.filter(
          (path) =>
            !configuredPaths.some(
              (configuredPath) =>
                path.startsWith(`${configuredPath}.`) ||
                path.startsWith(`${configuredPath}[`)
            )
        );

        return [
          ...filteredPaths,
          ...configuredPaths
        ];
      })()
    : activeRules.map((rule) => rule.path);

  const constellation: OrbitalDrift[] = [];

  for (const path of paths) {
    const previousValue = resolvePath(
        referenceOrbit,
        path
    );

    const currentValue = resolvePath(
        liveEphemeris,
        path
    );

    const rule = activeRules.find(
      (item) => item.path === path
    );

    const comparison = {
      ...observationPlan.comparison,
      ...rule?.comparison
    };

    const strategy = comparison.strategy ?? "deep";
    const valueProperty = comparison.valueProperty ?? "value";

    let equivalent: boolean;

    if (strategy === "value-only") {
      const previousObject =
        previousValue as Record<string, unknown> | null;

      const currentObject =
        currentValue as Record<string, unknown> | null;

      const previousSelectedValue = previousObject?.[valueProperty];
      const currentSelectedValue = currentObject?.[valueProperty];

      const previousHasValue = previousObject !== null 
      && previousObject !== undefined 
      && Object.prototype.hasOwnProperty.call(
        previousObject,
        valueProperty
      );
      const currentHasValue = currentObject !== null
      && currentObject !== undefined
      && Object.prototype.hasOwnProperty.call(
        currentObject,
        valueProperty
      );

      const valueStrategy = comparison.valueStrategy ?? "deep";

      if (previousHasValue !== currentHasValue) {
        equivalent = false;
      } else if (!previousHasValue && !currentHasValue) {
        equivalent = true;
      } else if (valueStrategy === "reference") {
        equivalent = Object.is(
          previousSelectedValue,
          currentSelectedValue
        );
      } else if (valueStrategy === "shallow") {
        equivalent = areShallowEquivalent(
          previousSelectedValue,
          currentSelectedValue
        );
      } else {
        equivalent = areEquivalent(
          previousSelectedValue,
          currentSelectedValue
        );
      }
    } else if (strategy === "shallow") {
      equivalent = areShallowEquivalent(
        previousValue,
        currentValue
      );
    } else {
      equivalent = areEquivalent(
        previousValue,
        currentValue
      );
    }
    if (!equivalent) {        
      const rule = activeRules.find(
          (item) => item.path === path
      )

      const requiresAttention = rule?.alertWhen
      ? rule.alertWhen(
          previousValue as never,
          currentValue as never
      )
      : false;

      constellation.push({
        path,
        previousValue,
        currentValue,
        requiresAttention
      });
    }
  }
  const requiresAttention = constellation.some((drift) => drift.requiresAttention);

  return {
    hasDrift: constellation.length > 0,
    requiresAttention,
    driftCount: constellation.length,
    constellation
  };
}