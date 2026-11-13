
import {
  describe,
  it,
  expect,
  expectTypeOf
} from "vitest";

import type {
  ObservationPlan,
  ValuePath,
  PathValue
} from "../src/core/observation/ObservationPlan";

interface Employee {
  name: string;
  salary: number;
  active: boolean;
  department: {
    name: string;
    manager: {
      name: string;
    };
  };
  skills: string[];
  history: {
    year: number;
    role: string;
  }[];
}

describe("ObservationPlan", () => {
  it("supports selected observation mode", () => {
    const plan: ObservationPlan<Employee> = {
      mode: "selected",
      bodies: [
        {
          path: "name",
          enabled: true
        },
        {
          path: "salary",
          enabled: true
        }
      ]
    };

    expect(plan.mode).toBe("selected");
    expect(plan.bodies).toHaveLength(2);
  });

  it("infers the correct type for top-level properties", () => {
    const plan: ObservationPlan<Employee> = {
      mode: "selected",
      bodies: [
        {
          path: "salary",
          observeWhen: value => {
            expectTypeOf(value).toEqualTypeOf<number>();
            return value > 0;
          }
        },
        {
          path: "name",
          observeWhen: value => {
            expectTypeOf(value).toEqualTypeOf<string>();
            return value.length > 0;
          }
        }
      ]
    };

    expect(plan.bodies).toHaveLength(2);
  });

  it("infers types for nested properties", () => {
    const plan: ObservationPlan<Employee> = {
      mode: "selected",
      bodies: [
        {
          path: "department.manager.name",
          observeWhen: value => {
            expectTypeOf(value).toEqualTypeOf<string>();
            return value.length > 0;
          }
        }
      ]
    };

    expect(plan.bodies).toHaveLength(1);
  });

  it("infers types for array indexes", () => {
    const plan: ObservationPlan<Employee> = {
      mode: "selected",
      bodies: [
        {
          path: "skills[0]",
          observeWhen: value => {
            expectTypeOf(value).toEqualTypeOf<string>();
            return value.length > 0;
          }
        },
        {
          path: "history[0].year",
          observeWhen: value => {
            expectTypeOf(value).toEqualTypeOf<number>();
            return value > 2000;
          }
        }
      ]
    };

    expect(plan.bodies).toHaveLength(2);
  });

  it("infers previous and current values in alertWhen", () => {
    const plan: ObservationPlan<Employee> = {
      mode: "selected",
      bodies: [
        {
          path: "salary",
          alertWhen: (previousValue, currentValue) => {
            expectTypeOf(previousValue).toEqualTypeOf<number>();
            expectTypeOf(currentValue).toEqualTypeOf<number>();

            return previousValue !== currentValue;
          }
        }
      ]
    };

    expect(plan.bodies).toHaveLength(1);
  });

  it("accepts valid property paths", () => {
    const path: ValuePath<Employee> =
      "department.manager.name";

    expect(path).toBe("department.manager.name");
  });

  it("resolves path value types", () => {
    expectTypeOf<
      PathValue<Employee, "salary">
    >().toEqualTypeOf<number>();

    expectTypeOf<
      PathValue<Employee, "department.name">
    >().toEqualTypeOf<string>();

    expectTypeOf<
      PathValue<Employee, "history[0].year">
    >().toEqualTypeOf<number>();
  });

  it("rejects invalid property paths", () => {
    // @ts-expect-error "unknownProperty" does not exist
    const invalidPath: ValuePath<Employee> = "unknownProperty";

    expect(invalidPath).toBe("unknownProperty");
  });

  it("rejects operations incompatible with the inferred type", () => {
    const plan: ObservationPlan<Employee> = {
      mode: "selected",
      bodies: [
        {
          path: "salary",
          observeWhen: value => {
            // @ts-expect-error salary is a number
            return value.length > 0;
          }
        }
      ]
    };

    expect(plan.bodies).toHaveLength(1);
  });
});