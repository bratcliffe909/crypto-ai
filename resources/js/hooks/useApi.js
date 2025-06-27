import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const useApi = (endpoint, interval = 30000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get CSRF token first
        const csrfResponse = await axios.get('/api/csrf-token');
        axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
        
        // Modify endpoint for markets to get more data
        let url = endpoint;
        if (endpoint === '/api/crypto/markets') {
          url = endpoint + '?per_page=50';
        }
        
        // Fetch data
        const response = await axios.get(url);
        setData(response.data);
        setLastFetch(new Date());
      } catch (err) {
        setError(err.message || 'Failed to fetch data');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval if provided
    if (interval) {
      intervalRef.current = setInterval(fetchData, interval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [endpoint, interval]);

  return { data, loading, error, lastFetch };
};

export default useApi;
