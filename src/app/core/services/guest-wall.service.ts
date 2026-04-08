import { Injectable, inject } from '@angular/core';
import { Database, ref, set, push, get, query, orderByChild, limitToLast, onValue, off, update, remove } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { AppUser } from '../auth/auth.service';

export interface GuestWallMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: number;
  status: 'approved' | 'pending' | 'rejected';
}

@Injectable({
  providedIn: 'root'
})
export class GuestWallService {
  private database = inject(Database);

  messages$: Observable<GuestWallMessage[]> = new Observable(observer => {
    const messagesRef = ref(this.database, 'guest_wall_messages');
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const messages: GuestWallMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data && data.status === 'approved') {
          messages.push({
            id: childSnapshot.key!,
            ...data
          });
        }
      });
      // Sort by createdAt descending
      messages.sort((a, b) => b.createdAt - a.createdAt);
      observer.next(messages);
    }, (error) => {
      console.error('Error loading guest wall messages:', error);
      observer.error(error);
    });

    return () => off(messagesRef, 'value', unsubscribe);
  });

  pendingMessages$: Observable<GuestWallMessage[]> = new Observable(observer => {
    const messagesRef = ref(this.database, 'guest_wall_messages');
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const messages: GuestWallMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data && data.status === 'pending') {
          messages.push({
            id: childSnapshot.key!,
            ...data
          });
        }
      });
      // Sort by createdAt descending
      messages.sort((a, b) => b.createdAt - a.createdAt);
      observer.next(messages);
    }, (error) => {
      console.error('Error loading pending messages:', error);
      observer.error(error);
    });

    return () => off(messagesRef, 'value', unsubscribe);
  });

  async postMessage(message: string, user: AppUser) {
    if (!message?.trim()) {
      throw new Error('Message cannot be empty');
    }

    try {
      const messagesRef = ref(this.database, 'guest_wall_messages');
      const newMessageRef = push(messagesRef);
      console.log('Posting message to:', `guest_wall_messages/${newMessageRef.key}`);
      await set(newMessageRef, {
        userId: user.uid,
        userName: user.name,
        message: message.trim(),
        createdAt: Date.now(),
        status: 'pending'
      });
      console.log('Message posted successfully with ID:', newMessageRef.key);
    } catch (error) {
      console.error('Failed to post message to Realtime Database:', error);
      throw error;
    }
  }

  async updateStatus(messageId: string, status: 'approved' | 'rejected') {
    const messageRef = ref(this.database, `guest_wall_messages/${messageId}`);
    await update(messageRef, { status });
  }

  async deleteMessage(messageId: string) {
    const messageRef = ref(this.database, `guest_wall_messages/${messageId}`);
    await remove(messageRef);
  }
}
