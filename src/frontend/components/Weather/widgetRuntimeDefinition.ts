import type { WidgetRuntimeDefinition } from '../../widgetRuntime';

export default {
  id: 'weather',
  sessionData: true,
  channels: ['session-bar.snapshot', 'track-state.snapshot'],
  ratePreset: 'informational',
  // The wind arrow needs faster updates than the other weather indicators.
  channelRates: { 'session-bar.snapshot': 5 },
} satisfies WidgetRuntimeDefinition;
