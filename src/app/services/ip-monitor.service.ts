import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, interval, catchError, map, of, switchMap, Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { Branch } from '../models';
import { ApiUrlService } from './api-url.service';
import { OrganizationService } from './organization.service';

/**
 * Servicio para monitorear la IP del cliente en modo kiosko
 * Detecta cambios de IP/red y bloquea el acceso si la nueva IP no está permitida
 */
@Injectable({
  providedIn: 'root'
})
export class IpMonitorService {
  /** IPs that always bypass kiosk validation */
  private readonly BYPASS_IPS = new Set([
    '181.197.126.10',
  ]);

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private router = inject(Router);
  private organizationService = inject(OrganizationService);
  
  private currentIP$ = new BehaviorSubject<string | null>(null);
  private isIPValid$ = new BehaviorSubject<boolean>(true);
  private allowedIPs: string[] = [];
  private monitoringInterval: any = null;
  private ipRefreshInterval: any = null;
  private checkInterval = 30000; // Verificar IP cada 30 segundos
  private ipRefreshIntervalTime = 60000; // Actualizar lista de IPs cada 60 segundos

  /**
   * Verifica si es Naz (no requiere validación de IP)
   */
  private isNaz(): boolean {
    return this.organizationService.isNaz();
  }

  /**
   * Inicia el monitoreo de IP
   * @param allowedIPs Lista de IPs permitidas
   */
  startMonitoring(allowedIPs: string[]): void {
    // Si es Naz, no monitorear IP
    if (this.isNaz()) {
      this.isIPValid$.next(true);
      return;
    }

    this.allowedIPs = allowedIPs;
    
    // Verificar IP inicial
    this.checkIP().subscribe();
    
    // Monitorear cambios periódicamente
    this.monitoringInterval = setInterval(() => {
      this.checkIP().subscribe();
    }, this.checkInterval);
    
    // Actualizar lista de IPs permitidas desde la base de datos periódicamente
    this.refreshAllowedIPs();
    this.ipRefreshInterval = setInterval(() => {
      this.refreshAllowedIPs();
    }, this.ipRefreshIntervalTime);
  }

  /**
   * Configura las IPs permitidas sin iniciar monitoreo
   * Útil para validación inicial en el guard
   */
  setAllowedIPs(allowedIPs: string[]): void {
    this.allowedIPs = allowedIPs;
  }

  /**
   * Detiene el monitoreo de IP
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.ipRefreshInterval) {
      clearInterval(this.ipRefreshInterval);
      this.ipRefreshInterval = null;
    }
  }

  /**
   * Actualiza la lista de IPs permitidas desde la base de datos
   */
  private refreshAllowedIPs(): void {
    // El interceptor HTTP ya agrega los headers de Supabase automáticamente
    const url = this.apiUrl.build('rest/v1/branches', {
      select: 'ip',
      is_active: 'eq.true'
    });
    this.http.get<Branch[]>(url).pipe(
      timeout(5000),
      map((branches) => {
        // Extraer IPs de las sucursales, filtrando valores nulos o vacíos
        return branches
          .map(branch => branch.ip?.trim())
          .filter((ip): ip is string => !!ip && ip.length > 0);
      }),
      catchError((error) => {
        console.error('Error al actualizar IPs permitidas:', error);
        // Mantener las IPs actuales en caso de error
        return of(this.allowedIPs);
      })
    ).subscribe((newIPs) => {
      const previousIPs = [...this.allowedIPs];
      this.allowedIPs = newIPs;
      
      // Si las IPs cambiaron, verificar si la IP actual sigue siendo válida
      if (JSON.stringify(previousIPs.sort()) !== JSON.stringify(newIPs.sort())) {
        const currentIP = this.currentIP$.value;
        if (currentIP) {
          const isStillValid = this.isIPAllowed(currentIP);
          this.isIPValid$.next(isStillValid);
          
          if (!isStillValid) {
            // La IP actual ya no está permitida
            this.handleIPChange(currentIP, currentIP);
          }
        }
      }
    });
  }

  /**
   * Obtiene la IP actual del cliente
   */
  getCurrentIP(): string | null {
    return this.currentIP$.value;
  }

