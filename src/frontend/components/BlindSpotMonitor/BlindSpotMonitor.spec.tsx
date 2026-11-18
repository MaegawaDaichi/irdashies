import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CarLeftRight } from '@irdashies/types';
import { BlindSpotMonitorDisplay } from './BlindSpotMonitor';

describe('BlindSpotMonitor multi-car display', () => {
  it.each([10, 50, 100])(
    'keeps the travel range at %i%% bar length',
    (length) => {
      const props = {
        show: true,
        multiCarBars: true,
        indicatorLength: length,
        leftState: CarLeftRight.CarLeft,
        rightState: CarLeftRight.Clear,
        leftPercent: 0,
        rightPercent: 0,
      };
      const renderAt = (percent: number) => (
        <BlindSpotMonitorDisplay
          {...props}
          bars={[{ carIdx: 1, side: 'left', percent }]}
        />
      );
      const { container, rerender } = render(renderAt(0));
      const bar = container.querySelector<HTMLElement>(
        'div[style*="translateY"]'
      );
      if (!bar) throw new Error('Expected a visible blind spot bar');
      expect(bar.style.height).toBe(`${length}%`);
      const topInContainer = () => {
        const translation = bar.style.transform.match(/translateY\(([^%]+)%\)/);
        return (Number(translation?.[1]) * length) / 100;
      };
      expect(topInContainer()).toBeCloseTo((100 - length) / 2);
      rerender(renderAt(1));
      expect(topInContainer()).toBeCloseTo(-length);
      rerender(renderAt(-1));
      expect(topInContainer()).toBeCloseTo(100);
    }
  );

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
    expect(
      Array.from(bars, (bar) => (bar as HTMLElement).style.transform)
    ).toEqual(['translateY(-10%)', 'translateY(110%)', 'translateY(50%)']);
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
      (bar) => (bar as HTMLElement).style.transform
    );

  it('defaults to one bar per side with the legacy position and two-car label', () => {
    const { container, getByText } = render(
      <BlindSpotMonitorDisplay {...props} />
    );
    expect(barPositions(container)).toEqual([
      'translateY(20%)',
      'translateY(80%)',
    ]);
    expect(getByText('2 left')).toBeTruthy();
  });

  it('switches between per-car bars and the legacy bars without a remount', () => {
    const { container, rerender, queryByText } = render(
      <BlindSpotMonitorDisplay {...props} multiCarBars />
    );
    expect(barPositions(container)).toEqual([
      'translateY(-10%)',
      'translateY(110%)',
      'translateY(50%)',
    ]);
    expect(queryByText('2 left')).toBeNull();
    rerender(<BlindSpotMonitorDisplay {...props} multiCarBars={false} />);
    expect(barPositions(container)).toEqual([
      'translateY(20%)',
      'translateY(80%)',
    ]);
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
  const colours = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll('div[style*="height: 50%"]'),
      (bar) => (bar as HTMLElement).style.backgroundColor
    );

  it('colours only the outer bar on each side with the second colour', () => {
    const { container, rerender } = render(
      <BlindSpotMonitorDisplay
        {...props}
        multiCarBars
        indicatorColor={0x00ff00}
        secondIndicatorColor={0xff0000}
        bars={[...props.bars, { carIdx: 4, side: 'right', percent: 0.3 }]}
      />
    );
    expect(colours(container)).toEqual([
      'rgb(255, 0, 0)',
      'rgb(0, 255, 0)',
      'rgb(255, 0, 0)',
      'rgb(0, 255, 0)',
    ]);
    rerender(
      <BlindSpotMonitorDisplay
        {...props}
        multiCarBars
        indicatorColor={0x00ff00}
        secondIndicatorColor={0xff0000}
        bars={[props.bars[0]]}
      />
    );
    expect(colours(container)).toEqual(['rgb(0, 255, 0)']);
    rerender(
      <BlindSpotMonitorDisplay
        {...props}
        indicatorColor={0x00ff00}
        secondIndicatorColor={0xff0000}
      />
    );
    expect(colours(container)).toEqual(['rgb(0, 255, 0)', 'rgb(0, 255, 0)']);
  });

  it.each([undefined, null])(
    'follows the primary colour when the second colour is %s',
    (secondIndicatorColor) => {
      const { container, rerender } = render(
        <BlindSpotMonitorDisplay
          {...props}
          multiCarBars
          indicatorColor={0x00ff00}
          secondIndicatorColor={secondIndicatorColor}
        />
      );
      expect(colours(container)).toEqual(Array(3).fill('rgb(0, 255, 0)'));
      rerender(
        <BlindSpotMonitorDisplay
          {...props}
          multiCarBars
          indicatorColor={0x0000ff}
          secondIndicatorColor={secondIndicatorColor}
        />
      );
      expect(colours(container)).toEqual(Array(3).fill('rgb(0, 0, 255)'));
    }
  );
});
