const STORAGE_PREFIX = 'hydrocalc_';
const CURRENT_VERSION = 3;

const clearOldStorage = () => {
  try {
    const versionKey = STORAGE_PREFIX + 'version';
    const storedVersion = parseInt(localStorage.getItem(versionKey) || '0');
    
    if (storedVersion < CURRENT_VERSION) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem(versionKey, CURRENT_VERSION.toString());
      console.log('Storage cleared for upgrade to version', CURRENT_VERSION);
    }
  } catch (e) {
    console.warn('Clear storage check failed:', e);
  }
};

clearOldStorage();

export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Storage get error for ${key}:`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Storage set error for ${key}:`, error);
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (error) {
      console.warn(`Storage remove error for ${key}:`, error);
    }
  },
};

export const STORAGE_KEYS = {
  DARK_MODE: 'dark_mode',
  SECTION_PARAMS: 'section_params',
  PROFILE_GLOBAL: 'profile_global',
  PROFILE_SECTIONS: 'profile_sections',
  MATRIX_PARAMS: 'matrix_params',
  LAST_PAGE: 'last_page',
};