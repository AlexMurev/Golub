export const formatFullDate = (timestamp: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatShortTime = (timestamp: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
