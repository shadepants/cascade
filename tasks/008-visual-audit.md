# Visual Audit & Subagent Creation Plan

## Objective
To enhance our workflow efficiency by creating specialized custom subagents and to execute a comprehensive visual and asset audit for the Track B integration (Oracle's Eye UI and Global Ledger).

## Phase 1: Subagent Creation
We will define specific subagents to assist with specialized tasks. These will be created in the `.gemini/agents/` directory using Markdown with YAML frontmatter.

### Proposed Subagents
1. **`asset-validator`**
   - **Role:** Verifies asset paths, sprite sheet coordinates, and integration in `src/engine/tileMap.ts`.
   - **Tools:** `read_file`, `grep_search`.
2. **`ui-auditor`**
   - **Role:** Analyzes React component structure (specifically `PixiViewport.tsx` and UI overlays) to ensure alignment with design constraints and state mapping.
   - **Tools:** `read_file`, `grep_search`.

## Phase 2: Visual and Asset Audit
Using the newly created subagents and manual verification, we will execute a deep-dive audit of the current visual state and UI integration:

### 2.1 Asset Mapping & Rendering Verification
- **High-Fidelity Asset Alignment:** Ensure the assets outlined in `006-final-asset-evaluation.md` (DawnLike, ToenMedieval, DCSS) are correctly mapped in `tileMap.ts`.
- **Comprehensive Visual Coverage Check:** Conduct a 1:1 mapping audit between the simulation state (`World`, `Faction`, `Settlement`, `TemporalEcho`) and the rendering engine to guarantee that *every* concept requiring visual representation is actively rendered on-screen (e.g., ensuring no hidden state changes lack visual feedback).
- **Track B Visuals:** Validate the rendering logic for Track B specific mechanics:
  - **Trade Routes:** Visually distinct paths connecting settlements.
  - **Faith Blooms:** Heatmaps or particle effects representing religious spread.
  - **Innovation Icons:** Correct DCSS/DawnLike sprites mapped to discovered technologies.
- **Performance Profiling:** Verify that the PixiJS Texture pool (`Map<string, Texture>`) is effectively preventing per-turn GPU allocations and memory leaks when rendering new assets.

### 2.2 UI & "Oracle's Eye" Integration Check
- **Component Architecture:** Audit the "Oracle's Eye" UI overlay and Global Ledger components for strict adherence to React 19 and Zustand best practices.
- **Stacking & Z-Index:** Ensure React DOM overlays render cleanly over the PixiJS WebGL canvas without clipping, event-swallowing, or obscuring crucial interactive elements.
- **Keyboard Shortcut Isolation:** Verify that standard hotkeys (H, R, J, Arrows) function correctly and do not conflict with UI input fields or focus states within the Ledger.
- **Styling & Responsiveness:** Check plain CSS implementations for the new UI elements to ensure they are responsive, maintain high contrast against the map background, and fit the thematic aesthetics.

### 2.3 Layer Polish & Visual Feedback
- **Ghost of History (`H` key):** Verify that the dashed-stroke ghost layers representing `previousWorld` states are visually distinct (e.g., correct 0.4 alpha) and batched efficiently by faction color.
- **Temporal Echoes:** Ensure player interventions and Whispers provide clear, immediate visual feedback (e.g., highlights, ripples) on the map without causing clutter.

## Phase 3: Track B Phase 4 Completion
1. Integrate any fixes identified during the audit into `PixiViewport.tsx` and the React UI components.
2. Finalize the Global Ledger state connections to ensure the UI correctly reflects the `useGameStore` state.

## Verification
- Run Vitest regression tests to ensure no simulation logic was broken during UI tweaks.
- Visually confirm the rendering of all Track B mechanics in the browser.