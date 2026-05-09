export type UserRole = "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT";

export interface SchoolSummary {
  id: string;
  name: string;
  subdomain: string;
}

export interface SectionSummary {
  id: string;
  class_name: string;
  section_name: string;
}

export interface PrincipalProfile {
  id: string;
  name: string;
  mobile_number: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  mobile_number: string;
  primary_subject: {
    id: string;
    name: string;
  };
  assigned_sections: SectionSummary[];
  class_teacher_sections?: SectionSummary[];
}

export interface StudentProfile {
  id: string;
  name: string;
  mobile_number: string;
  class: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  };
  roll_number: string;
  admission_number: string;
}

export interface ParentLinkedStudent {
  id: string;
  name: string;
  class_name: string;
  section_name: string;
  roll_number: string;
}

export interface ParentProfile {
  id: string;
  name: string;
  mobile_number: string;
  linked_students: ParentLinkedStudent[];
}

export interface PrincipalMeResponse {
  id: string;
  username: string;
  role: "PRINCIPAL";
  profile_pic_url: string | null;
  profile: PrincipalProfile;
  school: SchoolSummary;
}

export interface TeacherMeResponse {
  id: string;
  username: string;
  role: "TEACHER";
  profile_pic_url: string | null;
  profile: TeacherProfile;
  school: SchoolSummary;
}

export interface StudentMeResponse {
  id: string;
  username: string;
  role: "STUDENT";
  profile_pic_url: string | null;
  profile: StudentProfile;
  school: SchoolSummary;
}

export interface ParentMeResponse {
  id: string;
  username: string;
  role: "PARENT";
  profile_pic_url: string | null;
  profile: ParentProfile;
  school: SchoolSummary;
}

export type MeResponse =
  | PrincipalMeResponse
  | TeacherMeResponse
  | StudentMeResponse
  | ParentMeResponse;
