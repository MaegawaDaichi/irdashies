import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WindDirection } from './WindDirection';

describe('WindDirection', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('colors only the arrow by direction and returns to the speed color when disabled', () => {
    const { container, rerender } = render(
      <WindDirection speedMs={5} direction={0} colorArrowByDirection />
    );
    const [ring, arrow] = container.querySelectorAll('path');
    expect(arrow.style.getPropertyValue('--wind-arrow-color')).toBe(
      'hsl(0 100% 50%)'
    );
    expect(ring.getAttribute('style')).toBeNull();
    expect(screen.getByTestId('wind-direction')).toHaveClass(
      'text-emerald-300'
    );
    expect(screen.getByText('18')).toBeInTheDocument();

    rerender(
      <WindDirection speedMs={5} direction={Math.PI} colorArrowByDirection />
    );
    expect(arrow.style.getPropertyValue('--wind-arrow-color')).toBe(
      'hsl(240 100% 50%)'
    );

    rerender(<WindDirection speedMs={5} direction={Math.PI} />);
    expect(arrow.style.getPropertyValue('--wind-arrow-color')).toBe(
      'currentColor'
    );
  });

  it('uses the speed color when no direction is available', () => {
    const { container } = render(
      <WindDirection speedMs={5} colorArrowByDirection />
    );
    expect(
      container
        .querySelectorAll('path')[1]
        .style.getPropertyValue('--wind-arrow-color')
    ).toBe('currentColor');
  });
});
