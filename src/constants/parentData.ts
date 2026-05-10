import type {
    ParentProfile,
    ParentSchool,
    ParentStudent,
} from "../../types/parent";

export type School = ParentSchool;
export type AcademicClass = {
  id: string;
  name: string;
};
export type Section = {
  id: string;
  name: string;
};
export type Student = ParentStudent;

export const PARENT_PROFILE: ParentProfile = {
  id: "961be03f-394e-415e-b375-f2f5826256b3",
  name: "Ramesh Kumar",
  mobile_number: "9200000001",
  school: {
    id: "e8123e14-2d69-4d71-93a3-d8bfd2dc7900",
    name: "Green Valley Public School",
  },
  students: [
    {
      id: "843d3dc1-5747-4a37-ba25-cc62763c97a5",
      name: "Aarav Mehta",
      roll_number: "1",
      academic_class: {
        id: "0d7024a6-47c0-4b89-a646-8490faaab727",
        name: "Class 5",
      },
      section: {
        id: "97a5016f-3c2e-4137-bf45-a0da4e08d128",
        name: "5A",
      },
    },
  ],
};
