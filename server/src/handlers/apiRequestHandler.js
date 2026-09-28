const axios = require('axios');
const { validateTargetUrl } = require('../utils/ssrfValidator');

/**
 * api_request handler
 * Payload: { url: string, method?: string, headers?: object, data?: object, timeout?: number }
 */
const apiRequestHandler = async (payload) => {
  const { url, method = 'GET', headers = {}, data = null, timeout = 10000 } = payload;

  if (!url) {
    throw new Error('API Request handler missing required "url" field in payload');
  }

  // Mandatory SSRF Validation (Section 13 & 23 requirement)
  validateTargetUrl(url);

  try {
    const response = await axios({
      url,
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'TaskForge-Worker/1.0',
        ...headers,
      },
      data,
      timeout,
      maxRedirects: 3,
    });

    return {
      status: 'COMPLETED',
      httpStatusCode: response.status,
      headers: response.headers,
      responseData: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err.response) {
      throw new Error(`HTTP Error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
    } else if (err.code === 'ECONNABORTED') {
      throw new Error(`External API request timed out after ${timeout}ms`);
    }
    throw new Error(`External API request failed: ${err.message}`);
  }
};

module.exports = apiRequestHandler;
