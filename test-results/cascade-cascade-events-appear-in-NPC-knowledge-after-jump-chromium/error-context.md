# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cascade.spec.ts >> cascade events appear in NPC knowledge after jump
- Location: tests\cascade.spec.ts:190:1

# Error details

```
Error: Timeout 30000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: Era Year 124751
      - generic [ref=e8]: (64, 61)
      - generic [ref=e9]: Act 0/6
      - generic "Insight earned by narrative engagement" [ref=e10]: ✧ 5458 Insight
    - generic [ref=e11]:
      - generic [ref=e12]: "↑↓←→ move | Enter: use item | J: jump | Click tile: intervene"
      - button "Show Score" [ref=e13] [cursor=pointer]
  - generic [ref=e18]:
    - heading "Knowledge Log" [level=3] [ref=e19]
    - paragraph [ref=e20]: Talk to NPCs to learn about history.
    - generic [ref=e22]: 0 facts learned
```

# Test source

```ts
  1   | // ─── Cascade Playtest E2E Suite ─────────────────────────────────────────
  2   | // Covers the full cascade chain SOP:
  3   | //   title screen → new game → give item → jump → cascade fires →
  4   | //   NPCs learn it → dialogue shows tiered text → "Remember this" notifies
  5   | 
  6   | /// <reference path="../src/window.d.ts" />
  7   | import { test, expect, type Page } from '@playwright/test';
  8   | import type { NPC, GameEvent, NPCKnowledge, TestAction } from '../src/types';
  9   | 
  10  | // ─── Helpers ─────────────────────────────────────────────────────────────
  11  | 
  12  | /** Read the full game state from the dev test hook. */
  13  | async function getState(page: Page) {
  14  |   return page.evaluate(() => window.__CASCADE_STATE);
  15  | }
  16  | 
  17  | /** Dispatch a store action via the dev test hook. */
  18  | async function dispatch(page: Page, action: TestAction) {
  19  |   return page.evaluate((a) => window.__CASCADE_DISPATCH!(a), action);
  20  | }
  21  | 
  22  | /** Wait for game phase to match. */
  23  | async function waitForPhase(page: Page, phase: string, timeout = 60_000) {
  24  |   await expect.poll(
  25  |     async () => { const s = await getState(page); return s?.phase; },
  26  |     { timeout },
  27  |   ).toBe(phase);
  28  | }
  29  | 
  30  | /** Wait for world to have a storyteller (post new-game). */
  31  | async function waitForWorld(page: Page) {
  32  |   await waitForPhase(page, 'exploring', 60_000);
> 33  |   await expect.poll(
      |   ^ Error: Timeout 30000ms exceeded while waiting on the predicate
  34  |     async () => { const s = await getState(page); return !!s?.world; },
  35  |     { timeout: 30_000 },
  36  |   ).toBe(true);
  37  | }
  38  | 
  39  | // ─── 1. Title Screen ─────────────────────────────────────────────────────
  40  | 
  41  | test('title screen shows Cascade heading and mode buttons', async ({ page }) => {
  42  |   await page.goto('/');
  43  |   await expect(page.getByText('CASCADE')).toBeVisible();
  44  |   await expect(page.getByText('Clio')).toBeVisible();
  45  |   await expect(page.getByText('Ares')).toBeVisible();
  46  |   await expect(page.getByText('Tyche')).toBeVisible();
  47  |   await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  48  | });
  49  | 
  50  | // ─── 2. New Game + Storyteller Init ──────────────────────────────────────
  51  | 
  52  | test('new game initialises world with storyteller state', async ({ page }) => {
  53  |   await page.goto('/');
  54  | 
  55  |   // Select Ares mode for faster cascades
  56  |   await page.getByRole('button', { name: 'Ares' }).click();
  57  |   await page.getByRole('button', { name: 'New Game' }).click();
  58  | 
  59  |   await waitForWorld(page);
  60  | 
  61  |   const state = await getState(page);
  62  |   const st = state?.world?.storyteller;
  63  | 
  64  |   expect(st).toBeTruthy();
  65  |   expect(st.mode).toBe('ares');
  66  |   expect(typeof st.tension).toBe('number');
  67  |   expect(st.tension).toBeGreaterThanOrEqual(st.tensionFloor);
  68  |   expect(st.tension).toBeLessThanOrEqual(100);
  69  |   expect(st.yearsSincePlayerDiscovery).toBe(0);
  70  |   expect(st.spotlightFactionId).toBeNull();
  71  |   expect(Array.isArray(st.cooldowns)).toBe(true);
  72  | });
  73  | 
  74  | test('Clio mode has lower tension floor than Ares', async ({ page }) => {
  75  |   await page.goto('/');
  76  |   await page.getByRole('button', { name: 'Clio' }).click();
  77  |   await page.getByRole('button', { name: 'New Game' }).click();
  78  |   await waitForWorld(page);
  79  | 
  80  |   const state = await getState(page);
  81  |   expect(state?.world?.storyteller?.tensionFloor).toBe(10);
  82  |   expect(state?.world?.storyteller?.tensionDecayRate).toBe(3);
  83  | });
  84  | 
  85  | // ─── 3. World Has Factions, NPCs, Items ──────────────────────────────────
  86  | 
  87  | test('world generates factions, NPCs, items, and settlements', async ({ page }) => {
  88  |   await page.goto('/');
  89  |   await page.getByRole('button', { name: 'New Game' }).click();
  90  |   await waitForWorld(page);
  91  | 
  92  |   const state = await getState(page);
  93  |   const world = state?.world;
  94  | 
  95  |   expect(world.factions.length).toBeGreaterThanOrEqual(3);
  96  |   expect(world.npcs.length).toBeGreaterThan(0);
  97  |   expect(world.items.length).toBeGreaterThan(0);
  98  |   expect(world.settlements.length).toBeGreaterThan(0);
  99  |   expect(world.events.length).toBeGreaterThan(0); // pre-history events
  100 | });
  101 | 
  102 | // ─── 4. Player Action → StatDeltas ───────────────────────────────────────
  103 | 
  104 | test('giving an item creates a playerCaused event with statDeltas', async ({ page }) => {
  105 |   await page.goto('/');
  106 |   await page.getByRole('button', { name: 'Ares' }).click();
  107 |   await page.getByRole('button', { name: 'New Game' }).click();
  108 |   await waitForWorld(page);
  109 | 
  110 |   const state = await getState(page);
  111 |   const world = state?.world;
  112 |   const item = world.items[0];
  113 |   const faction = world.factions[0];
  114 | 
  115 |   // Open action menu and give item via dispatch (avoids canvas navigation)
  116 |   await dispatch(page, { type: 'OPEN_ACTION', item });
  117 |   await waitForPhase(page, 'action');
  118 | 
  119 |   // Click "Give to [faction name]" button
  120 |   const giveBtn = page.getByRole('button', { name: `Give to ${faction.name}`, exact: true }).first();
  121 |   await expect(giveBtn).toBeVisible();
  122 |   await giveBtn.click();
  123 | 
  124 |   await waitForPhase(page, 'exploring');
  125 | 
  126 |   const stateAfter = await getState(page);
  127 |   const playerEvents = stateAfter?.world?.events.filter((e) => e.playerCaused) || [];
  128 | 
  129 |   expect(playerEvents.length).toBeGreaterThan(0);
  130 |   const giveEvent = playerEvents[0];
  131 |   expect(giveEvent.statDeltas).toBeDefined();
  132 |   expect(giveEvent.statDeltas.length).toBeGreaterThan(0);
  133 |   expect(giveEvent.statDeltas[0].delta).not.toBe(0);
```