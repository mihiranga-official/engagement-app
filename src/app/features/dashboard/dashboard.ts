import { Component, inject, OnDestroy, OnInit, AfterViewInit, signal, computed, HostListener, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink, Router } from '@angular/router';
import { AuthService, AppUser } from '../../core/auth/auth.service';
import { Database, ref, onValue, off } from '@angular/fire/database';
import { Observable, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PhotoService, PhotoRecord } from '../../core/services/photo.service';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import confetti from 'canvas-confetti';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  standalone: true,
})
export class DashboardComponent implements OnDestroy, OnInit, AfterViewInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private database = inject(Database);
  private photoService = inject(PhotoService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);

  protected readonly mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://maps.google.com/maps?q=Arangala%20Forest%20Lodge,%20Naula&z=15&output=embed'
  );

  protected galleryEnabled = toSignal(this.photoService.galleryEnabled$, { initialValue: true });

  protected isAdmin() {
    const user = this.authService.currentUser();
    return !!user && (user.role === 'admin' || (user.email && environment.adminEmails.includes(user.email)));
  }

  protected showGalleryButton() {
    return this.isAdmin() || this.galleryEnabled();
  }
  protected activeUsers$: Observable<AppUser[]> = toObservable(this.authService.currentUser).pipe(
    switchMap(user => {
      if (!user) return new Observable<AppUser[]>(observer => { observer.next([]); observer.complete(); });
      return new Observable<AppUser[]>(observer => {
        const usersRef = ref(this.database, 'users');
        
        const unsubscribe = onValue(usersRef, (snapshot) => {
          const users: AppUser[] = [];
          snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const isRecentlyActive = data && data.lastActive && (Date.now() - data.lastActive < 60 * 60 * 1000);
            if (data && data.isOnline && isRecentlyActive) {
              users.push({
                uid: childSnapshot.key!,
                ...data
              });
            }
          });
          observer.next(users);
        }, (error) => {
          console.error('Error loading active users:', error);
          observer.error(error);
        });

        return () => off(usersRef, 'value', unsubscribe);
      });
    })
  );
  protected activeUserCount$ = this.activeUsers$.pipe(map(users => users.length));
  
  private featuredPhotos$ = toObservable(this.authService.currentUser).pipe(
    switchMap(user => {
      if (!user) return new Observable<PhotoRecord[]>(observer => { observer.next([]); observer.complete(); });
      return new Observable<PhotoRecord[]>(observer => {
        const photosRef = ref(this.database, 'photos');
        
        const unsubscribe = onValue(photosRef, (snapshot) => {
          const photos: PhotoRecord[] = [];
          snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data && data.pinned) {
              photos.push({
                id: childSnapshot.key!,
                ...data
              });
            }
          });
          // Sort by createdAt descending and limit to 10
          photos.sort((a, b) => b.createdAt - a.createdAt);
          observer.next(photos.slice(0, 10));
        }, (error) => {
          console.error('Error loading featured photos:', error);
          observer.error(error);
        });

        return () => off(photosRef, 'value', unsubscribe);
      });
    })
  );
  
  protected featuredPhotos = toSignal(this.featuredPhotos$, { initialValue: [] });
  protected approvedFeaturedPhotos = computed(() => 
    this.featuredPhotos().filter(photo => photo.status === 'approved')
  );

  // Countdown signals for modern, reactive, and robust UI updates
  protected cdDays = signal('00');
  protected cdHours = signal('00');
  protected cdMinutes = signal('00');
  protected cdSeconds = signal('00');
  protected cdLive = signal(false);
  private countdownInterval: any;
  private authSubscription?: Subscription;
  private firecrackerTimeout: any;

  protected isInvitationModalOpen = signal(false);

  protected openInvitationModal() {
    this.isInvitationModalOpen.set(true);
  }

  protected closeInvitationModal() {
    this.isInvitationModalOpen.set(false);
  }

  protected scrollToLocation() {
    const mapElement = document.querySelector('.map-section');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }

  ngOnInit() {
    this.updateCountdown(); // Run immediately on load
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);

    // Run firecrackers OUTSIDE zone — confetti uses requestAnimationFrame which Zone.js patches
    this.ngZone.runOutsideAngular(() => {
      this.scheduleNextFirecracker();
    });



    // Reactively watch for auth user changes to handle redirect without async/await
    this.authSubscription = toObservable(this.authService.currentUser).subscribe((user) => {
      if (user === undefined) return; // Wait until auth state is loaded

      const isAdmin = !!user && (user.role === 'admin' || (user.email && environment.adminEmails.includes(user.email)));
      if (!isAdmin) {
        this.photoService.dashboardEnabled$.subscribe(enabled => {
          if (!enabled) {
            console.warn('Dashboard is disabled by admin');
            this.router.navigate(['/invite']);
          }
        });
      }
    });
  }

  ngOnDestroy() {
    this.countdownInterval && clearInterval(this.countdownInterval);
    this.authSubscription?.unsubscribe();
    if (this.firecrackerTimeout) {
      clearTimeout(this.firecrackerTimeout);
    }

  }

  private scheduleNextFirecracker() {
    // Random delay between 4 and 10 seconds
    const nextTime = Math.random() * 6000 + 4000;
    this.firecrackerTimeout = setTimeout(() => {
      this.shootFirecracker();
      // Keep going
      this.scheduleNextFirecracker();
    }, nextTime);
  }

  private shootFirecracker() {
    // Subtle, small burst in the background
    const colors = ['#2c4e35', '#d4af37', '#c5a02b', '#ffffff', '#e8efe9'];
    
    // Shoot from a random X coordinate, mostly in the top half of the screen
    const x = Math.random() * 0.8 + 0.1; // 10% to 90% width
    const y = Math.random() * 0.4 + 0.1; // 10% to 50% height

    confetti({
      particleCount: 30, // keeping it small so it's not disturbing
      startVelocity: 20,
      spread: 360,
      ticks: 60,
      gravity: 0.6,
      scalar: 0.7,
      colors: colors,
      origin: { x, y },
      zIndex: 0 // Behind any modals, but over the background
    });
  }

  // Mouse trail effect — runs OUTSIDE zone so mousemove doesn't trigger Angular change detection on every pixel
  private lastMouseConfettiTime = 0;

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', (event: MouseEvent) => {
        const now = Date.now();
        if (now - this.lastMouseConfettiTime > 150) {
          this.lastMouseConfettiTime = now;
          const x = event.clientX / window.innerWidth;
          const y = event.clientY / window.innerHeight;
          const colors = ['#2c4e35', '#d4af37', '#c5a02b', '#ffffff', '#e8efe9'];
          confetti({
            particleCount: 8,
            startVelocity: 10,
            spread: 360,
            ticks: 40,
            gravity: 0.5,
            scalar: 0.5,
            colors: colors,
            origin: { x, y },
            zIndex: 0
          });
        }
      });
    });
  }

  private updateCountdown() {
    const eventDate = new Date(2026, 6, 30, 18, 0, 0); // July 30, 2026
    const diff = eventDate.getTime() - Date.now();
    if (diff <= 0) {
      this.cdLive.set(true);
      return;
    }
    this.cdLive.set(false);
    this.cdDays.set(String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0'));
    this.cdHours.set(String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0'));
    this.cdMinutes.set(String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0'));
    this.cdSeconds.set(String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0'));
  }
}
