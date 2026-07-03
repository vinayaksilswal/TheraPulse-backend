export const ADMIN_AUTH_KEY = 'lumively_admin_auth';

/**
 * Check if the admin is currently authenticated in this session
 */
export const isAdminAuthenticated = () => {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
};

/**
 * Attempt to login the admin with a PIN
 * @param {string} pin - The PIN entered by the user
 * @returns {boolean} true if successful, false otherwise
 */
export const loginAdmin = (pin) => {
  const correctPin = import.meta.env.VITE_ADMIN_PIN || '1234';
  if (pin === correctPin) {
    sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
    return true;
  }
  return false;
};

/**
 * Logout the admin
 */
export const logoutAdmin = () => {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
};
