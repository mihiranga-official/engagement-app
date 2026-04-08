import { Injectable, inject } from '@angular/core';
import { Database, ref, set, push, get, query, orderByChild, limitToLast, onValue, off, update, remove, runTransaction } from '@angular/fire/database';
import { Storage, ref as storageRef, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { AppUser } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export interface PhotoRecord {
  id: string;
  url: string;
  uploadedBy: string;
  uploaderId: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
  viewsCount: number;
  likesCount: number;
  pinned?: boolean;
  likes?: Record<string, boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private database = inject(Database);
  private storage = inject(Storage);

  approvedPhotos$: Observable<PhotoRecord[]> = new Observable(observer => {
    const photosRef = ref(this.database, 'photos');
    
    const unsubscribe = onValue(photosRef, (snapshot) => {
      const photos: PhotoRecord[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data && data.status === 'approved') {
          photos.push({
            id: childSnapshot.key!,
            ...data
          });
        }
      });
      // Sort by createdAt descending
      photos.sort((a, b) => b.createdAt - a.createdAt);
      observer.next(photos);
    }, (error) => {
      console.error('Error loading approved photos:', error);
      observer.error(error);
    });

    return () => off(photosRef, 'value', unsubscribe);
  });

  pendingPhotos$: Observable<PhotoRecord[]> = new Observable(observer => {
    const photosRef = ref(this.database, 'photos');
    
    const unsubscribe = onValue(photosRef, (snapshot) => {
      const photos: PhotoRecord[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data && data.status === 'pending') {
          photos.push({
            id: childSnapshot.key!,
            ...data
          });
        }
      });
      // Sort by createdAt descending
      photos.sort((a, b) => b.createdAt - a.createdAt);
      observer.next(photos);
    }, (error) => {
      console.error('Error loading pending photos:', error);
      observer.error(error);
    });

    return () => off(photosRef, 'value', unsubscribe);
  });

  allPhotos$: Observable<PhotoRecord[]> = new Observable(observer => {
    const photosRef = ref(this.database, 'photos');
    
    const unsubscribe = onValue(photosRef, (snapshot) => {
      const photos: PhotoRecord[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data) {
          photos.push({
            id: childSnapshot.key!,
            ...data
          });
        }
      });
      // Sort by createdAt descending
      photos.sort((a, b) => b.createdAt - a.createdAt);
      observer.next(photos);
    }, (error) => {
      console.error('Error loading all photos:', error);
      observer.error(error);
    });

    return () => off(photosRef, 'value', unsubscribe);
  });

  async uploadPhoto(file: File, user: AppUser) {
    if (!file || !user) {
      throw new Error('File and user are required for upload.');
    }

    try {
      // 1. Upload to Cloudinary using Unsigned Preset
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', environment.cloudinary.uploadPreset);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`;
      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Cloudinary upload failed');
      }

      const data = await response.json();
      const url = data.secure_url;

      // 2. Save the resulting photo URL to Firebase Database
      const photosRef = ref(this.database, 'photos');
      const newPhotoRef = push(photosRef);
      await set(newPhotoRef, {
        url,
        uploadedBy: user.name,
        uploaderId: user.uid,
        createdAt: Date.now(),
        status: 'pending',
        viewsCount: 0,
        likesCount: 0,
        pinned: false
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  }

  async updateStatus(photoId: string, status: 'approved' | 'rejected') {
    const photoRef = ref(this.database, `photos/${photoId}`);
    await update(photoRef, { status });
  }

  async togglePin(photoId: string, pinned: boolean) {
    const photoRef = ref(this.database, `photos/${photoId}`);
    await update(photoRef, { pinned });
  }

  async deletePhoto(photoId: string) {
    const photoRef = ref(this.database, `photos/${photoId}`);
    await remove(photoRef);
  }

  async incrementViews(photo: PhotoRecord) {
    const photoRef = ref(this.database, `photos/${photo.id}`);
    await update(photoRef, { viewsCount: (photo.viewsCount || 0) + 1 });
  }

  async toggleLike(photoId: string, userId: string) {
    const photoRef = ref(this.database, `photos/${photoId}`);
    await runTransaction(photoRef, (photo) => {
      if (photo) {
        if (!photo.likes) {
          photo.likes = {};
        }
        if (photo.likes[userId]) {
          // User already liked it, so unlike
          photo.likesCount = Math.max(0, (photo.likesCount || 0) - 1);
          photo.likes[userId] = null; // Removing the like entry
        } else {
          // User hasn't liked it, so like
          photo.likesCount = (photo.likesCount || 0) + 1;
          photo.likes[userId] = true;
        }
      }
      return photo;
    });
  }
}
