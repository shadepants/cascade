# Engine & Fidelity Research: Cascade

## 1. Visual Fidelity Upgrade: Tilesets
To upgrade the current ASCII/Rectangle HTML5 Canvas renderer to a true "High-Fidelity" roguelike experience, migrating to a sprite atlas/tileset is the natural next step. The following open-source (CC0 or CC-BY-SA) tilesets are the best fits for a 128x128 procedurally generated web game:

### Top Open-Source Tilesets
1. **Kenney Roguelike/RPG Pack (16x16)**
   - **License:** CC0 (Public Domain)
   - **Pros:** Extremely comprehensive (1,700+ tiles). Clean, highly readable pixel art. Excellent for prototyping and final games. Often comes with pre-configured JSON atlases perfect for web rendering.
2. **DawnLike (16x16)**
   - **License:** CC-BY-SA 3.0
   - **Pros:** Massive, high-quality fantasy tileset utilizing the famous DawnBringer 16-color palette. Gives a very cohesive, moody retro RPG aesthetic.
3. **RL Tiles (Dungeon Crawl Stone Soup)**
   - **License:** Mostly CC0
   - **Pros:** Thousands of unique, highly detailed sprites for every conceivable monster and item. The `statico/rltiles` repo provides JSON-metadata-ready versions.
4. **Ever Rogue (16x16)**
   - **License:** CC0
   - **Pros:** A vibrant, high-contrast tileset heavily inspired by modern hits like *Caves of Qud*. Excellent modular walls and props.

**Implementation Note for React/Canvas:** To use these, the current `renderer.ts` would need to be updated to load a sprite atlas image and use `ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)` instead of `ctx.fillText()`.

---

## 2. Engine Architecture: Godot vs. React/Canvas
As Cascade grows from a 24x24 POC to a 128x128 heavy simulation with complex UI, the question of engine architecture arises.

### React + HTML5 Canvas (Current Stack)
- **The DOM Advantage:** React is arguably the best tool in the world for building complex, text-heavy UIs (menus, dialogue trees, knowledge logs, cascade graphs). Building this in a game engine's UI system is often painful.
- **Bundle & Load Time:** React web apps are tiny (<1MB) and load instantly in the browser.
- **Simulation Decoupling:** The pure TypeScript tick engine runs with zero engine overhead and can easily be moved to a Web Worker to prevent UI thread blocking during the 500-year "Era Zero" generation.
- **Visual Limits:** Canvas 2D limits how much "juice" (shaders, particle systems, dynamic lighting) can be easily added without writing raw WebGL or migrating to PixiJS.

### Godot (4.3+)
- **Visuals & Performance:** Godot's C++ core and built-in `TileMapLayer` can handle 16k tiles effortlessly. Shaders, lighting, and particles come out of the box.
- **Cross-Platform:** Trivial to export to Steam (desktop) and mobile.
- **Web Export Drawbacks:** Godot 4 web exports are still heavy (~5MB - 30MB base payload) and require a loading screen. Iteration loop (compile -> browser refresh) is slower than Vite's instant HMR.
- **UI Challenge:** While Godot has a good UI node system, building complex, scrolling text interfaces with dynamic layouts (like the 'Cascade Score' tree or the Socratic Dialogue panel) is much slower than using HTML/CSS.

---

## 3. Claude Steelman Collaboration
*(To be completed by Claude)*

**Prompt for Claude:**
Please review the architectural research above. We are building "Cascade", a browser-based, procedurally generated history simulator (inspired by Dwarf Fortress and Caves of Qud). It features a 128x128 grid, a 500-year heavy background simulation, and very text-heavy UIs (dialogue, causal graphs, lore logs). 

Please provide a "Steelman" argument for both paths:
1. **Steelman React/Canvas:** Why should we stick with our current React + HTML5 Canvas (or perhaps PixiJS) stack? What makes this the definitively correct choice for *this specific type of game*?
2. **Steelman Godot:** Why is migrating to Godot the strategically superior choice? What long-term roadblocks will Godot save us from?

Provide your analysis below:

### Claude's Analysis:
...
### Claude's Analysis:

#### 1. Steelman React/Canvas: The Definitively Correct Choice for Cascade

**The core thesis: Cascade is not a game that happens to have text. It is a text experience that happens to have a map.**

Consider where the actual complexity budget of this project lives. The 128x128 tile grid — even fully animated with a sprite atlas — is the *simplest* rendering problem in Cascade. The hard problems are:

