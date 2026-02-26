/**
 * Chart configuration utilities for the home dashboard
 */

export interface ChartDataset {
  data: number[];
  label?: string;
  borderColor?: string;
  backgroundColor?: string | string[];
  fill?: boolean;
  tension?: number;
  borderWidth?: number;
  pointRadius?: number | ((ctx: any) => number);
  pointHoverRadius?: number | ((ctx: any) => number);
  pointHitRadius?: number | ((ctx: any) => number);
  pointBackgroundColor?: string;
  pointBorderColor?: string;
  pointBorderWidth?: number;
  pointHoverBackgroundColor?: string;
  pointHoverBorderColor?: string;
  customNames?: string[][];
  customDetails?: any[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Generate corporate color palette for charts
 */
export function generateCorporateColors(count: number): {
  backgroundColor: string[];
  borderColor: string[];
} {
  const baseColors = [
    { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.8)' },
    { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.7)' },
    { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.6)' },
  ];

  const backgroundColor: string[] = [];
  const borderColor: string[] = [];

  for (let i = 0; i < count; i++) {
    const color = baseColors[i % baseColors.length];
    backgroundColor.push(color.bg);
    borderColor.push(color.border);
  }

  return { backgroundColor, borderColor };
}

/**
 * Bar chart options for dashboard
 */
export const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#18181b',
      titleColor: '#fbbf24',
      bodyColor: '#ffffff',
      borderColor: 'rgba(251, 191, 36, 0.5)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: {
          size: 12,
        },
      },
      grid: {
        color: 'rgba(251, 191, 36, 0.1)',
      },
    },
    y: {
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: {
          size: 12,
        },
      },
      grid: {
        color: 'rgba(251, 191, 36, 0.1)',
      },
    },
  },
};

/**
 * Gender chart options (semicircle donut)
 */
export const genderChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '85%',
  rotation: -90,
  circumference: 180,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
      backgroundColor: '#18181b',
      titleColor: '#fbbf24',
      bodyColor: '#ffffff',
      borderColor: 'rgba(107, 114, 128, 0.3)',
      borderWidth: 1,
      callbacks: {
        label: (context: any) => {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = context.dataset.data.reduce(
            (a: number, b: number) => a + b,
            0
          );
          const percentage =
            total > 0 ? Math.round((value / total) * 100) : 0;
          return `${label}: ${value} (${percentage}%)`;
        },
      },
    },
  },
};

/**
 * Hires/Exits chart options (semicircle donut)
 */
export const hiresExitsChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '85%',
  rotation: -90,
  circumference: 180,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
      backgroundColor: '#18181b',
      titleColor: '#fbbf24',
      bodyColor: '#ffffff',
      borderColor: 'rgba(107, 114, 128, 0.3)',
      borderWidth: 1,
      callbacks: {
        label: (context: any) => {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = context.dataset.data.reduce(
            (a: number, b: number) => a + b,
            0
          );
          const percentage =
            total > 0 ? Math.round((value / total) * 100) : 0;
          return `${label}: ${value} (${percentage}%)`;
        },
      },
    },
  },
};

/**
 * Headcount line chart options
 */
export function getHeadcountChartOptions(onPointClick?: (monthLabel: string, monthIndex: number) => void): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#18181b',
        titleColor: '#fbbf24',
        bodyColor: '#ffffff',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (items: any[]) => {
            if (!items.length) return '';
            return items[0].label;
          },
          label: (context: any) => {
            const ds = context.dataset;
            const val = context.raw ?? 0;
            if (ds.label === 'Headcount') {
              return `  Empleados: ${val}`;
            } else if (ds.label === 'Ingresos') {
              return `  Ingresos: +${val}`;
            } else if (ds.label === 'Salidas') {
              return `  Salidas: -${val}`;
            }
            return `  ${ds.label}: ${val}`;
          },
          afterBody: () => {
            return '\nClick para ver detalles';
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(251, 191, 36, 0.08)',
        },
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 10 },
          stepSize: 1,
        },
        grid: {
          color: 'rgba(251, 191, 36, 0.08)',
        },
      },
    },
    onClick: (evt: any, elements: any[], chart: any) => {
      if (elements.length > 0 && onPointClick) {
        const idx = elements[0].index;
        const label = chart.data.labels[idx];
        onPointClick(label, idx);
      }
    },
  };
}

/**
 * Lates daily chart options with click handler
 */
export function getLatesDailyChartOptions(onChartClick?: (evt: any) => void): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#18181b',
        titleColor: '#FCD34D',
        bodyColor: '#fff',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        borderWidth: 1,
        callbacks: {
          title: (items: any[]) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const day = idx + 1;
            return `Día ${day}`;
          },
          label: (ctx: any) => {
            const count = ctx.raw ?? 0;
            return count === 1 ? '1 tardanza' : `${count} tardanzas`;
          },
          afterBody: (items: any[]) => {
            if (!items || !items.length) return '';
            const ds: any = items[0].dataset;
            const idx = items[0].dataIndex;
            const names: string[] = ds.customNames?.[idx] ?? [];
            if (names.length === 0) return '';
            const limit = 5;
            const shown = names.slice(0, limit);
            const lines = shown.map((n: string) => `• ${n}`);
            if (names.length > limit) {
              lines.push(`...y ${names.length - limit} más`);
            }
            lines.push('');
            lines.push('Click para ver detalles');
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(252, 211, 77, 0.08)',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 10 },
          stepSize: 1,
        },
        grid: {
          color: 'rgba(252, 211, 77, 0.08)',
        },
      },
    },
    onClick: onChartClick,
  };
}
