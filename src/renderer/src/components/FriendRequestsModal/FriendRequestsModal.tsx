import React from 'react';
import type { User } from '@shared/types';
import './FriendRequestsModal.css';

interface FriendRequestsModalProps {
  incoming: User[];
  outgoing: User[];
  onAccept: (peerId: string) => Promise<void>;
  onReject: (peerId: string) => Promise<void>;
  onCancel: (peerId: string) => Promise<void>;
  onClose: () => void;
}

export const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({
  incoming,
  outgoing,
  onAccept,
  onReject,
  onCancel,
  onClose
}): React.JSX.Element => {
  return (
    <div className="friend-requests-overlay" onClick={onClose}>
      <div className="friend-requests" onClick={(e): void => e.stopPropagation()}>
        <header className="friend-requests__header">
          <h2 className="friend-requests__title">Заявки в друзья</h2>
          <button className="friend-requests__close" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </header>

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
                  <li key={u.peerId} className="friend-requests__item">
                    <div className="friend-requests__avatar-wrapper">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.nickname} className="friend-requests__avatar" />
                      ) : (
                        <div className="friend-requests__avatar friend-requests__avatar--placeholder">
                          {u.nickname.charAt(0).toUpperCase() || 'A'}
                        </div>
                      )}
                    </div>
                    <div className="friend-requests__info">
                      <span className="friend-requests__nickname">{u.nickname}</span>
                      <span className="friend-requests__address">{u.address}</span>
                    </div>
                    <div className="friend-requests__actions">
                      <button
                        className="friend-requests__button friend-requests__button--accept"
                        onClick={(): void => {
                          void onAccept(u.peerId);
                        }}
                      >
                        Принять
                      </button>
                      <button
                        className="friend-requests__button friend-requests__button--reject"
                        onClick={(): void => {
                          void onReject(u.peerId);
                        }}
                      >
                        Отклонить
                      </button>
                    </div>
                  </li>
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
                  <li key={u.peerId} className="friend-requests__item">
                    <div className="friend-requests__avatar-wrapper">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.nickname} className="friend-requests__avatar" />
                      ) : (
                        <div className="friend-requests__avatar friend-requests__avatar--placeholder">
                          {u.nickname.charAt(0).toUpperCase() || 'A'}
                        </div>
                      )}
                    </div>
                    <div className="friend-requests__info">
                      <span className="friend-requests__nickname">{u.nickname}</span>
                      <span className="friend-requests__address">{u.address}</span>
                    </div>
                    <div className="friend-requests__actions">
                      <button
                        className="friend-requests__button friend-requests__button--cancel"
                        onClick={(): void => {
                          void onCancel(u.peerId);
                        }}
                      >
                        Отменить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
