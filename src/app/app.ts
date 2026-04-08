import { Component, inject, signal, OnInit, HostListener, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth/auth.service';

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

  // Inactivity feature
  showInactivityPrompt = signal(false);
  private inactivityTimeout: any;
  private refreshTimeout: any;
  
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
    // Only reset if the prompt isn't already showing
    if (!this.showInactivityPrompt()) {
      this.resetTimer();
    }
  }

  resetTimer() {
    clearTimeout(this.inactivityTimeout);
    clearTimeout(this.refreshTimeout);
    
    // Start the inactivity countdown
    this.inactivityTimeout = setTimeout(() => {
      this.showInactivityPrompt.set(true);
      
      // If they don't respond within 30 seconds of the prompt popping up, log them out
      this.refreshTimeout = setTimeout(() => {
        this.logout();
      }, 30000); 

    }, this.INACTIVITY_LIMIT_MS);
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
}
