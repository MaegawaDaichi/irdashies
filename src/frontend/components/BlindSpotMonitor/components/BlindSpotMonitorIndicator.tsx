import { CarLeftRight } from '@irdashies/types';
import { useEffect, useRef, useState } from 'react';

export interface BlindSpotMonitorIndicatorProps {
  side: 'left' | 'right';
  state?: CarLeftRight;
  bgOpacity?: number;
  percent: number;
  offset?: number;
  width?: number;
  indicatorLength?: number;
  borderSize?: number;
  indicatorColor?: number;
  visible: boolean;
  disableTransition: boolean;
}

export const BlindSpotMonitorIndicator = ({
  side,
  state,
  bgOpacity,
  percent,
  offset = 0,
  width,
  indicatorLength = 50,
  borderSize,
  indicatorColor,
  visible,
  disableTransition,
}: BlindSpotMonitorIndicatorProps) => {
  const isTwoCars =
    state === CarLeftRight.Cars2Left || state === CarLeftRight.Cars2Right;
  const twoCarsText = side === 'left' ? '2 left' : '2 right';
  const length =
    Number.isFinite(indicatorLength) &&
    indicatorLength >= 10 &&
    indicatorLength <= 100
      ? indicatorLength
      : 50;
  const movementRange = (100 + length) / 2;
  const topPosition = `${(100 - length) / 2 - percent * movementRange}%`;
  const widthPx = `${width ?? 20}px`;
  const indicatorColorHex = `#${(indicatorColor ?? 16096779).toString(16).padStart(6, '0')}`;
  const transitionTimeoutRef = useRef<number | null>(null);
  const [enableTransition, setEnableTransition] = useState(false);

  useEffect(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (visible && !disableTransition && !enableTransition) {
      setEnableTransition(false);
      transitionTimeoutRef.current = window.setTimeout(() => {
        setEnableTransition(true);
      }, 33);
    } else if (disableTransition || !visible) {
      setEnableTransition(false);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [visible, disableTransition, enableTransition]);

  return (
    <div
      className={`absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ display: visible ? 'block' : 'none', [side]: offset }}
    >
      <div
        className={`absolute inset-y-0 rounded-full ${side === 'left' ? 'left-0' : 'right-0'} overflow-hidden`}
        style={{
          backgroundColor:
            bgOpacity !== undefined && bgOpacity > 0
              ? `rgba(0, 0, 0, ${bgOpacity / 100})`
              : 'transparent',
          borderStyle: 'solid',
          borderWidth: `${borderSize ?? 1}px`,
          borderColor:
            bgOpacity !== undefined && bgOpacity > 0
              ? `rgba(0, 0, 0, ${bgOpacity / 100})`
              : 'transparent',
          width: widthPx,
        }}
      >
        <div
          className={`absolute rounded-full left-1/2 -translate-x-1/2 flex items-center justify-center`}
          style={{
            top: topPosition,
            height: `${length}%`,
            width: widthPx,
            backgroundColor: indicatorColorHex,
            transition: enableTransition ? 'top 0.04s linear' : 'none',
          }}
        ></div>

        {isTwoCars && (
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
              side === 'left' ? 'rotate-180' : ''
            } bg-black/70 px-2 py-0.5 rounded-full text-amber-500 text-xs font-semibold whitespace-nowrap animate-blink text-shadow-md`}
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
          >
            {twoCarsText}
          </div>
        )}
      </div>
    </div>
  );
};
