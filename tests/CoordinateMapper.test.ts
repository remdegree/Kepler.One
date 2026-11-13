
import { describe, it, expect } from "vitest";
import { resolvePath } from "../src/core/coordinates";

describe("CoordinateMapper", () => {
  const employee = {
    name: "Alex",
    department: {
      name: "Engineering",
      manager: {
        name: "Jordan"
      }
    },
    employees: [
      { name: "Sam", salary: 50000 },
      { name: "Taylor", salary: 60000 }
    ],
    settings: {
      "user.name": "Alex"
    }
  };

  it("retrieves a top-level property", () => {
    expect(resolvePath(employee, "name")).toBe("Alex");
  });

  it("retrieves nested properties using dot notation", () => {
    expect(
      resolvePath(employee, "department.manager.name")
    ).toBe("Jordan");
  });

  it("retrieves array values using numeric indexes", () => {
    expect(
      resolvePath(employee, "employees.0.name")
    ).toBe("Sam");
  });

  it("retrieves array values using bracket notation", () => {
    expect(
      resolvePath(employee, "employees[1].name")
    ).toBe("Taylor");
  });

  it("supports mixed dot and bracket notation", () => {
    expect(
      resolvePath(employee, "employees[0].salary")
    ).toBe(50000);
  });

  it("supports quoted bracket properties", () => {
    expect(
      resolvePath(employee, 'settings["user.name"]')
    ).toBe("Alex");
  });

  it("supports single-quoted bracket properties", () => {
    expect(
      resolvePath(employee, "settings['user.name']")
    ).toBe("Alex");
  });

  it("returns the source when the path is empty", () => {
    expect(resolvePath(employee, "")).toBe(employee);
  });

  it("returns undefined for missing properties", () => {
    expect(
      resolvePath(employee, "department.director.name")
    ).toBeUndefined();
  });

  it("returns undefined when an intermediate value is null", () => {
    const data = {
      department: null
    };

    expect(
      resolvePath(data, "department.manager.name")
    ).toBeUndefined();
  });

  it("returns undefined when an intermediate value is undefined", () => {
    const data = {
      department: undefined
    };

    expect(
      resolvePath(data, "department.manager.name")
    ).toBeUndefined();
  });

  it("does not resolve inherited properties", () => {
    const data = {};

    expect(resolvePath(data, "constructor")).toBeUndefined();
    expect(resolvePath(data, "toString")).toBeUndefined();
    expect(resolvePath(data, "__proto__")).toBeUndefined();
  });

  it("returns primitive values correctly", () => {
    expect(resolvePath({ active: true }, "active")).toBe(true);
    expect(resolvePath({ count: 10 }, "count")).toBe(10);
  });
});
