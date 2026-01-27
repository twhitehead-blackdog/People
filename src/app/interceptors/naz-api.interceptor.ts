import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { NazContextService } from '../services/naz-context.service';

@Injectable()
export class NazApiInterceptor implements HttpInterceptor {
  private context = inject(NazContextService);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    try {
      const nazId = this.context.getId();

      // 1. Inject into Query Params
      let params = req.params;
      if (!params.has('company_id')) {
        params = params.set('company_id', nazId);
      } else if (params.get('company_id') !== nazId) {
        // Validation: Block cross-company attempts in params
        throw new Error(
          `SECURITY: Request blocked. 'company_id' param (${params.get(
            'company_id'
          )}) matches foreign entity.`
        );
      }

      // 2. Inject into Body (Safe Mode)
      let body = req.body;
      if (body && typeof body === 'object') {
        // Exclude FormData, Blob, ArrayBuffer, etc.
        const isBinary =
          body instanceof FormData ||
          body instanceof Blob ||
          body instanceof ArrayBuffer ||
          body instanceof DataView;

        if (!isBinary && !Array.isArray(body)) {
          // It's a plain object (likely JSON payload)
          // Clone request body to obtain a mutable reference
          body = { ...body };

          if ('company_id' in body) {
            if (body.company_id !== nazId) {
              throw new Error(
                `SECURITY: Request blocked. Body 'company_id' (${body.company_id}) matches foreign entity.`
              );
            }
          } else {
            // Auto-inject
            body['company_id'] = nazId;
          }
        }
      }

      const clonedReq = req.clone({
        params,
        body,
      });

      return next.handle(clonedReq);
    } catch (error) {
      console.error('[NazApiInterceptor] Security Block:', error);
      return throwError(() => error);
    }
  }
}
