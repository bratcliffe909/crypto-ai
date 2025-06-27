import { useEffect, useRef } from 'react';

/**
 * Custom hook for setInterval with React
 * @param {Function} callback - Function to call on each interval
 * @param {number < /dev/null | null} delay - Delay in milliseconds, or null to pause
 */
function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default useInterval;
