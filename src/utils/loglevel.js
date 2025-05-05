const determineLogLevel = (status) => {
    if (status >= 400) return 'error'; // Server errors
    // if (status >= 400) return 'warn';  // Client errors
    if (status >= 100) return 'info';  // Informational
    return 'debug';                   // Debug (for unexpected cases)
};

module.exports = { determineLogLevel }