import React, { useState, useEffect } from 'react';
import {
    TestTube,
    Heart,
    Search,
    Filter,
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    User,
    Clock,
    LogOut,
    CalendarDays,
    X
} from 'lucide-react';
import LogoutModal from '../components/LogoutModal';  // Import your LogoutModal component
import { getTestRequests, uploadLabResult, logout, getLabStaffInfo, getAvailableSlots } from '../api.js';  // Import your API functions
import UploadResultsModal from '../components/UploadResultsModal.jsx';  // Import the UploadResultsModal component
import TestRequestList from '../components/TestRequestList.jsx';
import { getStatusColor, getStatusIcon } from '../utils/Helpers';  // Import utility functions for status color and icon
import { getDaysInMonth, getFirstDayOfMonth, isDateInPast, getLastDayOfMonth, calendarDateFormat } from '../utils/dateTimeFormat';  // Import date helper functions

// Mock appointment data
const mockAppointments = {
    '2025-08-01': ['09:00', '10:30', '14:00'], // Partially booked
    '2025-08-02': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    '2025-08-03': ['12:00', '13:00'], // Lightly booked (only lunch time)
    '2025-08-04': [], // Fully available
    '2025-08-05': ['09:30', '14:00', '16:00'], // Partially booked
    '2025-08-13': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'], // Fully booked
};

// Generate time slots from 9:00 AM to 5:00 PM (excluding lunch 12:00-13:30)
const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    const lunchStart = 12; // Lunch starts at 12:00 PM
    const lunchEnd = 13.5; // Lunch ends at 1:30 PM (1.5 hours after 12:00)

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            // Skip lunch time from 12:00 PM to 1:30 PM
            if (hour >= lunchStart && hour < lunchEnd) {
                if (hour === 12 && minute >= 0) continue; // Skip 12:30-1:00
                if (hour === 13 && minute === 0) continue; // Skip 1:00-1:30
            }

            // Format time as 24-hour time string (e.g., "09:00", "13:30")
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

            // Display time in 24-hour format
            slots.push({
                value: timeString,
                display: timeString // Display time in 24-hour format
            });
        }
    }
    return slots;
};



