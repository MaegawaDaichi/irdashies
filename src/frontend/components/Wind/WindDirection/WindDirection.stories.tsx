import type { Meta, StoryObj } from '@storybook/react-vite';
import { WindDirection } from './WindDirection';

const meta = {
  component: WindDirection,
  title: 'widgets/Wind/components/WindDirection',
  decorators: [
    (Story) => (
      <div className="h-44 w-44 bg-slate-800 p-2">
        <Story />
      </div>
    ),
  ],
  args: {
    speedMs: 5,
    direction: 0,
    colorArrowByDirection: true,
  },
  argTypes: {
    direction: {
      control: { type: 'range', min: -Math.PI, max: Math.PI, step: 0.01 },
    },
  },
} satisfies Meta<typeof WindDirection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Headwind: Story = {};
export const FrontQuarter: Story = { args: { direction: Math.PI / 4 } };
export const Crosswind: Story = { args: { direction: Math.PI / 2 } };
export const RearQuarter: Story = { args: { direction: (3 * Math.PI) / 4 } };
export const Tailwind: Story = { args: { direction: Math.PI } };
export const Disabled: Story = { args: { colorArrowByDirection: false } };
