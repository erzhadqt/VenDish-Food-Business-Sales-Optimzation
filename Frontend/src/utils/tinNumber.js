export const DEFAULT_TIN_NUMBER = "123-456-789-000";
export const TIN_NUMBER_REGEX = /^\d{3}-\d{3}-\d{3}-\d{3}$/;
export const DEFAULT_RECEIPT_PHONE = "+63 966 443 1581";
export const RECEIPT_PHONE_REGEX = /^\+?[0-9][0-9\s\-()]{5,24}$/;

export const extractTinDigits = (value = "") => {
  return String(value).replace(/\D/g, "").slice(0, 12);
};

export const formatTinNumber = (value = "") => {
  const digits = extractTinDigits(value);
  const groups = [];

  if (digits.length > 0) groups.push(digits.slice(0, 3));
  if (digits.length > 3) groups.push(digits.slice(3, 6));
  if (digits.length > 6) groups.push(digits.slice(6, 9));
  if (digits.length > 9) groups.push(digits.slice(9, 12));

  return groups.join("-");
};

export const isValidTinNumber = (value = "") => {
  return TIN_NUMBER_REGEX.test(String(value).trim());
};

export const normalizeTinNumber = (value, fallback = DEFAULT_TIN_NUMBER) => {
  const formatted = formatTinNumber(value || "");
  if (isValidTinNumber(formatted)) {
    return formatted;
  }

  return fallback;
};

export const isValidReceiptPhone = (value = "") => {
  return RECEIPT_PHONE_REGEX.test(String(value).trim());
};

export const normalizeReceiptPhone = (value, fallback = DEFAULT_RECEIPT_PHONE) => {
  const normalized = String(value ?? "").trim();
  if (isValidReceiptPhone(normalized)) {
    return normalized;
  }

  return fallback;
};
