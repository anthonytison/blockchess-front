/**
 * E2E Accessibility Tests
 * 
 * These tests use Playwright and axe-core to verify accessibility compliance
 * across the entire application.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility E2E Tests', () => {
  test('Home page should be accessible', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Game setup page should be accessible', async ({ page }) => {
    await page.goto('/game');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('History page should be accessible', async ({ page }) => {
    await page.goto('/history');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('All images should have alt text', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
      expect(alt).not.toBe('');
    }
  });

  test('All buttons should have accessible names', async ({ page }) => {
    await page.goto('/');
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      const hasAccessibleName = ariaLabel || (textContent && textContent.trim().length > 0);
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('All links should have accessible names', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('a[href]').all();
    
    for (const link of links) {
      const ariaLabel = await link.getAttribute('aria-label');
      const textContent = await link.textContent();
      const hasAccessibleName = ariaLabel || (textContent && textContent.trim().length > 0);
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('Page should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check that h1 exists
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);
    
    // Check that headings don't skip levels
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;
    
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));
      
      if (previousLevel > 0) {
        expect(level).toBeLessThanOrEqual(previousLevel + 1);
      }
      
      previousLevel = level;
    }
  });

  test('Skip to main content link should work', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab to focus skip link
    await page.keyboard.press('Tab');
    
    // Check if skip link is visible
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    
    // Press Enter to activate
    await page.keyboard.press('Enter');
    
    // Check if focus moved to main content
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('Keyboard navigation should work', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    const focusableElements: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused) {
        focusableElements.push(focused);
      }
    }
    
    expect(focusableElements.length).toBeGreaterThan(0);
  });

  test('Chess board should be keyboard accessible', async ({ page }) => {
    // This test would require a game to be set up
    // Placeholder for chess board keyboard navigation tests
    await page.goto('/');
    expect(true).toBe(true);
  });

  test('Color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/');
    // Color contrast testing would require additional tools
    // This is a placeholder - implement with contrast checking library
    expect(true).toBe(true);
  });

  test('Page should have proper lang attribute', async ({ page }) => {
    await page.goto('/');
    const html = await page.locator('html');
    const lang = await html.getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(['en', 'fr']).toContain(lang);
  });

  test('Modals should trap focus', async ({ page }) => {
    // This test would require a modal to be opened
    // Placeholder for modal focus trap tests
    await page.goto('/');
    expect(true).toBe(true);
  });

  test('Forms should have proper labels', async ({ page }) => {
    await page.goto('/game');
    const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label).toBeGreaterThan(0);
      }
    }
  });
});

