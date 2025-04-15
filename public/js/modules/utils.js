/**
 * Utility functions for ApproVideo (shared across modules).
 * Includes a debounce utility and formatting functions for duration, date, and view counts.
 */
 
 /**
  * Create a debounced version of a function. The function will be invoked only after 
  * it hasn't been called for the specified delay.
  * Useful for handling rapid events (e.g., search input, window resize) without overloading logic.
  * @param {Function} func - The function to debounce.
  * @param {number} wait - The delay in milliseconds.
  * @returns {Function} A new function that delays invoking `func` until after `wait` ms of inactivity.
  */
 export function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        func.apply(this, args);
      }, wait);
    };
  }
  
  /**
   * Format a video duration (in seconds) into a human-readable string.
   * Outputs "M:SS" or "H:MM:SS" format (e.g., 75 -> "1:15", 3675 -> "1:01:15").
   * @param {number} seconds - Duration in seconds.
   * @returns {string} The formatted duration string.
   */
  export function formatDuration(seconds) {
    const totalSeconds = Number(seconds);
    if (isNaN(totalSeconds) || totalSeconds < 0) return '';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    let result = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (hrs > 0) {
      result = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return result;
  }
  
  /**
   * Format a date into a reader-friendly format (e.g., "Jan 2, 2025").
   * @param {string|Date} dateInput - A date string or Date object.
   * @returns {string} Formatted date string.
   */
  export function formatDate(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  
  /**
   * Format a number of views into a shorthand string (e.g., 1500 -> "1.5K", 2500000 -> "2.5M").
   * Adds suffix K for thousands, M for millions, B for billions.
   * @param {number} num - The view count.
   * @returns {string} Formatted view count string.
   */
  export function formatViews(num) {
    const views = Number(num);
    if (isNaN(views) || views < 0) return '';
    if (views < 1000) {
      return views.toString();
    } else if (views < 1000000) {
      const thousands = (views / 1000).toFixed(1);
      return (thousands.endsWith('.0') ? thousands.slice(0, -2) : thousands) + 'K';
    } else if (views < 1000000000) {
      const millions = (views / 1000000).toFixed(1);
      return (millions.endsWith('.0') ? millions.slice(0, -2) : millions) + 'M';
    } else {
      const billions = (views / 1000000000).toFixed(1);
      return (billions.endsWith('.0') ? billions.slice(0, -2) : billions) + 'B';
    }
  }
 