import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { DeviceService } from '../services/device.service';

/**
 * Ensures the user has a valid Kiosk Token.
 * If not, redirects to Enrollment Page (or stays on clock if configured).
 */
export const kioskGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const device = inject(DeviceService);

  if (device.isKioskAuthorized()) {
    return true;
  }

  // If not authorized, maybe redirect to an enrollment route or show error
  // For now, allow access to the route BUT the component will show 'Enrollment' UI
  // This is a soft guard.
  return true;
};

/**
 * BLOCKS Kiosk Devices from accessing Admin/Dashboard Areas.
 * Reverse Logic: If isKioskAuthorized is TRUE, then BLOCK.
 */
export const adminBlockGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const device = inject(DeviceService);

  if (device.isKioskAuthorized()) {
    // If you are a Kiosk, you should NOT be here.
    return router.parseUrl('/timeclock');
  }

  return true;
};
