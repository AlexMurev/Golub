import React from 'react';
import { Modal } from '@renderer/components/Modal/Modal';
import { ModalHeader } from '@renderer/components/Modal/ModalHeader';
import { useContacts } from '@renderer/hooks/useContacts';
import { useChats } from '@renderer/hooks/useChats';
import { FriendRequestItem } from './FriendRequestItem';
import './FriendRequestsModal.css';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({
  isOpen,
  onClose
}): React.JSX.Element | null => {
  const { incoming, outgoing, reload: reloadContacts } = useContacts();
  const { reload: reloadChats, openDirectChat } = useChats();

  const handleAccept = async (peerId: string): Promise<void> => {
    await window.api.db.users.acceptRequest(peerId);
    await reloadContacts();
    await reloadChats();
    await openDirectChat(peerId);
  };

  const handleReject = async (peerId: string): Promise<void> => {
    await window.api.db.users.rejectRequest(peerId);
    await reloadContacts();
  };

  const handleCancel = async (peerId: string): Promise<void> => {
    await window.api.db.users.cancelRequest(peerId);
    await reloadContacts();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="friend-requests">
      <ModalHeader title="Заявки в друзья" onClose={onClose} />

      <div className="friend-requests__body">
        <section className="friend-requests__section">
          <h3 className="friend-requests__section-title">
            Входящие {incoming.length > 0 && `(${incoming.length})`}
          </h3>

          {incoming.length === 0 ? (
            <p className="friend-requests__empty">Нет входящих заявок</p>
          ) : (
            <ul className="friend-requests__list">
              {incoming.map((u) => (
                <FriendRequestItem key={u.peerId} user={u}>
                  <button
                    className="friend-requests__button friend-requests__button--accept"
                    onClick={(): void => {
                      void handleAccept(u.peerId);
                    }}
                  >
                    Принять
                  </button>
                  <button
                    className="friend-requests__button friend-requests__button--reject"
                    onClick={(): void => {
                      void handleReject(u.peerId);
                    }}
                  >
                    Отклонить
                  </button>
                </FriendRequestItem>
              ))}
            </ul>
          )}
        </section>

        <section className="friend-requests__section">
          <h3 className="friend-requests__section-title">
            Исходящие {outgoing.length > 0 && `(${outgoing.length})`}
          </h3>

          {outgoing.length === 0 ? (
            <p className="friend-requests__empty">Нет исходящих заявок</p>
          ) : (
            <ul className="friend-requests__list">
              {outgoing.map((u) => (
                <FriendRequestItem key={u.peerId} user={u}>
                  <button
                    className="friend-requests__button friend-requests__button--cancel"
                    onClick={(): void => {
                      void handleCancel(u.peerId);
                    }}
                  >
                    Отменить
                  </button>
                </FriendRequestItem>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
};
