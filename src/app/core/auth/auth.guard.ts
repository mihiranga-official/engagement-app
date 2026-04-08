import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { Auth, authState } from '@angular/fire/auth';
import { take } from 'rxjs/operators';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const fireAuth = inject(Auth);

  const currentUser = authService.currentUser();

  // If user is already loaded, allow or deny based on auth status
  if (currentUser !== undefined) {
    if (currentUser) {
      return true; // User is logged in
    } else {
      // User is null (logged out), redirect to login
      router.navigate(['/login']);
      return false;
    }
  }

  // If user is still loading (undefined), wait for auth state to resolve
  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const authSub = authState(fireAuth)
      .pipe(take(1))
      .subscribe(firebaseUser => {
        if (!resolved) {
          resolved = true;
          authSub.unsubscribe();
          
          // Check if the service user signal has updated
          const serviceUser = authService.currentUser();
          if (serviceUser) {
            resolve(true);
          } else {
            router.navigate(['/login']);
            resolve(false);
          }
        }
      });

    // Timeout after 3 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        authSub.unsubscribe();
        const serviceUser = authService.currentUser();
        if (serviceUser) {
          resolve(true);
        } else {
          router.navigate(['/login']);
          resolve(false);
        }
      }
    }, 3000);
  });
};
