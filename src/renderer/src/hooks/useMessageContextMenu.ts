import { useState, useEffect } from 'react';
import type { Message } from '@renderer/types/chat';

interface ContextMenuState {
  x: number;
  y: number;
  message: Message;
}

interface UseMessageContextMenuResult {
  menuState: ContextMenuState | null;
  handleContextMenu: (e: React.MouseEvent, msg: Message) => void;
  closeMenu: () => void;
}

export const useMessageContextMenu = (): UseMessageContextMenuResult => {
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);

  useEffect((): (() => void) => {
    const closeMenu = (): void => setMenuState(null);
    window.addEventListener('click', closeMenu);
    return (): void => window.removeEventListener('click', closeMenu);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, msg: Message): void => {
    e.preventDefault();
    setMenuState({
      x: e.clientX,
      y: e.clientY,
      message: msg
    });
  };

  const closeMenu = (): void => setMenuState(null);

  return { menuState, handleContextMenu, closeMenu };
};
