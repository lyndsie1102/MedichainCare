import { X, LogOut } from 'lucide-react';

const LogoutModal = ({ showModal, onConfirmLogout, onCancelLogout }) => {
  if (!showModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-small">
        <div className="modal-header modal-header-red">
          <h3 className="modal-title">Confirm Logout</h3>
          <button onClick={onCancelLogout} className="modal-close">
            <X className="close-icon" />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-content">
            <div className="logout-confirmation">
              <div className="logout-icon-container">
                <LogOut className="logout-confirmation-icon" />
              </div>
              <p className="logout-message">
                Are you sure you want to log out? You will need to sign in again to access the dashboard.
              </p>

              <div className="logout-actions">
                <button onClick={onCancelLogout} className="btn btn-cancel">
                  Cancel
                </button>
                <button onClick={onConfirmLogout} className="btn btn-logout-confirm">
                  <LogOut className="btn-icon" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
