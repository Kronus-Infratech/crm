/**
 * Format date in DD/MM/YYYY style (Standardized for Kronus CRM)
 * @param {string|Date} date 
 * @returns {string}
 */
const formatDate = (date) => {
    if (!date) return 'Empty';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
};

module.exports = {
    formatDate
};
