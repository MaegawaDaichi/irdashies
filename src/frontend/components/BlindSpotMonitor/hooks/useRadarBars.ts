import { useMemo } from 'react';
import { useDriverCarIdx, useRadarSelector } from '@irdashies/context';
import type { RadarSnapshot } from '@irdashies/types';
import { useBlindSpotMonitorSettings } from './useBlindSpotMonitorSettings';

export interface RadarBar {
  carIdx: number;
  side: 'left' | 'right';
  percent: number;
}

const selectSnapshot = (snapshot: RadarSnapshot) => snapshot;

/** Use the same per-car distance and lane estimates as Radar. */
export const useRadarBars = (): readonly RadarBar[] => {
  const snapshot = useRadarSelector(selectSnapshot, {
    equality: (a, b) => a.version === b.version,
  });
  const driverCarIdx = useDriverCarIdx();
  const settings = useBlindSpotMonitorSettings();
  const ahead = settings?.distAhead ?? 4;
  const behind = settings?.distBehind ?? 4;

  return useMemo(() => {
    if (!snapshot?.isOnTrack || snapshot.focusCarIdx !== driverCarIdx)
      return [];
    // Outer cars first: the display stacks inward from each screen edge.
    return snapshot.cars
      .filter(
        (car) =>
          car.onPitRoad === snapshot.focusOnPitRoad &&
          Math.abs(car.lane) >= 0.5 &&
          car.dist <= ahead &&
          car.dist >= -behind
      )
      .sort(
        (a, b) => Math.abs(b.lane) - Math.abs(a.lane) || a.carIdx - b.carIdx
      )
      .map((car) => ({
        carIdx: car.carIdx,
        side: car.lane < 0 ? 'left' : 'right',
        percent: Math.max(
          -1,
          Math.min(1, car.dist / Math.max(0.01, car.dist > 0 ? ahead : behind))
        ),
      }));
  }, [snapshot, driverCarIdx, ahead, behind]);
};
