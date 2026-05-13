# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cascade.spec.ts >> time jump produces cascade events with causedBy links
- Location: tests\cascade.spec.ts:159:1

# Error details

```
Test timeout of 300000ms exceeded.
```

```
Error: locator.click: Test timeout of 300000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Give to Ashvale', exact: true }).first()
    - locator resolved to <button class="action-btn">Give to Ashvale</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
      - waiting 100ms
    84 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - element is outside of the viewport
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e6]:
    - generic [ref=e7]: Era Year 124751
    - generic [ref=e8]: (64, 64)
    - generic [ref=e9]: Act 0/6
    - generic "Insight earned by narrative engagement" [ref=e10]: ✧ 420 Insight
  - generic [ref=e15]:
    - heading "Knowledge Log" [level=3] [ref=e16]
    - paragraph [ref=e17]: Talk to NPCs to learn about history.
    - generic [ref=e19]: 0 facts learned
  - generic [ref=e20]:
    - generic [ref=e21]:
      - generic [ref=e22]: Prison Key
      - button "Close action menu" [ref=e23] [cursor=pointer]: ✕
    - paragraph [ref=e24]: An iron key to the cells beneath the old keep. Someone important is locked away.
    - generic [ref=e25]: "Era actions: 0/6"
    - generic [ref=e26]:
      - heading "What do you do?" [level=4] [ref=e27]
      - button "Give to Ashvale" [ref=e28] [cursor=pointer]
      - button "Give to Thornhold" [ref=e29] [cursor=pointer]
      - button "Give to Duskmere" [ref=e30] [cursor=pointer]
      - button "Give to Ironpeak" [ref=e31] [cursor=pointer]
      - button "Give to Frostfen" [ref=e32] [cursor=pointer]
      - button "Give to Ashvale" [ref=e33] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e34] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e35] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e36] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e37] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e38] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e39] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e40] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e41] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e42] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e43] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e44] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e45] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e46] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e47] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e48] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e49] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e50] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e51] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e52] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e53] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e54] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e55] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e56] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e57] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e58] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e59] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e60] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e61] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e62] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e63] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e64] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e65] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e66] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e67] [cursor=pointer]
      - button "Give to Thornhold Remnant" [ref=e68] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e69] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e70] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e71] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e72] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e73] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e74] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e75] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e76] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e77] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e78] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e79] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e80] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e81] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e82] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e83] [cursor=pointer]
      - button "Give to Duskmere Remnant" [ref=e84] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e85] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e86] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e87] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e88] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e89] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e90] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e91] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e92] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e93] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e94] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e95] [cursor=pointer]
      - button "Give to Ashvale Remnant" [ref=e96] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e97] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e98] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e99] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e100] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e101] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e102] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e103] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e104] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e105] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e106] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e107] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e108] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e109] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e110] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e111] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e112] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e113] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e114] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e115] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e116] [cursor=pointer]
      - button "Give to Ironpeak Remnant" [ref=e117] [cursor=pointer]
    - paragraph [ref=e118]: Press Escape to cancel
```

# Test source

```ts
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
  134 | });
  135 | 
  136 | // ─── 5. Spotlight Set After Give ─────────────────────────────────────────
  137 | 
  138 | test('spotlight is set on the faction the player gives to', async ({ page }) => {
  139 |   await page.goto('/');
  140 |   await page.getByRole('button', { name: 'New Game' }).click();
  141 |   await waitForWorld(page);
  142 | 
  143 |   const state = await getState(page);
  144 |   const item = state.world.items[0];
  145 |   const faction = state.world.factions[0];
  146 | 
  147 |   await dispatch(page, { type: 'OPEN_ACTION', item });
  148 |   await waitForPhase(page, 'action');
  149 |   await page.getByRole('button', { name: `Give to ${faction.name}`, exact: true }).first().click();
  150 |   await waitForPhase(page, 'exploring');
  151 | 
  152 |   const stateAfter = await getState(page);
  153 |   expect(stateAfter.world.storyteller.spotlightFactionId).toBe(faction.id);
  154 |   expect(stateAfter.world.storyteller.playerActionCount).toBe(1);
  155 | });
  156 | 
  157 | // ─── 6. Time Jump → Cascade Events ───────────────────────────────────────
  158 | 
  159 | test('time jump produces cascade events with causedBy links', async ({ page }) => {
  160 |   await page.goto('/');
  161 |   await page.getByRole('button', { name: 'Ares' }).click();
  162 |   await page.getByRole('button', { name: 'New Game' }).click();
  163 |   await waitForWorld(page);
  164 | 
  165 |   // Give item to first faction
  166 |   const state = await getState(page);
  167 |   const item = state.world.items[0];
  168 |   const faction = state.world.factions[0];
  169 | 
  170 |   await dispatch(page, { type: 'OPEN_ACTION', item });
  171 |   await waitForPhase(page, 'action');
> 172 |   await page.getByRole('button', { name: `Give to ${faction.name}`, exact: true }).first().click();
      |                                                                                            ^ Error: locator.click: Test timeout of 300000ms exceeded.
  173 |   await waitForPhase(page, 'exploring');
  174 | 
  175 |   // Trigger a time jump (20 years for higher cascade probability)
  176 |   await dispatch(page, { type: 'SET_PHASE', phase: 'jumping' });
  177 |   await waitForPhase(page, 'exploring', 180_000);
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
```