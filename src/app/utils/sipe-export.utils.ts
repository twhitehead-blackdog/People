/**
 * SIPE Export Utilities
 *
 * Generates fixed-width TXT files for Panama's CSS (Caja de Seguro Social)
 * SIPE system. Employers use these files to report employee social security
 * contributions each period.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SipeEmployeeData {
  /** Cedula or document ID (e.g. "8-123-4567") */
  document_id: string;
  /** First name */
  first_name: string;
  /** Middle name (optional) */
  middle_name?: string;
  /** Paternal last name */
  father_name: string;
  /** Maternal last name */
  mother_name: string;
  /** Gross salary reported for the period */
  salary: number;
  /** CSS employee contribution (Seguro Social Obrero ~9.75%) */
  css_employee: number;
  /** CSS employer contribution (Seguro Social Patronal ~12.25%) */
  css_employer: number;
  /** Seguro Educativo employee contribution (~1.25%) */
  se_employee: number;
  /** Seguro Educativo employer contribution (~1.50%) */
  se_employer: number;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Pad a string on the right with a fill character up to `width`.
 * Truncates if the value exceeds the width.
 */
export function padRight(value: string, width: number, fill = ' '): string {
  const truncated = value.slice(0, width);
  return truncated + fill.repeat(Math.max(0, width - truncated.length));
}

/**
 * Pad a string on the left with a fill character up to `width`.
 * Truncates from the right if the value exceeds the width.
 */
export function padLeft(value: string, width: number, fill = ' '): string {
  const truncated = value.slice(0, width);
  return fill.repeat(Math.max(0, width - truncated.length)) + truncated;
}

/**
 * Format a monetary amount for SIPE fixed-width fields.
 * Multiplies by 100 to remove decimals, rounds, and zero-pads on the left.
 *
 * Example: formatAmount(1234.56, 12) => "000000123456"
 */
export function formatAmount(amount: number, width = 12): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const raw = cents.toString();
  if (raw.length > width) {
    return raw.slice(0, width);
  }
  return raw.padStart(width, '0');
}

/**
 * Sanitise text for the SIPE file: uppercase, remove accents, strip
 * characters that are not A-Z, 0-9, space or hyphen.
 */
export function sanitizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toUpperCase()
    .replace(/[^A-Z0-9 \-]/g, '')
    .trim();
}

/**
 * Strip the cedula formatting (hyphens, spaces) and return digits only,
 * preserving leading zeros if present. SIPE expects the raw cedula string
 * left-padded with spaces to 15 characters.
 */
export function formatCedula(documentId: string): string {
  const clean = documentId.replace(/[^0-9]/g, '');
  return padLeft(clean, 15);
}

// ---------------------------------------------------------------------------
// SIPE file generation
// ---------------------------------------------------------------------------

/**
 * Build the header line (record type "01").
 *
 * Layout:
 *  - Record type   :  2 chars ("01")
 *  - Company RUC   : 15 chars (left-padded spaces)
 *  - Company name  : 50 chars (right-padded spaces)
 *  - Period        :  6 chars (YYYYMM)
 *  - Record count  :  6 chars (zero-padded)
 */
function buildHeaderLine(
  companyRuc: string,
  companyName: string,
  period: string,
  recordCount: number,
): string {
  const parts: string[] = [
    '01',
    padLeft(companyRuc.replace(/[^0-9]/g, ''), 15),
    padRight(sanitizeText(companyName), 50),
    padRight(period.replace(/[^0-9]/g, '').slice(0, 6), 6, '0'),
    recordCount.toString().padStart(6, '0'),
  ];
  return parts.join('');
}

/**
 * Build one detail line (record type "02") for a single employee.
 *
 * Layout:
 *  - Record type          :  2 chars ("02")
 *  - Cedula               : 15 chars (left-padded spaces)
 *  - Apellido paterno     : 30 chars (right-padded spaces)
 *  - Apellido materno     : 30 chars (right-padded spaces)
 *  - Nombres              : 30 chars (right-padded spaces)
 *  - Salario              : 12 chars (amount * 100, zero-padded)
 *  - CSS empleado         : 12 chars
 *  - CSS patronal         : 12 chars
 *  - SE empleado          : 12 chars
 *  - SE patronal          : 12 chars
 */
function buildDetailLine(emp: SipeEmployeeData): string {
  const fullName = emp.middle_name
    ? `${emp.first_name} ${emp.middle_name}`
    : emp.first_name;

  const parts: string[] = [
    '02',
    formatCedula(emp.document_id),
    padRight(sanitizeText(emp.father_name), 30),
    padRight(sanitizeText(emp.mother_name), 30),
    padRight(sanitizeText(fullName), 30),
    formatAmount(emp.salary, 12),
    formatAmount(emp.css_employee, 12),
    formatAmount(emp.css_employer, 12),
    formatAmount(emp.se_employee, 12),
    formatAmount(emp.se_employer, 12),
  ];
  return parts.join('');
}

/**
 * Build the trailer line (record type "99").
 *
 * Layout:
 *  - Record type      :  2 chars ("99")
 *  - Total records     :  6 chars (zero-padded)
 *  - Total salary      : 14 chars (amount * 100, zero-padded)
 *  - Total CSS emp     : 14 chars
 *  - Total CSS patron  : 14 chars
 *  - Total SE emp      : 14 chars
 *  - Total SE patron   : 14 chars
 */
function buildTrailerLine(
  recordCount: number,
  totals: {
    salary: number;
    cssEmployee: number;
    cssEmployer: number;
    seEmployee: number;
    seEmployer: number;
  },
): string {
  const parts: string[] = [
    '99',
    recordCount.toString().padStart(6, '0'),
    formatAmount(totals.salary, 14),
    formatAmount(totals.cssEmployee, 14),
    formatAmount(totals.cssEmployer, 14),
    formatAmount(totals.seEmployee, 14),
    formatAmount(totals.seEmployer, 14),
  ];
  return parts.join('');
}

/**
 * Generate the full SIPE TXT file content.
 *
 * @param employees   Array of employee data for the period
 * @param period      Period string in "YYYYMM" format (e.g. "202603")
 * @param companyRuc  Company RUC number
 * @param companyName Company legal name
 * @returns The complete file content as a string
 */
export function generateSipeFile(
  employees: SipeEmployeeData[],
  period: string,
  companyRuc: string,
  companyName: string,
): string {
  const lines: string[] = [];

  // Header
  lines.push(buildHeaderLine(companyRuc, companyName, period, employees.length));

  // Accumulate totals
  const totals = {
    salary: 0,
    cssEmployee: 0,
    cssEmployer: 0,
    seEmployee: 0,
    seEmployer: 0,
  };

  // Detail lines
  for (const emp of employees) {
    lines.push(buildDetailLine(emp));
    totals.salary += emp.salary;
    totals.cssEmployee += emp.css_employee;
    totals.cssEmployer += emp.css_employer;
    totals.seEmployee += emp.se_employee;
    totals.seEmployer += emp.se_employer;
  }

  // Trailer
  lines.push(buildTrailerLine(employees.length, totals));

  // SIPE files use CRLF line endings
  return lines.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/**
 * Trigger a browser download of the SIPE TXT file.
 *
 * @param content  The file content (from generateSipeFile)
 * @param filename The download filename (e.g. "SIPE_202603.txt")
 */
export function downloadSipeFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
