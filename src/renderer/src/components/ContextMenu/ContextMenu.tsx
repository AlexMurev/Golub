import React from 'react';
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

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose
}): React.JSX.Element => {
  const handleItemClick = (callback: () => void): void => {
    callback();
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{ top: y, left: x }}
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
