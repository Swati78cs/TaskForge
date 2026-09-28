const { URL } = require('url');

const PRIVATE_IP_REGEX = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // 169.254.0.0/16 (Cloud Metadata)
  /^0\.0\.0\.0$/,
  /^::1$/,
];

const FORBIDDEN_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
];

/**
 * Validates a target URL to prevent Server-Side Request Forgery (SSRF).
 * Returns true if valid, throws an Error if forbidden/invalid.
 */
const validateTargetUrl = (targetUrl) => {
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error('URL must be a valid non-empty string');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    throw new Error(`Invalid URL format: ${targetUrl}`);
  }

  // 1. Protocol check
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Forbidden protocol '${parsedUrl.protocol}'. Only http: and https: are allowed.`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 2. Forbidden hostnames check
  if (FORBIDDEN_HOSTNAMES.includes(hostname)) {
    throw new Error(`SSRF Prevention: Access to forbidden hostname '${hostname}' is blocked.`);
  }

  // 3. Private IP check
  for (const regex of PRIVATE_IP_REGEX) {
    if (regex.test(hostname)) {
      throw new Error(`SSRF Prevention: Access to private/internal IP address '${hostname}' is blocked.`);
    }
  }

  return true;
};

module.exports = { validateTargetUrl };
