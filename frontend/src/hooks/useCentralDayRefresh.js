import { useEffect } from 'react';

const CENTRAL_TIME_ZONE = 'America/Chicago';

const getCentralDayKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: CENTRAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const useCentralDayRefresh = (onDayChange, { intervalMs = 1000 } = {}) => {
  useEffect(() => {
    if (typeof onDayChange !== 'function') return undefined;

    let currentDayKey = getCentralDayKey();

    const checkForDayChange = () => {
      const nextDayKey = getCentralDayKey();
      if (nextDayKey === currentDayKey) return;
      currentDayKey = nextDayKey;
      onDayChange();
    };

    const intervalId = window.setInterval(checkForDayChange, intervalMs);
    window.addEventListener('focus', checkForDayChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', checkForDayChange);
    };
  }, [intervalMs, onDayChange]);
};

export default useCentralDayRefresh;
