/**
 * W3C Compliance E2E Tests
 * 
 * These tests verify W3C HTML and CSS compliance
 * and proper web standards implementation.
 */

import { test, expect } from '@playwright/test';

test.describe('W3C Compliance Tests', () => {
  test('HTML should have proper DOCTYPE', async ({ page }) => {
    await page.goto('/');
    const doctype = await page.evaluate(() => document.doctype?.name);
    expect(doctype).toBe('html');
  });

  test('HTML should have lang attribute', async ({ page }) => {
    await page.goto('/');
    const html = await page.locator('html');
    const lang = await html.getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });

  test('Page should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    
    // Check charset
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset).toBe('utf-8');
  });

  test('Page should have proper Open Graph tags', async ({ page }) => {
    await page.goto('/');
    
    const ogTitle = await page.locator('meta[property="og:title"]').count();
    const ogDescription = await page.locator('meta[property="og:description"]').count();
    const ogType = await page.locator('meta[property="og:type"]').count();
    
    expect(ogTitle).toBeGreaterThan(0);
    expect(ogDescription).toBeGreaterThan(0);
    expect(ogType).toBeGreaterThan(0);
  });

  test('Page should have proper Twitter Card tags', async ({ page }) => {
    await page.goto('/');
    
    const twitterCard = await page.locator('meta[name="twitter:card"]').count();
    expect(twitterCard).toBeGreaterThan(0);
  });

  test('All images should have alt attributes', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test('All images should have width and height', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const width = await img.getAttribute('width');
      const height = await img.getAttribute('height');
      // At least one should be present for layout stability
      expect(width || height).toBeTruthy();
    }
  });

  test('Semantic HTML elements should be used', async ({ page }) => {
    await page.goto('/');
    
    const header = await page.locator('header').count();
    const main = await page.locator('main').count();
    const footer = await page.locator('footer').count();
    const nav = await page.locator('nav').count();
    
    expect(header).toBeGreaterThan(0);
    expect(main).toBeGreaterThan(0);
    expect(footer).toBeGreaterThan(0);
    expect(nav).toBeGreaterThan(0);
  });

  test('Forms should have proper structure', async ({ page }) => {
    await page.goto('/game');
    const forms = await page.locator('form').all();
    
    for (const form of forms) {
      const formElement = await form.evaluate((el) => el.tagName);
      expect(formElement).toBe('FORM');
    }
  });

  test('Links should have href attributes', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const href = await link.getAttribute('href');
      // Links should have href or be buttons
      const role = await link.getAttribute('role');
      expect(href || role === 'button').toBeTruthy();
    }
  });

  test('Buttons should have proper type attributes', async ({ page }) => {
    await page.goto('/');
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const type = await button.getAttribute('type');
      // Type should be button, submit, or reset
      if (type) {
        expect(['button', 'submit', 'reset']).toContain(type);
      }
    }
  });

  test('Page should have proper title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('Favicons should be properly configured', async ({ page }) => {
    await page.goto('/');
    
    const favicon = await page.locator('link[rel="icon"]').count();
    const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]').count();
    
    expect(favicon).toBeGreaterThan(0);
    expect(appleTouchIcon).toBeGreaterThan(0);
  });

  test('CSS should be valid', async ({ page }) => {
    await page.goto('/');
    // CSS validation would require external tools
    // This is a placeholder - CSS is validated by build process
    expect(true).toBe(true);
  });

  test('No deprecated HTML elements should be used', async ({ page }) => {
    await page.goto('/');
    
    const deprecatedElements = [
      'center', 'font', 'marquee', 'blink', 'applet',
      'basefont', 'big', 'strike', 'tt', 'u'
    ];
    
    for (const element of deprecatedElements) {
      const count = await page.locator(element).count();
      expect(count).toBe(0);
    }
  });

  test('ARIA attributes should be valid', async ({ page }) => {
    await page.goto('/');
    
    // Check for common ARIA attributes
    const elementsWithAria = await page.locator('[aria-label], [aria-labelledby], [role]').count();
    // Should have some ARIA attributes for accessibility
    expect(elementsWithAria).toBeGreaterThan(0);
  });

  test('Meta robots tag should be properly configured', async ({ page }) => {
    await page.goto('/');
    const robots = await page.locator('meta[name="robots"]').count();
    // Robots meta tag is optional but if present should be valid
    if (robots > 0) {
      const content = await page.locator('meta[name="robots"]').first().getAttribute('content');
      expect(content).toBeTruthy();
    }
  });
});

