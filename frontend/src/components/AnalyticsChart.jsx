import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { family: 'Inter', size: 12 },
        usePointStyle: true,
        pointStyleWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(22, 33, 62, 0.95)',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      borderWidth: 1,
      titleColor: '#a5b4fc',
      bodyColor: '#e2e8f0',
      cornerRadius: 8,
      padding: 12,
      titleFont: { family: 'Inter', weight: 600 },
      bodyFont: { family: 'Inter', size: 13 },
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
      border: { display: false },
    },
    y: {
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
      border: { display: false },
      beginAtZero: true,
    },
  },
};

/**
 * Attendance Trend Line Chart.
 * Shows attendance rate over time per course.
 */
export const AttendanceTrendChart = ({ data, height = 280 }) => {
  if (!data?.labels?.length) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No trend data available yet.
      </div>
    );
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Attendance Rate (%)',
        data: data.values,
        borderColor: '#6366f1',
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  return (
    <div style={{ height }}>
      <Line
        data={chartData}
        options={{
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                label: (ctx) => ` ${ctx.parsed.y.toFixed(1)}% attendance`,
              },
            },
          },
          scales: {
            ...baseOptions.scales,
            y: {
              ...baseOptions.scales.y,
              max: 100,
              ticks: {
                ...baseOptions.scales.y.ticks,
                callback: (v) => `${v}%`,
              },
            },
          },
        }}
      />
    </div>
  );
};

/**
 * Session-by-Day Bar Chart.
 */
export const SessionsByDayChart = ({ data, height = 220 }) => {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No session data available.
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.day),
    datasets: [
      {
        label: 'Sessions',
        data: data.map((d) => d.count),
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: false } } }} />
    </div>
  );
};

/**
 * Attendance Status Doughnut Chart.
 */
export const AttendanceStatusChart = ({ present = 0, late = 0, absent = 0, height = 220 }) => {
  const total = present + late + absent;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No attendance data yet.
      </div>
    );
  }

  const chartData = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [
      {
        data: [present, late, absent],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(239, 68, 68, 0.85)',
        ],
        borderColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444',
        ],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  return (
    <div style={{ height }}>
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: baseOptions.plugins.legend,
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                label: (ctx) => {
                  const pct = ((ctx.parsed / total) * 100).toFixed(1);
                  return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                },
              },
            },
          },
        }}
      />
    </div>
  );
};
