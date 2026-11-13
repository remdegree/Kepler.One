import { ObservationPlan } from "../src/core/observation/ObservationPlan";

interface Employee {
  name: string;
  salary: number;
  department: {
    name: string;
    manager: {
      name: string;
    };
  };
  active: boolean;
  skills: string[];
}

const observationPlan: ObservationPlan<Employee> = {
  mode: "selected",

  bodies: [
    {
      path: "name",
      enabled: true,

      // TypeScript infers string.
      observeWhen: value => value.length > 0
    },
    {
      path: "salary",
      enabled: true,

      // TypeScript infers number.
      observeWhen: value => value > 0,

      alertWhen: (previousValue, currentValue) =>
        previousValue !== currentValue
    },
    {
      path: "department.manager.name",
      enabled: true,

      // TypeScript infers string.
      observeWhen: value => value.length > 0
    },
    {
      path: "skills[0]",
      enabled: true,

      // TypeScript infers string.
      observeWhen: value => value.length > 0
    },
    {
      path: "active",
      enabled: false
    }
  ]
};

console.log("Observation Plan:", observationPlan);
