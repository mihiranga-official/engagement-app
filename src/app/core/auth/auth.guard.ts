import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { Auth, authState } from '@angular/fire/auth';
import { take } from 'rxjs/operators';

export const AuthGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If user is still loading (undefined), wait for the AuthService signal to be set
  if (authService.currentUser() === undefined) {
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        if (authService.currentUser() !== undefined) {
          clearInterval(timer);
          resolve();
        }
      }, 30);

      // Fallback timeout after 4 seconds
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 4000);
    });
  }

  const currentUser = authService.currentUser();
  if (currentUser) {
    return true; // User is logged in, allow access
  } else {
    // User is null (logged out), redirect to login
    console.warn('AuthGuard: User not authenticated, redirecting to login');
    router.navigate(['/login']);
    return false;
  }
};
