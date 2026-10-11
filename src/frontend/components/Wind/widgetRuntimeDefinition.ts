import type { WidgetRuntimeDefinition } from '../../widgetRuntime';

export default {
  id: 'wind',
  sessionData: true,
  channels: ['session-bar.snapshot', 'track-state.snapshot'],
  ratePreset: 'informational',
  // Car-relative wind direction must follow heading changes at the source rate.
  channelRates: { 'session-bar.snapshot': 5 },
} satisfies WidgetRuntimeDefinition;