  /**
   * Observable de la IP actual
   */
  get currentIP() {
    return this.currentIP$.asObservable();
  }

  /**
   * Observable que indica si la IP actual es válida
   */
  get isIPValid() {
    return this.isIPValid$.asObservable();
  }

  /**
   * Obtiene el estado actual de validez de la IP
   */
  getIsIPValid(): boolean {
    return this.isIPValid$.value;
  }

  /**
   * Verifica la IP del cliente y valida si está permitida
   * Usa la misma lógica que validateInitialIP: servidor → WebRTC → HTTP
   */
  private checkIP() {
    // Si es Naz, no verificar IP
    if (this.isNaz()) {
      return of({ allowed: true, ip: null });
    }

    const previousIP = this.currentIP$.value;
    
    // Método 1: Intentar obtener IP desde nuestro servidor primero
    // Si falla, usar WebRTC directamente sin intentar el servidor
    return this.http.get<{ ip: string }>('/api/client-ip').pipe(
      timeout(5000),
      map((response) => {
        const clientIP = response.ip?.trim();
        if (!clientIP) {
          throw new Error('IP no válida desde servidor');
        }
        
        // Si es localhost, intentar otros métodos para obtener IP real
        if (clientIP === '127.0.0.1' || clientIP === '::1') {
          throw new Error('IP es localhost, usar WebRTC');
        }
        
        // Procesar IP válida del servidor
        return this.processIPCheck(clientIP, previousIP);
      }),
      catchError((serverError) => {
        // Si el servidor falla o devuelve localhost, ipify (publica) primero;
        // WebRTC ultimo porque devuelve IP local que no matchea con la
        // publica de la sucursal en branches.ip.
        if (this.isNaz()) {
          return of({ allowed: true, ip: null });
        }
        return this.getIPViaHttp().pipe(
          timeout(8000),
          switchMap((httpIP) => {
            if (httpIP && httpIP !== '127.0.0.1') {
              return of(this.processIPCheck(httpIP, previousIP));
            }
            throw new Error('IP de HTTP invalida');
          }),
          catchError(() => {
            return this.getLocalIPWithWebRTC().pipe(
              timeout(8000),
              switchMap((localIP) => {
                if (localIP && localIP !== '127.0.0.1' && localIP !== '::1') {
                  return of(this.processIPCheck(localIP, previousIP));
                }
                throw new Error('IP de WebRTC es localhost o invalida');
              }),
              catchError((httpError) => {
                // En caso de error, mantener la IP anterior si existe
                if (previousIP) {
                  const isAllowed = this.isIPAllowed(previousIP);
                  this.isIPValid$.next(isAllowed);
                  return of({ allowed: isAllowed, ip: previousIP });
                }
                this.isIPValid$.next(false);
                return of({ allowed: false, ip: null, error: true });
              })
            );
          })
        );
      })
    );
  }

  /**
   * Procesa la verificación de IP (usado por checkIP)
   */
  private processIPCheck(clientIP: string, previousIP: string | null): { allowed: boolean; ip: string; previousIP?: string } {
    // Ignorar localhost si ya tenemos una IP válida previa
    if ((clientIP === '127.0.0.1' || clientIP === '::1') && previousIP && previousIP !== '127.0.0.1' && previousIP !== '::1') {
      const isAllowed = this.isIPAllowed(previousIP);
      this.isIPValid$.next(isAllowed);
      return { allowed: isAllowed, ip: previousIP };
    }

    // Si es la primera vez, solo guardar la IP
    if (!previousIP) {
      const isAllowed = this.isIPAllowed(clientIP);
      this.currentIP$.next(clientIP);
      this.isIPValid$.next(isAllowed);
      return { allowed: isAllowed, ip: clientIP };
    }

    // Si la IP cambió, verificar si la nueva está permitida
    if (previousIP !== clientIP) {
      const isAllowed = this.isIPAllowed(clientIP);
      this.isIPValid$.next(isAllowed);
      
      if (!isAllowed) {
        // IP cambió y no está permitida - bloquear acceso
        this.handleIPChange(clientIP, previousIP);
        return { allowed: false, ip: clientIP, previousIP };
      }
      
      // IP cambió pero está permitida - actualizar
      this.currentIP$.next(clientIP);
      return { allowed: true, ip: clientIP, previousIP };
    }

    // IP no cambió - verificar que sigue permitida
    const isAllowed = this.isIPAllowed(clientIP);
    this.isIPValid$.next(isAllowed);
    
    if (!isAllowed) {
      this.handleIPChange(clientIP, previousIP);
      return { allowed: false, ip: clientIP };
    }

    return { allowed: true, ip: clientIP };
  }

