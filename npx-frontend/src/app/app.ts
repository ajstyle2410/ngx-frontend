import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, Role } from './core/auth.service';
import {
  DashboardSummary,
  TaskStatus,
  WorkspaceApiService,
  WorkspaceMessage,
  WorkspaceNotification,
  WorkspaceProject,
  WorkspaceTask,
  WorkspaceUser,
} from './core/workspace-api.service';

type Page = 'dashboard' | 'projects' | 'tasks' | 'people' | 'messages' | 'reports';
type Modal = 'task' | 'project' | 'time' | 'user' | 'schedule' | null;

@Component({
  imports: [DatePipe, FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(WorkspaceApiService);

  readonly pageTitles: Record<Page, string> = {
    dashboard: 'Overview',
    projects: 'Projects',
    tasks: 'Task board',
    people: 'People',
    messages: 'Messages',
    reports: 'Reports',
  };

  role: Role | null = null;
  currentUserId: number | null = null;
  currentName = '';
  page: Page = 'dashboard';
  authMode: 'login' | 'register' = 'login';
  registerName = '';
  email = '';
  password = '';
  isLoggedIn = false;
  menuOpen = false;
  modal: Modal = null;
  searchTerm = '';
  statusFilter = 'ALL';
  error = '';
  notice = '';
  loading = false;
  saving = false;
  selectedTaskId = 0;
  timeHours = 1;
  timeNote = '';
  timeDate = new Date().toISOString().slice(0, 10);
  selectedProjectId: number | null = null;
  selectedRecipientId: number | null = null;
  selectedUserProjectId: number | null = null;
  participantToAddId: number | null = null;
  editingScheduleProjectId: number | null = null;
  scheduleProjectName = '';
  scheduleProjectDescription = '';
  scheduleStartDate = '';
  scheduleEndDate = '';
  draftTask = { title: '', projectId: null as number | null, developerId: null as number | null, priority: 'MEDIUM', dueDate: '', description: '' };
  draftProject = { name: '', description: '', startDate: '', endDate: '', participantIds: [] as number[] };
  draftUser = { name: '', email: '', password: '', role: 'DEVELOPER' as Role };

  projects: WorkspaceProject[] = [];
  tasks: WorkspaceTask[] = [];
  users: WorkspaceUser[] = [];
  messages: WorkspaceMessage[] = [];
  notifications: WorkspaceNotification[] = [];
  summary: DashboardSummary | null = null;

  ngOnInit(): void {
    const session = this.auth.session;
    if (session) {
      this.role = session.role;
      this.currentUserId = session.id;
      this.currentName = session.name;
      this.email = session.email;
      this.isLoggedIn = true;
      this.loadWorkspace();
    }
  }

  get roleLabel(): string {
    return this.role ? this.role.charAt(0) + this.role.slice(1).toLowerCase() : '';
  }

  get activeTasks(): WorkspaceTask[] {
    return this.tasks.filter((task) => {
      const matchesStatus = this.statusFilter === 'ALL' || task.status === this.statusFilter;
      const matchesSearch = `${task.title} ${task.projectName}`.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }

  get userProject(): WorkspaceProject | undefined {
    if (!this.projects.length) return undefined;
    if (this.selectedUserProjectId !== null) {
      const found = this.projects.find((p) => p.id === this.selectedUserProjectId);
      if (found) return found;
    }
    return this.projects[0];
  }

  get userTasks(): WorkspaceTask[] {
    return this.userProject ? this.tasks.filter((task) => task.projectId === this.userProject?.id) : [];
  }

  get hasUnreadNotifications(): boolean {
    return this.notifications.some((item) => !item.read);
  }

  get todoTaskCount(): number {
    return this.tasks.filter((task) => task.status === 'TODO').length;
  }

  get inProgressTaskCount(): number {
    return this.tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  }

  get selectedTaskTitle(): string {
    return this.tasks.find((task) => task.id === this.selectedTaskId)?.title ?? '';
  }

  selectUserProject(id: number | string | null): void {
    this.selectedUserProjectId = id !== null ? Number(id) : null;
  }

  projectParticipantNames(project: WorkspaceProject): string {
    const names = this.projectParticipantsFor(project).map((person) => person.name);
    return names.length ? names.join(', ') : 'No team members added';
  }

  isParticipant(project: WorkspaceProject, userId: number): boolean {
    return project.participants.some((member) => member.id === userId);
  }

  get progress(): number {
    return this.userProject?.progress ?? 0;
  }

  get totalHours(): number {
    return this.summary?.totalHours ?? this.projects.reduce((sum, project) => sum + Number(project.totalHours), 0);
  }

  get openTaskCount(): number {
    return this.summary?.openTasks ?? this.tasks.filter((task) => task.status !== 'DONE').length;
  }

  get overdueCount(): number {
    return this.summary?.overdueTasks ?? this.tasks.filter((task) =>
      task.status !== 'DONE' && !!task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10),
    ).length;
  }

  get activeProjectCount(): number {
    return this.summary?.activeProjects ?? this.projects.filter((project) => project.status === 'ACTIVE').length;
  }

  get currentHours(): number {
    return this.summary?.totalHours ?? this.tasks.reduce((sum, task) => sum + Number(task.hours), 0);
  }

  get visibleUsers(): WorkspaceUser[] {
    return this.users.filter((user) => !this.searchTerm || `${user.name} ${user.email}`.toLowerCase().includes(this.searchTerm.toLowerCase()));
  }

  get recipients(): WorkspaceUser[] {
    const project = this.projects.find((item) => item.id === this.selectedProjectId);
    if (!project || !this.role) return [];
    return project.participants.filter((person) => {
      if (person.id === this.currentUserId) return false;
      return this.role === 'ADMIN' ? person.role !== 'ADMIN' : person.role === 'ADMIN';
    });
  }

  get messagesForThread(): WorkspaceMessage[] {
    return this.messages.filter((message) =>
      this.selectedRecipientId === null
        ? true
        : message.senderId === this.selectedRecipientId || message.recipientId === this.selectedRecipientId,
    );
  }

  login(): void {
    this.error = '';
    this.saving = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (session) => {
        this.role = session.role;
        this.currentUserId = session.id;
        this.currentName = session.name;
        this.isLoggedIn = true;
        this.password = '';
        this.authMode = 'login';
        this.page = 'dashboard';
        this.loadWorkspace();
        this.saving = false;
      },
      error: (error: unknown) => {
        this.saving = false;
        this.error = this.errorMessage(error, 'Could not sign in. Check your email and password.');
      },
    });
  }

  register(): void {
    if (!this.registerName.trim() || !this.email.trim() || !this.password) return;
    this.error = '';
    this.saving = true;
    this.auth.register(this.registerName.trim(), this.email.trim(), this.password).subscribe({
      next: (session) => {
        this.role = session.role;
        this.currentUserId = session.id;
        this.currentName = session.name;
        this.isLoggedIn = true;
        this.password = '';
        this.registerName = '';
        this.authMode = 'login';
        this.page = 'dashboard';
        this.loadWorkspace();
        this.saving = false;
        this.showNotice('Account registered successfully! Welcome.');
      },
      error: (error: unknown) => {
        this.saving = false;
        this.error = this.errorMessage(error, 'Could not complete registration. Check your details.');
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.isLoggedIn = false;
    this.role = null;
    this.currentUserId = null;
    this.currentName = '';
    this.authMode = 'login';
    this.registerName = '';
    this.projects = [];
    this.tasks = [];
    this.users = [];
    this.messages = [];
    this.notifications = [];
    this.summary = null;
    this.error = '';
    this.password = '';
  }

  loadWorkspace(): void {
    if (!this.role) return;
    this.loading = true;
    this.error = '';
    this.api.projects(this.role).subscribe({
      next: (projects) => {
        this.projects = projects;
        if (this.selectedUserProjectId === null && projects.length) {
          this.selectedUserProjectId = projects[0].id;
        }
        if (this.draftTask.projectId === null && projects.length) this.draftTask.projectId = projects[0].id;
        if (this.selectedProjectId === null && projects.length) this.selectedProjectId = projects[0].id;
        this.loadRemainingData();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.handleApiError(error);
      },
    });
  }

  private loadRemainingData(): void {
    if (!this.role) return;
    this.api.tasks(this.role).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        if (this.role === 'ADMIN') this.loadAdminData();
        else this.loadSharedData();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.handleApiError(error);
      },
    });
  }

  private loadAdminData(): void {
    this.api.users().subscribe({
      next: (users) => {
        this.users = users;
        this.api.summary('ADMIN').subscribe({
          next: (summary) => {
            this.summary = summary;
            this.loadSharedData();
          },
          error: (error: unknown) => {
            this.loading = false;
            this.handleApiError(error);
          },
        });
      },
      error: (error: unknown) => {
        this.loading = false;
        this.handleApiError(error);
      },
    });
  }

  private loadSharedData(): void {
    this.api.messages().subscribe({
      next: (messages) => {
        this.messages = messages;
        this.api.notifications().subscribe({
          next: (notifications) => {
            this.notifications = notifications;
            if (this.role === 'DEVELOPER') {
              this.api.summary('DEVELOPER').subscribe({
                next: (summary) => {
                  this.summary = summary;
                  this.loading = false;
                },
                error: (error: unknown) => {
                  this.loading = false;
                  this.handleApiError(error);
                },
              });
            } else {
              this.loading = false;
            }
          },
          error: (error: unknown) => {
            this.loading = false;
            this.handleApiError(error);
          },
        });
      },
      error: (error: unknown) => {
        this.loading = false;
        this.handleApiError(error);
      },
    });
  }

  navigate(page: Page): void {
    this.page = page;
    this.menuOpen = false;
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.error = '';
  }

  setTaskStatus(task: WorkspaceTask, status: TaskStatus): void {
    if (!this.role) return;
    this.saving = true;
    this.api.updateTaskStatus(this.role, task.id, status).subscribe({
      next: (updated) => {
        this.tasks = this.tasks.map((item) => item.id === updated.id ? updated : item);
        this.saving = false;
        this.loadWorkspace();
        this.showNotice('Task status updated.');
      },
      error: (error: unknown) => {
        this.saving = false;
        this.handleApiError(error);
      },
    });
  }

  openTimeLog(task: WorkspaceTask): void {
    this.selectedTaskId = task.id;
    this.timeHours = 1;
    this.timeNote = '';
    this.timeDate = new Date().toISOString().slice(0, 10);
    this.modal = 'time';
  }

  saveTimeLog(): void {
    if (this.timeHours <= 0 || this.timeHours > 24) {
      this.error = 'Hours must be greater than 0 and no more than 24.';
      return;
    }
    this.saving = true;
    this.api.logTime(this.selectedTaskId, { hours: this.timeHours, workDate: this.timeDate, note: this.timeNote }).subscribe({
      next: () => {
        this.modal = null;
        this.saving = false;
        this.loadWorkspace();
        this.showNotice('Time entry saved.');
      },
      error: (error: unknown) => {
        this.saving = false;
        this.handleApiError(error);
      },
    });
  }

  saveTask(): void {
    if (!this.draftTask.title.trim() || this.draftTask.projectId === null) return;
    this.saving = true;
    this.api.createTask({
      projectId: this.draftTask.projectId,
      title: this.draftTask.title.trim(),
      description: this.draftTask.description.trim(),
      priority: this.draftTask.priority,
      dueDate: this.draftTask.dueDate || null,
      assignedTo: this.draftTask.developerId,
    }).subscribe({
      next: () => {
        this.draftTask = { title: '', projectId: this.projects[0]?.id ?? null, developerId: null, priority: 'MEDIUM', dueDate: '', description: '' };
        this.modal = null;
        this.saving = false;
        this.loadWorkspace();
        this.showNotice('Task created.');
      },
      error: (error: unknown) => {
        this.saving = false;
        this.handleApiError(error);
      },
    });
  }

  selectedProjectForDraftTask(): WorkspaceProject | undefined {
    return this.projects.find((p) => p.id === this.draftTask.projectId);
  }

  openCreateTaskForProject(projectId: number): void {
    this.draftTask = {
      title: '',
      projectId: Number(projectId),
      developerId: null,
      priority: 'MEDIUM',
      dueDate: '',
      description: '',
    };
    this.modal = 'task';
  }

  openScheduleModal(project: WorkspaceProject): void {
    this.editingScheduleProjectId = project.id;
    this.scheduleProjectName = project.name;
    this.scheduleProjectDescription = project.description || '';
    this.scheduleStartDate = project.startDate ?? '';
    this.scheduleEndDate = project.endDate ?? '';
    this.modal = 'schedule';
  }

  saveProjectSchedule(): void {
    if (this.editingScheduleProjectId === null) return;
    this.saving = true;
    this.api.updateProjectSchedule(
      this.editingScheduleProjectId,
      this.scheduleStartDate ? this.scheduleStartDate : null,
      this.scheduleEndDate ? this.scheduleEndDate : null
    ).subscribe({
      next: (updated) => {
        this.modal = null;
        this.saving = false;
        this.editingScheduleProjectId = null;
        this.loadWorkspace();
        this.showNotice(`Schedule decided: Start ${updated.startDate ?? 'TBD'} to End ${updated.endDate ?? 'TBD'}`);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.handleApiError(error);
      },
    });
  }

  saveProject(): void {
    if (!this.draftProject.name.trim() || !this.role) return;
    this.saving = true;
    this.api.createProject({
      name: this.draftProject.name.trim(),
      description: this.draftProject.description.trim(),
      startDate: this.draftProject.startDate || null,
      endDate: this.draftProject.endDate || null,
      participantIds: this.role === 'ADMIN' ? this.draftProject.participantIds : [],
    }, this.role).subscribe({
      next: (project) => {
        this.draftProject = { name: '', description: '', startDate: '', endDate: '', participantIds: [] };
        this.modal = null;
        this.saving = false;
        this.selectedUserProjectId = project.id;
        this.loadWorkspace();
        this.showNotice(this.role === 'USER' ? 'Project requirements submitted to administrator.' : 'Project created.');
      },
      error: (error: unknown) => {
        this.saving = false;
        this.handleApiError(error);
      },
    });
  }

  saveUser(): void {
    if (!this.draftUser.name.trim() || !this.draftUser.email.trim() || !this.draftUser.password) return;
    this.saving = true;
    this.api.createUser({ ...this.draftUser, name: this.draftUser.name.trim(), email: this.draftUser.email.trim() }).subscribe({
      next: () => {
        this.draftUser = { name: '', email: '', password: '', role: 'DEVELOPER' };
        this.modal = null;
        this.saving = false;
        this.loadWorkspace();
        this.showNotice('Account created.');
      },
      error: (error: unknown) => {
        this.saving = false;
        this.handleApiError(error);
      },
    });
  }

  addParticipant(project: WorkspaceProject): void {
    if (this.participantToAddId === null) return;
    this.saving = true;
    this.api.addParticipant(project.id, this.participantToAddId).subscribe({
      next: () => {
        this.participantToAddId = null;
        this.saving = false;
        this.loadWorkspace();
        this.showNotice('Project participant added.');
      },
      error: (error: unknown) => {
        this.saving = false;
        this.handleApiError(error);
      },
    });
  }

  sendMessage(): void {
    const body = this.messageDraft.trim();
    if (!body || this.selectedProjectId === null || this.selectedRecipientId === null) {
      this.error = 'Choose a project and recipient before sending.';
      return;
    }
    this.saving = true;
    this.api.sendMessage({ projectId: this.selectedProjectId, recipientId: this.selectedRecipientId, body }).subscribe({
      next: (message) => {
        this.messages = [...this.messages, message];
        this.messageDraft = '';
        this.saving = false;
        this.error = '';
      },
      error: (error: unknown) => {
        this.saving = false;
        this.handleApiError(error);
      },
    });
  }

  messageDraft = '';

  changeMessageProject(projectId: number): void {
    this.selectedProjectId = Number(projectId);
    this.selectedRecipientId = this.recipients[0]?.id ?? null;
  }

  selectMessage(message: WorkspaceMessage): void {
    this.selectedProjectId = message.projectId;
    this.selectedRecipientId = message.senderId === this.currentUserId ? message.recipientId : message.senderId;
  }

  markNotificationRead(notification: WorkspaceNotification): void {
    if (notification.read) return;
    this.api.markNotificationRead(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) => item.id === notification.id ? { ...item, read: true } : item);
      },
      error: (error: unknown) => this.handleApiError(error),
    });
  }

  exportCsv(projectId: number): void {
    this.api.report(projectId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `project-${projectId}-report.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => this.handleApiError(error),
    });
  }

  projectName(id: number): string {
    return this.projects.find((project) => project.id === id)?.name ?? 'Unknown project';
  }

  projectProgress(id: number): number {
    return this.projects.find((project) => project.id === id)?.progress ?? 0;
  }

  projectHours(id: number): number {
    return Number(this.projects.find((project) => project.id === id)?.totalHours ?? 0);
  }

  taskCountFor(id: number): number {
    return this.projects.find((project) => project.id === id)?.totalTasks ?? 0;
  }

  statusLabel(status: TaskStatus): string {
    return status === 'TODO' ? 'To do' : status === 'IN_PROGRESS' ? 'In progress' : 'Done';
  }

  initials(name: string | null | undefined): string {
    return name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  }

  projectParticipantsFor(project: WorkspaceProject): WorkspaceUser[] {
    return project.participants.filter((person) => person.role !== 'ADMIN');
  }

  selectedProject(): WorkspaceProject | undefined {
    return this.projects.find((project) => project.id === this.selectedProjectId);
  }

  private handleApiError(error: unknown): void {
    this.error = this.errorMessage(error, 'The request could not be completed.');
    if (this.error.includes('Authentication required') || this.error.includes('expired')) this.logout();
  }

  private errorMessage(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string }; status?: number };
    if (candidate.status === 0) return 'Cannot reach the API. Check that the Spring Boot server is running.';
    return candidate.error?.message ?? fallback;
  }

  showNotice(message: string): void {
    this.notice = message;
    setTimeout(() => {
      if (this.notice === message) this.notice = '';
    }, 3200);
  }
}
