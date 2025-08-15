// Calendar helper functions
const getDaysInMonth = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0);
    return lastDayOfMonth.getDate();
};

const calendarDateFormat = (date) => {
    const newDate = new Date(date);
    return newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getFirstDayOfMonth = (month) => {
    const year = new Date().getFullYear();

    // Create a date for the first day of the given month
    const firstDay = new Date(year, month, 1);

    // Manually extract the year, month, and day
    const yearFormatted = firstDay.getFullYear();
    const monthFormatted = (firstDay.getMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
    const dayFormatted = firstDay.getDate().toString().padStart(2, '0');

    // Return the formatted date as 'YYYY-MM-DD'
    return `${yearFormatted}-${monthFormatted}-${dayFormatted}`;
};

const getLastDayOfMonth = (month) => {
    const year = new Date().getFullYear();
    
    // Create a date for the last day of the given month
    const lastDay = new Date(year, month + 1, 0);

    // Manually extract the year, month, and day
    const yearFormatted = lastDay.getFullYear();
    const monthFormatted = (lastDay.getMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
    const dayFormatted = lastDay.getDate().toString().padStart(2, '0');

    // Return the formatted date as 'YYYY-MM-DD'
    return `${yearFormatted}-${monthFormatted}-${dayFormatted}`;
};


const isDateInPast = (dateString) => {
    const today = new Date();
    const checkDate = new Date(dateString);
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
};

const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };



export {getDaysInMonth, getFirstDayOfMonth, isDateInPast, getLastDayOfMonth, calendarDateFormat, formatDate};