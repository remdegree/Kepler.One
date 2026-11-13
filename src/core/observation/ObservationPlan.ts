
/**
 * kepler.one
 *
 * Observation Plan
 *
 * Defines which application values should be observed
 * and the conditions governing their observation.
 */

type BuiltIn =
  | Date
  | RegExp
  | Function;

/**
 * Generates valid property paths for a data structure.
 *
 * Supports:
 * - Nested object paths
 * - Dot-separated array indexes
 * - Bracket array indexes
 */
export type ValuePath<T> =
  T extends BuiltIn
    ? never
    : T extends readonly (infer U)[]
      ? `${number}` | `[${number}]` |
        `${number}.${ValuePath<U>}` |
        `[${number}].${ValuePath<U>}`
      : T extends object
        ? {
            [K in keyof T & string]:
              K |
              (
                NonNullable<T[K]> extends readonly (infer U)[]
                  ? `${K}.${number}` |
                    `${K}[${number}]` |
                    `${K}.${number}.${ValuePath<U>}` |
                    `${K}[${number}].${ValuePath<U>}`
                  : NonNullable<T[K]> extends object
                    ? `${K}.${ValuePath<NonNullable<T[K]>>}`
                    : never
              )
          }[keyof T & string]
        : never;

/**
 * Resolves the value type represented by a property path.
 */
type PathSegmentValue<T, S extends string> =
  S extends `${infer K}[${number}]`
    ? K extends keyof T
      ? NonNullable<T[K]> extends readonly (infer U)[]
        ? U
        : never
      : never
    : S extends keyof T
      ? T[S]
      : T extends readonly (infer U)[]
        ? S extends `${number}`
          ? U
          : never
        : never;

export type PathValue<
  T,
  P extends string
> =
  P extends `${infer Head}.${infer Rest}`
    ? PathValue<PathSegmentValue<T, Head>, Rest>
    : PathSegmentValue<T, P>;

/**
 * Determines how fields are selected for observation.
 */
export type ObservationMode = "all" | "selected";

/**
 * Configuration for observing an individual field.
 *
 * Callback types are inferred from the field's path.
 */
export type ObservationRule<TValues> = {
  [P in ValuePath<TValues>]: {
    path: P;
    enabled?: boolean;

    observeWhen?: (
      value: PathValue<TValues, P>
    ) => boolean;

    alertWhen?: (
      previousValue: PathValue<TValues, P>,
      currentValue: PathValue<TValues, P>
    ) => boolean;
  }
}[ValuePath<TValues>];

/**
 * Complete observation configuration.
 */
export interface ObservationPlan<TValues> {
  mode: ObservationMode;
  bodies?: ObservationRule<TValues>[];
}
