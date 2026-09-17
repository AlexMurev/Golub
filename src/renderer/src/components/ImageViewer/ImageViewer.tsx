import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useImageViewer, closeImage, setImageIndex } from '@renderer/utils/imageViewer';
import './ImageViewer.css';
import CloseIcon from '@renderer/assets/close.svg?react';
import DownloadIcon from '@renderer/assets/download.svg?react';
import ChevronRightIcon from '@renderer/assets/chevron-right.svg?react';
import ChevronLeftIcon from '@renderer/assets/chevron-left.svg?react';

interface DragState {
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;
// Один «клик» колеса (deltaY ≈ 100) даёт ~10% изменения.
// Экспонента симметрична: увеличение и уменьшение компенсируют друг друга.
const ZOOM_SPEED = 0.001;
const CLOSE_ANIMATION_MS = 150;

export const ImageViewer: React.FC = (): React.JSX.Element | null => {
  const { attachments, index } = useImageViewer();
  const attachment = attachments[index] ?? null;

  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [prevKey, setPrevKey] = useState<string>('');
  const dragRef = useRef<DragState | null>(null);

  // Сброс зума при смене картинки (по id) или переходе на соседнюю (по индексу).
  const currentKey = `${attachment?.id ?? ''}:${index}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsClosing(false);
  }

  const handleClose = useCallback((): void => {
    setIsClosing(true);
    window.setTimeout((): void => {
      closeImage();
    }, CLOSE_ANIMATION_MS);
  }, []);

  const handlePrev = useCallback((): void => {
    setImageIndex(index - 1);
  }, [index]);

  const handleNext = useCallback((): void => {
    setImageIndex(index + 1);
  }, [index]);

  useEffect(() => {
    if (!attachment) return;

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') handleClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', onKey);
    return (): void => {
      window.removeEventListener('keydown', onKey);
    };
  }, [attachment, handleClose, handlePrev, handleNext]);

  if (!attachment) return null;

  const url = `golub-file://${attachment.id}`;
  const hasPrev = index > 0;
  const hasNext = index < attachments.length - 1;
  const showCounter = attachments.length > 1;

  const handleWheel = (e: React.WheelEvent<HTMLImageElement>): void => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * ZOOM_SPEED);
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>): void => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>): void => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: dragRef.current.startOffsetX + dx,
      y: dragRef.current.startOffsetY + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>): void => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const reset = (): void => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const cursor: string = isDragging ? 'grabbing' : 'grab';
  const showZoomIndicator = Math.abs(zoom - 1) > 0.01;

  return (
    <div className={`image-viewer ${isClosing ? 'image-viewer--closing' : ''}`}>
      <div className="image-viewer__backdrop" onClick={handleClose} />

      {hasPrev && (
        <button
          type="button"
          className="image-viewer__nav image-viewer__nav--prev"
          onClick={handlePrev}
          title="Предыдущее (←)"
        >
          <ChevronLeftIcon width={200} height={200} opacity={0.1} />
        </button>
      )}

      <img
        src={url}
        alt={attachment.fileName ?? ''}
        className="image-viewer__image"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          cursor,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)'
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={reset}
        draggable={false}
      />

      {hasNext && (
        <button
          type="button"
          className="image-viewer__nav image-viewer__nav--next"
          onClick={handleNext}
          title="Следующее (→)"
        >
          <ChevronRightIcon width={200} height={200} opacity={0.1} />
        </button>
      )}

      {showCounter && (
        <div className="image-viewer__counter">
          {index + 1} / {attachments.length}
        </div>
      )}

      {showZoomIndicator && <div className="image-viewer__zoom">{Math.round(zoom * 100)}%</div>}

      <div className="image-viewer__toolbar">
        <button
          type="button"
          className="image-viewer__button"
          onClick={(): void => void window.api.files.saveAs(attachment.id)}
          title="Скачать"
        >
          <DownloadIcon height={40} width={40} />
        </button>
        <button
          type="button"
          className="image-viewer__button"
          onClick={handleClose}
          title="Закрыть (Esc)"
        >
          <CloseIcon height={40} width={40} />
        </button>
      </div>
    </div>
  );
};
