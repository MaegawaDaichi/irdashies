import { useMemo } from 'react';
import {
  useBlindSpotSelector,
  useDriverCarIdx,
  useRadarSelector,
} from '@irdashies/context';
import {
  CarLeftRight,
  type BlindSpotSnapshot,
  type RadarSnapshot,
} from '@irdashies/types';
import { useBlindSpotMonitorSettings } from './useBlindSpotMonitorSettings';

export interface RadarBar {
  carIdx: number;
  side: 'left' | 'right';
  percent: number;
}

const selectCarLeftRight = (snapshot: BlindSpotSnapshot) =>
  snapshot.carLeftRight;

const selectSnapshot = (snapshot: RadarSnapshot) => snapshot;

/** Use the same per-car distance and lane estimates as Radar. */
export const useRadarBars = (): readonly RadarBar[] => {
  const snapshot = useRadarSelector(selectSnapshot, {
    equality: (a, b) => a.version === b.version,
  });
  const carLeftRight =
    useBlindSpotSelector(selectCarLeftRight) ?? CarLeftRight.Off;
  const driverCarIdx = useDriverCarIdx();
  const settings = useBlindSpotMonitorSettings();
  const ahead = settings?.distAhead ?? 4;
  const behind = settings?.distBehind ?? 4;

  return useMemo(() => {
    if (!snapshot?.isOnTrack || snapshot.focusCarIdx !== driverCarIdx)
      return [];
    const leftCount =
      carLeftRight === CarLeftRight.Cars2Left
        ? 2
        : carLeftRight === CarLeftRight.CarLeft ||
            carLeftRight === CarLeftRight.CarLeftRight
          ? 1
          : 0;
    const rightCount =
      carLeftRight === CarLeftRight.Cars2Right
        ? 2
        : carLeftRight === CarLeftRight.CarRight ||
            carLeftRight === CarLeftRight.CarLeftRight
          ? 1
          : 0;
    if (leftCount === 0 && rightCount === 0) return [];
    // The spotter authorizes each side and its count. Radar only supplies
    // identities and positions; remembered/guessed lanes cannot add bars.
    const candidates = snapshot.cars
      .filter(
        (car) =>
          car.onPitRoad === snapshot.focusOnPitRoad &&
          Math.abs(car.lane) >= 0.5 &&
          car.dist <= ahead &&
          car.dist >= -behind
      )
      .sort(
        (a, b) =>
          Math.abs(a.lane) - Math.abs(b.lane) ||
          Math.abs(a.dist) - Math.abs(b.dist) ||
          a.carIdx - b.carIdx
      );
    const selected = [
      ...candidates.filter((car) => car.lane < 0).slice(0, leftCount),
      ...candidates.filter((car) => car.lane > 0).slice(0, rightCount),
    ];
    // Outer cars first: the display stacks inward from each screen edge.
    return selected
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
  }, [snapshot, carLeftRight, driverCarIdx, ahead, behind]);
};
