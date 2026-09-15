import { useState } from 'react';

interface UseModalAnimationReturn {
  shouldRender: boolean;
  animationClass: string;
  handleAnimationEnd: (e: React.AnimationEvent) => void;
}

export const useModalAnimation = (
  isOpen: boolean,
  onClose: () => void
): UseModalAnimationReturn => {
  const [isRendered, setIsRendered] = useState<boolean>(isOpen);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      setIsClosing(true);
    }
  }

  const handleAnimationEnd = (e: React.AnimationEvent): void => {
    if (isClosing && e.target === e.currentTarget) {
      setIsRendered(false);
      setIsClosing(false);
      onClose();
    }
  };

  return {
    shouldRender: isRendered,
    animationClass: isClosing ? 'modal-overlay--closing' : 'modal-overlay--open',
    handleAnimationEnd
  };
};
