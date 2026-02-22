import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root',
})
export class PushSubscriptionService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  /** Whether push notifications are currently subscribed */
  public isSubscribed = signal(false);

  /** Browser permission state: 'default' | 'granted' | 'denied' */
  public permissionState = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  /** Whether push is supported in this browser */
  public isSupported = signal(
    typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window
  );

  /**
   * Checks if already subscribed and updates signal.
   */
  async checkSubscription(): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      this.isSubscribed.set(!!subscription);
    } catch {
      this.isSubscribed.set(false);
    }
  }

  /**
   * Requests permission and subscribes to push notifications.
   * Saves subscription to Supabase push_subscriptions table.
   */
  async subscribe(employeeId: string): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const permission = await Notification.requestPermission();
      this.permissionState.set(permission);

      if (permission !== 'granted') return false;

      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment or config
      const vapidKey = this.getVapidPublicKey();
      if (!vapidKey) {
        console.warn('VAPID public key not configured');
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();

      // Save to Supabase
      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/push_subscriptions'),
          {
            employee_id: employeeId,
            endpoint: json.endpoint,
            p256dh: json.keys?.['p256dh'] ?? '',
            auth: json.keys?.['auth'] ?? '',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=minimal,resolution=merge-duplicates',
            },
          }
        )
      );

      this.isSubscribed.set(true);
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }

  /**
   * Unsubscribes from push notifications and removes from Supabase.
   */
  async unsubscribe(employeeId: string): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from Supabase
        await firstValueFrom(
          this.http.delete(
            this.apiUrl.build('rest/v1/push_subscriptions', {
              employee_id: `eq.${employeeId}`,
              endpoint: `eq.${subscription.endpoint}`,
            })
          )
        );
      }

      this.isSubscribed.set(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  private getVapidPublicKey(): string | null {
    // Will be configured via environment when VAPID keys are generated
    return (window as any).__VAPID_PUBLIC_KEY__ ?? null;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
