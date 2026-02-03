import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { firstValueFrom, Observable, from, switchMap, map } from 'rxjs';
import { Employee } from '../models';
import { ApiUrlService } from './api-url.service';

export interface QrGenerationResult {
    qr_code: string;
    code_uri: string;
}

@Injectable({ providedIn: 'root' })
export class QrService {
    private http = inject(HttpClient);
    private apiUrl = inject(ApiUrlService);

    /**
     * Genera un nuevo código QR TOTP para un empleado y lo guarda en Supabase.
     * @param employee El empleado para quien generar el QR
     * @returns Observable con el qr_code (base64) y code_uri (URI TOTP)
     */
    generateQrCode(employee: Employee): Observable<QrGenerationResult> {
        // Crear el TOTP con un nuevo secreto aleatorio
        const totp = new OTPAuth.TOTP({
            issuer: 'People Blackdog',
            label: `${employee.first_name.trim()} ${employee.father_name.trim()}`,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        });

        const uri = totp.toString();

        // Convertir el URI TOTP a imagen QR base64
        return from(QRCode.toDataURL(uri)).pipe(
            switchMap((qrDataUrl: string) => {
                // Guardar en Supabase
                return this.http
                    .patch<void>(
                        this.apiUrl.build('rest/v1/employees'),
                        {
                            qr_code: qrDataUrl,
                            code_uri: uri,
                        },
                        {
                            params: {
                                id: `eq.${employee.id}`,
                            },
                            headers: {
                                'Content-Type': 'application/json',
                                Prefer: 'return=minimal',
                            },
                        }
                    )
                    .pipe(
                        map(() => ({
                            qr_code: qrDataUrl,
                            code_uri: uri,
                        }))
                    );
            })
        );
    }

    /**
     * Genera un código QR y retorna una Promise (útil para async/await)
     */
    async generateQrCodeAsync(employee: Employee): Promise<QrGenerationResult> {
        return firstValueFrom(this.generateQrCode(employee));
    }
}
