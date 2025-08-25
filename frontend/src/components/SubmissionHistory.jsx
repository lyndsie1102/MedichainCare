import { Calendar, Camera, Eye, FilterIcon } from 'lucide-react';
import { formatDate, getSymptomStatusIcon, getSymptomStatusColor } from '../utils/Helpers'


const SubmissionHistory = ({ submissions, handleViewClick, setStatusFilter, setStartDate, setEndDate }) => {
  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <section className="history-section">
      <h2>Submission History</h2>

      {/* Filter section */}
      <div className="filters-section">
        <div className="filters-header">
          <div className="filters-title">
            <FilterIcon className="filters-icon" />
            <span>Filters</span>
          </div>
          <button
            onClick={clearAllFilters}
            className="clear-filters-btn"
          >
            Clear All
          </button>
        </div>


        <div className="filters-grid">
          {/*Status Filter*/}
          <div className="filter-group">
            <label htmlFor="status-filter" className="filter-label">Status</label>
            <select
              id="status-filter"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Assigned to Lab">Assigned to Lab</option>
              <option value="Tested">Tested</option>
              <option value="Diagnosed">Diagnosed</option>
              <option value="Waiting for Test">Waiting for Test</option>
              <option value="Referred">Referred</option>
            </select>
          </div>

          {/*Date range filter*/}
          <div className="filter-group date-group">
            <div className="filter-date">
              <label htmlFor="start-date-filter" className="filter-label">Start Date</label>
              <input
                id="start-date-filter"
                type="date"
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="filter-date">
              <label htmlFor="end-date-filter" className="filter-label">End Date</label>
              <input
                id="end-date-filter"
                type="date"
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="submissions-list">
        {submissions.length === 0 ? (
          <p>No submissions yet. Submit your symptoms above!</p>
        ) : (
          submissions.map((s) => (
            <div key={s.id} className="submission-card">
              <div className="submission-header">
                <div className="date-time">
                  <Calendar size={16} />
                  <span>{formatDate(s.submitted_at)}</span>
                  {s.images && s.images.length > 0 && (
                    <div className="image-tag"><Camera size={14} /> Image attached</div>
                  )}
                </div>
                <div className="status-action">
                  <div className={getSymptomStatusColor(s.status)}>
                    {getSymptomStatusIcon(s.status)} <span>{s.status}</span>
                  </div>
                  <button
                    onClick={() => handleViewClick(s)}
                    className="btn btn-view"
                  >
                    <Eye className="btn-icon" />
                    <span>View</span>
                  </button>
                </div>
              </div>
              <p>{s.symptoms}</p>
            </div>
          ))
        )}
      </div>
    </section >
  );
};

export default SubmissionHistory;
