import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type Role = 'ADMIN' | 'DEVELOPER' | 'USER';

export interface AuthSession {
  id: number;
  token: string;
  role: Role;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly sessionKey = 'npx-auth-session';

  login(email: string, password: string): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((session) => this.save(session)),
    );
  }

  register(name: string, email: string, password: string): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.apiUrl}/auth/register`, { name, email, password }).pipe(
      tap((session) => this.save(session)),
    );
  }

  get session(): AuthSession | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const stored = localStorage.getItem(this.sessionKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthSession;
    } catch {
      this.logout();
      return null;
    }
  }

  get token(): string | null {
    return this.session?.token ?? null;
  }

  save(session: AuthSession): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.sessionKey);
    }
  }
}