- A scrolling, filterable lore log that could contain thousands of entries spanning 500 years of procedural history.
- A causal graph visualization (the "Cascade Score" tree) that needs to be pannable, zoomable, and richly annotated — essentially a bespoke data visualization.
- A Socratic dialogue panel with dynamic text layout, inline entity references (hover for tooltip? click to cross-reference the knowledge graph?), and potentially branching conversation trees.
- Menu systems, inspector panels, entity detail views, and the inevitable wiki-like cross-linking between all of the above.

This is a **document application** with a tile viewport embedded in it. The entire lineage of web platform development — CSS Flexbox/Grid, accessible text rendering, `overflow: auto`, `position: sticky`, SVG/D3 for graph layouts, React's component model for state-driven UI — was *designed* to solve exactly these problems. Godot's Control nodes were not. Anyone who has tried to build a rich, scrollable, dynamically-sized text interface in *any* game engine UI system (Godot, Unity, Unreal) knows the pain: you are fighting the framework instead of building your game.

**The PixiJS upgrade path is surgical and sufficient.** If and when you need visual "juice" — ambient occlusion on tiles, a day/night lighting pass, particle effects for rain or fire — PixiJS gives you a WebGL-accelerated sprite renderer that drops cleanly into a React component. You get shaders (written in GLSL, the universal standard), a `ParticleContainer` that can push 100k+ sprites at 60fps, and a `TilingSprite` class purpose-built for large grids. Critically, PixiJS renders into a `<canvas>` element that coexists peacefully with the surrounding React DOM. The tile viewport becomes one `<canvas>` managed by Pixi; everything else remains HTML/CSS. You get the best renderer for the viewport and the best renderer for the UI, with zero compromise.

**The simulation architecture is already ideal.** Your pure TypeScript tick engine is the crown jewel of this project. It has zero coupling to any rendering framework. It can run in a Web Worker today, in a SharedArrayBuffer-backed thread tomorrow, or be compiled to WASM via AssemblyScript if you ever need raw speed for the 500-year generation pass. Porting this to GDScript or even Godot's C# bindings is not just unnecessary work — it is a *downgrade* in portability and testability. You can unit-test your simulation with `vitest` right now, in milliseconds, with no engine boot.

