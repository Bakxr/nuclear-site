import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
  window.matchMedia = window.matchMedia || function matchMedia() {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  };
}

if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}