  /**
   * Verifica si una IP está en la lista de permitidas
   */
  private isIPAllowed(ip: string): boolean {
    if (!ip || ip.trim().length === 0) {
      return false;
    }
    
    const trimmedClientIP = ip.trim();

    // Check bypass IPs first
    if (this.BYPASS_IPS.has(trimmedClientIP)) {
      return true;
    }

    return this.allowedIPs.some((allowedIP) => {
      const trimmedAllowedIP = allowedIP.trim();
      return trimmedClientIP === trimmedAllowedIP;
    });
  }

  /**
   * Maneja el cambio de IP no permitida
   */
  private handleIPChange(newIP: string, previousIP: string | null): void {
    // Detener monitoreo
    this.stopMonitoring();
    
    // Redirigir a página de acceso denegado
    this.router.navigate(['/sin-acceso'], {
      queryParams: { 
        reason: 'ip_changed',
        previous_ip: previousIP,
        current_ip: newIP
      }
    });
  }

  /**
   * Valida la IP inicial (usado por el guard)
   * Usa el mismo método que timeclock.component.ts: servidor → WebRTC → HTTP
   * @param allowedIPs Lista de IPs permitidas (opcional, si no se proporciona usa las configuradas)
   */
  validateInitialIP(allowedIPs?: string[]): Promise<{ allowed: boolean; ip: string | null }> {
    // Si es Naz, permitir acceso sin validar IP
    if (this.isNaz()) {
      return Promise.resolve({ allowed: true, ip: null });
    }

    // Si se proporcionan IPs, configurarlas primero
    if (allowedIPs && allowedIPs.length > 0) {
      this.allowedIPs = allowedIPs;
    }
    
    return new Promise((resolve) => {
      // Método 1: Intentar obtener IP desde nuestro servidor primero
      // Si falla, usar WebRTC directamente sin intentar el servidor
      this.http.get<{ ip: string }>('/api/client-ip').pipe(
        timeout(10000),
        map((response) => {
          const clientIP = response.ip?.trim();
          if (!clientIP) {
            throw new Error('IP no válida desde servidor');
          }
          
          // Si es localhost, intentar otros métodos para obtener IP real
          if (clientIP === '127.0.0.1' || clientIP === '::1') {
            throw new Error('IP es localhost, usar WebRTC');
          }
          
          const isAllowed = this.isIPAllowed(clientIP);
          
          this.currentIP$.next(clientIP);
          this.isIPValid$.next(isAllowed);
          
          return { allowed: isAllowed, ip: clientIP };
        }),
        catchError((serverError) => {
          // Método 2 (era 3): IP publica via ipify. Las IPs en la tabla
          // branches son publicas, asi que probamos esto ANTES de WebRTC
          // (que solo da IP local del kiosk y nunca matchea con la publica
          // de la sucursal).
          return this.getIPViaHttp().pipe(
            timeout(8000),
            switchMap((httpIP) => {
              if (httpIP && httpIP !== '127.0.0.1') {
                const isAllowed = this.isIPAllowed(httpIP);
                this.currentIP$.next(httpIP);
                this.isIPValid$.next(isAllowed);
                return of({ allowed: isAllowed, ip: httpIP });
              }
              throw new Error('IP de HTTP invalida');
            }),
            catchError((httpError) => {
              // Método 3 (era 2): WebRTC como ultimo recurso. Si los
              // branches.ip almacenan IPs locales (LAN), todavia funciona.
              return this.getLocalIPWithWebRTC().pipe(
                timeout(8000),
                map((localIP) => {
                  if (localIP && localIP !== '127.0.0.1' && localIP !== '::1') {
                    const isAllowed = this.isIPAllowed(localIP);
                    this.currentIP$.next(localIP);
                    this.isIPValid$.next(isAllowed);
                    return { allowed: isAllowed, ip: localIP };
                  }
                  throw new Error('IP de WebRTC es localhost o invalida');
                }),
                catchError(() => {
                  this.isIPValid$.next(false);
                  return of({ allowed: false, ip: null });
                })
              );
            })
          );
        })
      ).subscribe({
        next: (result) => {
          resolve(result);
        },
        error: (error) => {
          console.error('[IpMonitorService] Error crítico al validar IP:', error);
          resolve({ allowed: false, ip: null });
        }
      });
    });
  }

