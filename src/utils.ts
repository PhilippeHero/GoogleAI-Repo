/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const getInitialDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
};

export const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

export const isDateBeforeTomorrow = (dateString: string): boolean => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    return false;
  }
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today to include today in the check

    const inputDate = new Date(dateString);
    // Correct for timezone offset to treat date as local
    const userTimezoneOffset = inputDate.getTimezoneOffset() * 60000;
    const correctInputDate = new Date(inputDate.getTime() + userTimezoneOffset);
    
    return correctInputDate <= today;
  } catch (e) {
    return false;
  }
};


export const formatDate = (isoDate: string): string => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) { // Adjusted regex to support ISO strings
    return 'N/A';
  }
  try {
    const date = new Date(isoDate);
    // Add timezone offset to prevent date from shifting
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctDate = new Date(date.getTime() + userTimezoneOffset);

    const day = String(correctDate.getDate()).padStart(2, '0');
    const month = String(correctDate.getMonth() + 1).padStart(2, '0');
    const year = correctDate.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return isoDate; // Fallback to original string if something goes wrong
  }
};
