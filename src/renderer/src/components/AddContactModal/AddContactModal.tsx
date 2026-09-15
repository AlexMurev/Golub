import React, { useState } from 'react';
import './AddContactModal.css';

interface AddContactModalProps {
  onClose: () => void;
  onSubmit: (address: string) => Promise<void>;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  onClose,
  onSubmit
}): React.JSX.Element => {
  const [address, setAddress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!address.trim()) {
      setError('Укажите адрес');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(address.trim());
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-contact-overlay" onClick={onClose}>
      <div className="add-contact" onClick={(e): void => e.stopPropagation()}>
        <header className="add-contact__header">
          <h2 className="add-contact__title">Добавить контакт</h2>
          <button className="add-contact__close" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </header>

        <form className="add-contact__form" onSubmit={handleSubmit}>
          <label className="add-contact__field">
            <span className="add-contact__label">Адрес пользователя</span>
            <input
              className="add-contact__input"
              type="text"
              value={address}
              onChange={(e): void => setAddress(e.target.value)}
              placeholder="26.64.82.174:8080"
              autoFocus
            />
            <span className="add-contact__hint">
              IP и порт из настроек собеседника (например: 26.64.82.174:8080)
            </span>
          </label>

          {error && <div className="add-contact__error">{error}</div>}

          <div className="add-contact__actions">
            <button
              type="button"
              className="add-contact__button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="add-contact__button add-contact__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Подключение...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
