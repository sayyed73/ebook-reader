import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createServices } from '@/app/services';
import { ServicesProvider } from '@/app/services-context';
import { createTestPlatform } from './fakes';

/** Renders UI with real services over in-memory platform fakes. */
export function renderWithServices(
  ui: ReactElement,
  setup: (platform: ReturnType<typeof createTestPlatform>) => void = () => undefined,
) {
  const platform = createTestPlatform();
  setup(platform);
  const services = createServices(platform);
  const result = render(<ServicesProvider services={services}>{ui}</ServicesProvider>);
  return { ...result, platform, services };
}
