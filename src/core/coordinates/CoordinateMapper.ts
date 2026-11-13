
/**
 * kepler.one
 *
 * Coordinate Mapper
 *
 * Resolves values from nested objects using property paths.
 */

/**
 * Converts a property path into individual segments.
 *
 * Examples:
 * employees[0].name
 * => ["employees", "0", "name"]
 *
 * settings["user.name"]
 * => ["settings", "user.name"]
 */
function parsePath(path: string): string[] {
  const segments: string[] = [];

  const pattern = /(?:^|\.)([^.[\]]+)|\[(?:"([^"]*)"|'([^']*)'|(\d+))\]/g;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(path)) !== null) {
    const segment =
      match[1] ??
      match[2] ??
      match[3] ??
      match[4];

    segments.push(segment);
  }

  return segments;
}

/**
 * Retrieves a nested value using a property path.
 *
 * Supports:
 * - Dot notation
 * - Numeric array indexes
 * - Bracket notation
 * - Quoted property names
 * - Mixed notation
 */
export function resolvePath(source: unknown, path: string): unknown {
  if (path === "") {
    return source;
  }

  const segments = parsePath(path);

  let current: unknown = source;

  for (const segment of segments) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        current,
        segment
      )
    ) {
      return undefined;
    }

    current = (
      current as Record<string, unknown>
    )[segment];
  }

  return current;
}
