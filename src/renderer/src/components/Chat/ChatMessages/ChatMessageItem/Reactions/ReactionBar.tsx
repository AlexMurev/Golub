import React, { useMemo, useState } from 'react';
import type { Reaction } from '@shared/types';
import { useContacts } from '@renderer/hooks/useContacts';
import './ReactionBar.css';

interface ReactionGroup {
  name: string;
  dataUrl: string;
  peerIds: string[];
}

interface ReactionBarProps {
  reactions: Reaction[];
  myId: string;
  onToggle: (name: string, dataUrl: string, isMine: boolean) => void;
  onChipContextMenu: (e: React.MouseEvent, name: string, dataUrl: string, isMine: boolean) => void;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  reactions,
  myId,
  onToggle,
  onChipContextMenu
}) => {
  const { accepted } = useContacts();
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const groups = useMemo<ReactionGroup[]>(() => {
    const map = new Map<string, ReactionGroup>();
    for (const r of reactions) {
      const g = map.get(r.name);
      if (g) {
        g.peerIds.push(r.peerId);
      } else {
        map.set(r.name, { name: r.name, dataUrl: r.dataUrl, peerIds: [r.peerId] });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.peerIds.length !== b.peerIds.length) return b.peerIds.length - a.peerIds.length;
      return a.name.localeCompare(b.name);
    });
  }, [reactions]);

  if (groups.length === 0) return null;

  const getNickname = (peerId: string): string => {
    if (peerId === myId) return 'Вы';
    const c = accepted.find((u) => u.peerId === peerId);
    return c?.nickname ?? 'Кто-то';
  };

  return (
    <div className="reaction-bar">
      {groups.map((g) => {
        const isMine = g.peerIds.includes(myId);
        const showCount = g.peerIds.length > 1;
        const tooltipVisible = hoveredName === g.name;
        const names = g.peerIds.map(getNickname);
        const shownNames = names.slice(0, 3);
        const restCount = names.length - shownNames.length;
        const verb = names.length === 1 ? 'поставил' : 'поставили';

        return (
          <div
            key={g.name}
            className="reaction-chip-wrapper"
            onMouseEnter={(): void => setHoveredName(g.name)}
            onMouseLeave={(): void => setHoveredName(null)}
          >
            <button
              type="button"
              className={`reaction-chip ${isMine ? 'reaction-chip--mine' : ''}`}
              onClick={(): void => onToggle(g.name, g.dataUrl, isMine)}
              onContextMenu={(e): void => onChipContextMenu(e, g.name, g.dataUrl, isMine)}
            >
              <img src={g.dataUrl} alt={g.name} className="reaction-chip__icon" />
              {showCount && <span className="reaction-chip__count">{g.peerIds.length}</span>}
            </button>

            {tooltipVisible && (
              <div className="reaction-tooltip">
                <span className="reaction-tooltip__names">{shownNames.join(', ')}</span>
                {restCount > 0 && (
                  <span className="reaction-tooltip__rest"> и ещё {restCount}</span>
                )}
                <span className="reaction-tooltip__suffix">
                  {' '}
                  {verb} «{g.name}»
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
