import { Component, inject, signal, OnInit, HostListener, OnDestroy, NgZone } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth/auth.service';
import { PhotoService } from './core/services/photo.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('engagement-app');
  protected authService = inject(AuthService);
  private photoService = inject(PhotoService);
  private ngZone = inject(NgZone);

  protected mobileMenuOpen = signal(false);

  protected toggleMobileMenu() {
    this.mobileMenuOpen.update(open => !open);
  }

  protected closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  protected galleryEnabled = toSignal(this.photoService.galleryEnabled$, { initialValue: true });
  protected dashboardEnabled = toSignal(this.photoService.dashboardEnabled$, { initialValue: true });
  protected guestWallEnabled = toSignal(this.photoService.guestWallEnabled$, { initialValue: true });

  protected isAdmin() {
    const user = this.authService.currentUser();
    return !!user && (user.role === 'admin' || (user.email && environment.adminEmails.includes(user.email)));
  }

  protected showDashboardLink() {
    return this.isAdmin() || this.dashboardEnabled();
  }

  protected showGalleryLink() {
    return !!this.authService.currentUser() && (this.isAdmin() || this.galleryEnabled());
  }

  protected showGuestWallLink() {
    return !!this.authService.currentUser() && (this.isAdmin() || this.guestWallEnabled());
  }

  // Inactivity feature
  showInactivityPrompt = signal(false);
  private inactivityTimeout: any;
  private refreshTimeout: any;
  private lastActivityTime = 0; // throttle flag to avoid hammering resetTimer
  
  // Set the limit to 15 minutes
  private INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

  async ngOnInit() {
    this.resetTimer();
  }

  ngOnDestroy() {
    clearTimeout(this.inactivityTimeout);
    clearTimeout(this.refreshTimeout);
  }

  // Listen to any interaction indicating the user is active
  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:click')
  @HostListener('window:scroll')
  onUserActivity() {
    // Throttle to once every 2 seconds to avoid flooding Zone.js with clearTimeout/setTimeout
    const now = Date.now();
    if (now - this.lastActivityTime < 2000) return;
    this.lastActivityTime = now;
    // Only reset if the prompt isn't already showing
    if (!this.showInactivityPrompt()) {
      this.resetTimer();
    }
  }

  resetTimer() {
    // Run timers OUTSIDE Angular zone so clearTimeout/setTimeout don't interfere with
    // Zone.js macrotask tracking and freeze change detection (e.g., countdown seconds)
    this.ngZone.runOutsideAngular(() => {
      clearTimeout(this.inactivityTimeout);
      clearTimeout(this.refreshTimeout);

      this.inactivityTimeout = setTimeout(() => {
        // Re-enter Angular zone to update signals
        this.ngZone.run(() => {
          this.showInactivityPrompt.set(true);
        });

        this.refreshTimeout = setTimeout(() => {
          this.ngZone.run(() => {
            this.logout();
          });
        }, 30000);
      }, this.INACTIVITY_LIMIT_MS);
    });
  }

  imHere() {
    this.showInactivityPrompt.set(false);
    this.resetTimer();
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  // Prevent right-click context menus globally
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    event.preventDefault();
  }

  // Prevent copying of elements/assets
  @HostListener('window:copy', ['$event'])
  onCopy(event: ClipboardEvent) {
    event.preventDefault();
  }

  // Prevent critical keyboard shortcuts (Save, Print, DevTools, View Source)
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

    // Prevent Ctrl+S / Cmd+S (Save Page)
    if (isCmdOrCtrl && event.key === 's') {
      event.preventDefault();
    }

    // Prevent Ctrl+P / Cmd+P (Print Page)
    if (isCmdOrCtrl && event.key === 'p') {
      event.preventDefault();
    }

    // Prevent Ctrl+U / Cmd+U (View Source)
    if (isCmdOrCtrl && event.key === 'u') {
      event.preventDefault();
    }

    // Prevent F12 and Ctrl+Shift+I/J/C (Developer Tools)
    if (
      event.key === 'F12' ||
      (isCmdOrCtrl && event.shiftKey && 
        (event.key === 'I' || event.key === 'J' || event.key === 'C' || 
         event.key === 'i' || event.key === 'j' || event.key === 'c'))
    ) {
      event.preventDefault();
    }
  }

  // Clear clipboard on PrintScreen key release and show notice
  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.key === 'PrintScreen' || event.key === 'PrtScn') {
      navigator.clipboard.writeText('');
      alert('Screenshots and saving images are restricted on this platform to protect shared memories.');
    }
  }
}
