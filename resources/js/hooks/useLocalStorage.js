import { useState, useEffect } from 'react';

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      // Handle cases where localStorage contains "undefined" as a string
      if (!item || item === 'undefined' || item === 'null') {
        return initialValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      // Clear the corrupted value
      window.localStorage.removeItem(key);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

export default useLocalStorage;
