import { apiRequest } from "../../services/api";

export interface CreateQueryPayload {
  student_id: string;
  subject: string;
  message: string;
}

export type QueryStatus = "OPEN" | "ANSWERED" | "CLOSED";

export interface Student {
  id: string;
  name: string;
}

export interface AssignedTeacher {
  id: string;
  name: string;
}

export interface Query {
  id: string;
  subject: string;
  status: QueryStatus;
  student: Student;
  assigned_teacher: AssignedTeacher;
  created_at: string;
}

export interface QueryReply {
  id: string;
  sender_id: string;
  sender_role: "TEACHER" | "PARENT";
  message: string;
  created_at: string;
}

export interface QueryDetail extends Query {
  message: string;
  replies: QueryReply[];
}

export interface QueryListResponse {
  count: number;
  results: Query[];
}

async function requestQuery<T>(
  method: "GET" | "POST",
  path: string,
  body?: object,
): Promise<T> {
  return await apiRequest<T>(method, path, body);
}

export async function createQuery(payload: CreateQueryPayload): Promise<Query> {
  return await requestQuery<Query>("POST", "/parent/queries/", payload);
}

export async function getQueries(
  student_id: string,
  status?: QueryStatus,
): Promise<QueryListResponse> {
  const params = new URLSearchParams({ student_id });
  if (status) params.set("status", status);
  return await requestQuery<QueryListResponse>(
    "GET",
    `/parent/queries/?${params.toString()}`,
  );
}

export async function getQueryById(id: string): Promise<QueryDetail> {
  return await requestQuery<QueryDetail>("GET", `/parent/queries/${id}/`);
}

export async function replyToQuery(
  id: string,
  message: string,
): Promise<QueryReply> {
  return await requestQuery<QueryReply>(
    "POST",
    `/parent/queries/${id}/replies/`,
    { message },
  );
}
