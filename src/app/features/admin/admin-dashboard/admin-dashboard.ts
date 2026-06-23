import { Component, inject, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AppUser } from '../../../core/auth/auth.service';
import { PhotoService, PhotoRecord } from '../../../core/services/photo.service';
import { GuestWallService, GuestWallMessage } from '../../../core/services/guest-wall.service';
import { ActivityService, ActivityLog } from '../../../core/services/activity.service';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
  standalone: true,
})
export class AdminDashboardComponent implements OnDestroy {
  private authService = inject(AuthService);
  private photoService = inject(PhotoService);
  private guestWallService = inject(GuestWallService);
  private activityService = inject(ActivityService);

  galleryEnabled = toSignal(this.photoService.galleryEnabled$, { initialValue: true });
  dashboardEnabled = toSignal(this.photoService.dashboardEnabled$, { initialValue: true });
  guestWallEnabled = toSignal(this.photoService.guestWallEnabled$, { initialValue: true });
  activeTab = signal<'photos' | 'messages' | 'analytics' | 'invites'>('photos');
  guestNameInput = signal('');
  generatedLink = signal('');

  async toggleGallery() {
    await this.photoService.setGalleryEnabled(!this.galleryEnabled());
  }

  async toggleDashboard() {
    await this.photoService.setDashboardEnabled(!this.dashboardEnabled());
  }

  async toggleGuestWall() {
    await this.photoService.setGuestWallEnabled(!this.guestWallEnabled());
  }
  pendingPhotos$: Observable<PhotoRecord[]> = this.photoService.pendingPhotos$;
  pendingMessages$: Observable<GuestWallMessage[]> = this.guestWallService.pendingMessages$;
  approvedPhotos$: Observable<PhotoRecord[]> = this.photoService.approvedPhotos$;
  approvedMessages$: Observable<GuestWallMessage[]> = this.guestWallService.messages$;

  totalPhotos = signal(0);
  totalMessages = signal(0);
  approvedPhotosCount = signal(0);
  approvedMessagesCount = signal(0);
  activeUsersCount = signal(0);

  private subscriptions: Subscription = new Subscription();

  constructor() {
    // Track counts
    this.subscriptions.add(
      this.photoService.pendingPhotos$.subscribe(photos => {
        this.totalPhotos.set(photos.length);
      })
    );

    this.subscriptions.add(
      this.guestWallService.pendingMessages$.subscribe(messages => {
        this.totalMessages.set(messages.length);
      })
    );

    this.subscriptions.add(
      this.photoService.approvedPhotos$.subscribe(photos => {
        this.approvedPhotosCount.set(photos.length);
      })
    );

    this.subscriptions.add(
      this.guestWallService.messages$.subscribe(messages => {
        this.approvedMessagesCount.set(messages.length);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async approvePhoto(photo: PhotoRecord) {
    try {
      await this.photoService.updateStatus(photo.id, 'approved');
      const user = this.authService.currentUser();
      if (user) {
        await this.activityService.logAction(user.uid, `approved_photo_${photo.id}`);
      }
      console.log('Photo approved:', photo.id);
    } catch (error) {
      console.error('Error approving photo:', error);
    }
  }

  async rejectPhoto(photo: PhotoRecord) {
    try {
      await this.photoService.updateStatus(photo.id, 'rejected');
      const user = this.authService.currentUser();
      if (user) {
        await this.activityService.logAction(user.uid, `rejected_photo_${photo.id}`);
      }
      console.log('Photo rejected:', photo.id);
    } catch (error) {
      console.error('Error rejecting photo:', error);
    }
  }

  async deletePhoto(photo: PhotoRecord) {
    try {
      await this.photoService.deletePhoto(photo.id);
      const user = this.authService.currentUser();
      if (user) {
        await this.activityService.logAction(user.uid, `deleted_photo_${photo.id}`);
      }
      console.log('Photo deleted:', photo.id);
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  }

  async togglePin(photo: PhotoRecord) {
    try {
      await this.photoService.togglePin(photo.id, !photo.pinned);
      const user = this.authService.currentUser();
      if (user) {
        await this.activityService.logAction(user.uid, `pinned_photo_${photo.id}`);
      }
      console.log('Photo pin toggled:', photo.id);
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  }

  async approveMessage(message: GuestWallMessage) {
    try {
      await this.guestWallService.updateStatus(message.id, 'approved');
      const user = this.authService.currentUser();
      if (user) {
        await this.activityService.logAction(user.uid, `approved_message_${message.id}`);
      }
    } catch (error) {
      console.error('Error approving message:', error);
    }
  }

  async rejectMessage(message: GuestWallMessage) {
    try {
      await this.guestWallService.updateStatus(message.id, 'rejected');
      const user = this.authService.currentUser();
      if (user) {
        await this.activityService.logAction(user.uid, `rejected_message_${message.id}`);
      }
    } catch (error) {
      console.error('Error rejecting message:', error);
    }
  }

  async deleteMessage(message: GuestWallMessage) {
    try {
      await this.guestWallService.deleteMessage(message.id);
      const user = this.authService.currentUser();
      if (user) {
        await this.activityService.logAction(user.uid, `deleted_message_${message.id}`);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  switchTab(tab: 'photos' | 'messages' | 'analytics' | 'invites') {
    this.activeTab.set(tab);
  }

  generateLink() {
    const name = this.guestNameInput().trim();
    if (!name) return;
    const baseUrl = `${window.location.origin}/invite`;
    const encodedName = encodeURIComponent(name);
    this.generatedLink.set(`${baseUrl}?name=${encodedName}`);
  }

  copyToClipboard() {
    if (this.generatedLink()) {
      navigator.clipboard.writeText(this.generatedLink());
    }
  }
}
