import { Clock, CheckCircle } from 'lucide-react';

const getStatusIcon = (status) => {
    switch (status) {
        case 'Pending':
            return <Clock className="status-icon status-icon-red" />;
        case 'Uploaded':
            return <CheckCircle className="status-icon status-icon-green" />;
        default:
            return <Clock className="status-icon status-icon-gray" />;
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Pending':
            return 'status-badge status-badge-red';
        case 'Uploaded':
            return 'status-badge status-badge-green';
        default:
            return 'status-badge status-badge-gray';
    }
};


export { getStatusIcon, getStatusColor };