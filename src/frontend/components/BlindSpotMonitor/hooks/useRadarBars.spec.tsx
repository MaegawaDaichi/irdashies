import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CarLeftRight,
  type BlindSpotSnapshot,
  type RadarCar,
  type RadarSnapshot,
} from '@irdashies/types';
import { useRadarBars } from './useRadarBars';

let snapshot: RadarSnapshot;
let carLeftRight: CarLeftRight;
vi.mock('@irdashies/context', () => ({
  useBlindSpotSelector: (selector: (value: BlindSpotSnapshot) => unknown) =>
    selector({ carLeftRight } as BlindSpotSnapshot),
  useDriverCarIdx: () => 0,
  useRadarSelector: (selector: (value: RadarSnapshot) => unknown) =>
    selector(snapshot),
}));
vi.mock('./useBlindSpotMonitorSettings', () => ({
  useBlindSpotMonitorSettings: () => ({ distAhead: 4, distBehind: 4 }),
}));
const car = (carIdx: number, lane: number, dist: number): RadarCar => ({
  carIdx,
  lane,
  dist,
  closingSpeed: 0,
  laneSource: 'spotter',
  onPitRoad: false,
  offTrack: false,
});
describe('Radar bars', () => {
  beforeEach(() => {
    carLeftRight = CarLeftRight.Cars2Left;
    snapshot = {
      focusCarIdx: 0,
      playerPct: 0.5,
      playerSpeed: 30,
      trackLength: 5000,
      focusOnPitRoad: false,
      focusInPitBox: false,
      isOnTrack: true,
      formation: null,
      follow: null,
      focusBrake: null,
      caution: false,
      cars: [car(1, -2, -2), car(2, -1, 2), car(3, 1, 1)],
      hazards: [],
      version: 1,
    };
  });
  it('shows two independent left bars only with the two-left verdict', () => {
    expect(renderHook(() => useRadarBars()).result.current).toEqual([
      { carIdx: 1, side: 'left', percent: -0.5 },
      { carIdx: 2, side: 'left', percent: 0.5 },
    ]);
  });
  it.each([CarLeftRight.Off, CarLeftRight.Clear])(
    'hides all Radar estimates when the spotter is clear/off (%s)',
    (state) => {
      carLeftRight = state;
      expect(renderHook(() => useRadarBars()).result.current).toEqual([]);
    }
  );
  it.each([
    [CarLeftRight.CarLeft, [2]],
    [CarLeftRight.CarRight, [3]],
    [CarLeftRight.CarLeftRight, [2, 3]],
    [CarLeftRight.Cars2Left, [1, 2]],
    [CarLeftRight.Cars2Right, [3, 4]],
  ])(
    'limits each side to the received spotter verdict (%s)',
    (state, expected) => {
      carLeftRight = state as CarLeftRight;
      snapshot.cars = [...snapshot.cars, car(4, 2, -1), car(5, -2, 3)];
      expect(
        renderHook(() => useRadarBars())
          .result.current.map((bar) => bar.carIdx)
          .sort()
      ).toEqual(expected);
    }
  );
  it('removes the extra bar immediately when two-left becomes one-left, then hides on clear', () => {
    const { result, rerender } = renderHook(() => useRadarBars());
    expect(result.current).toHaveLength(2);
    carLeftRight = CarLeftRight.CarLeft;
    rerender();
    expect(result.current.map((bar) => bar.carIdx)).toEqual([2]);
    carLeftRight = CarLeftRight.Clear;
    rerender();
    expect(result.current).toEqual([]);
  });
  it('removes departing cars without changing the identity of the remaining bars', () => {
    const { result, rerender } = renderHook(() => useRadarBars());
    snapshot = {
      ...snapshot,
      version: 2,
      cars: [car(1, -2, -1), car(2, -1, 6)],
    };
    rerender();
    expect(result.current).toEqual([
      { carIdx: 1, side: 'left', percent: -0.25 },
    ]);
  });
  it('excludes cars in our lane, beyond the window, and across the pit wall', () => {
    snapshot.cars = [
      car(1, 0, 0),
      car(2, 1, -5),
      { ...car(3, -1, 0), onPitRoad: true },
    ];
    expect(renderHook(() => useRadarBars()).result.current).toEqual([]);
  });
  it('hides when Radar is following another car or the player leaves the track', () => {
    snapshot.focusCarIdx = 4;
    expect(renderHook(() => useRadarBars()).result.current).toEqual([]);
    snapshot.focusCarIdx = 0;
    snapshot.isOnTrack = false;
    expect(renderHook(() => useRadarBars()).result.current).toEqual([]);
  });
});
