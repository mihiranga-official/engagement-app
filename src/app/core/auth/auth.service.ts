import { Injectable, inject, signal } from '@angular/core';
import { Auth, authState, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, updateProfile } from '@angular/fire/auth';
import { Database, ref, set, get, update, onValue, off, onDisconnect } from '@angular/fire/database';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ActivityService } from '../services/activity.service';
import { environment } from '../../../environments/environment';

export interface AppUser {
  uid: string;
  name: string;
  email?: string;
  role: 'admin' | 'guest';
  lastActive: number;
  isOnline: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private fireAuth = inject(Auth);
  private database = inject(Database);
  private router = inject(Router);
  private activityService = inject(ActivityService);

  private sessionTimer: any;
  private activePresenceUid: string | null = null;
  private connectedListenerUnsubscribe: (() => void) | null = null;
  private readonly MAX_SESSION_MS = 2 * 60 * 60 * 1000; // 2 hours

  // Expose current user as a signal for modern Angular change detection
  currentUser = signal<AppUser | null | undefined>(undefined);

  constructor() {
    // Listen to Firebase Auth State
    authState(this.fireAuth).pipe(
      switchMap(user => {
        if (user) {
          // Fetch custom user data from Realtime Database
          const userRef = ref(this.database, `users/${user.uid}`);
          return new Observable<AppUser | null>(observer => {
            const unsubscribe = onValue(userRef, (snapshot) => {
              const data = snapshot.val();
              if (data) {
                observer.next({
                  uid: user.uid,
                  name: data.name || 'Anonymous Guest',
                  email: data.email || null,
                  role: data.role || (user.email && environment.adminEmails.includes(user.email) ? 'admin' : 'guest'),
                  lastActive: data.lastActive || Date.now(),
                  isOnline: data.isOnline || true
                } as AppUser);
              } else {
                // Fallback if no data in database
                observer.next({
                  uid: user.uid,
                  name: user.displayName || 'Anonymous Guest',
                  email: user.email || null,
                  role: user.email && environment.adminEmails.includes(user.email) ? 'admin' : 'guest',
                  lastActive: Date.now(),
                  isOnline: true
                } as AppUser);
              }
            }, (error) => {
              console.error('Failed to load user data from Realtime Database:', error);
              observer.next({
                uid: user.uid,
                name: user.displayName || 'Anonymous Guest',
                email: user.email || null,
                role: user.email && environment.adminEmails.includes(user.email) ? 'admin' : 'guest',
                lastActive: Date.now(),
                isOnline: true
              } as AppUser);
            });
            // Properly unsubscribe from Firebase listener when Observable completes
            return () => off(userRef, 'value', unsubscribe);
          });
        } else {
          return of(null);
        }
      })
    ).subscribe((appUser) => {
      if (appUser) {
        let loginAt = localStorage.getItem('sessionStartStr');
        const now = Date.now();
        
        if (!loginAt) {
          // If session timing is missing from localStorage but Firebase auth has a valid user (e.g., on page refresh),
          // initialize it now rather than forcing a logout.
          loginAt = now.toString();
          localStorage.setItem('sessionStartStr', loginAt);
        } else if ((now - parseInt(loginAt, 10)) >= this.MAX_SESSION_MS) {
          console.warn('Session expired, forcing logout');
          localStorage.removeItem('sessionStartStr');
          this.logout();
          return;
        }
        this.startSessionLimitTimer();
        if (appUser.uid) {
          this.setupPresence(appUser.uid);
        }
      } else {
        this.stopSessionLimitTimer();
        this.cleanupPresence();
      }

      this.currentUser.set(appUser);
      // Don't update presence here - it creates an update loop
      // Presence is updated only on login/logout actions
    });
  }

  private startSessionLimitTimer() {
    this.stopSessionLimitTimer();
    const loginAt = localStorage.getItem('sessionStartStr');
    if (!loginAt) return;
    
    const now = Date.now();
    const timeElapsed = now - parseInt(loginAt, 10);
    const timeRemaining = this.MAX_SESSION_MS - timeElapsed;
    
    if (timeRemaining <= 0) {
      this.logout();
    } else {
      this.sessionTimer = setTimeout(() => {
        console.warn('Max session time reached (2 hours)');
        this.logout();
      }, timeRemaining);
    }
  }

