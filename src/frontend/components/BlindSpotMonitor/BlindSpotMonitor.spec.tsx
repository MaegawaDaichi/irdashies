import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CarLeftRight } from '@irdashies/types';
import { BlindSpotMonitorDisplay } from './BlindSpotMonitor';

describe('BlindSpotMonitor multi-car display', () => {
  it('draws each rival separately with the existing bar dimensions and no count text', () => {
    const { container, queryByText } = render(
      <BlindSpotMonitorDisplay
        show
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
