import type { TestAction } from './types';
import type { GameStore } from './store/types';

declare global {
  interface Window {
    __CASCADE_STATE?: GameStore;
    __CASCADE_DISPATCH?: (action: TestAction) => void;
  }
}

export {};
