import type { Branch, Company } from './company.model';
import type { Employee } from './employee.model';

export interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
}

export interface ExportColumn {
  title: string;
  dataKey: string;
}

export interface Timestamp {
  id: string;
  employee_id: string;
  employee?: Employee;
  branch_id: string;
  branch?: Branch;
  company_id: string;
  company?: Company;
  date: Date;
  time: string;
}

// ============================================
// Color variants + helpers para schedules
// ============================================

export const colorVariants: Record<string, string> = {
  slate: 'bg-slate-300 text-slate-800',
  yellow: 'bg-yellow-300 text-yellow-800',
  green: 'bg-green-300 text-green-800',
  sky: 'bg-sky-300 text-sky-800',
  indigo: 'bg-indigo-300 text-indigo-800',
  orange: 'bg-orange-300 text-orange-800',
  purple: 'bg-purple-300 text-purple-800',
  red: 'bg-red-300 text-red-800',
  pink: 'bg-pink-300 text-pink-800',
  teal: 'bg-teal-300 text-teal-800',
  cyan: 'bg-cyan-300 text-cyan-800',
  // Colores adicionales recomendados
  emerald: 'bg-emerald-300 text-emerald-800',
  lime: 'bg-lime-300 text-lime-800',
  amber: 'bg-amber-300 text-amber-800',
  rose: 'bg-rose-300 text-rose-800',
  violet: 'bg-violet-300 text-violet-800',
  fuchsia: 'bg-fuchsia-300 text-fuchsia-800',
  blue: 'bg-blue-300 text-blue-800',
  stone: 'bg-stone-300 text-stone-800',
  neutral: 'bg-neutral-300 text-neutral-800',
  zinc: 'bg-zinc-300 text-zinc-800',
  gray: 'bg-gray-300 text-gray-800',
  // Colores adicionales más variados
  'slate-400': 'bg-slate-400 text-slate-900',
  'yellow-400': 'bg-yellow-400 text-yellow-900',
  'green-400': 'bg-green-400 text-green-900',
  'sky-400': 'bg-sky-400 text-sky-900',
  'indigo-400': 'bg-indigo-400 text-indigo-900',
  'orange-400': 'bg-orange-400 text-orange-900',
  'purple-400': 'bg-purple-400 text-purple-900',
  'red-400': 'bg-red-400 text-red-900',
  'pink-400': 'bg-pink-400 text-pink-900',
  'teal-400': 'bg-teal-400 text-teal-900',
  'cyan-400': 'bg-cyan-400 text-cyan-900',
  'emerald-400': 'bg-emerald-400 text-emerald-900',
  'lime-400': 'bg-lime-400 text-lime-900',
  'amber-400': 'bg-amber-400 text-amber-900',
  'rose-400': 'bg-rose-400 text-rose-900',
  'violet-400': 'bg-violet-400 text-violet-900',
  'fuchsia-400': 'bg-fuchsia-400 text-fuchsia-900',
  'blue-400': 'bg-blue-400 text-blue-900',
  'slate-500': 'bg-slate-500 text-white',
  'yellow-500': 'bg-yellow-500 text-white',
  'green-500': 'bg-green-500 text-white',
  'sky-500': 'bg-sky-500 text-white',
  'indigo-500': 'bg-indigo-500 text-white',
  'orange-500': 'bg-orange-500 text-white',
  'purple-500': 'bg-purple-500 text-white',
  'red-500': 'bg-red-500 text-white',
  'pink-500': 'bg-pink-500 text-white',
  'teal-500': 'bg-teal-500 text-white',
  'cyan-500': 'bg-cyan-500 text-white',
  'emerald-500': 'bg-emerald-500 text-white',
  'lime-500': 'bg-lime-500 text-white',
  'amber-500': 'bg-amber-500 text-white',
  'rose-500': 'bg-rose-500 text-white',
  'violet-500': 'bg-violet-500 text-white',
  'fuchsia-500': 'bg-fuchsia-500 text-white',
  'blue-500': 'bg-blue-500 text-white',
};

// Función helper para obtener el estilo de color de un schedule
// Maneja tanto colores recomendados (de colorVariants) como colores RGB personalizados
export function getScheduleColorStyle(
  color: string | undefined | null
): string {
  if (!color) return '';

  // Si el color está en colorVariants, retornar la clase Tailwind
  if (colorVariants[color]) {
    return colorVariants[color];
  }

  // Si es un color RGB personalizado, retornar estilo inline
  if (color.startsWith('rgb(')) {
    return '';
  }

  // Si es hex, convertir a RGB
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color);
    return '';
  }

  return '';
}

// Función helper para obtener el estilo inline de color (para colores personalizados)
export function getScheduleColorInlineStyle(
  color: string | undefined | null
): { [key: string]: string } | null {
  if (!color) return null;

  // Si el color está en colorVariants, no necesita estilo inline
  if (colorVariants[color]) {
    return null;
  }

  // Si es un color RGB personalizado
  if (color.startsWith('rgb(')) {
    return {
      'background-color': color,
      color: getTextColorForRgb(color),
    };
  }

  // Si es hex, convertir a RGB
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color);
    return {
      'background-color': rgb,
      color: getTextColorForRgb(rgb),
    };
  }

  return null;
}

// Convertir Hex a RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 'rgb(59, 130, 246)';

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgb(${r}, ${g}, ${b})`;
}

// Determinar color de texto según el fondo RGB
function getTextColorForRgb(rgb: string): string {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  // Calcular luminosidad
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}
