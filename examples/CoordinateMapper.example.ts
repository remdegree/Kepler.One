import { resolvePath } from "../src/core/coordinates";

// Sample application data
const employee = {
  id: 101,
  name: "Alex",
  department: {
    name: "Engineering",
    manager: {
      name: "Jordan"
    }
  },
  skills: [
    "TypeScript",
    "React",
    "Node.js"
  ],
  settings: {
    "user.name": "Alex"
  }
};

// 1. Top-level property
console.log(resolvePath(employee, "name"));
// "Alex"

// 2. Nested property
console.log(
  resolvePath(employee, "department.manager.name")
);
// "Jordan"

// 3. Array index using dot notation
console.log(resolvePath(employee, "skills.0"));
// "TypeScript"

// 4. Array index using bracket notation
console.log(resolvePath(employee, "skills[1]"));
// "React"

// 5. Mixed notation
console.log(
  resolvePath(employee, "department.manager.name")
);
// "Jordan"

// 6. Quoted property name
console.log(
  resolvePath(employee, 'settings["user.name"]')
);
// "Alex"

// 7. Missing property
console.log(
  resolvePath(employee, "department.director.name")
);
// undefined

// 8. Empty path returns the original object
console.log(resolvePath(employee, "") === employee);
// true
