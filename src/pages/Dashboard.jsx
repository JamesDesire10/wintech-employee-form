import { useState, useEffect, useRef } from "react";
import React from "react";
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

// ── STATS HELPERS ─────────────────────────────────────────
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

// ── STAT CARD ─────────────────────────────────────────────
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

// ── SORT ICON ─────────────────────────────────────────────
const SortIcon = ({ column, sortKey, sortDir }) => {
  if (sortKey !== column)
    return (
      <svg
        className="sort-icon sort-idle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
      </svg>
    );
  return sortDir === "asc" ? (
    <svg
      className="sort-icon sort-active"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5l-7 7h14l-7-7z" />
    </svg>
  ) : (
    <svg
      className="sort-icon sort-active"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 19l7-7H5l7 7z" />
    </svg>
  );
};

const ROWS_PER_PAGE = 10;
const IDLE_TIMEOUT = 15 * 60 * 1000;
const WARNING_BEFORE = 60 * 1000;

const Dashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();

  // ── SESSION TIMEOUT ───────────────────────────────────
  useEffect(() => {
    let idleTimer = null;
    let warningTimer = null;
    let countdownInterval = null;

    const resetTimers = () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      setShowTimeoutWarning(false);
      setCountdown(60);

      warningTimer = setTimeout(() => {
        setShowTimeoutWarning(true);
        let secs = 60;
        setCountdown(secs);
        countdownInterval = setInterval(() => {
          secs -= 1;
          setCountdown(secs);
          if (secs <= 0) clearInterval(countdownInterval);
        }, 1000);
      }, IDLE_TIMEOUT - WARNING_BEFORE);

      idleTimer = setTimeout(() => {
        sessionStorage.removeItem("wintech_admin");
        navigate("/admin");
      }, IDLE_TIMEOUT);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((e) =>
      window.addEventListener(e, resetTimers, { passive: true }),
    );
    resetTimers();

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      events.forEach((e) => window.removeEventListener(e, resetTimers));
    };
  }, [navigate]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    let result = [...submissions];
    if (search)
      result = result.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()),
      );
    if (dateFilter)
      result = result.filter((s) => s.created_at.startsWith(dateFilter));

    result.sort((a, b) => {
      let aVal = a[sortKey] ?? "";
      let bVal = b[sortKey] ?? "";
      if (sortKey === "created_at") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    setFiltered(result);
    setCurrentPage(1);
  }, [search, dateFilter, submissions, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginatedRows = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

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
      return raw.split(/\s[—\-]\s/)[0]?.trim() || raw;
    })(),
  };

  const columns = [
    { label: "Name", key: "name" },
    { label: "Gender", key: "gender" },
    { label: "Phone", key: "phone" },
    { label: "Blood Group", key: "blood_group" },
    { label: "Genotype", key: "genotype" },
    { label: "Bank", key: "bank_name" },
    { label: "Submitted", key: "created_at" },
  ];

  return (
    <div className="dashboard-wrapper">
      {/* Session Timeout Warning */}
      {showTimeoutWarning && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">⏱️</div>
            <h2 className="modal-title">Still there?</h2>
            <p className="modal-message">
              You've been inactive. Auto-logout in{" "}
              <strong style={{ color: "#e879f9" }}>{countdown}s</strong>.
            </p>
            <div className="timeout-bar-track">
              <div
                className="timeout-bar-fill"
                style={{ width: `${(countdown / 60) * 100}%` }}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button
                className="modal-confirm confirm-export"
                onClick={() => setShowTimeoutWarning(false)}
              >
                I'm still here
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Stats */}
      {!loading && submissions.length > 0 && (
        <div className="stats-grid">
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
        <>
          <div className="table-wrap">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map(({ label, key }) => (
                    <th
                      key={key}
                      className="sortable-th"
                      onClick={() => handleSort(key)}
                    >
                      <div className="th-inner">
                        {label}
                        <SortIcon
                          column={key}
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </div>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((s, index) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/dashboard/${s.id}`)}
                    className="table-row"
                  >
                    <td>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</td>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  «
                </button>
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1,
                  )
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`dot-${i}`} className="page-dots">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`page-btn ${currentPage === p ? "active" : ""}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next ›
                </button>
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
