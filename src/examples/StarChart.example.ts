import { StarChart } from "../core/snapshots/StarChart";

const employee = {
    name: "John",
    salary: 50000,
    address: {
        city: "Bengaluru"
    },
    skills: ["React", "Typescript"]
};

const chart = new StarChart<typeof employee>();

const origin = chart.capture(employee);
console.log("Original snapshot:", origin);

employee.name = "John Smith";
employee.salary = 65000;
employee.address.city = "Mumbai";
employee.skills.push("Node.js");

const restored = chart.restore(origin.id);

console.log("Restored snapshot:", restored);