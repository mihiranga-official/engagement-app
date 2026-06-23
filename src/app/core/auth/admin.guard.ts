import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { firstValueFrom, filter, timeout } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';

export const AdminGuard: CanActivateFn = async (route, state) => {
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

  // Now check if user is admin
  const currentUser = authService.currentUser();
  if (currentUser && currentUser.email === 'janithgunawardana98@gmail.com') {
    console.log('Admin access granted for:', currentUser.name);
    return true;
  } else {
    console.warn('User is not admin:', currentUser);
    router.navigate(['/login']);
    return false;
  }
};
