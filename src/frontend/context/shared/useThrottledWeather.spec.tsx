import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChannelBridge, SessionBarSnapshot } from '@irdashies/types';
import { WidgetRuntimeProvider } from '../../widgetRuntime';
import { useThrottledWeather } from './useThrottledWeather';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('weather subscription cadence', () => {
  it.each(['wind', 'weather'])(
    '%s requests 5 Hz and follows heading changes within one second',
    (widgetType) => {
      let now = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      let publish: ((snapshot: SessionBarSnapshot) => void) | undefined;
      const subscribe = vi.fn(
        (
          _channel: string,
          callback: (snapshot: SessionBarSnapshot) => void
        ) => {
          publish = callback;
          return vi.fn();
        }
      );
      vi.stubGlobal('channelBridge', { subscribe } as unknown as ChannelBridge);

      let renders = 0;
      const { result } = renderHook(
        () => {
          renders += 1;
          return useThrottledWeather();
        },
        {
          wrapper: ({ children }) => (
            <WidgetRuntimeProvider widgetType={widgetType}>
              {children}
            </WidgetRuntimeProvider>
          ),
        }
      );

      expect(subscribe).toHaveBeenCalledWith(
        'session-bar.snapshot',
        expect.any(Function),
        5
      );

      for (let tick = 0; tick < 5; tick += 1) {
        now = tick * 200;
        act(() =>
          publish?.({
            windDirection: Math.PI,
            windYaw: tick * 0.2,
            windVelocity: 8,
            version: tick,
          } as SessionBarSnapshot)
        );
        expect(result.current.windYaw).toBe(tick * 0.2);
      }

      const rendersAfterHeadingChanges = renders;
      now = 1000;
      act(() =>
        publish?.({
          windDirection: Math.PI,
          windYaw: 0.8,
          windVelocity: 8,
          incidents: 2,
          version: 5,
        } as SessionBarSnapshot)
      );
      expect(renders).toBe(rendersAfterHeadingChanges);
    }
  );
});
