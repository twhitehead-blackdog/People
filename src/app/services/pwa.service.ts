import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PwaService {
  /** Whether the install prompt is available */
  readonly canInstall = signal(false);
  /** Whether the notification permission has been granted */
  readonly notificationsEnabled = signal(false);
  /** Whether we should show the install banner */
  readonly showInstallBanner = signal(false);
  /** Whether the app is already installed (standalone mode) */
  readonly isInstalled = signal(false);
  /** Whether we should show the notification prompt */
  readonly showNotificationPrompt = signal(false);

  private deferredPrompt: any = null;

  constructor() {
    this.checkIfInstalled();
    this.checkNotificationPermission();
    this.listenForInstallPrompt();
    this.scheduleNotificationPrompt();
  }

  private checkIfInstalled() {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    this.isInstalled.set(isStandalone);
  }

  private checkNotificationPermission() {
    if (!('Notification' in window)) return;
    this.notificationsEnabled.set(Notification.permission === 'granted');
  }

  private listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);

      // Show install banner if not dismissed recently
      const dismissed = sessionStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        setTimeout(() => this.showInstallBanner.set(true), 3000);
      }
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled.set(true);
      this.canInstall.set(false);
      this.showInstallBanner.set(false);
      this.deferredPrompt = null;
    });
  }

  private scheduleNotificationPrompt() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;

    const asked = localStorage.getItem('pwa_notif_asked');
    if (asked) return;

    // Show notification prompt after 10 seconds
    setTimeout(() => {
      this.showNotificationPrompt.set(true);
    }, 10000);
  }

  /** Trigger the native install prompt */
  async install(): Promise<boolean> {
    if (!this.deferredPrompt) return false;
    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
    this.showInstallBanner.set(false);
    return result.outcome === 'accepted';
  }

  /** Dismiss the install banner */
  dismissInstallBanner() {
    this.showInstallBanner.set(false);
    sessionStorage.setItem('pwa_install_dismissed', '1');
  }

  /** Request notification permission */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    localStorage.setItem('pwa_notif_asked', '1');
    this.showNotificationPrompt.set(false);

    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    this.notificationsEnabled.set(granted);
    return granted;
  }

  /** Dismiss the notification prompt */
  dismissNotificationPrompt() {
    this.showNotificationPrompt.set(false);
    localStorage.setItem('pwa_notif_asked', '1');
  }

  /** Check and prompt for notifications if not yet asked (call from any page) */
  promptIfNeeded() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    const asked = localStorage.getItem('pwa_notif_asked');
    if (asked) return;
    this.showNotificationPrompt.set(true);
  }

  /** Send a local notification (for clock-in confirmations) */
  sendNotification(title: string, body: string, icon?: string) {
    if (!('Notification' in window)) return;
    // Re-check permission live (user may have granted after constructor ran)
    if (Notification.permission !== 'granted') return;

    const opts: NotificationOptions = {
      body,
      icon: icon || '/icons/pwa/icon-192x192.png',
      badge: '/icons/pwa/icon-96x96.png',
    };

    // Try via Service Worker first (works on mobile / background)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, opts).catch(() => {
          // Fallback to Notification API
          try { new Notification(title, opts); } catch (_) {}
        });
      }).catch(() => {
        try { new Notification(title, opts); } catch (_) {}
      });
    } else {
      // No SW controller yet, use Notification API directly
      try { new Notification(title, opts); } catch (_) {}
    }
  }
}
