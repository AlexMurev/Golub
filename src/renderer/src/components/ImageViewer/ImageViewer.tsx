import React, { useEffect, useRef, useState } from 'react';
import { useImageViewer, closeImage } from '@renderer/utils/imageViewer';
import './ImageViewer.css';

interface DragState {
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
}

export const ImageViewer: React.FC = (): React.JSX.Element | null => {
  const { attachment } = useImageViewer();
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [prevAttachmentId, setPrevAttachmentId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const currentId = attachment?.id ?? null;

  // Сброс зума при смене картинки — во время рендера, а не в effect.
  if (currentId !== prevAttachmentId) {
    setPrevAttachmentId(currentId);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  // Escape — закрыть
  useEffect(() => {
    if (!attachment) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeImage();
    };
    window.addEventListener('keydown', onKey);
    return (): void => {
      window.removeEventListener('keydown', onKey);
    };
  }, [attachment]);

  if (!attachment) return null;

  const url = `golub-file://${attachment.id}`;

  const handleWheel = (e: React.WheelEvent<HTMLImageElement>): void => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setZoom((z) => Math.max(0.2, Math.min(8, z + delta * z)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>): void => {
    if (zoom <= 1) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: dragRef.current.startOffsetX + dx,
      y: dragRef.current.startOffsetY + dy
    });
  };

  const handleMouseUp = (): void => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const reset = (): void => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const cursor: string = zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';

  return (
    <div
      className="image-viewer"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="image-viewer__backdrop" onClick={closeImage} />

      <img
        src={url}
        alt={attachment.fileName ?? ''}
        className="image-viewer__image"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          cursor,
          transition: isDragging ? 'none' : 'transform 0.05s linear'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDoubleClick={reset}
        draggable={false}
      />

      <div className="image-viewer__toolbar">
        <button
          type="button"
          className="image-viewer__button"
          onClick={(): void => void window.api.files.saveAs(attachment.id)}
        >
          Скачать
        </button>
        <button type="button" className="image-viewer__button" onClick={closeImage}>
          Закрыть
        </button>
      </div>
    </div>
  );
};
