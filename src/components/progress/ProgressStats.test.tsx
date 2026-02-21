import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressStats } from './ProgressStats';

describe('ProgressStats', () => {
  it('returns null when no current weight', () => {
    const { container } = render(
      <ProgressStats
        weightEntries={[]}
        streakData={null}
        weightUnit="lbs"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays current weight in lbs from manual entry', () => {
    const entries = [
      { entry_date: '2025-06-15', metrics: { weight: 180 } },
    ];
    render(
      <ProgressStats
        weightEntries={entries}
        streakData={null}
        weightUnit="lbs"
      />
    );
    expect(screen.getByText('180')).toBeInTheDocument();
  });

  it('converts HealthKit kg to lbs for display', () => {
    const entries = [
      { entry_date: '2025-06-15', metrics: { weight: 89.5, unit: 'kilogram', source: 'healthkit' } },
    ];
    render(
      <ProgressStats
        weightEntries={entries}
        streakData={null}
        weightUnit="lbs"
      />
    );
    // 89.5 kg ≈ 197.3 lbs, rounded
    expect(screen.getByText('197')).toBeInTheDocument();
  });

  it('honors weightUnit kg for display', () => {
    const entries = [
      { entry_date: '2025-06-15', metrics: { weight: 180 } },
    ];
    render(
      <ProgressStats
        weightEntries={entries}
        streakData={null}
        weightUnit="kg"
      />
    );
    // 180 lbs ≈ 81.6 kg, rounded to 82
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('shows Set goal when no goalWeight', () => {
    const entries = [
      { entry_date: '2025-06-15', metrics: { weight: 180 } },
    ];
    render(
      <ProgressStats
        weightEntries={entries}
        streakData={null}
        weightUnit="lbs"
      />
    );
    expect(screen.getByText('Set goal')).toBeInTheDocument();
  });

  it('displays Change and Weekly when multiple entries', () => {
    const entries = [
      { entry_date: '2025-06-15', metrics: { weight: 180 } },
      { entry_date: '2025-06-01', metrics: { weight: 185 } },
    ];
    render(
      <ProgressStats
        weightEntries={entries}
        streakData={null}
        weightUnit="lbs"
      />
    );
    expect(screen.getByText('-5')).toBeInTheDocument();
    expect(screen.getByText(/wk/)).toBeInTheDocument();
  });

  it('displays To Goal when goalWeight set', () => {
    const entries = [
      { entry_date: '2025-06-15', metrics: { weight: 180 } },
    ];
    render(
      <ProgressStats
        weightEntries={entries}
        streakData={null}
        goalWeight={170}
        weightUnit="lbs"
      />
    );
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('sorts entries by date when entry_date varies', () => {
    const entries = [
      { entry_date: '2025-06-01', metrics: { weight: 185 } },
      { entry_date: '2025-06-15', metrics: { weight: 180 } },
    ];
    render(
      <ProgressStats
        weightEntries={entries}
        streakData={null}
        weightUnit="lbs"
      />
    );
    expect(screen.getByText('180')).toBeInTheDocument();
  });
});
