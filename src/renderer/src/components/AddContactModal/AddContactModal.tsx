import React, { useState } from 'react';
import { Modal } from '@renderer/components/Modal/Modal';
import { ModalHeader } from '@renderer/components/Modal/ModalHeader';
import { useContacts } from '@renderer/hooks/useContacts';
import { useChats } from '@renderer/hooks/useChats';
import './AddContactModal.css';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose
}): React.JSX.Element | null => {
  const { reload: reloadContacts } = useContacts();
  const { reload: reloadChats, openDirectChat } = useChats();

  const [address, setAddress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setAddress('');
      setError(null);
      setIsSubmitting(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!address.trim()) {
      setError('Укажите адрес');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await window.api.db.users.addByAddress(address.trim());
      if (!result.success || !result.contact) {
        throw new Error(result.error || 'Не удалось добавить контакт');
      }

      await reloadContacts();
      await reloadChats();

      if (result.contact.contactStatus === 'accepted') {
        await openDirectChat(result.contact.peerId);
      }

      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="add-contact">
      <ModalHeader title="Добавить контакт" onClose={onClose} />

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
    </Modal>
  );
};
