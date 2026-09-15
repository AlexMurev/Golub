import React, { useEffect } from 'react';
import { useModalAnimation } from '@renderer/hooks/useModalAnimation';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className
}): React.JSX.Element | null => {
  const { shouldRender, animationClass, handleAnimationEnd } = useModalAnimation(isOpen, onClose);

  useEffect(() => {
    const timerId: NodeJS.Timeout = setTimeout(
      (): void => {
        window.api.setTitlebarColor(isOpen ? '#10101026' : '#2b2d31');
      },
      isOpen ? 30 : 160
    );
    return (): void => {
      clearTimeout(timerId);
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div
      className={`modal-overlay ${animationClass}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className={`modal ${className ?? ''}`} onClick={(e): void => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};
