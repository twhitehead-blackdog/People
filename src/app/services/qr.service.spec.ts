import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QrService } from './qr.service';
import { Employee } from '../models';

describe('QrService', () => {
    let service: QrService;
    let httpMock: HttpTestingController;

    const mockEmployee: Partial<Employee> = {
        id: 'test-employee-id',
        first_name: 'Juan',
        father_name: 'Pérez',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                QrService,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(QrService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should generate QR code and update employee in Supabase', (done) => {
        service.generateQrCode(mockEmployee as Employee).subscribe({
            next: (result) => {
                expect(result.qr_code).toBeDefined();
                expect(result.qr_code).toContain('data:image/png;base64');
                expect(result.code_uri).toBeDefined();
                expect(result.code_uri).toContain('otpauth://totp/');
                expect(result.code_uri).toContain('Juan%20P%C3%A9rez');
                done();
            },
            error: done.fail,
        });

        // Wait for the QR generation (async) and then expect the HTTP call
        setTimeout(() => {
            const req = httpMock.expectOne((request) =>
                request.url.includes('/rest/v1/employees') &&
                request.method === 'PATCH'
            );

            expect(req.request.body.qr_code).toContain('data:image/png;base64');
            expect(req.request.body.code_uri).toContain('otpauth://totp/');
            expect(req.request.params.get('id')).toBe('eq.test-employee-id');

            req.flush(null);
        }, 100);
    });

    it('should handle HTTP errors gracefully', (done) => {
        service.generateQrCode(mockEmployee as Employee).subscribe({
            next: () => done.fail('Should have errored'),
            error: (err) => {
                expect(err.status).toBe(500);
                done();
            },
        });

        setTimeout(() => {
            const req = httpMock.expectOne((request) =>
                request.url.includes('/rest/v1/employees') &&
                request.method === 'PATCH'
            );
            req.flush('Error', { status: 500, statusText: 'Server Error' });
        }, 100);
    });
});
