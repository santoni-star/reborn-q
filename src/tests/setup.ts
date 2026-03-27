import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock window.postMessage and other necessary browser APIs
if (typeof window !== 'undefined') {
  window.postMessage = vi.fn();
}
