import { Component, inject, signal, ViewChild, ElementRef, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { PhotoService, PhotoRecord } from '../../core/services/photo.service';
import { AuthService } from '../../core/auth/auth.service';
import { ActivityService } from '../../core/services/activity.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-gallery',
  imports: [CommonModule, RouterLink],
  templateUrl: './gallery.html',
  styleUrls: ['./gallery.scss'],
  standalone: true,
})
export class GalleryComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected photoService = inject(PhotoService);
  protected authService = inject(AuthService);
  protected activityService = inject(ActivityService);
  protected router = inject(Router);
  
  protected approvedPhotos = toSignal(this.photoService.approvedPhotos$, { initialValue: [] });
  protected selectedPhoto = signal<PhotoRecord | null>(null);
  protected uploadState = signal<string>('');
  protected uploading = signal(false);

  ngOnInit() {
    // Ensure user is logged in
    const user = this.authService.currentUser();
    if (!user) {
      console.warn('User not logged in for gallery');
      this.router.navigate(['/login']);
      return;
    }

    // Redirect to home if gallery is disabled (except for admin)
    const isAdmin = user.email === 'janithgunawardana98@gmail.com';
    if (!isAdmin) {
      this.photoService.galleryEnabled$.subscribe(enabled => {
        if (!enabled) {
          console.warn('Gallery is disabled by admin');
          this.router.navigate(['/']);
        }
      });
    }
  }

  protected openSlideshow(photo: PhotoRecord) {
    this.selectedPhoto.set(photo);
    // Track unique view per user session
    this.trackView(photo);
  }

  protected closeSlideshow() {
    this.selectedPhoto.set(null);
  }

  private getSelectedIndex(): number {
    const photo = this.selectedPhoto();
    if (!photo) return -1;
    return this.approvedPhotos().findIndex(p => p.id === photo.id);
  }

  protected showPrev(event: Event) {
    event.stopPropagation();
    const photos = this.approvedPhotos();
    if (photos.length === 0) return;
    const index = this.getSelectedIndex();
    if (index > 0) {
      this.selectedPhoto.set(photos[index - 1]);
      this.trackView(photos[index - 1]);
    } else {
      // Loop to end
      this.selectedPhoto.set(photos[photos.length - 1]);
      this.trackView(photos[photos.length - 1]);
    }
  }

  protected showNext(event: Event) {
    event.stopPropagation();
    const photos = this.approvedPhotos();
    if (photos.length === 0) return;
    const index = this.getSelectedIndex();
    if (index >= 0 && index < photos.length - 1) {
      this.selectedPhoto.set(photos[index + 1]);
      this.trackView(photos[index + 1]);
    } else {
      // Loop to beginning
      this.selectedPhoto.set(photos[0]);
      this.trackView(photos[0]);
    }
  }

  // Handle arrow keys and escape key for slideshow
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.selectedPhoto()) return;
    if (event.key === 'ArrowLeft') {
      this.showPrev(event);
    } else if (event.key === 'ArrowRight') {
      this.showNext(event);
    } else if (event.key === 'Escape') {
      this.closeSlideshow();
    }
  }

  protected async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const user = this.authService.currentUser();
    
    console.log('File selected:', file?.name, 'User:', user?.name);

    if (!file) {
      this.uploadState.set('❌ No file selected');
      return;
    }

    if (!user) {
      console.warn('User not authenticated');
      this.uploadState.set('❌ Please log in first');
      this.router.navigate(['/login']);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.uploadState.set('❌ Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.uploadState.set('❌ File size must be less than 10MB');
      return;
    }

    this.uploading.set(true);
    this.uploadState.set('⏳ Uploading photo...');
    
    try {
      console.log('Starting upload for user:', user.uid);
      await this.photoService.uploadPhoto(file, user);
      console.log('Upload successful');
      
      this.uploadState.set('✅ Photo sent for approval!');
      
      // Reset file input
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
      
      // Clear message after 3 seconds
      setTimeout(() => {
        this.uploadState.set('');
      }, 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.uploadState.set(`❌ Upload failed: ${errorMessage}`);
      console.error('Full error:', error);
    } finally {
      this.uploading.set(false);
    }
  }

  private viewedPhotos = new Set<string>();

  protected async trackView(photo: PhotoRecord) {
    // Only count a view once per user session
    if (this.viewedPhotos.has(photo.id)) {
      return;
    }
    
    const user = this.authService.currentUser();
    if (!user) {
      return; // Don't redirect on load, just ignore anonymous views
    }

    try {
      this.viewedPhotos.add(photo.id);
      await this.photoService.incrementViews(photo);
      await this.activityService.logAction(user.uid, 'view_photo', photo.id);
    } catch (error) {
      console.error('Error recording photo view:', error);
    }
  }

  protected hasLiked(photo: PhotoRecord): boolean {
    const user = this.authService.currentUser();
    return user ? !!(photo.likes && photo.likes[user.uid]) : false;
  }

  protected async likePhoto(photo: PhotoRecord) {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      await this.photoService.toggleLike(photo.id, user.uid);
      await this.activityService.logAction(user.uid, 'like_photo', photo.id);
    } catch (error) {
      console.error('Error liking photo:', error);
    }
  }
}

