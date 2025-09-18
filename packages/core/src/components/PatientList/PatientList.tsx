import React, { useState } from 'react';
import { usePatients } from '../../hooks/usePatients';
import type { Patient } from '../../types';
import './PatientList.css';

interface PatientListProps {
  apiUrl?: string;
  mode?: 'standalone' | 'embedded';
  onSelect?: (patient: Patient) => void;
  pageSize?: number;
}

export const PatientList: React.FC<PatientListProps> = ({
  apiUrl,
  mode = 'standalone',
  onSelect,
  pageSize = 20,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSizeState, setPageSizeState] = useState(pageSize);

  const { patients, isLoading, error, refetch, total } = usePatients({
    apiUrl,
    mode,
    pageSize: pageSizeState,
    offset: currentPage * pageSizeState,
  });

  const filteredPatients = patients.filter((patient) => {
    if (!searchTerm) return true;
    const name = patient.name?.[0];
    const fullName = `${name?.given?.join(' ')} ${name?.family}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const handleSelect = (patient: Patient) => {
    setSelectedId(patient.id);
    onSelect?.(patient);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  if (error) {
    return (
      <div className="patient-list-error">
        <p>Error loading patients</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="patient-list">
      <div className="patient-list-header">
        <h2>Patients ({filteredPatients.length})</h2>
        <div className="patient-list-controls">
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="patient-search-input"
          />
          <button onClick={() => refetch()} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="patient-list-loading">Loading patients...</div>
      ) : (
        <div className="patient-list-container">
          {filteredPatients.length === 0 ? (
            <div className="patient-list-empty">No patients found</div>
          ) : (
            <table className="patient-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Birth Date</th>
                  <th>City</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const name = patient.name?.[0];
                  const address = patient.address?.[0];
                  return (
                    <tr
                      key={patient.id}
                      className={selectedId === patient.id ? 'selected' : ''}
                      onClick={() => handleSelect(patient)}
                    >
                      <td>{patient.id}</td>
                      <td>
                        {name?.given?.join(' ')} {name?.family}
                      </td>
                      <td>{patient.gender || 'Unknown'}</td>
                      <td>{formatDate(patient.birthDate)}</td>
                      <td>{address?.city || 'Unknown'}</td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(patient);
                          }}
                          className="view-btn"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          {filteredPatients.length > 0 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                Showing {currentPage * pageSizeState + 1} to{' '}
                {Math.min((currentPage + 1) * pageSizeState, total || patients.length)} of{' '}
                {total || patients.length} patients
              </div>

              <div className="pagination-actions">
                <select
                  value={pageSizeState}
                  onChange={(e) => {
                    setPageSizeState(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="page-size-select"
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>

                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="pagination-btn"
                >
                  Previous
                </button>

                <span className="page-number">
                  Page {currentPage + 1} of {Math.ceil((total || patients.length) / pageSizeState)}
                </span>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={(currentPage + 1) * pageSizeState >= (total || patients.length)}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};