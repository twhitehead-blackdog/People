import { ChartOptions } from 'chart.js';
import {
  getMonthNameSpanish,
  getPanamaNowParts,
} from '../../utils/panama-date.utils';

export const GENDER_CHART_OPTIONS: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
};

export const HIRES_EXITS_CHART_OPTIONS: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
    },
  },
};

export const HEADCOUNT_CHART_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      displayColors: false,
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => {
          const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
          return `${y}`;
        },
        title: (ctx: any) => {
          // Access labels from chart data directly
          const labels = ctx[0]?.chart?.data?.labels;
          const index = ctx[0]?.dataIndex;
          if (labels && index !== undefined && labels[index]) {
            return labels[index] as string;
          }
          return '';
        },
      },
    },
  },
  scales: {
    x: {
      display: false,
      grid: {
        display: false,
      },
    },
    y: {
      display: false,
      min: 0,
      grid: {
        display: false,
      },
    },
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 3,
      borderColor: '#fbbf24', // yellow-400
      backgroundColor: 'rgba(251, 191, 36, 0.1)',
      fill: true,
    },
    point: {
      radius: 0,
      hoverRadius: 6,
      hitRadius: 10,
      hoverBorderWidth: 2,
      backgroundColor: '#fbbf24',
    },
  },
};

export const LATES_CHART_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      displayColors: false,
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => {
          const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
          return `${y}`;
        },
        afterLabel: (ctx: any) => {
          const names: string[] | undefined = (ctx.dataset as any)
            ?.customNames?.[ctx.dataIndex];
          if (!names || names.length === 0) return '';
          // Return full list (one name per line)
          return names.map((n) => ` ${n}`);
        },
        title: (ctx: any) => {
          const dayNum = ctx[0]?.dataIndex + 1;
          const { month } = getPanamaNowParts();
          const monthName = getMonthNameSpanish(month - 1);
          return `Día ${dayNum} ${monthName}`;
        },
      },
    },
  },
  scales: {
    x: {
      display: false,
      grid: {
        display: false,
      },
    },
    y: {
      display: false,
      beginAtZero: true,
      grid: {
        display: false,
      },
    },
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 3,
      borderJoinStyle: 'round',
      borderCapStyle: 'round',
      borderColor: '#fb923c', // orange-400
      backgroundColor: 'rgba(251, 146, 60, 0.1)',
      fill: true,
    },
    point: {
      radius: 0,
      hoverRadius: 6,
      hitRadius: 10,
      hoverBorderWidth: 2,
      backgroundColor: '#fb923c',
    },
  },
  // OnClick removed, handled by component event
};
