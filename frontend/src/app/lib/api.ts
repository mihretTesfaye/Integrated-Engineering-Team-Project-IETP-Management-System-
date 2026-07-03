// Talks to the Django REST backend. No mock data, no Supabase.
// Base URL comes from an env var so it's easy to point at a deployed API later.

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const ACCESS_KEY = 'ietp_access_token';
const REFRESH_KEY = 'ietp_refresh_token';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function extractErrorMessage(body: any, fallback: string): string {
  if (!body) return fallback;
  if (typeof body === 'string') return body;
  if (body.detail) return body.detail;
  // DRF validation errors come back as { field: ["message"] }
  const firstKey = Object.keys(body)[0];
  if (firstKey) {
    const val = body[firstKey];
    const msg = Array.isArray(val) ? val[0] : val;
    return `${firstKey}: ${msg}`;
  }
  return fallback;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        if (data.access) {
          tokenStore.setAccess(data.access);
          return data.access as string;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isForm?: boolean;
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isForm = false, skipAuth = false } = options;
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (!isForm) headers['Content-Type'] = 'application/json';
    if (!skipAuth) {
      const token = tokenStore.getAccess();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuth) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      res = await doFetch();
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(data, `Request failed (${res.status})`), res.status, data);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Types matching the Django serializers
// ---------------------------------------------------------------------------

export type Role = 'student' | 'advisor' | 'admin';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group: string;
  student: string;
  student_detail: User;
  role_in_group: 'leader' | 'member';
  joined_at: string;
}

export interface AdvisorAssignment {
  id: string;
  group: string;
  advisor: string;
  advisor_detail: User;
  assigned_by: string | null;
  assigned_at: string;
}

export interface ProjectGroup {
  id: string;
  group_name: string;
  academic_year: string;
  semester: string;
  department_mix: string | null;
  status: 'active' | 'completed' | 'archived';
  created_by: string | null;
  created_at: string;
  members: GroupMember[];
  advisor_assignments: AdvisorAssignment[];
}

export interface Project {
  id: string;
  group: string;
  group_detail: ProjectGroup;
  title: string;
  sdg_alignment: string | null;
  problem_statement: string | null;
  description: string | null;
  stage: 'idea' | 'proposal' | 'planning' | 'development' | 'submitted' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  submission: string;
  uploaded_by: string | null;
  file: string;
  file_name: string;
  file_type: string;
  file_size_kb: number;
  uploaded_at: string;
}

export interface Feedback {
  id: string;
  submission: string;
  advisor: string | null;
  advisor_detail: User | null;
  comment: string;
  given_at: string;
}

export interface Submission {
  id: string;
  project: string;
  submitted_by: string | null;
  submitted_by_detail: User | null;
  submission_type: 'idea' | 'proposal' | 'progress_report' | 'prototype_doc' | 'final_report' | 'poster';
  status: 'pending' | 'under_review' | 'approved' | 'revision_required' | 'rejected';
  notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  documents: DocumentItem[];
  feedback: Feedback[];
}

export interface ProgressLog {
  id: string;
  project: string;
  logged_by: string | null;
  logged_by_detail: User | null;
  log_type: 'milestone' | 'weekly_update' | 'meeting_record';
  title: string;
  description: string;
  blockers: string | null;
  log_date: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  project: string;
  evaluator: string | null;
  evaluator_detail: User | null;
  evaluation_type: 'advisor' | 'peer';
  criteria_scores: Record<string, number>;
  total_score: number;
  weight_percent: number;
  remarks: string | null;
  evaluated_at: string;
}

export interface ArchiveEntry {
  id: string;
  project: string;
  final_title: string;
  department_mix: string;
  academic_year: string;
  keywords: string;
  abstract: string | null;
  report_file: string;
  published_by: string | null;
  published_at: string;
}

export interface Notification {
  id: string;
  recipient: string;
  title: string;
  message: string;
  notif_type: 'deadline' | 'submission' | 'feedback' | 'evaluation' | 'system';
  is_read: boolean;
  sent_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string | null;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  target_table: string;
  target_id: string | null;
  detail: string | null;
  performed_at: string;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// A view may or may not paginate depending on DRF config; normalize to an array.
function asList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: Role;
    department: string | null;
  };
}

export const auth = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login/', { method: 'POST', body: { email, password }, skipAuth: true }),
  logout: () => tokenStore.clear(),
};

// ---------------------------------------------------------------------------
// Resource helpers
// ---------------------------------------------------------------------------

