# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cascade.spec.ts >> action budget shows in action menu and blocks at 6
- Location: tests\cascade.spec.ts:370:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  271 |   await expect(panel).toBeVisible();
  272 |   await expect(panel).toContainText(npc.name);
  273 | });
  274 | 
  275 | // ─── 10. Dialogue Shows Accuracy Dot ─────────────────────────────────────
  276 | 
  277 | test('dialogue panel shows accuracy dot for NPCs with knowledge', async ({ page }) => {
  278 |   await page.goto('/');
  279 |   await page.getByRole('button', { name: 'New Game' }).click();
  280 |   await waitForWorld(page);
  281 | 
  282 |   const state = await getState(page);
  283 |   // Find an NPC with pre-history knowledge
  284 |   const npcWithKnowledge = state.world.npcs.find((n: NPC) => n.knowledge.length > 0);
  285 | 
  286 |   if (!npcWithKnowledge) {
  287 |     test.skip();
  288 |     return;
  289 |   }
  290 | 
  291 |   await dispatch(page, { type: 'OPEN_DIALOGUE', npc: npcWithKnowledge });
  292 | 
  293 |   const panel = page.locator('.dialogue-panel');
  294 |   await expect(panel).toBeVisible();
  295 |   await expect(panel.locator('.accuracy-dot').first()).toBeVisible();
  296 |   // Should show one of the three tier symbols
  297 |   const dotText = await panel.locator('.accuracy-dot').first().textContent();
  298 |   expect(['●', '◑', '○']).toContain(dotText?.trim());
  299 | });
  300 | 
  301 | // ─── 11. Remember This → Cascade Notification ────────────────────────────
  302 | 
  303 | test('"Remember this" on a cascade event fires cascade notification', async ({ page }) => {
  304 |   await page.goto('/');
  305 |   await page.getByRole('button', { name: 'Ares' }).click();
  306 |   await page.getByRole('button', { name: 'New Game' }).click();
  307 |   await waitForWorld(page);
  308 | 
  309 |   // Give item + jump to generate cascade events
  310 |   const state = await getState(page);
  311 |   const item = state.world.items[0];
  312 |   const faction = state.world.factions[0];
  313 | 
  314 |   await dispatch(page, { type: 'OPEN_ACTION', item });
  315 |   await waitForPhase(page, 'action');
  316 |   await page.getByRole('button', { name: `Give to ${faction.name}`, exact: true }).first().click();
  317 |   await waitForPhase(page, 'exploring');
  318 |   await dispatch(page, { type: 'SET_PHASE', phase: 'jumping' });
  319 |   await waitForPhase(page, 'exploring', 90_000);
  320 | 
  321 |   const stateAfter = await getState(page);
  322 |   const cascadeEvent = stateAfter?.world?.events.find(
  323 |     (e) => e.playerCaused && e.causedBy !== null,
  324 |   );
  325 | 
  326 |   if (!cascadeEvent) {
  327 |     console.log('No cascade event generated — skipping (probabilistic)');
  328 |     test.skip();
  329 |     return;
  330 |   }
  331 | 
  332 |   // Find an NPC who knows about this cascade event
  333 |   const witness = stateAfter?.world?.npcs.find(
  334 |     (n) => n.knowledge.some((k) => k.eventId === cascadeEvent.id),
  335 |   );
  336 | 
  337 |   if (!witness) {
  338 |     console.log('No NPC knows about cascade event — skipping');
  339 |     test.skip();
  340 |     return;
  341 |   }
  342 | 
  343 |   await dispatch(page, { type: 'OPEN_DIALOGUE', npc: witness });
  344 |   await expect(page.locator('.dialogue-panel')).toBeVisible();
  345 | 
  346 |   // Click "Remember this"
  347 |   const rememberBtn = page.locator('.learn-btn').first();
  348 |   await expect(rememberBtn).toBeVisible();
  349 |   await rememberBtn.click();
  350 | 
  351 |   // Notification should appear — either cascade ripple or generic
  352 |   const stateWithNotif = await getState(page);
  353 |   const notification = stateWithNotif?.notification;
  354 |   console.log('Notification:', notification);
  355 |   // If it was a cascade event, notification contains "Cascade!" or "rippled"
  356 |   if (notification) {
  357 |     expect(typeof notification).toBe('string');
  358 |   }
  359 | 
  360 |   // Knowledge log should have the event
  361 |   const statePost = await getState(page);
  362 |   const logged = statePost?.world?.player.knowledgeLog.some(
  363 |     (k) => k.eventId === cascadeEvent.id,
  364 |   );
  365 |   expect(logged).toBe(true);
  366 | });
  367 | 
  368 | // ─── 12. Action Budget ────────────────────────────────────────────────────
  369 | 
  370 | test('action budget shows in action menu and blocks at 6', async ({ page }) => {
> 371 |   await page.goto('/');
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  372 |   await page.getByRole('button', { name: 'New Game' }).click();
  373 |   await waitForWorld(page);
  374 | 
  375 |   const state = await getState(page);
  376 |   const item = state.world.items[0];
  377 | 
  378 |   await dispatch(page, { type: 'OPEN_ACTION', item });
  379 |   await waitForPhase(page, 'action');
  380 | 
  381 |   // Budget counter visible
  382 |   await expect(page.locator('.action-panel')).toContainText('Era actions:');
  383 |   await expect(page.locator('.action-panel')).toContainText('/6');
  384 | });
  385 | 
```