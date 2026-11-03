import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingPage } from './LandingPage';
import { CHROME_WEB_STORE_URL } from '../shared/launch';

describe('LandingPage', () => {
  it('renders the primary headline and supporting copy', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /اشرحها مرة/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/حوّل خطوات العمل على المواقع/)).toBeInTheDocument();
  });

  it('links every download CTA to the Chrome Web Store listing', () => {
    render(<LandingPage />);

    const downloadLinks = screen.getAllByRole('link', { name: /حمّل دليل مجانًا/ });
    expect(downloadLinks.length).toBeGreaterThan(0);
    for (const link of downloadLinks) {
      expect(link).toHaveAttribute('href', CHROME_WEB_STORE_URL);
    }
  });

  it('routes the secondary hero CTA to the interactive demo', () => {
    render(<LandingPage />);

    const secondaryLinks = screen.getAllByRole('link', { name: /شوف دليل بيشتغل إزاي/ });
    for (const link of secondaryLinks) {
      expect(link).toHaveAttribute('href', '#demo');
    }
  });

  it('toggles the FAQ accordion', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    const faqButton = screen.getByRole('button', { name: /هل دليل مجاني/ });
    expect(faqButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(faqButton);
    expect(faqButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('switches the interactive demo step', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    const stepButton = screen
      .getAllByRole('button', { name: /أنشئ عميلًا جديدًا/ })
      .find((button) => button.getAttribute('aria-pressed') === 'false');
    expect(stepButton).toBeDefined();

    if (stepButton) {
      await user.click(stepButton);
      expect(stepButton).toHaveAttribute('aria-pressed', 'true');
    }
  });
});
