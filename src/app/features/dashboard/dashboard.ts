import { Component, inject, OnDestroy, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService, AppUser } from '../../core/auth/auth.service';
import { Database, ref, onValue, off } from '@angular/fire/database';
import { Observable, interval, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { PhotoRecord } from '../../core/services/photo.service';
import { toSignal } from '@angular/core/rxjs-interop';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  standalone: true,
})
export class DashboardComponent implements OnDestroy, OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private database = inject(Database);
  protected activeUsers$: Observable<AppUser[]> = new Observable(observer => {
    const usersRef = ref(this.database, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const users: AppUser[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data && data.isOnline) {
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
  protected activeUserCount$ = this.activeUsers$.pipe(map(users => users.length));
  
  private featuredPhotos$ = new Observable<PhotoRecord[]>(observer => {
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
  
  protected featuredPhotos = toSignal(this.featuredPhotos$, { initialValue: [] });
  protected approvedFeaturedPhotos = computed(() => 
    this.featuredPhotos().filter(photo => photo.status === 'approved')
  );

  protected countdown = signal('00d 00h 00m 00s');
  private countdownSubscription = interval(1000).subscribe(() => this.updateCountdown());
  private firecrackerTimeout: any;

  ngOnInit() {
    this.scheduleNextFirecracker();
  }

  ngOnDestroy() {
    this.countdownSubscription.unsubscribe();
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
    const colors = ['#8b5cf6', '#ec4899', '#fcd34d', '#ffffff', '#ffd700'];
    
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

  // Mouse trail effect variables
  private lastMouseConfettiTime = 0;

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const now = Date.now();
    // Throttle to one burst every 150ms so we don't crash the browser!
    if (now - this.lastMouseConfettiTime > 150) {
      this.lastMouseConfettiTime = now;
      
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      const colors = ['#8b5cf6', '#ec4899', '#fcd34d', '#ffffff', '#ffd700'];

      confetti({
        particleCount: 8, // Very subtle for the mouse
        startVelocity: 10,
        spread: 360,
        ticks: 40,
        gravity: 0.5,
        scalar: 0.5, // make them look like tiny sparks
        colors: colors,
        origin: { x, y },
        zIndex: 0
      });
    }
  }

  private updateCountdown() {
    const eventDate = new Date('2026-07-30T18:00:00');
    const diff = eventDate.getTime() - Date.now();
    if (diff <= 0) {
      this.countdown.set('Event is live!');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    this.countdown.set(`${days}d ${hours}h ${minutes}m ${seconds}s`);
  }
}
