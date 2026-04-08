import { Injectable, inject } from '@angular/core';
import { Database, ref, set, push } from '@angular/fire/database';

export interface ActivityLog {
  id?: string;
  userId: string;
  actionType: string;
  targetId?: string | null;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private database = inject(Database);

  async logAction(userId: string, actionType: string, targetId?: string | null) {
    if (!userId) {
      return;
    }

    const logsRef = ref(this.database, 'activity_logs');
    const newLogRef = push(logsRef);
    await set(newLogRef, {
      userId,
      actionType,
      targetId: targetId || null,
      timestamp: Date.now()
    });
  }
}
