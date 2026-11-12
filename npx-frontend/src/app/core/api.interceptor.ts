import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { AuthService } from './auth.service';

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = inject(API_BASE_URL);
  if (!request.url.startsWith(apiUrl)) return next(request);
  const token = inject(AuthService).token;
  if (!token) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
