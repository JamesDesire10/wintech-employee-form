import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./EmployeeDetail.css";
import logo from "../assets/logo.jpg";

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    const { data, error } = await supabase
      .from("employee_submissions")
      .select("*")
      .eq("id", id)
      .single();
    if (!error) setEmployee(data);
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) return <div className="detail-loading">⏳ Loading...</div>;
  if (!employee)
    return <div className="detail-loading">Employee not found</div>;

  const documents = [
    { label: "CV", url: employee.cv_url },
    { label: "Highest Qualification", url: employee.qualification_url },
    { label: "NYSC Certificate", url: employee.nysc_url },
    { label: "Birth Certificate", url: employee.birth_certificate_url },
    { label: "Marriage Certificate", url: employee.marriage_certificate_url },
    { label: "Valid ID", url: employee.valid_id_url },
  ];

  return (
    <div className="detail-wrapper">
      {/* Header */}
      <div className="detail-header">
        <div className="dashboard-brand">
          <img src={logo} alt="WINTECH" className="dashboard-logo" />
          <div>
            <span className="dashboard-brand-name">WINTECH</span>
            <span className="dashboard-brand-sub"> GLOBAL</span>
          </div>
        </div>
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>

      <div className="detail-container">
        {/* Employee Name Banner */}
        <div className="detail-banner">
          <div className="detail-avatar">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt={employee.name}
                className="detail-avatar-img"
              />
            ) : (
              employee.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1>{employee.name}</h1>
            <p>Submitted on {formatDate(employee.created_at)}</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="detail-card">
          <div className="detail-card-header">
            <span className="detail-card-icon">👤</span>
            <h2>Personal Information</h2>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{employee.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gender</span>
              <span className="detail-value">{employee.gender}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date of Birth</span>
              <span className="detail-value">{employee.date_of_birth}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Nationality</span>
              <span className="detail-value">{employee.nationality}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Religion</span>
              <span className="detail-value">{employee.religion}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Marital Status</span>
              <span className="detail-value">{employee.marital_status}</span>
            </div>
            <div className="detail-item full">
              <span className="detail-label">Current Address</span>
              <span className="detail-value">{employee.address}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone Numbers</span>
              <span className="detail-value">{employee.phone}</span>
            </div>
          </div>
        </div>

        {/* Health Information */}
        <div className="detail-card">
          <div className="detail-card-header">
            <span className="detail-card-icon">🩺</span>
            <h2>Health Information</h2>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Blood Group</span>
              <span className="detail-value badge-value">
                {employee.blood_group}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Genotype</span>
              <span className="detail-value badge-value">
                {employee.genotype}
              </span>
            </div>
          </div>
        </div>

        {/* Contact & Family */}
        <div className="detail-card">
          <div className="detail-card-header">
            <span className="detail-card-icon">👨‍👩‍👧</span>
            <h2>Contact & Family</h2>
          </div>
          <div className="detail-grid">
            <div className="detail-item full">
              <span className="detail-label">Emergency Contact</span>
              <span className="detail-value">{employee.emergency_contact}</span>
            </div>
            <div className="detail-item full">
              <span className="detail-label">Next of Kin</span>
              <span className="detail-value">{employee.next_of_kin}</span>
            </div>
          </div>
        </div>

        {/* Banking Details */}
        <div className="detail-card">
          <div className="detail-card-header">
            <span className="detail-card-icon">🏦</span>
            <h2>Salary Account Details</h2>
          </div>
          <div className="detail-grid">
            <div className="detail-item full">
              <span className="detail-label">Bank Name & Account Name</span>
              <span className="detail-value">{employee.bank_name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Account Number</span>
              <span className="detail-value account-number">
                {employee.account_number}
              </span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="detail-card">
          <div className="detail-card-header">
            <span className="detail-card-icon">📁</span>
            <h2>Documents</h2>
          </div>
          <div className="documents-grid">
            {documents.map(({ label, url }) => (
              <div key={label} className="document-item">
                <span className="document-label">{label}</span>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="document-link"
                  >
                    📎 View Document
                  </a>
                ) : (
                  <span className="document-missing">Not Uploaded</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
