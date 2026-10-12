import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PitStatusCell } from './PitStatusCell';

const renderInTable = (component: React.ReactElement) => {
  return render(
    <table>
      <tbody>
        <tr>{component}</tr>
      </tbody>
    </table>
  );
};

describe('PitStatusCell', () => {
  it('renders empty cell with default width when no props are provided', () => {
    const { container } = renderInTable(<PitStatusCell />);

    const td = container.querySelector('td[data-column="pitStatus"]');
    expect(td).toBeTruthy();
    expect(td?.className).toContain('w-[4.5rem]');
    expect(td?.textContent).toBe('');
  });

  it('renders empty cell when hidden', () => {
    const { container } = renderInTable(<PitStatusCell />);

    const td = container.querySelector('td[data-column="pitStatus"]');
    expect(td).toBeTruthy();
    expect(td?.textContent).toBe('');
  });

  it('uses a wider width when showPitTime is enabled', () => {
    const { container } = renderInTable(<PitStatusCell showPitTime={true} />);

    const td = container.querySelector('td[data-column="pitStatus"]');
    expect(td?.className).toContain('w-[7rem]');
  });

  it('changes PIT styling on box entry and restores it on box exit', () => {
    const props = {
      onPitRoad: true,
      currentSessionType: 'Race',
      lastLap: 10,
    };
    const cell = (surface: number, previousSurface: number) => (
      <table>
        <tbody>
          <tr>
            <PitStatusCell
              {...props}
              carTrackSurface={surface}
              prevCarTrackSurface={previousSurface}
            />
          </tr>
        </tbody>
      </table>
    );
    const { getByText, rerender } = render(cell(2, 3));
    expect(getByText('PIT').className).toContain('border-yellow-500');
    expect(getByText('PIT').className).toContain('animate-pulse');

    rerender(cell(1, 2));
    expect(getByText('PIT').className).toContain('border-red-500');
    expect(getByText('PIT').className).not.toContain('animate-pulse');

    rerender(cell(2, 1));
    expect(getByText('PIT').className).toContain('border-yellow-500');
    expect(getByText('PIT').className).toContain('animate-pulse');
  });

  it('keeps TOW when the car arrives in its stall by towing', () => {
    const { getByText, queryByText } = renderInTable(
      <PitStatusCell
        onPitRoad
        currentSessionType="Race"
        lastLap={10}
        carTrackSurface={1}
        prevCarTrackSurface={3}
      />
    );
    expect(getByText('TOW').className).toContain('animate-pulse');
    expect(queryByText('PIT')).toBeNull();
  });

  it('stops pulsing inside the box while respecting minimal badge styling', () => {
    const { getByText } = renderInTable(
      <PitStatusCell
        onPitRoad
        currentSessionType="Race"
        lastLap={10}
        carTrackSurface={1}
        prevCarTrackSurface={2}
        isMinimal
      />
    );
    expect(getByText('PIT').className).toContain('border-transparent');
    expect(getByText('PIT').className).not.toContain('animate-pulse');
  });

  it('shows OUT status when conditions are met', () => {
    const { container } = renderInTable(
      <PitStatusCell
        onPitRoad={false}
        lastPitLap={3}
        lastLap={3}
        carTrackSurface={1}
      />
    );

    expect(container.textContent).toContain('OUT');
  });

  it('does not show OUT when car is off track', () => {
    const { container } = renderInTable(
      <PitStatusCell
        onPitRoad={false}
        lastPitLap={3}
        lastLap={3}
        carTrackSurface={-1}
      />
    );

    expect(container.textContent).not.toContain('OUT');
  });

  it.each([
    ['lastPitLap', 'L 11'],
    ['pitEntryLap', 'L 10'],
    ['lapsSinceLastPit', 'L 3'],
  ])('uses %s for the lap badge', (mode, expected) => {
    const { container } = renderInTable(
      <PitStatusCell
        onPitRoad={false}
        carTrackSurface={3}
        lap={13}
        lastLap={13}
        lastPitLap={11}
        pitEntryLap={10}
        pitLapDisplayMode={mode}
      />
    );
    expect(container.textContent?.trim()).toBe(expected);
  });

  it('keeps OUT based on the exit lap when entry lap display is selected', () => {
    const { container } = renderInTable(
      <PitStatusCell
        onPitRoad={false}
        carTrackSurface={3}
        lastLap={11}
        lastPitLap={11}
        pitEntryLap={10}
        pitLapDisplayMode="pitEntryLap"
      />
    );
    expect(container.textContent?.trim()).toBe('OUT');
  });

  it('does not substitute the exit lap when the entry lap is unknown', () => {
    const { container } = renderInTable(
      <PitStatusCell
        onPitRoad={false}
        carTrackSurface={3}
        lastLap={13}
        lastPitLap={11}
        pitLapDisplayMode="pitEntryLap"
      />
    );
    expect(container.textContent?.trim()).toBe('');
  });

  describe('pitExitAfterSF — pit exit close to start/finish line', () => {
    it('keeps OUT visible after crossing S/F when pitExitAfterSF is true', () => {
      // Driver pitted on lap 5, has now crossed S/F (lastLap=6) but pit exit
      // was in the last 15% of the lap so OUT should still show
      const { container } = renderInTable(
        <PitStatusCell
          onPitRoad={false}
          lastPitLap={5}
          lastLap={6}
          carTrackSurface={1}
          pitExitAfterSF={true}
        />
      );

      expect(container.textContent).toContain('OUT');
    });

    it('does not keep OUT after two S/F crossings when pitExitAfterSF is true', () => {
      // Driver pitted on lap 5, has now crossed S/F twice (lastLap=7) — OUT
      // should be gone even with pitExitAfterSF
      const { container } = renderInTable(
        <PitStatusCell
          onPitRoad={false}
          lastPitLap={5}
          lastLap={7}
          carTrackSurface={1}
          pitExitAfterSF={true}
        />
      );

      expect(container.textContent).not.toContain('OUT');
    });

    it('does not extend OUT when pitExitAfterSF is false', () => {
      // Normal track: once S/F is crossed, OUT disappears
      const { container } = renderInTable(
        <PitStatusCell
          onPitRoad={false}
          lastPitLap={5}
          lastLap={6}
          carTrackSurface={1}
          pitExitAfterSF={false}
        />
      );

      expect(container.textContent).not.toContain('OUT');
    });
  });
});