  private stopSessionLimitTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const credential = await signInWithPopup(this.fireAuth, provider);
      const user = credential.user;
      try {
        await this.saveUserToDatabase(user);
      } catch (saveError) {
        console.warn('Could not save Google user to Realtime Database after popup login:', saveError);
      }
      // Set the user signal directly to avoid waiting for Firestore
      this.currentUser.set({
        uid: user.uid,
        name: user.displayName || 'Google User',
        email: user.email || undefined,
        role: user.email && environment.adminEmails.includes(user.email) ? 'admin' : 'guest',
        lastActive: Date.now(),
        isOnline: true
      });
      try {
        this.activityService.logAction(user.uid, 'login');
      } catch (activityError) {
        console.warn('Failed to log Google login activity after popup login:', activityError);
      }
      
      localStorage.setItem('sessionStartStr', Date.now().toString());
      this.startSessionLimitTimer();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  }

  async handleRedirectResult() {
    // No longer needed since we use popup instead of redirect
    return Promise.resolve();
  }

  async loginAsGuest(guestName: string) {
    console.log('AuthService.loginAsGuest called with:', guestName);
    try {
      console.log('Calling signInAnonymously...');
      const credential = await signInAnonymously(this.fireAuth);
      console.log('Anonymous sign in successful:', credential.user.uid);
      const user = credential.user;
      console.log('Updating profile with displayName:', guestName);
      try {
        await updateProfile(user, { displayName: guestName });
      } catch (profileError) {
        console.warn('Could not update anonymous profile displayName:', profileError);
      }
      console.log('Saving user to Realtime Database...');
      try {
        await this.saveUserToDatabase({ ...user, displayName: guestName } as any, 'guest');
      } catch (saveError) {
        console.warn('Could not save guest user to Realtime Database, continuing anyway:', saveError);
      }
      console.log('Setting currentUser signal directly...');
      // Set the user signal directly to avoid waiting for Firestore
      this.currentUser.set({
        uid: user.uid,
        name: guestName,
        email: undefined,
        role: 'guest',
        lastActive: Date.now(),
        isOnline: true
      });
      console.log('Logging activity...');
      try {
        this.activityService.logAction(user.uid, 'login');
      } catch (activityError) {
        console.warn('Failed to log guest login activity:', activityError);
      }
      
      localStorage.setItem('sessionStartStr', Date.now().toString());
      this.startSessionLimitTimer();
      console.log('Navigating to home...');
      this.router.navigate(['/']);
      console.log('Guest login completed successfully');
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      this.cleanupPresence();
      localStorage.removeItem('sessionStartStr');
      this.stopSessionLimitTimer();
      
      const user = this.currentUser();
      if (user) {
        await this.updatePresence(user.uid, false);
      }
      await signOut(this.fireAuth);
      this.currentUser.set(null); // Explicitly clear the signal
      // Small delay to ensure Firebase auth state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  private async saveUserToDatabase(user: any, roleOverride?: 'admin' | 'guest') {
    const userRef = ref(this.database, `users/${user.uid}`);
    const role = roleOverride ?? (user?.email && environment.adminEmails.includes(user.email) ? 'admin' : 'guest');
    await set(userRef, {
      uid: user.uid,
      name: user.displayName || 'Anonymous Guest',
      email: user.email || null,
      role,
      lastActive: Date.now(),
      isOnline: true
    });
  }

  private async updatePresence(uid: string, isOnline: boolean) {
    const userRef = ref(this.database, `users/${uid}`);
    try {
      await update(userRef, {
        isOnline: isOnline,
        lastActive: Date.now()
      });
    } catch(e) {
      // User might not exist yet
      console.warn('Could not update user presence:', e);
    }
  }

  private setupPresence(uid: string) {
    if (this.activePresenceUid === uid) {
      return; // Already set up for this user
    }
    
    // Clean up previous listener if any
    this.cleanupPresence();
    
    this.activePresenceUid = uid;
    const userRef = ref(this.database, `users/${uid}`);
    const connectedRef = ref(this.database, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // We are connected (or reconnected)!
        // Set isOnline to true
        update(userRef, {
          isOnline: true,
          lastActive: Date.now()
        }).catch(err => console.warn('Could not update user presence:', err));

        // When we disconnect, set isOnline to false
        const presenceRef = ref(this.database, `users/${uid}/isOnline`);
        onDisconnect(presenceRef).set(false).catch(err => console.warn('Could not set onDisconnect:', err));
      }
    });

    this.connectedListenerUnsubscribe = () => off(connectedRef, 'value', unsubscribe);
  }

  private cleanupPresence() {
    if (this.connectedListenerUnsubscribe) {
      try {
        this.connectedListenerUnsubscribe();
      } catch (e) {
        // Ignore if already unregistered
      }
      this.connectedListenerUnsubscribe = null;
    }
    this.activePresenceUid = null;
  }
}
