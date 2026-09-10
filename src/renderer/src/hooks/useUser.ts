import { useState, useEffect } from 'react';

export interface UserData {
  id: string;
  nickname: string;
  avatar?: string;
}

const generateId = (): string => {
  return 'user-' + crypto.randomUUID();
};

export const useUser = (): [UserData, (patch: Partial<UserData>) => void] => {
  const [user, setUser] = useState<UserData>(() => {
    const storedId = localStorage.getItem('user-id');
    const storedNickname = localStorage.getItem('user-nickname');
    const storedAvatar = localStorage.getItem('user-avatar');
    return {
      id: storedId || generateId(),
      nickname: storedNickname || 'Аноним',
      avatar: storedAvatar || undefined
    };
  });

  useEffect(() => {
    localStorage.setItem('user-id', user.id);
    localStorage.setItem('user-nickname', user.nickname);
    if (user.avatar) {
      localStorage.setItem('user-avatar', user.avatar);
    } else {
      localStorage.removeItem('user-avatar');
    }
  }, [user]);

  const updateUser = (patch: Partial<UserData>): void => {
    setUser((prev) => ({ ...prev, ...patch }));
  };

  return [user, updateUser];
};
