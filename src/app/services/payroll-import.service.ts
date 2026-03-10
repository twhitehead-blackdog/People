import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from './organization.service';
import { ApiUrlService } from './api-url.service';

export interface ImportBatch {
  id: string;
  company_id: string;
  import_type: string;
  file_name: string;
  total_records: number;
  validated_records: number;
  imported_records: number;
  error_records: number;
  skipped_records: number;
  status: 'uploaded' | 'validating' | 'validated' | 'importing' | 'completed' | 'failed' | 'cancelled';
  source_system: string;
  started_by: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ImportStagingRecord {
  id: string;
  company_id: string;
  import_batch_id: string;
  import_type: string;
  raw_data: Record<string, unknown>;
  employee_id: string | null;
  mapped_data: Record<string, unknown> | null;
  status: 'pending' | 'validated' | 'error' | 'imported' | 'skipped';
  validation_errors: string[] | null;
  source_system: string;
  source_reference: string | null;
  created_at: string;
}

export type ImportType =
  | 'payroll_history'
  | 'salary_history'
  | 'vacation_balance'
  | 'debt_history'
  | 'fondo_cesantia'
  | 'decimo_history'
  | 'employee_data';

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

@Injectable({ providedIn: 'root' })
export class PayrollImportService {
  private readonly http = inject(HttpClient);
  private readonly orgService = inject(OrganizationService);
  private readonly apiUrl = inject(ApiUrlService);

