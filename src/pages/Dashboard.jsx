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

// ── STATS HELPER ──────────────────────────────────────────
const getMostCommon = (arr, key) => {
  if (!arr.length) return "—";
  const freq = {};
  arr.forEach((s) => {
    const v = s[key];
    if (v) freq[v] = (freq[v] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
};

const getThisWeek = (arr) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return arr.filter((s) => new Date(s.created_at) >= weekAgo).length;
};

const getGenderCount = (arr, gender) =>
  arr.filter((s) => s.gender?.toLowerCase() === gender.toLowerCase()).length;

// ── STAT CARD COMPONENT ───────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="stat-card" style={{ "--accent": color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-body">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
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
    if (search)
      result = result.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()),
      );
    if (dateFilter)
      result = result.filter((s) => s.created_at.startsWith(dateFilter));
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

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const stats = {
    total: submissions.length,
    thisWeek: getThisWeek(submissions),
    male: getGenderCount(submissions, "male"),
    female: getGenderCount(submissions, "female"),
    topBlood: getMostCommon(submissions, "blood_group"),
    topGenotype: getMostCommon(submissions, "genotype"),
    topBank: (() => {
      const raw = getMostCommon(submissions, "bank_name");
      if (!raw || raw === "—") return "—";
      // Extract just bank name before ' — ' or ' - '
      const parts = raw.split(/\s[—\-]\s/);
      return parts[0]?.trim() || raw;
    })(),
  };

  return (
    <div className="dashboard-wrapper">
      {/* Modals */}
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

      {/* ── STATS OVERVIEW ── */}
      {!loading && submissions.length > 0 && (
        <div className="stats-grid">
          {/* Total Employees — group of people */}
          <StatCard
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
            label="Total Employees"
            value={stats.total}
            sub="All time submissions"
            color="#7c3aed"
          />
          {/* This Week — calendar */}
          <StatCard
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            label="This Week"
            value={stats.thisWeek}
            sub="Last 7 days"
            color="#6d28d9"
          />
          {/* Male — male gender symbol */}
          <StatCard
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="10" cy="14" r="5" />
                <path d="M19 5l-5.5 5.5M19 5h-5M19 5v5" />
              </svg>
            }
            label="Male"
            value={stats.male}
            sub={`${stats.total ? Math.round((stats.male / stats.total) * 100) : 0}% of total`}
            color="#4f46e5"
          />
          {/* Female — female gender symbol */}
          <StatCard
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="9" r="5" />
                <path d="M12 14v6M9 17h6" />
              </svg>
            }
            label="Female"
            value={stats.female}
            sub={`${stats.total ? Math.round((stats.female / stats.total) * 100) : 0}% of total`}
            color="#7c3aed"
          />
          {/* Top Blood Group — blood drop */}
          <StatCard
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0014 0c0-4.5-7-12-7-12z" />
              </svg>
            }
            label="Top Blood Group"
            value={stats.topBlood}
            sub="Most common"
            color="#9333ea"
          />
          {/* Top Genotype — DNA helix style */}
          <StatCard
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M6 3c0 4 12 4 12 8S6 17 6 21M18 3c0 4-12 4-12 8s12 6 12 10" />
                <line x1="6" y1="8" x2="18" y2="8" />
                <line x1="6" y1="16" x2="18" y2="16" />
              </svg>
            }
            label="Top Genotype"
            value={stats.topGenotype}
            sub="Most common"
            color="#a855f7"
          />
          {/* Top Bank — bank building with columns */}
          <StatCard
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 10h18M3 18h18M12 3L3 8h18L12 3z" />
                <line x1="7" y1="10" x2="7" y2="18" />
                <line x1="12" y1="10" x2="12" y2="18" />
                <line x1="17" y1="10" x2="17" y2="18" />
              </svg>
            }
            label="Top Bank"
            value={stats.topBank}
            sub="Most used"
            color="#c026d3"
          />
        </div>
      )}

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
