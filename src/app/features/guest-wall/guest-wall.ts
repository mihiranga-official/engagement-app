import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AppUser } from '../../core/auth/auth.service';
import { GuestWallService, GuestWallMessage } from '../../core/services/guest-wall.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-guest-wall',
  imports: [CommonModule, FormsModule],
  templateUrl: './guest-wall.html',
  styleUrls: ['./guest-wall.scss'],
  standalone: true,
})
export class GuestWallComponent {
  private authService = inject(AuthService);
  private guestWallService = inject(GuestWallService);

  protected currentUser = this.authService.currentUser;
  protected messages$: Observable<GuestWallMessage[]> = this.guestWallService.messages$;

  newMessage = '';
  isPosting = false;

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
