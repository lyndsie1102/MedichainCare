import { Clock, CheckCircle, FileCheck, FlaskRound, Hourglass, ArrowRight } from 'lucide-react'
import { jwtDecode } from 'jwt-decode';  // Correct import for latest version

const getRequestStatusIcon = (status) => {
    switch (status) {
        case 'Pending':
            return <Clock className="status-icon status-icon-red" />;
        case 'Uploaded':
            return <CheckCircle className="status-icon status-icon-green" />;
        default:
            return <Clock className="status-icon status-icon-gray" />;
    }
};

const getRequestStatusColor = (status) => {
    switch (status) {
        case 'Pending':
            return 'status-badge status-badge-red';
        case 'Uploaded':
            return 'status-badge status-badge-green';
        default:
            return 'status-badge status-badge-gray';
    }
};

const getSymptomStatusIcon = (status) => {
    switch (status) {
        case 'Pending':
            return <Clock className="status-icon status-icon-pending" />;
        case 'Tested':
            return <FileCheck className="status-icon status-icon-tested" />;
        case 'Assigned to Lab':
            return <FlaskRound className="status-icon status-icon-assigned" />;
        case 'Diagnosed':
            return <CheckCircle className="status-icon status-icon-diagnosed" />;
        case 'Waiting for Test':
            return <Hourglass className="status-icon status-icon-waiting" />;
        case 'Referred':
            return <ArrowRight className="status-icon status-icon-referred" />;
        default:
            return <Clock className="status-icon status-icon-gray" />;
    }
};

const getSymptomStatusColor = (status) => {
    switch (status) {
        case 'Pending':
            return 'status-badge status-badge-pending';
        case 'Tested':
            return 'status-badge status-badge-tested';
        case 'Assigned to Lab':
            return 'status-badge status-badge-assigned';
        case 'Diagnosed':
            return 'status-badge status-badge-diagnosed';
        case 'Waiting for Test':
            return 'status-badge status-badge-waiting';
        case 'Referred':
            return 'status-badge status-badge-referred';
        default:
            return 'status-badge status-badge-gray';
    }
};

// Format the date and time into a human-readable format
const formatDate = (dateString) => {
    if (!dateString.endsWith('Z')) {
        dateString += 'Z';
    }
    const utcDate = new Date(dateString);  // Parse the date string in UTC
    const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone  // Use the browser's local time zone, which takes DST into account
    };

    // Format the date in the user's local time zone (with DST adjustments)
    return new Intl.DateTimeFormat('en-US', options).format(utcDate);
};

const formatAddress = (address) => {
    const shortEthAddress = `0x...${address.slice(-5)}`;
    return shortEthAddress;
}

const copyAddressToClipboard = (address) => {
    navigator.clipboard.writeText(address);
  };

export {
    getRequestStatusIcon, getRequestStatusColor, getSymptomStatusColor, getSymptomStatusIcon,
    formatDate, formatAddress, copyAddressToClipboard
};