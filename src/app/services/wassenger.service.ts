import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WassengerService {
  async sendEmployeeInvitation(
    employeeName: string,
    phone: string,
    email: string
  ): Promise<boolean> {
    // TODO: Implement Wassenger API integration
    console.warn('[WassengerService] sendEmployeeInvitation not implemented', { employeeName, phone, email });
    return false;
  }
}
