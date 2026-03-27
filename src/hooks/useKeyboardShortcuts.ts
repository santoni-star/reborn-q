import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onClose?: () => void;
  onSave?: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onClose,
  onSave,
  enabled = true
}: KeyboardShortcutsOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Handle Escape key for closing (Allow even in inputs if needed, or exclude)
      if (e.key === 'Escape' && onClose) {
        // If in input, we might want to just blur or clear, but let's allow modal close
        onClose();
      }

      // Handle Ctrl+Enter for saving
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSave) {
        e.preventDefault();
        onSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, onSave, enabled]);
};