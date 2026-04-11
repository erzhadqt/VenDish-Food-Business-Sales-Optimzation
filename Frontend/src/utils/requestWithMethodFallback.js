import api from "../api";

const RETRIABLE_STATUSES = new Set([404, 405]);

const getUrlVariants = (url) => {
  if (!url) return [];

  const normalized = String(url);
  if (normalized.endsWith("/")) {
    return [normalized, normalized.slice(0, -1)];
  }

  return [normalized, `${normalized}/`];
};

const shouldRetry = (error) => {
  const status = error?.response?.status;
  return RETRIABLE_STATUSES.has(status);
};

export const requestWithMethodFallback = async ({
  url,
  data,
  config = {},
  primaryMethod = "post",
  fallbackMethods = ["patch"],
}) => {
  const methods = [primaryMethod, ...fallbackMethods];
  const urls = getUrlVariants(url);

  let lastError;

  for (const method of methods) {
    for (const targetUrl of urls) {
      try {
        return await api.request({
          method,
          url: targetUrl,
          data,
          ...config,
        });
      } catch (error) {
        lastError = error;

        if (!shouldRetry(error)) {
          throw error;
        }
      }
    }
  }

  throw lastError;
};
