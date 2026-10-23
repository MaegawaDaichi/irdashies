import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CarLeftRight } from '@irdashies/types';
import { BlindSpotMonitorDisplay } from './BlindSpotMonitor';

describe('BlindSpotMonitor multi-car display', () => {
  it('draws each rival separately with the existing bar dimensions and no count text', () => {
    const { container, queryByText } = render(
      <BlindSpotMonitorDisplay
        show
        multiCarBars
        leftState={CarLeftRight.Cars2Left}
        rightState={CarLeftRight.CarRight}
        leftPercent={0}
        rightPercent={0}
        width={20}
        bars={[
          { carIdx: 1, side: 'left', percent: 0.4 },
          { carIdx: 2, side: 'left', percent: -0.4 },
          { carIdx: 3, side: 'right', percent: 0 },
        ]}
      />
    );
    const bars = container.querySelectorAll('.-translate-x-1\\/2');
    expect(bars).toHaveLength(3);
    expect(Array.from(bars, (bar) => (bar as HTMLElement).style.top)).toEqual([
      '-5%',
      '55%',
      '25%',
    ]);
    expect(Array.from(bars, (bar) => (bar as HTMLElement).style.width)).toEqual(
      ['20px', '20px', '20px']
    );
    expect(queryByText('2 left')).toBeNull();
  });
});

describe('BlindSpotMonitor bar mode option', () => {
  const props = {
    show: true,
    leftState: CarLeftRight.Cars2Left,
    rightState: CarLeftRight.CarRight,
    leftPercent: 0.2,
    rightPercent: -0.2,
    bars: [
      { carIdx: 1, side: 'left' as const, percent: 0.4 },
      { carIdx: 2, side: 'left' as const, percent: -0.4 },
      { carIdx: 3, side: 'right' as const, percent: 0 },
    ],
  };
  const barPositions = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll('div[style*="height: 50%"]'),
      (bar) => (bar as HTMLElement).style.top
    );

  it('defaults to one bar per side with the legacy position and two-car label', () => {
    const { container, getByText } = render(
      <BlindSpotMonitorDisplay {...props} />
    );
    expect(barPositions(container)).toEqual(['10%', '40%']);
    expect(getByText('2 left')).toBeTruthy();
  });

  it('switches between per-car bars and the legacy bars without a remount', () => {
    const { container, rerender, queryByText } = render(
      <BlindSpotMonitorDisplay {...props} multiCarBars />
    );
    expect(barPositions(container)).toEqual(['-5%', '55%', '25%']);
    expect(queryByText('2 left')).toBeNull();
    rerender(<BlindSpotMonitorDisplay {...props} multiCarBars={false} />);
    expect(barPositions(container)).toEqual(['10%', '40%']);
    expect(queryByText('2 left')).toBeTruthy();
    rerender(<BlindSpotMonitorDisplay {...props} multiCarBars />);
    expect(barPositions(container)).toHaveLength(3);
    expect(queryByText('2 left')).toBeNull();
  });

  it('shows legacy bars even when Radar has no cars', () => {
    const { container, getByText } = render(
      <BlindSpotMonitorDisplay {...props} multiCarBars={false} bars={[]} />
    );
    expect(barPositions(container)).toHaveLength(2);
    expect(getByText('2 left')).toBeTruthy();
  });

  it('keeps the simple indicators when the multiple-bar option is enabled', () => {
    const { container, getByText } = render(
      <BlindSpotMonitorDisplay {...props} multiCarBars displayMode="simple" />
    );
    expect(barPositions(container)).toHaveLength(0);
    expect(getByText('2')).toBeTruthy();
  });
});
