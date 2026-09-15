import React from 'react';
import type { User } from '@shared/types';

interface FriendRequestItemProps {
  user: User;
  children: React.ReactNode;
}

export const FriendRequestItem: React.FC<FriendRequestItemProps> = ({
  user,
  children
}): React.JSX.Element => {
  const placeholder: string = user.nickname.charAt(0).toUpperCase() || 'A';

  return (
    <li className="friend-requests__item">
      <div className="friend-requests__avatar-wrapper">
        {user.avatar ? (
          <img src={user.avatar} alt={user.nickname} className="friend-requests__avatar" />
        ) : (
          <div className="friend-requests__avatar friend-requests__avatar--placeholder">
            {placeholder}
          </div>
        )}
      </div>
      <div className="friend-requests__info">
        <span className="friend-requests__nickname">{user.nickname}</span>
        <span className="friend-requests__address">{user.address}</span>
      </div>
      <div className="friend-requests__actions">{children}</div>
    </li>
  );
};
