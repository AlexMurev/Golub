import React, { useState } from 'react';
import { Modal } from '@renderer/components/Modal/Modal';
import { ModalHeader } from '@renderer/components/Modal/ModalHeader';
import { SettingsProfileTab } from './Tabs/SettingsProfileTab';
import { SettingsNotificationsTab } from './Tabs/SettingsNotificationsTab';
import { SettingsAppTab } from './Tabs/SettingsAppTab';
import './Tabs/SettingsTab.css';
import './Settings.css';
import AppIcon from '@renderer/assets/app.svg?react';
import UserIcon from '@renderer/assets/user.svg?react';
import NotificationIcon from '@renderer/assets/notification.svg?react';

type SettingsTabId = 'profile' | 'notifications' | 'app';

interface SettingsTab {
  id: SettingsTabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: SettingsTab[] = [
  { id: 'profile', label: 'Профиль', icon: <UserIcon height={25} width={25} /> },
  { id: 'notifications', label: 'Уведомления', icon: <NotificationIcon height={25} width={25} /> },
  { id: 'app', label: 'Приложение', icon: <AppIcon height={25} width={25} /> }
];

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose
}): React.JSX.Element | null => {
  const [tab, setTab] = useState<SettingsTabId>('profile');
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setTab('profile');
  }

  const currentTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="settings">
      <div className="settings__body">
        <nav className="settings__nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`settings__nav-item ${tab === t.id ? 'settings__nav-item--active' : ''}`}
              onClick={(): void => setTab(t.id)}
            >
              <span className="settings__nav-item-icon">{t.icon}</span>
              <span className="settings__nav-item-label">{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings__main">
          <ModalHeader title={currentTab.label} onClose={onClose} />

          <div className="settings__content">
            {tab === 'profile' && <SettingsProfileTab />}
            {tab === 'notifications' && <SettingsNotificationsTab />}
            {tab === 'app' && <SettingsAppTab />}
          </div>
        </div>
      </div>
    </Modal>
  );
};
