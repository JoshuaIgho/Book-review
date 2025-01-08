// utils/dateFormatter.js

const formatDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();

    // Determine the suffix for the day
    const suffix = (day) => {
        if (day > 3 && day < 21) return 'th'; // 4th to 20th
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    return `${day}${suffix(day)} ${month}, ${year}`;
};

module.exports = formatDate;