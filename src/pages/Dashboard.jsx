import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";
import logo from "../assets/logo.jpg";

const Modal = ({
  title,
  message,
  icon,
  onConfirm,
  onCancel,
  confirmText,
  confirmClass,
}) => (
  <div className="modal-overlay">
    <div className="modal-card">
      <div className="modal-icon">{icon}</div>
      <h2 className="modal-title">{title}</h2>
      <p className="modal-message">{message}</p>
      <div className="modal-actions">
        <button className="modal-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className={`modal-confirm ${confirmClass}`} onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    let result = submissions;
    if (search) {
      result = result.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (dateFilter) {
      result = result.filter((s) => s.created_at.startsWith(dateFilter));
    }
    setFiltered(result);
  }, [search, dateFilter, submissions]);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employee_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      setSubmissions(data);
      setFiltered(data);
    }
    setLoading(false);
  };

  const handleDeleteClick = (id, name, e) => {
    e.stopPropagation();
    setDeleteTarget({ id, name });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    const { error } = await supabase
      .from("employee_submissions")
      .delete()
      .eq("id", deleteTarget.id);
    if (!error) fetchSubmissions();
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleExport = async () => {
    const headers = [
      "Name",
      "Address",
      "Phone",
      "Gender",
      "Date of Birth",
      "Religion",
      "Nationality",
      "Emergency Contact",
      "Next of Kin",
      "Marital Status",
      "Blood Group",
      "Genotype",
      "CV",
      "Qualification",
      "NYSC",
      "Birth Certificate",
      "Marriage Certificate",
      "Valid ID",
      "Bank Name",
      "Account Number",
      "Submitted At",
    ];
    const rows = filtered.map((s) => [
      s.name,
      s.address,
      s.phone,
      s.gender,
      s.date_of_birth,
      s.religion,
      s.nationality,
      s.emergency_contact,
      s.next_of_kin,
      s.marital_status,
      s.blood_group,
      s.genotype,
      s.cv_url,
      s.qualification_url,
      s.nysc_url,
      s.birth_certificate_url,
      s.marriage_certificate_url,
      s.valid_id_url,
      s.bank_name,
      s.account_number,
      s.created_at,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v || ""}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wintech-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    await supabase.from("audit_logs").insert({
      action: "CSV_EXPORT",
      details: `Exported ${filtered.length} submissions on ${new Date().toLocaleString()}`,
    });
  };

  const handleLogoutConfirm = () => {
    sessionStorage.removeItem("wintech_admin");
    navigate("/admin");
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="dashboard-wrapper">
      {/* Logout Modal */}
      {showLogoutModal && (
        <Modal
          icon="🚪"
          title="Logout"
          message="Are you sure you want to logout of the admin dashboard?"
          confirmText="Yes, Logout"
          confirmClass="confirm-danger"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          icon="🗑️"
          title="Delete Submission"
          message={`Are you sure you want to delete ${deleteTarget?.name}'s submission? This action cannot be undone.`}
          confirmText="Yes, Delete"
          confirmClass="confirm-danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <Modal
          icon="📥"
          title="Export Submissions"
          message={`You are about to export ${filtered.length} employee submissions. This file will contain sensitive personal data including bank details. Are you sure?`}
          confirmText="Yes, Export"
          confirmClass="confirm-export"
          onConfirm={() => {
            handleExport();
            setShowExportModal(false);
          }}
          onCancel={() => setShowExportModal(false)}
        />
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-brand">
          <img src={logo} alt="WINTECH" className="dashboard-logo" />
          <div>
            <span className="dashboard-brand-name">WINTECH</span>
            <span className="dashboard-brand-sub"> GLOBAL</span>
          </div>
        </div>
        <div className="dashboard-header-right">
          <span className="submissions-count">
            {filtered.length} Submissions
          </span>
          <button
            className="export-btn"
            onClick={() => setShowExportModal(true)}
          >
            📥 Export CSV
          </button>
          <button
            className="logout-btn"
            onClick={() => setShowLogoutModal(true)}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="dashboard-title">
        <h1>
          Employee <span>Submissions</span>
        </h1>
        <p>View and manage all employee information submissions</p>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="date-filter"
        />
        {(search || dateFilter) && (
          <button
            className="clear-btn"
            onClick={() => {
              setSearch("");
              setDateFilter("");
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">⏳ Loading submissions...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No submissions found</div>
      ) : (
        <div className="table-wrap">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Blood Group</th>
                <th>Genotype</th>
                <th>Bank</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, index) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/dashboard/${s.id}`)}
                  className="table-row"
                >
                  <td>{index + 1}</td>
                  <td className="name-cell">{s.name}</td>
                  <td>{s.gender}</td>
                  <td>{s.phone}</td>
                  <td>
                    <span className="badge">{s.blood_group}</span>
                  </td>
                  <td>
                    <span className="badge">{s.genotype}</span>
                  </td>
                  <td>{s.bank_name}</td>
                  <td>{formatDate(s.created_at)}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/${s.id}`);
                      }}
                    >
                      👁 View
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeleteClick(s.id, s.name, e)}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
