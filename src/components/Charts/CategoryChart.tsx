'use client';

import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from 'next-themes';

ChartJS.register(ArcElement, Tooltip, Legend);

// Helper to interpolate colors
const interpolateColor = (color1: string, color2: string, factor: number) => {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const generatePalette = (count: number) => {
  const baseColors = [
    '#292421', // Black
    '#A75F37', // Copper
    '#CA8E82', // Pink
    '#D9B99F', // Tan
    '#F2D6CE', // Blush
    '#F2E7DD', // Vanilla
    '#7A958F', // Green
    '#BAE0DA', // Mint
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  const palette: string[] = [];
  let extrasNeeded = count - baseColors.length;

  // Interleave new colors between base colors
  for (let i = 0; i < baseColors.length - 1; i++) {
    palette.push(baseColors[i]);

    if (extrasNeeded > 0) {
      // Create a new color between current and next
      const newColor = interpolateColor(baseColors[i], baseColors[i + 1], 0.5);
      palette.push(newColor);
      extrasNeeded--;
    }
  }

  // Add the last base color
  palette.push(baseColors[baseColors.length - 1]);

  // If we still need more colors (more than 15 categories),
  // append them (simple repeat to avoid errors).
  while (extrasNeeded > 0) {
    palette.push(baseColors[baseColors.length - 1]);
    extrasNeeded--;
  }

  return palette;
};

export default function CategoryChart() {
  const { currentWallet, selectedMonth, selectedYear } = useWallet();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const data = useMemo(() => {
    if (!currentWallet) return { labels: [], datasets: [] };

    const monthlyTransactions = currentWallet.transactions.filter(t => {
      const [year, month] = t.date.split('-').map(Number);
      return month - 1 === selectedMonth && year === selectedYear && (t.type === 'expense_debit' || t.type === 'expense_credit');
    });

    const categoryTotals: { [key: string]: number } = {};
    monthlyTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);
    const backgroundColors = generatePalette(labels.length);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: backgroundColors,
          borderColor: isDark ? '#1e293b' : '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [currentWallet, selectedMonth, selectedYear, isDark]);

  const options = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: isDark ? '#e2e8f0' : '#1e293b',
          font: {
            family: 'var(--font-inter)',
            size: 12,
            weight: 300
          },
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        titleColor: isDark ? '#e2e8f0' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        titleFont: { family: 'var(--font-inter)', size: 13, weight: 300 },
        bodyFont: { family: 'var(--font-inter)', size: 12, weight: 300 },
      }
    },
    cutout: '65%',
  };

  return (
    <div className="bg-surface p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-semibold text-text-primary mb-6">Gastos por Categoría</h3>
      <div className="flex-1 min-h-[250px] flex justify-center items-center relative">
        {data.labels.length > 0 ? (
          <Doughnut data={data} options={options} />
        ) : (
          <div className="text-center text-text-secondary text-sm">
            <p>No hay gastos registrados este mes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
