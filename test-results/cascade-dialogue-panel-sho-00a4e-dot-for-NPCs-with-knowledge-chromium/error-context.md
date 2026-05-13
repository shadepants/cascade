# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cascade.spec.ts >> dialogue panel shows accuracy dot for NPCs with knowledge
- Location: tests\cascade.spec.ts:277:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  178 | 
  179 |   const stateAfter = await getState(page);
  180 |   const cascadeEvents = stateAfter?.world?.events.filter((e) => e.causedBy !== null) || [];
  181 | 
  182 |   // Cascade is probabilistic (40% per year) — with 20 years should fire at least once
  183 |   // Allow 0 with a soft check (some seeds may not cascade)
  184 |   console.log(`Cascade events found: ${cascadeEvents.length}`);
  185 |   expect(stateAfter.world.events.length).toBeGreaterThan(state.world.events.length);
  186 | });
  187 | 
  188 | // ─── 7. Cascade Events Seeded into NPC Knowledge ─────────────────────────
  189 | 
  190 | test('cascade events appear in NPC knowledge after jump', async ({ page }) => {
  191 |   await page.goto('/');
  192 |   await page.getByRole('button', { name: 'Ares' }).click();
  193 |   await page.getByRole('button', { name: 'New Game' }).click();
  194 |   await waitForWorld(page);
  195 | 
  196 |   const state = await getState(page);
  197 |   const item = state.world.items[0];
  198 |   const faction = state.world.factions[0];
  199 | 
  200 |   await dispatch(page, { type: 'OPEN_ACTION', item });
  201 |   await waitForPhase(page, 'action');
  202 |   await page.getByRole('button', { name: `Give to ${faction.name}`, exact: true }).first().click();
  203 |   await waitForPhase(page, 'exploring');
  204 |   await dispatch(page, { type: 'SET_PHASE', phase: 'jumping' });
  205 |   await waitForPhase(page, 'exploring', 180_000);
  206 | 
  207 |   const stateAfter = await getState(page);
  208 |   const allKnowledge = stateAfter.world.npcs.flatMap((n: NPC) => n.knowledge);
  209 |   const cascadeIds = new Set(
  210 |     stateAfter.world.events.filter((e: GameEvent) => e.causedBy).map((e: GameEvent) => e.id),
  211 |   );
  212 |   const cascadeKnowledge = allKnowledge.filter((k: NPCKnowledge) => cascadeIds.has(k.eventId));
  213 | 
  214 |   console.log(`Total NPC knowledge entries: ${allKnowledge.length}`);
  215 |   console.log(`Cascade knowledge entries: ${cascadeKnowledge.length}`);
  216 | 
  217 |   // Pre-history knowledge should always exist
  218 |   expect(allKnowledge.length).toBeGreaterThan(0);
  219 | 
  220 |   // Accuracy values should be in valid range
  221 |   for (const k of allKnowledge.slice(0, 20)) {
  222 |     expect(k.accuracy).toBeGreaterThanOrEqual(0);
  223 |     expect(k.accuracy).toBeLessThanOrEqual(1);
  224 |   }
  225 | });
  226 | 
  227 | // ─── 8. Storyteller Tension Updates After Jump ───────────────────────────
  228 | 
  229 | test('tension changes after a time jump with player action', async ({ page }) => {
  230 |   await page.goto('/');
  231 |   await page.getByRole('button', { name: 'Ares' }).click();
  232 |   await page.getByRole('button', { name: 'New Game' }).click();
  233 |   await waitForWorld(page);
  234 | 
  235 |   const stateBefore = await getState(page);
  236 |   const tensionBefore = stateBefore.world.storyteller.tension;
  237 | 
  238 |   const item = stateBefore.world.items[0];
  239 |   const faction = stateBefore.world.factions[0];
  240 | 
  241 |   await dispatch(page, { type: 'OPEN_ACTION', item });
  242 |   await waitForPhase(page, 'action');
  243 |   await page.getByRole('button', { name: `Give to ${faction.name}`, exact: true }).first().click();
  244 |   await waitForPhase(page, 'exploring');
  245 |   await dispatch(page, { type: 'SET_PHASE', phase: 'jumping' });
  246 |   await waitForPhase(page, 'exploring', 180_000);
  247 | 
  248 |   const stateAfter = await getState(page);
  249 |   const tensionAfter = stateAfter.world.storyteller.tension;
  250 | 
  251 |   console.log(`Tension: ${tensionBefore} → ${tensionAfter}`);
  252 |   // Tension should have been computed (may rise or fall depending on world state)
  253 |   expect(typeof tensionAfter).toBe('number');
  254 |   expect(tensionAfter).toBeGreaterThanOrEqual(stateAfter.world.storyteller.tensionFloor);
  255 | });
  256 | 
  257 | // ─── 9. Dialogue Panel Opens for NPC ─────────────────────────────────────
  258 | 
  259 | test('dialogue panel opens and shows NPC name', async ({ page }) => {
  260 |   await page.goto('/');
  261 |   await page.getByRole('button', { name: 'New Game' }).click();
  262 |   await waitForWorld(page);
  263 | 
  264 |   const state = await getState(page);
  265 |   const npc = state.world.npcs[0];
  266 | 
  267 |   // Open dialogue via dispatch (avoids canvas navigation)
  268 |   await dispatch(page, { type: 'OPEN_DIALOGUE', npc });
  269 | 
  270 |   const panel = page.locator('.dialogue-panel');
  271 |   await expect(panel).toBeVisible();
  272 |   await expect(panel).toContainText(npc.name);
  273 | });
  274 | 
  275 | // ─── 10. Dialogue Shows Accuracy Dot ─────────────────────────────────────
  276 | 
  277 | test('dialogue panel shows accuracy dot for NPCs with knowledge', async ({ page }) => {
> 278 |   await page.goto('/');
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
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
  371 |   await page.goto('/');
  372 |   await page.getByRole('button', { name: 'New Game' }).click();
  373 |   await waitForWorld(page);
  374 | 
  375 |   const state = await getState(page);
  376 |   const item = state.world.items[0];
  377 | 
  378 |   await dispatch(page, { type: 'OPEN_ACTION', item });
```