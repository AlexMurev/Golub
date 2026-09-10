import { useState, useEffect } from 'react';

export interface UserData {
  id: string;
  nickname: string;
}

const generateId = (): string => {
  return 'user-' + crypto.randomUUID();
};

export const useUser = (): [UserData, (patch: Partial<UserData>) => void] => {
  const [user, setUser] = useState<UserData>(() => {
    const storedId = localStorage.getItem('user-id');
    const storedNickname = localStorage.getItem('user-nickname');
    return {
      id: storedId || generateId(),
      nickname: storedNickname || 'Аноним'
    };
  });

  useEffect(() => {
    localStorage.setItem('user-id', user.id);
    localStorage.setItem('user-nickname', user.nickname);
  }, [user]);

  const updateUser = (patch: Partial<UserData>): void => {
    setUser((prev) => ({ ...prev, ...patch }));
  };

  return [user, updateUser];
};