  /**
   * Parsea un archivo CSV y devuelve headers y filas como objetos.
   */
  parseCsv(fileContent: string): CsvParseResult {
    const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return { headers: [], rows: [], totalRows: 0 };
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = (values[idx] ?? '').trim();
      });
      rows.push(row);
    }

    return { headers, rows, totalRows: rows.length };
  }

  /**
   * Crea un lote de importación.
   */
  async createBatch(importType: ImportType, fileName: string, totalRecords: number): Promise<ImportBatch> {
    const companyId = this.orgService.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/payroll_import_batches', { select: '*' });
    const result = await firstValueFrom(
      this.http.post<ImportBatch[]>(url, {
        company_id: companyId,
        import_type: importType,
        file_name: fileName,
        total_records: totalRecords,
        status: 'uploaded',
        source_system: 'payday',
      }, {
        headers: { Prefer: 'return=representation' },
      })
    );
    return result[0];
  }

  /**
   * Carga registros al staging.
   */
  async uploadToStaging(
    batchId: string,
    importType: ImportType,
    rows: Record<string, string>[],
    employeeMap: Map<string, string> // sourceRef → employeeId
  ): Promise<void> {
    const companyId = this.orgService.getCurrentCompanyId();
    const records = rows.map(row => {
      const sourceRef = this.getSourceReference(row, importType);
      const employeeId = sourceRef ? employeeMap.get(sourceRef) : null;

      return {
        company_id: companyId,
        import_batch_id: batchId,
        import_type: importType,
        raw_data: row,
        employee_id: employeeId ?? null,
        status: employeeId ? 'pending' : 'error',
        validation_errors: employeeId ? null : ['Empleado no encontrado en el sistema'],
        source_system: 'payday',
        source_reference: sourceRef,
      };
    });

    // Insertar en lotes de 100
    const chunkSize = 100;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const url = this.apiUrl.build('rest/v1/payroll_import_staging');
      await firstValueFrom(this.http.post(url, chunk));
    }
  }

  /**
   * Valida los registros pendientes de un lote.
   */
  async validateBatch(batchId: string): Promise<{ validated: number; errors: number }> {
    const url = this.apiUrl.build('rest/v1/payroll_import_staging', {
      select: '*',
      import_batch_id: `eq.${batchId}`,
      status: 'eq.pending',
    });
    const records = await firstValueFrom(
      this.http.get<ImportStagingRecord[]>(url)
    );

    let validated = 0;
    let errors = 0;

    for (const record of records ?? []) {
      const validationErrors = this.validateRecord(record);
      const newStatus = validationErrors.length === 0 ? 'validated' : 'error';

      const updateUrl = this.apiUrl.build('rest/v1/payroll_import_staging', {
        id: `eq.${record.id}`,
      });
      await firstValueFrom(
        this.http.patch(updateUrl, {
          status: newStatus,
          validation_errors: validationErrors.length > 0 ? validationErrors : null,
          mapped_data: validationErrors.length === 0 ? this.mapRecord(record) : null,
        })
      );

      if (newStatus === 'validated') validated++;
      else errors++;
    }

    // Actualizar batch
    await this.updateBatchStatus(batchId, 'validated', { validated_records: validated, error_records: errors });

    return { validated, errors };
  }

  /**
   * Ejecuta la importación de registros validados.
   */
  async executeBatch(batchId: string): Promise<{ imported: number; skipped: number }> {
    await this.updateBatchStatus(batchId, 'importing');

    const url = this.apiUrl.build('rest/v1/payroll_import_staging', {
      select: '*',
      import_batch_id: `eq.${batchId}`,
      status: 'eq.validated',
    });
    const records = await firstValueFrom(
      this.http.get<ImportStagingRecord[]>(url)
    );

    let imported = 0;
    let skipped = 0;

    for (const record of records ?? []) {
      try {
        await this.importRecord(record, batchId);
        const updateUrl = this.apiUrl.build('rest/v1/payroll_import_staging', {
          id: `eq.${record.id}`,
        });
        await firstValueFrom(
          this.http.patch(updateUrl, { status: 'imported', imported_at: new Date().toISOString() })
        );
        imported++;
      } catch {
        const updateUrl = this.apiUrl.build('rest/v1/payroll_import_staging', {
          id: `eq.${record.id}`,
        });
        await firstValueFrom(
          this.http.patch(updateUrl, { status: 'error', validation_errors: ['Error al importar registro'] })
        );
        skipped++;
      }
    }

    await this.updateBatchStatus(batchId, 'completed', {
      imported_records: imported,
      skipped_records: skipped,
      completed_at: new Date().toISOString(),
    });

    return { imported, skipped };
  }

  /**
   * Obtiene los lotes de importación.
   */
  async getBatches(): Promise<ImportBatch[]> {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return [];
    const url = this.apiUrl.build('rest/v1/payroll_import_batches', {
      select: '*',
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    });
    return await firstValueFrom(this.http.get<ImportBatch[]>(url)) ?? [];
  }

  /**
   * Obtiene registros staging de un lote.
   */
  async getStagingRecords(batchId: string): Promise<ImportStagingRecord[]> {
    const url = this.apiUrl.build('rest/v1/payroll_import_staging', {
      select: '*',
      import_batch_id: `eq.${batchId}`,
      order: 'created_at.asc',
    });
    return await firstValueFrom(this.http.get<ImportStagingRecord[]>(url)) ?? [];
  }

  // ==========================================
  // PRIVADOS
  // ==========================================

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private getSourceReference(row: Record<string, string>, importType: ImportType): string | null {
    // Buscar columnas comunes de identificación del empleado
    return row['cedula'] || row['Cedula'] || row['CEDULA']
      || row['documento'] || row['Documento'] || row['employee_id']
      || row['id_empleado'] || null;
  }

  private validateRecord(record: ImportStagingRecord): string[] {
    const errors: string[] = [];
    const data = record.raw_data;

    if (!record.employee_id) {
      errors.push('Empleado no encontrado en el sistema');
    }

    switch (record.import_type) {
      case 'salary_history':
        if (!data['salario'] && !data['salary'] && !data['monthly_salary']) {
          errors.push('Falta el campo de salario');
        }
        if (!data['fecha_efectiva'] && !data['effective_date'] && !data['fecha']) {
          errors.push('Falta la fecha efectiva');
        }
        break;
      case 'vacation_balance':
        if (!data['dias_acumulados'] && !data['accrued_days']) {
          errors.push('Falta los días acumulados');
        }
        break;
      case 'fondo_cesantia':
        if (!data['saldo'] && !data['balance'] && !data['monto']) {
          errors.push('Falta el saldo del fondo');
        }
        break;
      case 'debt_history':
        if (!data['monto'] && !data['amount'] && !data['balance']) {
          errors.push('Falta el monto de la deuda');
        }
        break;
      case 'payroll_history':
        if (!data['periodo'] && !data['period'] && !data['fecha']) {
          errors.push('Falta el período de la planilla');
        }
        break;
    }

    return errors;
  }

  private mapRecord(record: ImportStagingRecord): Record<string, unknown> {
    const data = record.raw_data;

    switch (record.import_type) {
      case 'salary_history':
        return {
          employee_id: record.employee_id,
          new_monthly_salary: parseFloat(String(data['salario'] || data['salary'] || data['monthly_salary'] || '0')),
          effective_date: data['fecha_efectiva'] || data['effective_date'] || data['fecha'],
          reason: data['razon'] || data['reason'] || 'Importado desde Payday',
        };
      case 'vacation_balance':
        return {
          employee_id: record.employee_id,
          accrued_days: parseFloat(String(data['dias_acumulados'] || data['accrued_days'] || '0')),
          used_days: parseFloat(String(data['dias_usados'] || data['used_days'] || '0')),
          cutoff_date: data['fecha_corte'] || data['cutoff_date'] || new Date().toISOString().split('T')[0],
        };
      case 'fondo_cesantia':
        return {
          employee_id: record.employee_id,
          current_balance: parseFloat(String(data['saldo'] || data['balance'] || data['monto'] || '0')),
        };
      case 'debt_history':
        return {
          employee_id: record.employee_id,
          description: data['descripcion'] || data['description'] || 'Deuda importada',
          amount: parseFloat(String(data['monto'] || data['amount'] || '0')),
          balance: parseFloat(String(data['saldo'] || data['balance'] || data['monto'] || '0')),
          installment_amount: parseFloat(String(data['cuota'] || data['installment'] || '0')),
          debt_type: data['tipo'] || data['type'] || 'other',
          status: 'active',
        };
      default:
        return { ...data, employee_id: record.employee_id };
    }
  }

  private async importRecord(record: ImportStagingRecord, batchId: string): Promise<void> {
    const companyId = this.orgService.getCurrentCompanyId();
    const mapped = record.mapped_data ?? this.mapRecord(record);

    switch (record.import_type) {
      case 'salary_history': {
        const url = this.apiUrl.build('rest/v1/payroll_salary_history');
        await firstValueFrom(this.http.post(url, {
          ...mapped,
          company_id: companyId,
          imported_from: 'payday',
          import_batch_id: batchId,
        }));
        break;
      }
      case 'vacation_balance': {
        const url = this.apiUrl.build('rest/v1/vacation_initial_balances');
        await firstValueFrom(this.http.post(url, {
          company_id: companyId,
          employee_id: mapped['employee_id'],
          accrued_days: mapped['accrued_days'],
          used_days: mapped['used_days'],
          available_days: (mapped['accrued_days'] as number) - (mapped['used_days'] as number),
          cutoff_date: mapped['cutoff_date'],
          imported_from: 'payday',
        }, {
          headers: { Prefer: 'resolution=merge-duplicates' },
        }));
        break;
      }
      case 'fondo_cesantia': {
        // Crear balance
        const balanceUrl = this.apiUrl.build('rest/v1/fondo_cesantia_balance');
        const balanceResult = await firstValueFrom(this.http.post<{ id: string }[]>(balanceUrl, {
          company_id: companyId,
          employee_id: mapped['employee_id'],
          current_balance: mapped['current_balance'],
        }, {
          headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
        }));
        // Crear movimiento de importación
        if (balanceResult?.[0]) {
          const movUrl = this.apiUrl.build('rest/v1/fondo_cesantia_movements');
          await firstValueFrom(this.http.post(movUrl, {
            company_id: companyId,
            employee_id: mapped['employee_id'],
            balance_id: balanceResult[0].id,
            movement_type: 'import',
            amount: mapped['current_balance'],
            running_balance: mapped['current_balance'],
            reference_date: new Date().toISOString().split('T')[0],
            description: 'Saldo importado desde Payday',
            imported_from: 'payday',
          }));
        }
        break;
      }
      case 'debt_history': {
        const url = this.apiUrl.build('rest/v1/payroll_debts');
        await firstValueFrom(this.http.post(url, {
          company_id: companyId,
          employee_id: mapped['employee_id'],
          description: mapped['description'],
          amount: mapped['amount'],
          balance: mapped['balance'],
          installment_amount: mapped['installment_amount'],
          debt_type: mapped['debt_type'],
          status: mapped['status'],
          imported_from: 'payday',
          import_batch_id: batchId,
        }));
        break;
      }
      default: {
        const url = this.apiUrl.build(`rest/v1/${record.import_type === 'payroll_history' ? 'payroll_payments' : record.import_type}`);
        await firstValueFrom(this.http.post(url, {
          ...mapped,
          company_id: companyId,
          imported_from: 'payday',
          import_batch_id: batchId,
        }));
        break;
      }
    }
  }

  private async updateBatchStatus(
    batchId: string,
    status: string,
    extra: Record<string, unknown> = {}
  ): Promise<void> {
    const url = this.apiUrl.build('rest/v1/payroll_import_batches', {
      id: `eq.${batchId}`,
    });
    await firstValueFrom(this.http.patch(url, { status, ...extra }));
  }
}