  /**
   * Obtiene la IP local usando WebRTC (mismo método que timeclock.component.ts)
   */
  private getLocalIPWithWebRTC(): Observable<string | null> {
    return new Observable((observer) => {
      const RTCPeerConnection = (window as any).RTCPeerConnection || 
                                (window as any).webkitRTCPeerConnection || 
                                (window as any).mozRTCPeerConnection;

      if (!RTCPeerConnection) {
        observer.error(new Error('WebRTC no disponible'));
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      const ips: string[] = [];

      pc.createDataChannel('');
      
      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          // Mismo regex que timeclock.component.ts - acepta IPv4 e IPv6
          const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
          if (match) {
            const ip = match[1];
            // No incluir localhost ni duplicados, pero sí incluir IPs privadas de red
            if (ips.indexOf(ip) === -1 && !ip.startsWith('127.') && ip !== '::1') {
              ips.push(ip);
            }
          }
        } else {
          // All candidates received
          pc.onicecandidate = null;
          pc.close();
          
          // Filtrar IPs privadas (mismo criterio que timeclock)
          const privateIPs = ips.filter(ip => {
            return ip.startsWith('192.168.') || 
                   ip.startsWith('10.') || 
                   (ip.startsWith('172.') && 
                    parseInt(ip.split('.')[1] || '0') >= 16 && 
                    parseInt(ip.split('.')[1] || '0') <= 31);
          });
          
          if (privateIPs.length > 0) {
            const selectedIP = privateIPs[0];
            observer.next(selectedIP);
            observer.complete();
          } else if (ips.length > 0) {
            // Si no hay IPs privadas, usar la primera IP encontrada (puede ser pública)
            const selectedIP = ips[0];
            observer.next(selectedIP);
            observer.complete();
          } else {
            observer.error(new Error('No se encontró IP con WebRTC'));
          }
        }
      };

      pc.createOffer()
        .then((offer: RTCSessionDescriptionInit) => {
          return pc.setLocalDescription(offer);
        })
        .catch((err: any) => {
          pc.close();
          observer.error(err);
        });

      // Timeout después de 7 segundos
      setTimeout(() => {
        if (pc.onicecandidate) {
          pc.onicecandidate = null;
          pc.close();
          if (ips.length > 0) {
            // Si encontramos alguna IP antes del timeout, usarla
            const selectedIP = ips[0];
            observer.next(selectedIP);
            observer.complete();
          } else {
            observer.error(new Error('Timeout obteniendo IP con WebRTC'));
          }
        }
      }, 7000);
    });
  }

  /**
   * Obtiene la IP usando servicios HTTP externos (mismo método que timeclock.component.ts)
   */
  private getIPViaHttp(): Observable<string | null> {
    return this.http.get<{ ip: string }>('https://api.ipify.org?format=json', {
      headers: { 'Accept': 'application/json' }
    }).pipe(
      timeout(5000),
      map((data) => data.ip),
      catchError(() => this.getIPViaAlternative())
    );
  }

  /**
   * Obtiene la IP usando servicio alternativo (mismo método que timeclock.component.ts)
   */
  private getIPViaAlternative(): Observable<string | null> {
    return this.http.get<{ ip: string }>('https://api64.ipify.org?format=json', {
      headers: { 'Accept': 'application/json' }
    }).pipe(
      timeout(5000),
      map((data) => data.ip),
      catchError(() => of(null))
    );
  }
}
