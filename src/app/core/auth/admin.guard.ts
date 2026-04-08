import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { firstValueFrom, filter, timeout } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';

export const AdminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const fireAuth = inject(Auth);

  try {
    // Wait for auth state to be established and user to be loaded
    await firstValueFrom(
      authState(fireAuth).pipe(
        filter(user => user !== null),
        timeout(5000)
      )
    );

    // Now check if user is admin
    const currentUser = authService.currentUser();
    if (currentUser && currentUser.role === 'admin') {
      console.log('Admin access granted for:', currentUser.name);
      return true;
    } else {
      console.warn('User is not admin:', currentUser);
      router.navigate(['/login']);
      return false;
    }
  } catch (error) {
    console.error('Admin guard error:', error);
    router.navigate(['/login']);
    return false;
  }
};
