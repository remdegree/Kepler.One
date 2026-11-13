
/**
 * kepler.one
 *
 * Equivalence Rule
 *
 * Determines whether two values should be considered equivalent.
 */

/**
 * Defines a function that determines whether two values
 * should be considered equivalent.
 */
export type EquivalenceRule<T = unknown> = (
  previousValue: T,
  currentValue: T
) => boolean;

/**
 * Tracks object pairs already compared to handle circular references.
 */
type ComparisonCache = WeakMap<object, WeakSet<object>>;

/**
 * Checks whether an object pair has already been compared.
 */
function hasCompared(
  cache: ComparisonCache,
  previous: object,
  current: object
): boolean {
  return cache.get(previous)?.has(current) ?? false;
}

/**
 * Records an object pair before recursively comparing its properties.
 */
function recordComparison(
  cache: ComparisonCache,
  previous: object,
  current: object
): void {
  let compared = cache.get(previous);

  if (!compared) {
    compared = new WeakSet<object>();
    cache.set(previous, compared);
  }

  compared.add(current);
}

/**
 * Compares two supported values recursively.
 */
function compareValues(
  previousValue: unknown,
  currentValue: unknown,
  cache: ComparisonCache
): boolean {
  if (Object.is(previousValue, currentValue)) {
    return true;
  }

  if (
    previousValue === null ||
    currentValue === null ||
    typeof previousValue !== "object" ||
    typeof currentValue !== "object"
  ) {
    return false;
  }

  const previous = previousValue as object;
  const current = currentValue as object;

  if (Object.getPrototypeOf(previous) !== Object.getPrototypeOf(current)) {
    return false;
  }

  if (hasCompared(cache, previous, current)) {
    return true;
  }

  // Dates are equivalent when their timestamps match.
  if (
    previousValue instanceof Date &&
    currentValue instanceof Date
  ) {
    return Object.is(
      previousValue.getTime(),
      currentValue.getTime()
    );
  }

  // Regular expressions include lastIndex in their comparison.
  if (
    previousValue instanceof RegExp &&
    currentValue instanceof RegExp
  ) {
    return (
      previousValue.source === currentValue.source &&
      previousValue.flags === currentValue.flags &&
      previousValue.lastIndex === currentValue.lastIndex
    );
  }

  const previousIsArray = Array.isArray(previousValue);
  const currentIsArray = Array.isArray(currentValue);

    if (
        previousIsArray &&
        currentIsArray &&
        (previousValue as unknown[]).length !==
        (currentValue as unknown[]).length
    ) {
        return false;
    }

  if (previousIsArray !== currentIsArray) {
    return false;
  }

  const prototype = Object.getPrototypeOf(previousValue);

  if (
    !previousIsArray &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    return false;
  }

  // Arrays and plain objects are now safe to traverse.
  recordComparison(cache, previous, current);

  const previousKeys = Reflect.ownKeys(previous).filter(
    key => Object.getOwnPropertyDescriptor(previous, key)?.enumerable
  );

  const currentKeys = Reflect.ownKeys(current).filter(
    key => Object.getOwnPropertyDescriptor(current, key)?.enumerable
  );

  if (previousKeys.length !== currentKeys.length) {
    return false;
  }

  for (const key of previousKeys) {
    if (!currentKeys.includes(key)) {
      return false;
    }

    const previousDescriptor =
      Object.getOwnPropertyDescriptor(previous, key);

    const currentDescriptor =
      Object.getOwnPropertyDescriptor(current, key);

    // Accessor properties are intentionally unsupported.
    if (
      !previousDescriptor ||
      !currentDescriptor ||
      previousDescriptor.get ||
      previousDescriptor.set ||
      currentDescriptor.get ||
      currentDescriptor.set
    ) {
      return false;
    }

    if (
      !compareValues(
        previousDescriptor.value,
        currentDescriptor.value,
        cache
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Determines whether two values are equivalent using
 * the default deep comparison strategy.
 */
export function areEquivalent(
  previousValue: unknown,
  currentValue: unknown
): boolean {
  return compareValues(
    previousValue,
    currentValue,
    new WeakMap<object, WeakSet<object>>()
  );
}

/**
 * Default equivalence rule used by kepler.one.
 */
export const defaultEquivalenceRule: EquivalenceRule =
  areEquivalent;
