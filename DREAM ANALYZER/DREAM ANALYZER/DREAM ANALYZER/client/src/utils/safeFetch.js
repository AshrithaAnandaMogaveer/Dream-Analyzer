// safeFetch.js - Global defensive network layer that prevents JSON parse crashes
// and handles non-JSON responses gracefully

/**
 * Safe fetch wrapper that handles both JSON and non-JSON responses
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<{response: Response, data: any}>} - Parsed response data
 * @throws {Error} - Custom error with status and body info
 */
export const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);

    // Always read as text first to handle any response type
    let data;
    const contentType = response.headers.get('content-type') || '';

    // Handle response based on content type
    if (contentType.includes('application/json')) {
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (jsonError) {
        // If JSON parsing fails, keep raw text
        data = { _rawResponse: await response.text(), _parseError: 'Invalid JSON' };
      }
    } else {
      // Non-JSON response (HTML, text, etc.)
      data = { _rawResponse: await response.text() };
    }

    return { response, data };
  } catch (networkError) {
    throw new Error(`Network Error: ${networkError.message}`);
  }
};

/**
 * Advanced fetch wrapper with automatic retry and error formatting
 */
export const safeFetchAdvanced = async (url, options = {}) => {
  const maxRetries = options.maxRetries || 1;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await safeFetch(url, options);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // Format error for better debugging
  const error = new Error(lastError.message);
  error.status = 'NETWORK_ERROR';
  error.originalError = lastError;
  throw error;
};

/**
 * Pre-configured fetch for API endpoints with auth
 */
export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;

  const finalOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  };

  return safeFetchAdvanced(url, finalOptions);
};