**Distribution is frictionless.** Cascade loads in a browser tab. No download, no install, no Steam runtime, no Electron wrapper. For a niche simulation game trying to find its audience, the difference between "click a link and you're playing" and "download a 30MB binary" is existential. Every indie history-sim that found its initial community (Dwarf Fortress's ASCII era, Cataclysm: DDA, early Caves of Qud) did so by minimizing the friction to try it.

**The concrete upgrade path:**

| Layer | Current | Next Step |
|---|---|---|
| Tile Rendering | `ctx.fillText()` | PixiJS `Sprite` from Kenney/DawnLike atlas |
| Visual Juice | None | PixiJS shaders (lighting, weather) |
| UI Framework | React DOM | React DOM (unchanged) |
| Graph Viz | (TBD) | D3.js / React Flow inside a panel |
| Simulation | TS tick engine | Web Worker isolation |
| Distribution | Static site (Vercel/Netlify) | Same |

No migration. No rewrite. Incremental improvement at every step.

---

#### 2. Steelman Godot: The Strategically Superior Choice

**The core thesis: Cascade's ambitions will eventually outgrow the web platform, and every month spent building bespoke rendering infrastructure in JavaScript is a month not spent on game design.**

Let's be honest about what "React + Canvas + PixiJS + Web Workers + custom shader pipeline" actually is: **you are building a game engine.** You are assembling a bespoke engine from npm packages, glue code, and hope — and you will be the sole maintainer of every integration seam. PixiJS handles sprites, but who handles the camera system? Input mapping? Sprite animation state machines? Tile occlusion culling? Audio spatialization? Each of these is a week of engineering that Godot solves with a single node.

**The 128x128 grid is not the ceiling — it's the floor.** Dwarf Fortress started with small maps too. If Cascade succeeds, you will want: larger maps, smooth scrolling with sub-tile camera movement, fog of war with per-tile alpha masking, animated water and lava, z-level transitions, minimap rendering, and real-time visualization of the 500-year simulation playback. Each of these features is trivial in Godot's `TileMapLayer` with its built-in shader pipeline, occlusion, and camera system. In PixiJS, each is a custom engineering project with its own performance pitfalls.

**Godot's UI system is better than its reputation — and getting better fast.** Godot 4.3's `RichTextLabel` supports BBCode-driven rich text with inline images, clickable links, and custom effects (wave, shake, fade-in typewriter). The `Tree` and `ItemList` controls handle thousands of entries with virtualized scrolling. `GraphEdit` is a built-in node-graph editor widget that could serve as the foundation for your Cascade Score causal graph *out of the box*. Yes, CSS is more flexible for pure document layout — but you are not building a document. You are building a game UI with a specific, known set of panels. Godot's `Container` system with anchors and `MarginContainer`/`VBoxContainer` nesting handles this class of layout cleanly. The Dwarf Fortress Premium Edition shipped its complex UI in a custom game engine, not in a browser.

**GDExtension unlocks your simulation's true performance ceiling.** The 500-year "Era Zero" simulation is computationally expensive by definition — you are simulating civilizations, wars, trade routes, and cultural drift across thousands of ticks. Today, TypeScript in a Web Worker is "fast enough." But as the simulation grows in depth (and it will — this is the heart of the game), you will hit the ceiling of single-threaded JS execution. Godot's GDExtension system lets you write the simulation core in C++ or Rust, compiled natively, with direct memory access and true multi-threading. This is not a theoretical benefit; Dwarf Fortress's world generation is CPU-bound for *minutes* — and it's written in optimized C++. Your simulation will grow toward that complexity, and when it does, the web platform cannot follow.

**Steam is not optional for commercial viability.** If Cascade is ever going to sustain development — even at the modest level of a Caves of Qud or an Ultima Ratio Regum — it needs to be on Steam. Godot's desktop export is a first-class, battle-tested pipeline. The web-to-desktop path for a React app means Electron or Tauri, both of which add their own layers of complexity, binary size, and platform-specific bugs. Godot gives you Windows, Mac, and Linux exports from a single project, with native performance, native file system access (for save games and modding), and Steam SDK integration via well-maintained community plugins.

**Modding is the lifeblood of the genre.** Dwarf Fortress, Caves of Qud, Cataclysm: DDA — every successful game in this lineage thrives on modding. Godot's resource system (`.tres` files, custom `Resource` types) provides a natural, structured modding surface. Tilesets, entity definitions, dialogue trees, and simulation parameters can all be exposed as moddable resources with minimal additional infrastructure. In the React stack, you would need to design and maintain a custom modding API from scratch.

**The migration cost is front-loaded but bounded.** The simulation engine is pure TypeScript with no rendering coupling — this is a massive advantage. It can be ported to C# (Godot's first-class scripting language) with near-1:1 syntax translation, or wrapped as a GDExtension native module. The UI panels are complex but *known* — there are a finite number of them, and rebuilding them in Godot's scene system, while tedious, is a one-time cost. The rendering layer (currently the simplest part of the codebase) is *replaced* rather than ported — Godot's TileMapLayer does more out of the box than anything you've built or will build in Canvas/PixiJS.

**The real question is: do you want to spend the next two years building a game, or building a game engine?**

---

#### Summary Table

| Dimension | React/Canvas/PixiJS | Godot |
|---|---|---|
| Text-heavy UI | ★★★★★ (native strength) | ★★★☆☆ (adequate, improving) |
| Tile rendering (basic) | ★★★★☆ (PixiJS) | ★★★★★ (TileMapLayer) |
| Visual juice (shaders, lighting, particles) | ★★★☆☆ (custom work) | ★★★★★ (built-in) |
| Simulation performance ceiling | ★★★☆☆ (JS/WASM) | ★★★★★ (GDExtension C++/Rust) |
| Distribution (web) | ★★★★★ (instant) | ★★☆☆☆ (5-30MB payload) |
| Distribution (Steam/desktop) | ★★☆☆☆ (Electron/Tauri) | ★★★★★ (native) |
| Modding support | ★★☆☆☆ (custom) | ★★★★☆ (resource system) |
| Iteration speed | ★★★★★ (Vite HMR) | ★★★☆☆ (compile cycle) |
| Migration cost | ★★★★★ (zero) | ★★☆☆☆ (significant, bounded) |
| Long-term maintenance burden | ★★☆☆☆ (you *are* the engine team) | ★★★★☆ (community-maintained engine) |

#### My Recommendation (if forced to choose):

**Stay on React + PixiJS for the next 6 months. Revisit Godot when — and only when — one of these triggers fires:**

1. You need desktop/Steam distribution for commercial launch.
2. The simulation's generation time exceeds what a Web Worker can deliver in an acceptable UX window (e.g., >30 seconds for Era Zero).
3. You find yourself spending more time on rendering infrastructure (camera systems, animation pipelines, input handling) than on game design and simulation logic.

Until one of those triggers fires, the React stack's strengths — frictionless distribution, instant iteration, and unmatched UI capability — directly serve the phase of development you are in: proving that the simulation and its presentation are *interesting*. Visual fidelity and engine sophistication are force multipliers, but only after you have something worth multiplying.
