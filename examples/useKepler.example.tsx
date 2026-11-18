import { useState } from "react";
import { useKepler } from "../src";

interface Student {
  name: string;
  email: string;
}

interface StudentExampleProps {
  onSave: (student: Student) => Promise<Student>;
}

export function StudentExample({ onSave }: StudentExampleProps) {
  const [student, setStudent] = useState<Student>({
    name: "Alex",
    email: "alex@example.com"
  });

  const kepler = useKepler({
    values: student,
    observationPlan: {
      mode: "selected",
      bodies: [
        {
          path: "name",
          enabled: true,
          alertWhen: (previousValue, currentValue) =>
            previousValue !== currentValue
        },
        {
          path: "email",
          enabled: true
        }
      ]
    }
  });

  async function handleSave() {
    try {
      // The backend must confirm the save before reanchoring.
      const savedStudent = await onSave(student);

      // Establish the successfully saved values as the new baseline.
      kepler.observatory.reanchor(savedStudent);

      setStudent(savedStudent);
    } catch (error) {
      console.error("Student save failed:", error);
    }
  }

  return (
    <section>
      <h2>Student Observation</h2>

      <label>
        Name
        <input
          value={student.name}
          onChange={(event) =>
            setStudent({ ...student, name: event.target.value })
          }
        />
      </label>

      <label>
        Email
        <input
          value={student.email}
          onChange={(event) =>
            setStudent({ ...student, email: event.target.value })
          }
        />
      </label>

      <p>Has drift: {String(kepler.hasDrift)}</p>
      <p>Requires attention: {String(kepler.requiresAttention)}</p>
      <p>Drift count: {kepler.driftCount}</p>

      <button onClick={handleSave}>Save Student</button>
    </section>
  );
}