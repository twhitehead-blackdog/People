import { FormGroup } from '@angular/forms';
import { toDate } from 'date-fns-tz';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { Employee } from '../../models';
import { COUNTRY_CODES, FIELD_LABELS } from './employee-form.constants';

const COUNTRY_CODE_VALUES = COUNTRY_CODES.map((c) => c.value);

export function parsePhoneNumber(phone: string): {
  countryCode: string;
  number: string;
} {
  if (!phone) return { countryCode: '+507', number: '' };

  for (const code of COUNTRY_CODE_VALUES) {
    if (phone.startsWith(code)) {
      return {
        countryCode: code,
        number: phone.substring(code.length).trim(),
      };
    }
  }

  if (phone.startsWith('+')) {
    const match = phone.match(/^(\+\d{1,4})\s*(.+)$/);
    if (match) {
      return { countryCode: match[1], number: match[2] };
    }
  }

  return { countryCode: '+507', number: phone };
}

export function combinePhoneWithCode(
  code: string | null | undefined,
  number: string | null | undefined
): string {
  const num = number?.trim() || '';
  if (!num) return '';
  return `${code || '+507'} ${num}`.trim();
}

export function preloadEmployeeForm(
  form: FormGroup,
  employee: Employee
): void {
  form.patchValue(employee);

  if (employee.birth_date) {
    form
      .get('birth_date')
      ?.patchValue(
        toDate(employee.birth_date, { timeZone: 'America/Panama' })
      );
  }
  form
    .get('start_date')
    ?.patchValue(toDate(employee.start_date, { timeZone: 'America/Panama' }));
  if (employee.end_date) {
    form
      .get('end_date')
      ?.patchValue(toDate(employee.end_date, { timeZone: 'America/Panama' }));
  }

  // Parse phone numbers into country code + number
  if (employee.phone_number) {
    const { countryCode, number } = parsePhoneNumber(employee.phone_number);
    form.get('phone_country_code')?.setValue(countryCode || '+507');
    form.get('phone_number')?.setValue(number || '');
  }

  if (employee.work_phone_number) {
    const { countryCode, number } = parsePhoneNumber(
      employee.work_phone_number
    );
    form.get('work_phone_country_code')?.setValue(countryCode || '+507');
    form.get('work_phone_number')?.setValue(number || '');
  }

  if (employee.emergency_contact_phone) {
    const { countryCode, number } = parsePhoneNumber(
      employee.emergency_contact_phone
    );
    form
      .get('emergency_contact_phone_country_code')
      ?.setValue(countryCode || '+507');
    form.get('emergency_contact_phone')?.setValue(number || '');
  }

  form.markAsPristine();
  form.markAsUntouched();
}

export function setBankIfExists(
  form: FormGroup,
  bankId: string | null | undefined,
  banks: Array<{ id: string }> | null | undefined
): void {
  if (bankId && banks && banks.length > 0) {
    const exists = banks.some((b) => b.id === bankId);
    if (exists) {
      form.get('bank')?.setValue(bankId, { emitEvent: false });
    }
  }
}

export interface EmployeeSavePayload {
  data: Record<string, any>;
  phoneNumber: string;
}

export function buildSavePayload(form: FormGroup): EmployeeSavePayload {
  const formValue = form.getRawValue();
  const phoneNumber = combinePhoneWithCode(
    formValue.phone_country_code,
    formValue.phone_number
  );

  const data: Record<string, any> = {
    ...formValue,
    phone_number: phoneNumber,
    work_phone_number: combinePhoneWithCode(
      formValue.work_phone_country_code,
      formValue.work_phone_number
    ),
    emergency_contact_phone: combinePhoneWithCode(
      formValue.emergency_contact_phone_country_code,
      formValue.emergency_contact_phone
    ),
  };

  // Remove internal country code fields
  delete data['phone_country_code'];
  delete data['work_phone_country_code'];
  delete data['emergency_contact_phone_country_code'];

  return { data, phoneNumber };
}

export function getInvalidFieldLabels(form: FormGroup): string[] {
  const labels: string[] = [];
  Object.keys(form.controls).forEach((key) => {
    const control = form.get(key);
    if (control && control.invalid) {
      labels.push(FIELD_LABELS[key] || key);
    }
  });
  return labels;
}

export function formatPhoneField(
  form: FormGroup,
  numberField: string,
  codeField: string
): void {
  const numberControl = form.get(numberField);
  const codeControl = form.get(codeField);

  if (numberControl && codeControl) {
    const number = numberControl.value?.trim() || '';
    if (number.startsWith('+')) {
      const parsed = parsePhoneNumber(number);
      codeControl.setValue(parsed.countryCode);
      numberControl.setValue(parsed.number);
    }
  }
}

export function generateTimeclockQR(
  form: FormGroup,
  firstName: string,
  lastName: string
): void {
  const totp = new OTPAuth.TOTP({
    issuer: 'People Blackdog',
    label: `${firstName.trim()} ${lastName.trim()}`,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  const uri = totp.toString();
  QRCode.toDataURL(uri, async (error, qrCode) => {
    if (error) {
      console.error(error);
      return;
    }
    form.patchValue({ qr_code: qrCode, code_uri: uri });
  });
}
