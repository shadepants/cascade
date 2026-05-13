/// <reference path="../src/window.d.ts" />
import { test, expect } from '@playwright/test';

test('debug state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clio' }).click();
  await page.getByRole('button', { name: 'New Game' }).click();

  await expect.poll(
    async () => { 
      const s = await page.evaluate(() => window.__CASCADE_STATE); 
      console.log('Phase:', s?.phase, 'World exists:', !!s?.world);
      return s?.phase; 
    },
    { timeout: 30_000 }
  ).toBe('exploring');

  const finalState = await page.evaluate(() => window.__CASCADE_STATE);
  console.log('Final state keys:', Object.keys(finalState || {}));
  console.log('Final state world keys:', finalState?.world ? Object.keys(finalState.world) : 'undefined');
});
