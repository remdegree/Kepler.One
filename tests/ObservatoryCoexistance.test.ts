import { describe, expect, it } from "vitest";

import { Observatory } from "../src/core/observatory";

interface Student {
  name: string;
}

interface Teacher {
  name: string;
}

const observationPlan = {
  mode: "selected" as const,
  bodies: [{ path: "name" as const }]
};

describe("Multiple Observatory instances", () => {
    it("maintains independent Reference Orbits", () => {
        const studentObservatory = new Observatory<Student>({
            values: { name: "Alex" },
            observationPlan
        });

        const teacherObservatory = new Observatory<Teacher>({
            values: { name: "Taylor" },
            observationPlan
        });

        studentObservatory.launch();
        teacherObservatory.launch();

        studentObservatory.update({ name: "Jordan" });

        expect(studentObservatory.hasDrift).toBe(true);
        expect(teacherObservatory.hasDrift).toBe(false);

        studentObservatory.reanchor({ name: "Jordan" });

        expect(studentObservatory.hasDrift).toBe(false);
        expect(teacherObservatory.hasDrift).toBe(false);

        teacherObservatory.update({ name: "Morgan" });

        expect(studentObservatory.hasDrift).toBe(false);
        expect(teacherObservatory.hasDrift).toBe(true);
    });

    it("keeps Signal Relay events independent", () => {
        const studentObservatory = new Observatory<Student>({
            values: { name: "Alex" },
            observationPlan
        });

        const teacherObservatory = new Observatory<Teacher>({
            values: { name: "Taylor" },
            observationPlan
        });

        let studentDriftEvents = 0;
        let teacherDriftEvents = 0;

        studentObservatory.signals.on("drift", () => {
            studentDriftEvents++;
        });

        teacherObservatory.signals.on("drift", () => {
            teacherDriftEvents++;
        });

        studentObservatory.launch();
        teacherObservatory.launch();

        studentObservatory.update({ name: "Jordan" });

        expect(studentDriftEvents).toBe(1);
        expect(teacherDriftEvents).toBe(0);

        teacherObservatory.update({ name: "Morgan" });

        expect(studentDriftEvents).toBe(1);
        expect(teacherDriftEvents).toBe(1);
    });

    it("keeps snapshots independent", () => {
        const studentObservatory = new Observatory<Student>({
            values: { name: "Alex" },
            observationPlan
        });

        const teacherObservatory = new Observatory<Teacher>({
            values: { name: "Taylor" },
            observationPlan
        });

        studentObservatory.launch();
        teacherObservatory.launch();

        const studentSnapshot = studentObservatory.getSnapshot();
        const teacherSnapshot = teacherObservatory.getSnapshot();

        studentObservatory.update({ name: "Jordan" });

        const updatedStudentSnapshot = studentObservatory.getSnapshot();
        const currentTeacherSnapshot = teacherObservatory.getSnapshot();

        expect(updatedStudentSnapshot).not.toBe(studentSnapshot);
        expect(currentTeacherSnapshot).toBe(teacherSnapshot);

        expect(updatedStudentSnapshot.hasDrift).toBe(true);
        expect(currentTeacherSnapshot.hasDrift).toBe(false);
    });
});