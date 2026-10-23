import { useRadarBars, type RadarBar } from './hooks/useRadarBars';
import { useBlindSpotMonitor } from './hooks/useBlindSpotMonitor';
import { useBlindSpotMonitorSettings } from './hooks/useBlindSpotMonitorSettings';
import { BlindSpotMonitorIndicator } from './components/BlindSpotMonitorIndicator';
import { BlindSpotMonitorSimpleIndicator } from './components/BlindSpotMonitorSimpleIndicator';
import { useDashboard, useSessionVisibility } from '@irdashies/context';
import { CarLeftRight } from '@irdashies/types';

export interface BlindSpotMonitorDisplayProps {
  bars?: readonly RadarBar[];
  multiCarBars?: boolean;
  show: boolean;
  leftState: CarLeftRight;
  rightState: CarLeftRight;
  leftPercent: number;
  rightPercent: number;
  disableTransition?: boolean;
  bgOpacity?: number;
  width?: number;
  indicatorLength?: number;
  borderSize?: number;
  indicatorColor?: number;
  displayMode?: 'standard' | 'simple';
  simpleSize?: number;
  simpleVerticalPosition?: number;
  simpleShowCount?: boolean;
  thresholdColorsEnabled?: boolean;
  thresholdColor1?: number;
  thresholdColor2?: number;
}

const DEFAULT_INDICATOR_COLOR = 16096779;
const DEFAULT_THRESHOLD_COLOR_1 = 16096779;
const DEFAULT_THRESHOLD_COLOR_2 = 15680580;

const carCountFromState = (state: CarLeftRight): 1 | 2 =>
  state === CarLeftRight.Cars2Left || state === CarLeftRight.Cars2Right ? 2 : 1;

export const BlindSpotMonitorDisplay = ({
  bars,
  multiCarBars = false,
  show,
  leftState,
  rightState,
  leftPercent,
  rightPercent,
  disableTransition = false,
  bgOpacity,
  width,
  indicatorLength,
  borderSize,
  indicatorColor,
  displayMode = 'standard',
  simpleSize = 44,
  simpleVerticalPosition = 50,
  simpleShowCount = true,
  thresholdColorsEnabled = false,
  thresholdColor1 = DEFAULT_THRESHOLD_COLOR_1,
  thresholdColor2 = DEFAULT_THRESHOLD_COLOR_2,
}: BlindSpotMonitorDisplayProps) => {
  const showLeft =
    show &&
    (leftState === CarLeftRight.CarLeft ||
      leftState === CarLeftRight.Cars2Left);
  const showRight =
    show &&
    (rightState === CarLeftRight.CarRight ||
      rightState === CarLeftRight.Cars2Right);

  if (displayMode === 'simple') {
    return (
      <div className="w-full h-full relative">
        <BlindSpotMonitorSimpleIndicator
          side="left"
          visible={showLeft}
          carCount={carCountFromState(leftState)}
          size={simpleSize}
          verticalPosition={simpleVerticalPosition}
          showCount={simpleShowCount}
          indicatorColor={indicatorColor ?? DEFAULT_INDICATOR_COLOR}
          thresholdColorsEnabled={thresholdColorsEnabled}
          thresholdColor1={thresholdColor1}
          thresholdColor2={thresholdColor2}
        />
        <BlindSpotMonitorSimpleIndicator
          side="right"
          visible={showRight}
          carCount={carCountFromState(rightState)}
          size={simpleSize}
          verticalPosition={simpleVerticalPosition}
          showCount={simpleShowCount}
          indicatorColor={indicatorColor ?? DEFAULT_INDICATOR_COLOR}
          thresholdColorsEnabled={thresholdColorsEnabled}
          thresholdColor1={thresholdColor1}
          thresholdColor2={thresholdColor2}
        />
      </div>
    );
  }

  const activeBars: readonly RadarBar[] = multiCarBars
    ? (bars ?? [])
    : [
        ...(showLeft
          ? [{ carIdx: -1, side: 'left' as const, percent: leftPercent }]
          : []),
        ...(showRight
          ? [{ carIdx: -2, side: 'right' as const, percent: rightPercent }]
          : []),
      ];
  return (
    <div className="w-full h-full relative">
      {(['left', 'right'] as const).map((side) =>
        activeBars
          .filter((bar) => bar.side === side)
          .map((bar, index) => (
            <BlindSpotMonitorIndicator
              key={bar.carIdx}
              side={side}
              state={
                multiCarBars
                  ? undefined
                  : side === 'left'
                    ? leftState
                    : rightState
              }
              offset={index * ((width ?? 20) + 4)}
              bgOpacity={bgOpacity}
              percent={bar.percent}
              width={width}
              indicatorLength={indicatorLength}
              borderSize={borderSize}
              indicatorColor={indicatorColor}
              visible={show}
              disableTransition={disableTransition}
            />
          ))
      )}
    </div>
  );
};

const DEMO_STATE_SIMPLE = {
  show: true,
  leftState: CarLeftRight.CarLeft,
  rightState: CarLeftRight.Cars2Right,
  leftPercent: 0,
  rightPercent: 0,
  disableTransition: true,
};

export const BlindSpotMonitor = () => {
  const state = useBlindSpotMonitor();
  const radarBars = useRadarBars();
  const settings = useBlindSpotMonitorSettings();
  const { isDemoMode } = useDashboard();

  const sessionVisible = useSessionVisibility(settings?.sessionVisibility);
  const activeState = isDemoMode ? DEMO_STATE_SIMPLE : state;
  const multiCarBars = settings?.multiCarBars === true;
  const useMultipleBars = multiCarBars && settings?.displayMode !== 'simple';

  if (!isDemoMode && !sessionVisible) return <></>;
  if (!isDemoMode && settings?.showOnlyWhenOnTrack && !state.isOnTrack)
    return <></>;

  return (
    <BlindSpotMonitorDisplay
      multiCarBars={multiCarBars}
      bars={
        isDemoMode
          ? [
              { carIdx: 1, side: 'left', percent: 0 },
              { carIdx: 2, side: 'right', percent: 0.35 },
              { carIdx: 3, side: 'right', percent: -0.3 },
            ]
          : radarBars
      }
      show={
        useMultipleBars ? isDemoMode || radarBars.length > 0 : activeState.show
      }
      leftState={activeState.leftState}
      rightState={activeState.rightState}
      leftPercent={activeState.leftPercent}
      rightPercent={activeState.rightPercent}
      disableTransition={
        isDemoMode || (!useMultipleBars && activeState.disableTransition)
      }
      bgOpacity={settings?.background?.opacity}
      width={settings?.width}
      indicatorLength={settings?.indicatorLength}
      borderSize={settings?.borderSize}
      indicatorColor={settings?.indicatorColor}
      displayMode={settings?.displayMode}
      simpleSize={settings?.simpleSize}
      simpleVerticalPosition={settings?.simpleVerticalPosition}
      simpleShowCount={settings?.simpleShowCount}
      thresholdColorsEnabled={settings?.thresholdColorsEnabled}
      thresholdColor1={settings?.thresholdColor1}
      thresholdColor2={settings?.thresholdColor2}
    />
  );
};
