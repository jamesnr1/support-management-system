import { useEffect } from 'react';

/**
 * Custom hook for keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to callbacks
 * Example: { 'ctrl+s': handleSave, 'esc': handleClose, 'ctrl+shift+e': handleExport }
 */
export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      let combination = '';
      if (ctrl) combination += 'ctrl+';
      if (shift) combination += 'shift+';
      if (alt) combination += 'alt+';
      combination += key;

      const callback = shortcuts[combination] || shortcuts[key];
      
      if (callback) {
        event.preventDefault();
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export default useKeyboardShortcuts;

