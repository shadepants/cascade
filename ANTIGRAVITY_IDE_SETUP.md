# 🌪️ Google Antigravity IDE — Optimal Setup for Cascade

## Overview
Google Antigravity IDE (released late 2025) is an **agent-first Integrated Development Environment** specifically designed for orchestrating autonomous AI agents. For the **Cascade** project (React 19, PixiJS v8, and a complex TypeScript simulation engine), Antigravity is uniquely powerful because it can hold the entire 1M+ token context of historical simulation logic in memory simultaneously.

## 1. Mission Control: Agent Specialization
In Antigravity’s **Mission Control** tab, create three distinct "Agent Roles" to prevent context pollution during complex tasks:

| Role | Scope | Focus |
| :--- | :--- | :--- |
| **Simulation Architect** | `src/simulation/*`, `src/types.ts` | Logic integrity, causality chains, SeededRNG stability. |
| **Render Master** | `src/ui/PixiViewport.tsx`, `src/engine/*` | PixiJS v8 performance, texture pooling, WebGL draw-calls. |
| **Narrative Director** | `src/simulation/templates.ts`, `DialoguePanel.tsx` | Socratic Gate tuning and LLM-powered dialogue accuracy. |

## 2. Recommended Extensions
Antigravity is a VS Code fork, maintaining compatibility with these essential Cascade tools:
*   **Vitest (Zest):** Crucial for real-time feedback on `tick.test.ts`.
*   **PixiJS DevTools:** Essential for debugging the Texture Pool and WebGL layers.
*   **ESLint (Flat Config):** Ensure full support for `eslint.config.js` and React 19 rules.
*   **Antigravity Browser Automation:** Enable for autonomous execution of **Playtest SOP (Task 003)**.

## 3. IDE Settings (`.vscode/settings.json`)
Align the IDE with Cascade’s technical mandates:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.enablePromptUse": true,
  "antigravity.context.pin": [
    "src/types.ts", 
    "src/simulation/tick.ts", 
    "GEMINI.md"
  ],
  "antigravity.browser.autoVerify": true,
  "vitest.enable": true
}
```

## 4. The "Cascade" Advantage in Antigravity
*   **Causality Debugging:** Use **"Trace Mission"** to map consequence chains (e.g., *"Trace why population collapsed in Year 620 based on the Artifact from Year 500"*).
*   **Texture Pool Monitoring:** Set an **"Agent Watch"** on memory usage. If a code change causes the texture pool to leak (not destroying on unmount), the IDE will flag the regression during verification.

## 5. Global Mandates Compliance
*   **Zero-Warning Policy:** Agents are configured to reject any implementation that introduces linting or type-checking warnings.
*   **Strict Typing:** Antigravity agents are instructed to prioritize explicit TypeScript interfaces over `any` types.
