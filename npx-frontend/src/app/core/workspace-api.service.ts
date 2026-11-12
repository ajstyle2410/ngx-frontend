import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Role = 'ADMIN' | 'DEVELOPER' | 'USER';

export interface WorkspaceUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface WorkspaceProject {
  id: number;
  name: string;
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  startDate: string | null;
  endDate: string | null;
  totalTasks: number;
  doneTasks: number;
  progress: number;
  totalHours: number;
  participants: WorkspaceUser[];
  createdById?: number | null;
  createdByName?: string | null;
}

export interface WorkspaceTask {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
  assignedToId: number | null;
  assignedTo: string | null;
  hours: number;
  createdAt: string;
}

export interface WorkspaceMessage {
  id: number;
  projectId: number;
  senderId: number;
  senderName: string;
  recipientId: number;
  recipientName: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface WorkspaceNotification {
  id: number;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  activeProjects: number;
  openTasks: number;
  overdueTasks: number;
  totalHours: number;
  completedTasks: number;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);

  users(): Observable<WorkspaceUser[]> {
    return this.http.get<WorkspaceUser[]>(`${this.apiUrl}/admin/users`);
  }

  createUser(input: { name: string; email: string; password: string; role: Role }): Observable<WorkspaceUser> {
    return this.http.post<WorkspaceUser>(`${this.apiUrl}/admin/users`, input);
  }

  projects(role: Role): Observable<WorkspaceProject[]> {
    const prefix = role === 'ADMIN' ? 'admin' : role === 'DEVELOPER' ? 'developer' : 'user';
    return this.http.get<WorkspaceProject[]>(`${this.apiUrl}/${prefix}/projects`);
  }

  createProject(input: { name: string; description: string; participantIds?: number[]; startDate?: string | null; endDate?: string | null }, role: Role = 'ADMIN'): Observable<WorkspaceProject> {
    const prefix = role === 'USER' ? 'user' : 'admin';
    return this.http.post<WorkspaceProject>(`${this.apiUrl}/${prefix}/projects`, input);
  }

  updateProjectSchedule(projectId: number, startDate: string | null, endDate: string | null): Observable<WorkspaceProject> {
    return this.http.patch<WorkspaceProject>(`${this.apiUrl}/admin/projects/${projectId}/schedule`, { startDate, endDate });
  }

  updateProject(projectId: number, input: { name: string; description: string; startDate?: string | null; endDate?: string | null; participantIds?: number[] }): Observable<WorkspaceProject> {
    return this.http.put<WorkspaceProject>(`${this.apiUrl}/admin/projects/${projectId}`, input);
  }

  addParticipant(projectId: number, userId: number): Observable<WorkspaceProject> {
    return this.http.post<WorkspaceProject>(`${this.apiUrl}/admin/projects/${projectId}/participants`, { userId });
  }

  tasks(role: Role): Observable<WorkspaceTask[]> {
    const prefix = role === 'ADMIN' ? 'admin' : role === 'DEVELOPER' ? 'developer' : 'user';
    return this.http.get<WorkspaceTask[]>(`${this.apiUrl}/${prefix}/tasks`);
  }

  createTask(input: { projectId: number; title: string; description: string; priority: string; dueDate: string | null; assignedTo: number | null }): Observable<WorkspaceTask> {
    return this.http.post<WorkspaceTask>(`${this.apiUrl}/admin/projects/${input.projectId}/tasks`, input);
  }

  updateTaskStatus(role: Role, taskId: number, status: TaskStatus): Observable<WorkspaceTask> {
    const prefix = role === 'ADMIN' ? 'admin' : 'developer';
    return this.http.patch<WorkspaceTask>(`${this.apiUrl}/${prefix}/tasks/${taskId}/status`, { status });
  }

  logTime(taskId: number, input: { hours: number; workDate: string; note: string }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/developer/tasks/${taskId}/time-logs`, input);
  }

  summary(role: Role): Observable<DashboardSummary> {
    const prefix = role === 'ADMIN' ? 'admin' : 'developer';
    return this.http.get<DashboardSummary>(`${this.apiUrl}/${prefix}/dashboard/summary`);
  }

  messages(): Observable<WorkspaceMessage[]> {
    return this.http.get<WorkspaceMessage[]>(`${this.apiUrl}/messages`);
  }

  sendMessage(input: { projectId: number; recipientId: number; body: string }): Observable<WorkspaceMessage> {
    return this.http.post<WorkspaceMessage>(`${this.apiUrl}/messages`, input);
  }

  notifications(): Observable<WorkspaceNotification[]> {
    return this.http.get<WorkspaceNotification[]>(`${this.apiUrl}/notifications`);
  }

  markNotificationRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  report(projectId: number): Observable<Blob> {
    const params = new HttpParams().set('format', 'csv');
    return this.http.get(`${this.apiUrl}/admin/reports/projects/${projectId}`, { params, responseType: 'blob' });
  }
}
