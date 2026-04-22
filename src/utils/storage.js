const STORAGE_PREFIX = 'hydrocalc_';

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