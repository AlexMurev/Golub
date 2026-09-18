import React, { useEffect, useRef, useState } from 'react';
import type { MyReaction } from '@shared/types';
import { Modal } from '@renderer/components/Modal/Modal';
import './ReactionPicker.css';

interface ReactionPickerProps {
  anchor: { x: number; y: number };
  onSelect: (name: string, dataUrl: string) => void;
  onClose: () => void;
}

interface PendingImage {
  dataUrl: string;
}

const MAX_BYTES = 200 * 1024;
const MAX_DIM = 128;

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (): void => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Не удалось прочитать файл'));
    };
    reader.onerror = (): void => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = (): void => resolve();
      img.onerror = (): void => reject(new Error('Не удалось открыть изображение'));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function prepareImage(file: File): Promise<string | null> {
  try {
    if (file.size <= MAX_BYTES) {
      return await readAsDataURL(file);
    }

    const img = await loadImageFromFile(file);
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (Math.max(w, h) > MAX_DIM) {
      const ratio = MAX_DIM / Math.max(w, h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/png');
    const approxBytes = Math.ceil(((dataUrl.length - 22) * 3) / 4);
    if (approxBytes > MAX_BYTES) return null;

    return dataUrl;
  } catch {
    return null;
  }
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ anchor, onSelect, onClose }) => {
  const [list, setList] = useState<MyReaction[]>([]);
  const [pending, setPending] = useState<PendingImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = async (): Promise<void> => {
    const data = await window.api.reactions.list();
    setList(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      const data = await window.api.reactions.list();
      if (!cancelled) setList(data);
    })();
    return (): void => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      // Пока открыта модалка с превью — не закрываем пикер по клику снаружи
      if (isModalOpen) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isModalOpen) onClose();
    };
    const t = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
      window.addEventListener('keydown', handleKey);
    }, 0);
    return (): void => {
      clearTimeout(t);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, isModalOpen]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const dataUrl = await prepareImage(file);
    if (!dataUrl) {
      alert('Не удалось подготовить изображение. Попробуйте картинку поменьше.');
      return;
    }

    const defaultName = file.name.replace(/\.[^.]+$/, '').slice(0, 32) || 'custom';
    setNameInput(defaultName);
    setPending({ dataUrl });
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
  };

  const handleSavePending = async (): Promise<void> => {
    if (!pending) return;
    const name = nameInput.trim();
    if (!name) {
      alert('Введите название реакции');
      return;
    }
    const res = await window.api.reactions.addCustom({ dataUrl: pending.dataUrl, name });
    if (!res.success) {
      alert(res.error || 'Не удалось сохранить');
      return;
    }
    setIsModalOpen(false);
    setNameInput('');
    await reload();
  };

  const handleRemoveCustom = async (id: string): Promise<void> => {
    await window.api.reactions.removeCustom(id);
    setRemovingId(null);
    await reload();
  };

  const isDefault = (id: string): boolean => id.startsWith('default-');

  const pickerWidth = 300;
  const pickerHeight = 240;
  const top = Math.min(anchor.y + 4, window.innerHeight - pickerHeight - 8);
  const left = Math.min(anchor.x, window.innerWidth - pickerWidth - 8);

  return (
    <>
      <div ref={ref} className="reaction-picker" style={{ top, left }}>
        <div className="reaction-picker__grid">
          {list.map((r) => (
            <button
              key={r.id}
              type="button"
              className="reaction-picker__item"
              onClick={(): void => onSelect(r.name, r.dataUrl)}
              onContextMenu={(e): void => {
                if (isDefault(r.id)) return;
                e.preventDefault();
                e.stopPropagation();
                setRemovingId(r.id);
              }}
              title={r.name}
            >
              <img src={r.dataUrl} alt={r.name} />
            </button>
          ))}
          <button
            type="button"
            className="reaction-picker__item reaction-picker__item--add"
            onClick={(): void => fileInputRef.current?.click()}
            title="Добавить свою реакцию"
          >
            +
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />

        {removingId && (
          <div className="reaction-picker__confirm">
            <span>Удалить реакцию?</span>
            <div className="reaction-picker__confirm-actions">
              <button
                type="button"
                className="reaction-picker__confirm-btn"
                onClick={(): void => setRemovingId(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="reaction-picker__confirm-btn reaction-picker__confirm-btn--danger"
                onClick={(): void => void handleRemoveCustom(removingId)}
              >
                Удалить
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} className="reaction-picker-modal">
        {pending && (
          <>
            <div className="reaction-picker-modal__preview">
              <img src={pending.dataUrl} alt="preview" />
            </div>
            <label className="reaction-picker-modal__field">
              <span className="reaction-picker-modal__label">Название реакции</span>
              <input
                autoFocus
                className="reaction-picker-modal__input"
                type="text"
                value={nameInput}
                onChange={(e): void => setNameInput(e.target.value)}
                maxLength={32}
                onKeyDown={(e): void => {
                  if (e.key === 'Enter') void handleSavePending();
                  if (e.key === 'Escape') handleCloseModal();
                }}
              />
            </label>
            <div className="reaction-picker-modal__actions">
              <button
                type="button"
                className="reaction-picker-modal__btn"
                onClick={handleCloseModal}
              >
                Отмена
              </button>
              <button
                type="button"
                className="reaction-picker-modal__btn reaction-picker-modal__btn--primary"
                onClick={(): void => void handleSavePending()}
              >
                Сохранить
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};
