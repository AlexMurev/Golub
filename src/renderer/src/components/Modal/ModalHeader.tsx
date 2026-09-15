import React from 'react';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose }): React.JSX.Element => {
  return (
    <header className="modal__header">
      <h2 className="modal__title">{title}</h2>
      <button className="modal__close" onClick={onClose} title="Закрыть">
        ✕
      </button>
    </header>
  );
};
