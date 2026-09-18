import type { MyReaction } from './types';

function svgEmoji(glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="48" font-size="52" text-anchor="middle">${glyph}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_REACTIONS: MyReaction[] = [
  { id: 'default-like', dataUrl: svgEmoji('👍'), name: 'like', orderIndex: 0, createdAt: 0 },
  { id: 'default-love', dataUrl: svgEmoji('❤️'), name: 'love', orderIndex: 1, createdAt: 0 },
  { id: 'default-laugh', dataUrl: svgEmoji('😂'), name: 'laugh', orderIndex: 2, createdAt: 0 },
  { id: 'default-wow', dataUrl: svgEmoji('😮'), name: 'wow', orderIndex: 3, createdAt: 0 },
  { id: 'default-sad', dataUrl: svgEmoji('😢'), name: 'sad', orderIndex: 4, createdAt: 0 },
  { id: 'default-fire', dataUrl: svgEmoji('🔥'), name: 'fire', orderIndex: 5, createdAt: 0 },
  { id: 'default-party', dataUrl: svgEmoji('🎉'), name: 'party', orderIndex: 6, createdAt: 0 },
  { id: 'default-dislike', dataUrl: svgEmoji('👎'), name: 'dislike', orderIndex: 7, createdAt: 0 }
];

export const DEFAULT_QUICK_REACTIONS: { name: string; dataUrl: string }[] = [
  { name: DEFAULT_REACTIONS[0].name, dataUrl: DEFAULT_REACTIONS[0].dataUrl },
  { name: DEFAULT_REACTIONS[1].name, dataUrl: DEFAULT_REACTIONS[1].dataUrl },
  { name: DEFAULT_REACTIONS[2].name, dataUrl: DEFAULT_REACTIONS[2].dataUrl }
];
