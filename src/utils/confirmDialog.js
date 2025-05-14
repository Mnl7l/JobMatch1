// src/utils/confirmDialog.js

/**
 * A utility function to handle confirmation dialogs
 * This isolates the ESLint no-restricted-globals issue to a single file
 * 
 * @param {string} message - The confirmation message to display
 * @returns {boolean} - True if the user confirmed, false otherwise
 */
export const confirmAction = (message) => {
  // eslint-disable-next-line no-restricted-globals
  return confirm(message);
};

/**
 * A more advanced confirmation utility that returns a Promise
 * This can be useful for async operations
 * 
 * @param {string} message - The confirmation message to display
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false otherwise
 */
export const confirmActionAsync = (message) => {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-restricted-globals
    const result = confirm(message);
    resolve(result);
  });
};

const confirmDialog = {
  confirmAction,
  confirmActionAsync
};

export default confirmDialog;