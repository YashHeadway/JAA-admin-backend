/**
 * Formats a date/timestamp into 'DD-MM-YYYY hh:mm am/pm' format.
 * Uses 'Asia/Kolkata' timezone (Indian Standard Time) by default.
 * 
 * Example:
 *   Input:  "2026-10-21T11:44:41.254Z"
 *   Output: "21-10-2026 05:14 pm"
 * 
 * @param {Date|string|number} value 
 * @param {string} timeZone 
 * @returns {string}
 */
export const formatDateTime = (value, timeZone = 'Asia/Kolkata') => {
  if (!value) return value;

  // If already in target format 'DD-MM-YYYY hh:mm am/pm', return as-is
  if (typeof value === 'string' && /^\d{2}-\d{2}-\d{4} \d{2}:\d{2} (am|pm)$/i.test(value.trim())) {
    return value;
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: timeZone || 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const parts = formatter.formatToParts(d);
    const map = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }

    const day = map.day;
    const month = map.month;
    const year = map.year;
    const hour = map.hour;
    const minute = map.minute;
    const dayPeriod = (map.dayPeriod || '').toLowerCase();

    return `${day}-${month}-${year} ${hour}:${minute} ${dayPeriod}`;
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
  }
};

/**
 * Formats a date into 'DD-MM-YYYY' format.
 * Example:
 *   Input:  "2026-10-23" or Date
 *   Output: "23-10-2026"
 * 
 * @param {Date|string|number} value 
 * @param {string} timeZone 
 * @returns {string}
 */
export const formatDateOnly = (value, timeZone = 'Asia/Kolkata') => {
  if (!value) return value;

  // If already in DD-MM-YYYY
  if (typeof value === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(value.trim())) {
    return value.trim();
  }

  // If in YYYY-MM-DD
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [yyyy, mm, dd] = value.trim().split('-');
    return `${dd}-${mm}-${yyyy}`;
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: timeZone || 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const parts = formatter.formatToParts(d);
    const map = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }

    return `${map.day}-${map.month}-${map.year}`;
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
};

/**
 * Recursively formats all `createdAt`, `updatedAt`, `joinedOn`, and `createdOn` properties inside an object or array.
 * 
 * @param {any} obj 
 * @returns {any}
 */
export const formatTimestamps = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      formatTimestamps(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if ((key === 'createdAt' || key === 'updatedAt') && obj[key]) {
      obj[key] = formatDateTime(obj[key]);
    } else if ((key === 'joinedOn' || key === 'createdOn') && obj[key]) {
      obj[key] = formatDateOnly(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      formatTimestamps(obj[key]);
    }
  }

  return obj;
};

