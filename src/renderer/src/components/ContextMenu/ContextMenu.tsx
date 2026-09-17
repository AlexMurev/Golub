import React, { useLayoutEffect, useRef, useState } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  isDanger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

// Отступ от края окна, чтобы меню не прилипало к границе.
const EDGE_MARGIN = 8;

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose
}): React.JSX.Element => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Измеряем размер меню и подгоняем позицию в границах окна.
  // useLayoutEffect — чтобы скорректированная позиция была применена до первого paint.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const { width, height } = el.getBoundingClientRect();
    const maxLeft = window.innerWidth - width - EDGE_MARGIN;
    const maxTop = window.innerHeight - height - EDGE_MARGIN;

    setPos({
      left: Math.max(EDGE_MARGIN, Math.min(x, maxLeft)),
      top: Math.max(EDGE_MARGIN, Math.min(y, maxTop))
    });
  }, [x, y]);

  const handleItemClick = (callback: () => void): void => {
    callback();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        top: pos?.top ?? y,
        left: pos?.left ?? x,
        // До измерения прячем — иначе на один кадр мелькнёт не на своём месте.
        visibility: pos ? 'visible' : 'hidden'
      }}
      onClick={(e: React.MouseEvent): void => e.stopPropagation()}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          className={`context-menu__item ${item.isDanger ? 'context-menu__item--danger' : ''}`}
          onClick={(): void => handleItemClick(item.onClick)}
        >
          {item.icon && <span className="context-menu__item-icon">{item.icon}</span>}
          <span className="context-menu__item-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
