import { useEffect, useRef, useState } from 'react';

export interface BlindSpotMonitorIndicatorProps {
  side: 'left' | 'right';
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
      </div>
    </div>
  );
};
