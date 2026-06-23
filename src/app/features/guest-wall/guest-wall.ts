import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AppUser } from '../../core/auth/auth.service';
import { GuestWallService, GuestWallMessage } from '../../core/services/guest-wall.service';
import { PhotoService } from '../../core/services/photo.service';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-guest-wall',
  imports: [CommonModule, FormsModule],
  templateUrl: './guest-wall.html',
  styleUrls: ['./guest-wall.scss'],
  standalone: true,
})
export class GuestWallComponent implements OnInit {
  private authService = inject(AuthService);
  private guestWallService = inject(GuestWallService);
  private photoService = inject(PhotoService);
  private router = inject(Router);

  protected currentUser = this.authService.currentUser;
  protected messages$: Observable<GuestWallMessage[]> = this.guestWallService.messages$;

  newMessage = '';
  isPosting = false;

  ngOnInit() {
    // Redirect guest to home if guest wall is disabled (except admin)
    const user = this.currentUser();
    const isAdmin = !!user && (user.role === 'admin' || (user.email && environment.adminEmails.includes(user.email)));
    if (!isAdmin) {
      this.photoService.guestWallEnabled$.subscribe(enabled => {
        if (!enabled) {
          console.warn('Guest wall is disabled by admin');
          this.router.navigate(['/']);
        }
      });
    }
  }

  async postMessage() {
    const user = this.currentUser();
    if (!user || !this.newMessage.trim()) {
      return;
    }

    this.isPosting = true;
    try {
      console.log('Posting message:', this.newMessage);
      await this.guestWallService.postMessage(this.newMessage, user);
      this.newMessage = '';
      console.log('Message posted and form cleared');
    } catch (error) {
      console.error('Error posting message:', error);
      alert('Failed to post message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      this.isPosting = false;
    }
  }
}
