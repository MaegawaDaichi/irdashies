import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RadarCar, RadarSnapshot } from '@irdashies/types';
import { useRadarBars } from './useRadarBars';

let snapshot: RadarSnapshot;
vi.mock('@irdashies/context', () => ({
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
  it('keeps independent fore/aft positions for each car in four-wide traffic', () => {
    expect(renderHook(() => useRadarBars()).result.current).toEqual([
      { carIdx: 1, side: 'left', percent: -0.5 },
      { carIdx: 2, side: 'left', percent: 0.5 },
      { carIdx: 3, side: 'right', percent: 0.25 },
    ]);
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
