import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IpDetectionService {
  private http = inject(HttpClient);

  public currentIP = signal<string>('127.0.0.1');

  public detect(): void {
    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem('timeclock_ip');
      if (cached && cached !== '127.0.0.1' && cached !== '::1') {
        this.currentIP.set(cached);
        return;
      }
    } catch { /* sessionStorage may not be available */ }

    const setIP = (ip: string) => {
      this.currentIP.set(ip);
      try { sessionStorage.setItem('timeclock_ip', ip); } catch { /* noop */ }
    };

    // Public IP first (ipify) — what we actually want for timeclock geolocation/audit.
    // WebRTC fallback only if both ipify endpoints fail (returns local 192.168.x).
    this.getIPViaHttp()
      .then((ip) => {
        if (ip && ip !== '127.0.0.1') { setIP(ip); return; }
        throw new Error('empty ipify');
      })
      .catch(() => {
        this.getIPViaAlternative()
          .then((ip) => {
            if (ip && ip !== '127.0.0.1') { setIP(ip); return; }
            throw new Error('empty ipify64');
          })
          .catch(() => {
            this.getIPViaWebRTC()
              .then((ip) => {
                if (ip && ip !== '127.0.0.1' && ip !== '::1') setIP(ip);
              })
              .catch(() => { /* keep default */ });
          });
      });
  }

  private getIPViaWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const RTCPeerConnection =
        (window as any).RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      if (!RTCPeerConnection) {
        reject(new Error('WebRTC not supported'));
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const ips: string[] = [];

      pc.createDataChannel('');

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const match = candidate.match(
            /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/
          );
          if (match) {
            const ip = match[1];
            if (
              ips.indexOf(ip) === -1 &&
              !ip.startsWith('127.') &&
              ip !== '::1'
            ) {
              ips.push(ip);
            }
          }
        } else {
          if (ips.length > 0) {
            pc.close();
            resolve(ips[0]);
          } else {
            pc.close();
            reject(new Error('No IP found'));
          }
        }
      };

      pc.createOffer()
        .then((offer: any) => pc.setLocalDescription(offer))
        .catch((err: any) => {
          pc.close();
          reject(err);
        });

      // Timeout after 3 seconds
      setTimeout(() => {
        if (ips.length > 0) {
          pc.close();
          resolve(ips[0]);
        } else {
          pc.close();
          reject(new Error('WebRTC timeout'));
        }
      }, 3000);
    });
  }

  private getIPViaHttp(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ ip: string }>('https://api.ipify.org?format=json', {
          headers: { Accept: 'application/json' },
        })
        .subscribe({
          next: (data) => resolve(data.ip),
          error: () => reject(new Error('HTTP method failed')),
        });
    });
  }

  private getIPViaAlternative(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ ip: string }>('https://api64.ipify.org?format=json', {
          headers: { Accept: 'application/json' },
        })
        .subscribe({
          next: (data) => resolve(data.ip),
          error: () => reject(new Error('Alternative method failed')),
        });
    });
  }
}
