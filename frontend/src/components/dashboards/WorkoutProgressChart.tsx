'use client';

import { useMemo } from 'react';
import styles from '@/styles/Dashboard.module.css';

export interface WorkoutProgressPoint {
  date: string;
  averageWeight: number;
  averageRepetitions: number;
}

interface WorkoutProgressChartProps {
  exerciseName: string;
  points: WorkoutProgressPoint[];
}

const CHART_WIDTH = 480;
const CHART_HEIGHT = 240;
const MARGIN = { top: 24, right: 16, bottom: 40, left: 48 };

const toLocaleDate = (isoDate: string): string => {
  const normalized = isoDate.includes('T') ? isoDate : `${isoDate}T00:00:00`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
};

export default function WorkoutProgressChart({ exerciseName, points }: WorkoutProgressChartProps) {
  const chartData = useMemo(() => {
    if (!Array.isArray(points) || points.length === 0) {
      return {
        labels: [] as string[],
        weightSeries: [] as Array<{ x: number; y: number }>,
        repetitionSeries: [] as Array<{ x: number; y: number }>,
        ticks: [] as Array<{ value: number; y: number }>
      };
    }

    const values = points.flatMap((point) => [point.averageWeight, point.averageRepetitions]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const safeMin = Number.isFinite(minValue) ? minValue : 0;
    const safeMax = Number.isFinite(maxValue) ? maxValue : safeMin + 1;
    const sameValue = safeMax - safeMin < 1e-3;
    const lowerBound = sameValue ? safeMin - 1 : safeMin;
    const upperBound = sameValue ? safeMax + 1 : safeMax;
    const valueRange = Math.max(upperBound - lowerBound, 1);

    const innerWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

    const positionForValue = (value: number): number => {
      const ratio = (value - lowerBound) / valueRange;
      const clamped = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0;
      return MARGIN.top + innerHeight - innerHeight * clamped;
    };

    const xPositions = points.map((_, index) => {
      if (points.length === 1) {
        return MARGIN.left + innerWidth / 2;
      }

      const progress = index / (points.length - 1);
      return MARGIN.left + innerWidth * progress;
    });

    const weightSeries = points.map((point, index) => ({
      x: xPositions[index],
      y: positionForValue(point.averageWeight)
    }));

    const repetitionSeries = points.map((point, index) => ({
      x: xPositions[index],
      y: positionForValue(point.averageRepetitions)
    }));

    const tickCount = 4;
    const ticks = Array.from({ length: tickCount + 1 }).map((_, index) => {
      const ratio = index / tickCount;
      const value = lowerBound + valueRange * (1 - ratio);
      return {
        value,
        y: MARGIN.top + innerHeight * ratio
      };
    });

    return {
      labels: points.map((point) => toLocaleDate(point.date)),
      weightSeries,
      repetitionSeries,
      ticks
    };
  }, [points]);

  if (!chartData.labels.length) {
    return (
      <article className={styles.progressCard}>
        <header className={styles.progressHeader}>
          <h3>{exerciseName}</h3>
          <p className={styles.progressSubtitle}>Sem dados suficientes para exibir o gráfico.</p>
        </header>
      </article>
    );
  }

  return (
    <article className={styles.progressCard}>
      <header className={styles.progressHeader}>
        <h3>{exerciseName}</h3>
        <p className={styles.progressSubtitle}>
          Evolução das cargas e repetições ao longo das sessões registradas.
        </p>
      </header>
      <div className={styles.chartWrapper}>
        <svg
          role="img"
          aria-label={`Evolução do exercício ${exerciseName}`}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          className={styles.chartCanvas}
        >
          <desc>
            Gráfico de linhas mostrando a evolução das cargas e repetições do exercício {exerciseName}.
          </desc>
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={CHART_WIDTH - MARGIN.left - MARGIN.right}
            height={CHART_HEIGHT - MARGIN.top - MARGIN.bottom}
            className={styles.chartArea}
          />
          {chartData.ticks.map((tick) => (
            <g key={tick.y} className={styles.chartTick}>
              <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={tick.y} y2={tick.y} />
              <text x={MARGIN.left - 8} y={tick.y + 4} className={styles.tickLabel}>
                {tick.value.toFixed(1)}
              </text>
            </g>
          ))}
          <polyline points={chartData.weightSeries.map((point) => `${point.x},${point.y}`).join(' ')} className={styles.weightLine} />
          <polyline
            points={chartData.repetitionSeries.map((point) => `${point.x},${point.y}`).join(' ')}
            className={styles.repetitionLine}
          />
          {chartData.weightSeries.map((point, index) => (
            <circle key={`weight-${index}`} cx={point.x} cy={point.y} r={4} className={styles.weightPoint} />
          ))}
          {chartData.repetitionSeries.map((point, index) => (
            <circle key={`rep-${index}`} cx={point.x} cy={point.y} r={4} className={styles.repetitionPoint} />
          ))}
          {chartData.labels.map((label, index) => (
            <text
              key={`label-${label}-${index}`}
              x={chartData.weightSeries[index]?.x ?? 0}
              y={CHART_HEIGHT - MARGIN.bottom + 20}
              className={styles.axisLabel}
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
      <footer className={styles.chartLegend}>
        <span>
          <span className={styles.weightSwatch} aria-hidden="true" /> Carga média (kg)
        </span>
        <span>
          <span className={styles.repetitionSwatch} aria-hidden="true" /> Repetições médias
        </span>
      </footer>
      <table className={styles.summaryTable}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Carga média (kg)</th>
            <th>Repetições médias</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{toLocaleDate(point.date)}</td>
              <td>{point.averageWeight.toFixed(1)}</td>
              <td>{point.averageRepetitions.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