export const usersApi = {
  me: () => request<User>('/users/me/'),
  list: () => request<Paginated<User> | User[]>('/users/').then(asList),
  create: (payload: { full_name: string; email: string; role: Role; department?: string; password: string }) =>
    request<User>('/users/', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<User>) =>
    request<User>(`/users/${id}/`, { method: 'PATCH', body: payload }),
  remove: (id: string) => request<void>(`/users/${id}/`, { method: 'DELETE' }),
};

export const groupsApi = {
  list: () => request<Paginated<ProjectGroup> | ProjectGroup[]>('/groups/').then(asList),
  get: (id: string) => request<ProjectGroup>(`/groups/${id}/`),
  create: (payload: { group_name: string; academic_year: string; semester: string; department_mix?: string }) =>
    request<ProjectGroup>('/groups/', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<ProjectGroup>) =>
    request<ProjectGroup>(`/groups/${id}/`, { method: 'PATCH', body: payload }),
  remove: (id: string) => request<void>(`/groups/${id}/`, { method: 'DELETE' }),
};

export const groupMembersApi = {
  create: (payload: { group: string; student: string; role_in_group: 'leader' | 'member' }) =>
    request<GroupMember>('/group-members/', { method: 'POST', body: payload }),
  remove: (id: string) => request<void>(`/group-members/${id}/`, { method: 'DELETE' }),
};

export const advisorAssignmentsApi = {
  list: () => request<Paginated<AdvisorAssignment> | AdvisorAssignment[]>('/advisor-assignments/').then(asList),
  create: (payload: { group: string; advisor: string }) =>
    request<AdvisorAssignment>('/advisor-assignments/', { method: 'POST', body: payload }),
  remove: (id: string) => request<void>(`/advisor-assignments/${id}/`, { method: 'DELETE' }),
};

export const projectsApi = {
  list: () => request<Paginated<Project> | Project[]>('/projects/').then(asList),
  get: (id: string) => request<Project>(`/projects/${id}/`),
  create: (payload: {
    group: string;
    title: string;
    sdg_alignment?: string;
    problem_statement?: string;
    description?: string;
    stage?: Project['stage'];
  }) => request<Project>('/projects/', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<Project>) =>
    request<Project>(`/projects/${id}/`, { method: 'PATCH', body: payload }),
};

export const submissionsApi = {
  list: () => request<Paginated<Submission> | Submission[]>('/submissions/').then(asList),
  create: (payload: { project: string; submission_type: Submission['submission_type']; notes?: string }) =>
    request<Submission>('/submissions/', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<Submission>) =>
    request<Submission>(`/submissions/${id}/`, { method: 'PATCH', body: payload }),
};

export const documentsApi = {
  upload: (payload: { submission: string; file: File }) => {
    const form = new FormData();
    form.append('submission', payload.submission);
    form.append('file', payload.file);
    form.append('file_name', payload.file.name);
    form.append('file_type', payload.file.type || 'application/octet-stream');
    return request<DocumentItem>('/documents/', { method: 'POST', body: form, isForm: true });
  },
};

export const progressLogsApi = {
  list: () => request<Paginated<ProgressLog> | ProgressLog[]>('/progress-logs/').then(asList),
  create: (payload: {
    project: string;
    log_type: ProgressLog['log_type'];
    title: string;
    description: string;
    blockers?: string;
    log_date: string;
  }) => request<ProgressLog>('/progress-logs/', { method: 'POST', body: payload }),
};

export const feedbackApi = {
  create: (payload: { submission: string; comment: string }) =>
    request<Feedback>('/feedback/', { method: 'POST', body: payload }),
};

export const evaluationsApi = {
  list: () => request<Paginated<Evaluation> | Evaluation[]>('/evaluations/').then(asList),
  create: (payload: {
    project: string;
    evaluation_type: Evaluation['evaluation_type'];
    criteria_scores: Record<string, number>;
    total_score: number;
    weight_percent: number;
    remarks?: string;
  }) => request<Evaluation>('/evaluations/', { method: 'POST', body: payload }),
};

export const archiveApi = {
  list: () => request<Paginated<ArchiveEntry> | ArchiveEntry[]>('/archive/').then(asList),
  create: (payload: {
    project: string;
    final_title: string;
    department_mix: string;
    academic_year: string;
    keywords: string;
    abstract?: string;
    report_file: File;
  }) => {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) form.append(key, value as any);
    });
    return request<ArchiveEntry>('/archive/', { method: 'POST', body: form, isForm: true });
  },
};

export const notificationsApi = {
  list: () => request<Paginated<Notification> | Notification[]>('/notifications/').then(asList),
  markRead: (id: string) => request<Notification>(`/notifications/${id}/mark_read/`, { method: 'POST' }),
};

export const auditLogsApi = {
  list: () => request<Paginated<AuditLogEntry> | AuditLogEntry[]>('/audit-logs/').then(asList),
};