const LabStaffDashboard = ({ accessToken }) => {
    const [labStaff, setLabStaff] = useState(null);
    const [testRequests, setTestRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [files, setFiles] = useState([]);
    const [resultSummary, setResultSummary] = useState('');
    const [summaryError, setSummaryError] = useState('');

    // Appointment scheduling states
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSuggestedSlot, setSelectedSuggestedSlot] = useState(null);
    const [slotsByDate, setSlotsByDate] = useState({});


    const getEarliestAvailableDay = () => {
        const today = new Date();
        const currentMonth = today.getMonth();  // Get current month
        const currentYear = today.getFullYear(); // Get current year
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // Get number of days in the current month

        const availableDays = [];

        // Loop through all the days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

            // Check if the date is in the past or fully booked
            const isFullyBooked = isDateFullyBooked(dateString);
            const isPast = isDateInPast(dateString);

            if (!isPast && !isFullyBooked) {
                availableDays.push(dateString);
            }
        }

        // Sort available days to find the earliest
        if (availableDays.length > 0) {
            const earliestDate = availableDays.sort((a, b) => new Date(a) - new Date(b))[0];
            return earliestDate;
        }

        return ''; // If no available day, return an empty string
    };

    // Fetch lab staff info
    useEffect(() => {
        const fetchLabStaffInfo = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const labStaff = await getLabStaffInfo(token);
                setLabStaff(labStaff);
            } catch (error) {
                console.error("Error fetching lab staff info:", error);
            }
        };
        fetchLabStaffInfo();
    }, []);

    // Fetch test requests
    useEffect(() => {
        const fetchTestRequests = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await getTestRequests(token);
                setTestRequests(response);
            } catch (error) {
                console.error("Error fetching test requests:", error);
            }
        };

        fetchTestRequests();
    }, [accessToken]);


    useEffect(() => {
        const fetchAvailableSlots = async () => {
            console.log('Current Month:', currentMonth);
            try {
                const token = localStorage.getItem('access_token'); // Get the token from localStorage
                const today = new Date();
                const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
                const lastDayOfMonth = getLastDayOfMonth(currentMonth);

                // Reset the time for comparison: use UTC date to avoid local time zone offset
                const todayAtMidnight = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

                let slots = [];

                // Determine the starting date for fetching available slots
                let currentDate;
                if (currentMonth === today.getMonth()) {
                    // If currentMonth is this month, start from today
                    currentDate = todayAtMidnight; // Using UTC midnight time
                    console.log('Starting from today:', currentDate.toLocaleDateString('en-CA')); // Log as 'YYYY-MM-DD'
                } else {
                    // Otherwise, start from the first day of the month
                    currentDate = new Date(firstDayOfMonth); // This will already be in the correct format
                    console.log('Starting from first day of month:', currentDate.toLocaleDateString('en-CA'));
                }

                const endDate = new Date(lastDayOfMonth); // Ensure end date is a Date object
                console.log('Fetching slots from:', currentDate.toLocaleDateString('en-CA'), 'to:', endDate.toLocaleDateString('en-CA'));

                // Loop through all the days of the month and fetch available slots
                while (currentDate <= endDate) {
                    const dateString = currentDate.toISOString().split('T')[0]; // Convert to 'YYYY-MM-DD' format
                    console.log('Fetching available slots for:', dateString); // Debug log

                    const response = await getAvailableSlots(dateString, token);

                    if (response && response.available_slots) {
                        slots = [...slots, ...response.available_slots];
                    }

                    // Increment the date by 1 (still a valid Date object)
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Use UTC setDate to avoid timezone issues
                }

                // Update the available slots state
                setAvailableSlots(slots);
                console.log('Available slots for the month:', slots);
            } catch (error) {
                console.error("Error fetching available slots:", error);
                setAvailableSlots([]);
            }
        };

        fetchAvailableSlots();
    }, [currentMonth]); // Trigger when `currentMonth` changes


    const handleDateSelect = (dateString) => {
        if (!dateString || isDateInPast(dateString) || isDateFullyBooked(dateString)) {
            return;
        }

        setSelectedDate(dateString);
        setSelectedTimeSlot('');

        // Get available slots from the state that was populated by the useEffect
        const availableSlotsForDate = availableSlots.filter(slot => {
            const slotDate = new Date(slot.start_time).toISOString().split('T')[0]; // Extract date part of the start_time
            return slotDate === dateString; // Only include slots for the selected date
        });

        // Update available slots for the selected date
        setAvailableSlots((prevSlots) => {
            return prevSlots.map(slot =>
                slot.date === dateString
                    ? { ...slot, available_slots: availableSlotsForDate }
                    : slot);
        });
    };


    //handle upload button click
    const handleUploadClick = (request) => {
        setSelectedRequest(request);
        setModalType('upload');
    };

    // Handle file selection
    const handleFileChange = (e) => {
        const fileList = e.target.files;  // This should be a FileList object
        setFiles(fileList);  // Save it in state
    };

    //Handle summary change
    const handleSummaryChange = (e) => {
        const value = e.target.value;
        if (value.length <= 500) {
            setResultSummary(value);
            setSummaryError('');
        } else {
            setSummaryError('Summary cannot exceed 500 characters');
        }
    };

    // Handle schedule appointment click
    const handleScheduleClick = (request) => {
        setSelectedRequest(request);
        setModalType('schedule');
        setSelectedTimeSlot('');

        // Auto-select the earliest available date when opening the modal
        const earliestDate = getEarliestAvailableDay();
        if (earliestDate) {
            handleDateSelect(earliestDate);
        } else {
            setSelectedDate('');
            setAvailableSlots([]);
        }
    };

    // Handle upload results
    const handleUploadResults = async () => {
        const token = localStorage.getItem('access_token');
        if (selectedRequest && selectedRequest.upload_token && files.length > 0) {
            const fileArray = Array.from(files);
            try {
                const response = await uploadLabResult(selectedRequest.upload_token, token, fileArray, resultSummary);
                alert(response.message);

                setTestRequests(prev =>
                    prev.map(req => req.id === selectedRequest.id ? { ...req, status: 'Uploaded' } : req)
                );

                setModalType(null);
                setSelectedRequest(null);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        } else {
            alert('Please select at least one file to upload.');
        }
    };


    // Handle logout modal actions
    const handleLogoutClick = () => {
        setShowUserDropdown(false);
        setShowLogoutModal(true);
    };

    const handleLogoutCancel = () => {
        setShowLogoutModal(false);
    };

    const handleLogoutConfirm = async () => {
        setShowLogoutModal(false);
        const token = localStorage.getItem('access_token');

        try {
            const res = await logout(token);

            if (res.status !== 200) {
                throw new Error('Logout failed on server');
            }

            // Clear client-side session
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');

            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
        }
    };

    const handleCloseModal = () => {
        setModalType(null);
        setSelectedRequest(null);
    };

    const filteredRequests = testRequests.filter(request => {
        const matchesSearch = request.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.testType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const navigateMonth = (direction) => {
        setCurrentMonth(prev => {
            // Calculate the new month integer value (0-based)
            const newMonth = prev + direction;

            // Ensure the new month is within the range [0, 11]
            if (newMonth < 0) {
                return 11; // December
            } else if (newMonth > 11) {
                return 0; // January
            }

            console.log('Month changed to:', newMonth); // Logs the month as integer (0-11)

            return newMonth;
        });
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


    const isDateFullyBooked = (dateString) => {
        // Filter the availableSlots based on the start_time matching the provided dateString
        const filteredSlots = availableSlots.filter(slot => {
            const slotDate = new Date(slot.start_time).toISOString().split('T')[0]; // Extract the date part of the start_time
            return slotDate === dateString; // Compare it with the dateString
        });

        if (availableSlots.length > 0 && !isDateInPast(dateString)) {
            return filteredSlots.length == 0;
        }
        return false;
    };


    console.log(isDateFullyBooked("2025-08-16"));


    const handleTimeSlotSelect = (timeSlot) => {
        if (timeSlot.isAvailable) {
            setSelectedTimeSlot(timeSlot.value);
        }
    };

    const handleConfirmAppointment = () => {
        if (selectedDate && selectedTimeSlot && selectedRequest) {
            // Update the request status to scheduled
            setTestRequests(prev =>
                prev.map(req =>
                    req.id === selectedRequest.id
                        ? { ...req, status: 'scheduled' }
                        : req
                )
            );

            let selectedSlot;
            if (selectedSuggestedSlot) {
                selectedSlot = { display: selectedSuggestedSlot.display };
            } else {
                selectedSlot = availableSlots.find(slot => slot.value === selectedTimeSlot);
            }
            alert(`Appointment scheduled successfully!\nDate: ${selectedDate}\nTime: ${selectedSlot?.display}\nPatient: ${selectedRequest.patient.name}`);
            handleCloseModal();
        }
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);

        // Create a Date object using currentMonth and currentYear
        const currentDate = new Date(new Date().getFullYear(), currentMonth, 1);

        // Get the month name and year in 'Month Year' format
        const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = getFirstDayOfMonth(currentMonth); // Assuming this is still working based on your updated code
        const days = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Add day headers
        dayNames.forEach(day => {
            days.push(
                <div key={day} className="lab-calendar-day-header">
                    {day}
                </div>
            );
        });

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="lab-calendar-day lab-calendar-day-empty"></div>);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isFullyBooked = isDateFullyBooked(dateString);
            const isPast = isDateInPast(dateString);
            const isSelected = selectedDate === dateString;
            const isDisabled = isPast || availableSlots.length == 0;

            days.push(
                <div
                    key={day}
                    className={`lab-calendar-day ${isSelected ? 'lab-calendar-day-selected' : ''} ${isDisabled ? 'lab-calendar-day-disabled' : 'lab-calendar-day-available'}`}
                    onClick={() => handleDateSelect(dateString)}
                >
                    <span className="lab-calendar-day-number">{day}</span>
                    {isFullyBooked && (
                        <span className="lab-calendar-day-status">Fully Booked</span>
                    )}
                </div>
            );
        }

        return (
            <div className="lab-calendar-container">
                <div className="lab-calendar-header">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="lab-calendar-nav-btn"
                    >
                        <ChevronLeft className="lab-calendar-nav-icon" />
                    </button>
                    <h4 className="lab-calendar-month-year">{monthYear}</h4>
                    <button
                        onClick={() => navigateMonth(1)}
                        className="lab-calendar-nav-btn"
                    >
                        <ChevronRight className="lab-calendar-nav-icon" />
                    </button>
                </div>
                <div className="lab-calendar-grid">
                    {days}
                </div>
            </div>
        );
    };



    return (
        <div className="lab-dashboard-container">
            {/* Header */}
            <header className="lab-header">
                <div className="lab-header-content">
                    <div className="lab-header-inner">
                        <div className="lab-header-left">
                            <div className="lab-logo-section">
                                <div className="lab-logo-icon">
                                    <Heart className="lab-logo-heart" />
                                </div>
                                <div>
                                    <h1 className="lab-logo-title">HealthConnect</h1>
                                    <p className="lab-logo-subtitle">Lab Staff Dashboard</p>
                                </div>
                            </div>
                        </div>

                        {/* User Info with TestTube Icon */}
                        <div className="lab-user-info" onClick={() => setShowUserDropdown(!showUserDropdown)}>
                            <div className="lab-user-card lab-user-card-clickable">
                                <div className="lab-user-icon">
                                    <TestTube className="lab-testtube-icon" />
                                </div>
                                <div className="lab-user-details">
                                    <p className="lab-user-name">
                                        {labStaff ? `${labStaff.name}` : 'Loading...'}
                                    </p>
                                    <p className="lab-user-role">Lab Technician</p>
                                </div>
                                <ChevronDown className={`lab-user-dropdown-icon ${showUserDropdown ? 'lab-user-dropdown-icon-rotated' : ''}`} />
                            </div>
                            {/* User Dropdown */}
                            {showUserDropdown && (
                                <div className="lab-user-dropdown-menu">
                                    <button
                                        onClick={handleLogoutClick}
                                        className="lab-user-dropdown-item lab-logout-item"
                                    >
                                        <LogOut className="lab-dropdown-item-icon" />
                                        <span>Log Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="lab-main-content">
                {/* Page Title and Filters */}
                <div className="lab-page-header">
                    <h2 className="lab-page-title">Test Requests</h2>

                    <div className="lab-filters-container">
                        {/* Search */}
                        <div className="lab-search-container">
                            <Search className="lab-search-icon" />
                            <input
                                type="text"
                                placeholder="Search patients, doctors, or tests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="lab-search-input"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="lab-filter-container">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="lab-status-filter"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="uploaded">Uploaded</option>
                            </select>
                            <Filter className="lab-filter-icon" />
                        </div>
                    </div>
                </div>

                {/* Test Requests List */}
                <TestRequestList
                    filteredRequests={filteredRequests}
                    handleUploadClick={handleUploadClick}
                    handleScheduleClick={handleScheduleClick}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                />
            </main >

            {/* Modal for Uploading Test Results */}
            {modalType === 'upload' && selectedRequest && (
                <UploadResultsModal
                    selectedRequest={selectedRequest}
                    onClose={handleCloseModal}
                    onFileChange={handleFileChange}
                    onUpload={handleUploadResults}
                    resultSummary={resultSummary}
                    handleSummaryChange={handleSummaryChange}
                    summaryError={summaryError}
                    files={files}
                />
            )}

            {/* Schedule Appointment Modal */}
            {modalType === 'schedule' && selectedRequest && (
                <div className="lab-modal-overlay">
                    <div className="lab-modal-container lab-modal-large">
                        <div className="lab-modal-header lab-modal-header-orange">
                            <h3 className="lab-modal-title">Schedule Appointment for {selectedRequest.patient_name}</h3>
                            <button
                                onClick={handleCloseModal}
                                className="lab-modal-close"
                            >
                                <X className="lab-close-icon" />
                            </button>
                        </div>

                        <div className="lab-modal-body">
                            <div className="lab-modal-content">
                                {/* Patient and Test Info */}
                                <div className="lab-appointment-info-card">
                                    <h4 className="lab-section-title">Appointment Details</h4>
                                    <div className="lab-appointment-info-grid">
                                        <div className="lab-appointment-info-item">
                                            <User className="lab-info-icon" />
                                            <span><strong>Patient:</strong> {selectedRequest.patient_name}</span>
                                        </div>
                                        <div className="lab-appointment-info-item">
                                            <TestTube className="lab-info-icon" />
                                            <span><strong>Test:</strong> {selectedRequest.testType}</span>
                                        </div>
                                        <div className="lab-appointment-info-item">
                                            <Clock className="lab-info-icon" />
                                            <span><strong>Status:</strong> {selectedRequest.status}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Date and Time Slot Picker Section */}
                                <div className="lab-date-time-picker-container">
                                    {/* Date Picker */}
                                    <div className="lab-date-picker-section">
                                        <h4 className="lab-section-title">Select Date</h4>
                                        {renderCalendar()}
                                    </div>

                                    {/* Time Slots */}
                                    {selectedDate && (
                                        <div className="lab-time-slots-section">
                                            <h4 className="lab-section-title">Available Time Slots for {selectedDate}</h4>
                                            {selectedRequest.status === 'rejected' && (
                                                <p className="lab-time-slots-note">You can also select from patient suggested slots above or choose any available slot below.</p>
                                            )}
                                            <div className="lab-time-slots-grid">
                                                {availableSlots.map((slot) => (
                                                    <button
                                                        key={slot.id}
                                                        onClick={() => handleTimeSlotSelect(slot)}
                                                        disabled={!slot.isAvailable}
                                                        className={`lab-time-slot ${selectedTimeSlot === slot.value && !selectedSuggestedSlot
                                                            ? 'lab-time-slot-selected'
                                                            : ''
                                                            } ${slot.isBooked
                                                                ? 'lab-time-slot-booked'
                                                                : slot.isAvailable
                                                                    ? 'lab-time-slot-available'
                                                                    : 'lab-time-slot-disabled'
                                                            }`}
                                                    >
                                                        <span className="lab-time-slot-time">{calendarDateFormat(slot.start_time)}</span>
                                                        {slot.isBooked && (
                                                            <span className="lab-time-slot-label">Booked</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Selected Appointment Summary */}
                                {selectedDate && selectedTimeSlot && (
                                    <div className="lab-appointment-summary">
                                        <h4 className="lab-section-title">Selected Appointment</h4>
                                        <div className="lab-appointment-summary-card">
                                            <div className="lab-appointment-summary-item">
                                                <Calendar className="lab-appointment-summary-icon" />
                                                <span><strong>Date:</strong> {selectedDate}</span>
                                            </div>
                                            <div className="lab-appointment-summary-item">
                                                <Clock className="lab-appointment-summary-icon" />
                                                <span>
                                                    <strong>Time:</strong> {
                                                        selectedSuggestedSlot
                                                            ? selectedSuggestedSlot.display
                                                            : availableSlots.find(slot => slot.value === selectedTimeSlot)?.display
                                                    }
                                                </span>
                                            </div>
                                            <div className="lab-appointment-summary-item">
                                                <User className="lab-appointment-summary-icon" />
                                                <span><strong>Patient:</strong> {selectedRequest.patient_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="lab-modal-actions">
                                    <button
                                        onClick={handleCloseModal}
                                        className="lab-btn lab-btn-cancel"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmAppointment}
                                        disabled={!selectedDate || !selectedTimeSlot}
                                        className="lab-btn lab-btn-confirm-appointment"
                                    >
                                        <CalendarDays className="lab-btn-icon" />
                                        Confirm Appointment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            <LogoutModal
                showModal={showLogoutModal}
                onConfirmLogout={handleLogoutConfirm}
                onCancelLogout={handleLogoutCancel}
            />
        </div >
    );
};


export default LabStaffDashboard;
