import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './EmployeeForm.css'
import logo from '../assets/logo.jpg'

const EmployeeForm = () => {
  const [formData, setFormData] = useState({
    name: '', address: '', phone: '', gender: '',
    dob: '', religion: '', nationality: '', emergency: '',
    nextofkin: '', marital: '', bloodgroup: '', genotype: '',
    bankname: '', accountnum: ''
  })

  const [files, setFiles] = useState({
    cv: null, qualification: null, nysc: null,
    birth: null, marriage: null, validid: null
  })

  const [fileNames, setFileNames] = useState({
    cv: '', qualification: '', nysc: '',
    birth: '', marriage: '', validid: ''
  })

  const [status, setStatus] = useState('idle') // idle | uploading | saving | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFile = (e, field) => {
    const file = e.target.files[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.type)) {
      alert(`${field}: Only PDF, JPG and PNG files are allowed!`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(`${field}: File size must be under 10MB!`)
      return
    }

    setFiles({ ...files, [field]: file })
    setFileNames({ ...fileNames, [field]: file.name })
  }

  const uploadFile = async (file, fieldName) => {
    if (!file) return null
    const employeeName = formData.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Unknown'
    const fileName = `${employeeName}/${fieldName}_${Date.now()}_${file.name}`
    const { error } = await supabase.storage
      .from('employee-documents')
      .upload(fileName, file, { upsert: true })
    if (error) return `Upload failed: ${error.message}`
    const { data } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Basic validation
    const required = ['name', 'address', 'phone', 'gender', 'dob', 'religion',
      'nationality', 'emergency', 'nextofkin', 'marital', 'bloodgroup',
      'genotype', 'bankname', 'accountnum']
    for (let field of required) {
      if (!formData[field]) {
        setErrorMsg(`Please fill in all required fields.`)
        return
      }
    }

    setStatus('uploading')
    setErrorMsg('')

    // Upload all files in parallel
    const [cvUrl, qualUrl, nyscUrl, birthUrl, marriageUrl, validIdUrl] =
      await Promise.all([
        uploadFile(files.cv, 'CV'),
        uploadFile(files.qualification, 'Qualification'),
        uploadFile(files.nysc, 'NYSC'),
        uploadFile(files.birth, 'BirthCertificate'),
        uploadFile(files.marriage, 'MarriageCertificate'),
        uploadFile(files.validid, 'ValidID'),
      ])

    setStatus('saving')

    const { error } = await supabase.from('employee_submissions').insert({
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      gender: formData.gender,
      date_of_birth: formData.dob,
      religion: formData.religion,
      nationality: formData.nationality,
      emergency_contact: formData.emergency,
      next_of_kin: formData.nextofkin,
      marital_status: formData.marital,
      blood_group: formData.bloodgroup,
      genotype: formData.genotype,
      cv_url: cvUrl,
      qualification_url: qualUrl,
      nysc_url: nyscUrl,
      birth_certificate_url: birthUrl,
      marriage_certificate_url: marriageUrl,
      valid_id_url: validIdUrl,
      bank_name: formData.bankname,
      account_number: formData.accountnum,
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <div className="success-screen">
        <div className="success-card">
          <img src={logo} alt="WINTECH Global" className="success-logo" />
          <div className="success-icon">✓</div>
          <h2>Submission Successful!</h2>
          <p>Your information has been received. The WINTECH Global team will be in touch shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="form-wrapper">
      <div className="form-container">

        {/* Header */}
        <div className="form-header">
          <div className="brand">
            <img src={logo} alt="WINTECH Global" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-name">WINTECH</span>
              <span className="brand-sub">Global</span>
            </div>
          </div>
          <div className="header-divider" />
          <h1 className="form-title">Employee <span>Information</span> Form</h1>
          <p className="form-desc">
            This information is essential for maintaining accurate records and ensuring
            compliance with company policies and legal requirements. Your data will be
            kept confidential and used solely for internal purposes. Thank you.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* PERSONAL INFORMATION */}
          <div className="section-header"><span>Personal Information</span></div>

          <div className="field">
            <label>01 — Name <span className="req">*</span></label>
            <p className="hint">(First, Middle and Last names)</p>
            <textarea name="name" value={formData.name} onChange={handleChange} placeholder="Type here" rows={3} />
          </div>

          <div className="field">
            <label>02 — Current Address <span className="req">*</span></label>
            <p className="hint">(Address where correspondences can be shared)</p>
            <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Type here" rows={3} />
          </div>

          <div className="field">
            <label>03 — Phone Numbers <span className="req">*</span></label>
            <p className="hint">(Primary and alternate phone numbers)</p>
            <div className="icon-input-wrap">
              <span className="input-icon">📞</span>
              <input type="tel" name="phone" value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\s,]/g, '') })}
                placeholder="e.g. 08012345678, 08087654321" className="icon-input" />
            </div>
          </div>

          <div className="field">
            <label>04 — Gender <span className="req">*</span></label>
            <div className="options-grid">
              {['Male', 'Female', 'Other'].map(opt => (
                <label key={opt} className={`option-item ${formData.gender === opt ? 'selected' : ''}`}>
                  <input type="radio" name="gender" value={opt} checked={formData.gender === opt} onChange={handleChange} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>05 — Date of Birth <span className="req">*</span></label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="date-input" />
          </div>

          <div className="field">
            <label>06 — Religion <span className="req">*</span></label>
            <div className="options-grid">
              {['Christianity', 'Islam', 'Other'].map(opt => (
                <label key={opt} className={`option-item ${formData.religion === opt ? 'selected' : ''}`}>
                  <input type="radio" name="religion" value={opt} checked={formData.religion === opt} onChange={handleChange} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>07 — Nationality <span className="req">*</span></label>
            <textarea name="nationality" value={formData.nationality} onChange={handleChange} placeholder="Type here" rows={2} />
          </div>

          {/* CONTACT & FAMILY */}
          <div className="section-header"><span>Contact &amp; Family</span></div>

          <div className="field">
            <label>08 — Emergency Contact Details <span className="req">*</span></label>
            <p className="hint">(Name, Relationship, Phone number and Email ID)</p>
            <textarea name="emergency" value={formData.emergency} onChange={handleChange} placeholder="Type here" rows={3} />
          </div>

          <div className="field">
            <label>09 — Next of Kin <span className="req">*</span></label>
            <p className="hint">(Name, Relationship, Phone number and Email ID)</p>
            <textarea name="nextofkin" value={formData.nextofkin} onChange={handleChange} placeholder="Type here" rows={3} />
          </div>

          <div className="field">
            <label>10 — Marital Status <span className="req">*</span></label>
            <div className="options-grid">
              {['Single', 'Married', 'Divorced', 'Widow', 'Widower'].map(opt => (
                <label key={opt} className={`option-item ${formData.marital === opt ? 'selected' : ''}`}>
                  <input type="radio" name="marital" value={opt} checked={formData.marital === opt} onChange={handleChange} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* HEALTH INFORMATION */}
          <div className="section-header"><span>Health Information</span></div>

          <div className="field">
            <label>11 — Blood Group <span className="req">*</span></label>
            <select name="bloodgroup" value={formData.bloodgroup} onChange={handleChange} className="select-input">
              <option value="" disabled>Select blood group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>12 — Genotype <span className="req">*</span></label>
            <select name="genotype" value={formData.genotype} onChange={handleChange} className="select-input">
              <option value="" disabled>Select genotype</option>
              {['AA', 'AS', 'AC', 'SS', 'SC'].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* DOCUMENTS */}
          <div className="section-header"><span>Documents</span></div>
          <p className="hint" style={{ marginBottom: '1.5rem' }}>📄 Accepted file types: PDF, JPG, PNG | Maximum file size: 10MB per document</p>

          {[
            { key: 'cv', label: '13 — CV', hint: 'Curriculum Vitae (CV)' },
            { key: 'qualification', label: '14 — Highest Qualification', hint: 'BSc., HND, Masters\' degree, Ph.D' },
            { key: 'nysc', label: '15 — NYSC Certificate', hint: null },
            { key: 'birth', label: '16 — Birth Certificate', hint: null },
            { key: 'marriage', label: '17 — Marriage Certificate', hint: 'If applicable' },
            { key: 'validid', label: '18 — Valid ID', hint: 'Voter\'s card, International Passport, NIN slip or card' },
          ].map(({ key, label, hint }) => (
            <div className="field" key={key}>
              <label>{label}</label>
              {hint && <p className="hint">{hint}</p>}
              <div className="file-upload-area">
                <div className="drop-zone">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <path d="M12 16V4m0 0L8 8m4-4l4 4" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {fileNames[key] ? <span className="file-chosen">{fileNames[key]}</span> : 'Paste or drag files here'}
                </div>
                <label className="file-btn">
                  + Upload local files
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFile(e, key)} />
                </label>
              </div>
            </div>
          ))}

          {/* SALARY ACCOUNT */}
          <div className="section-header"><span>Salary Account Details</span></div>

          <div className="field">
            <label>19 — Bank Name <span className="req">*</span></label>
            <p className="hint">Please input your bank name and account name (e.g. Access Bank — James Akonuche Desire)</p>
            <textarea name="bankname" value={formData.bankname} onChange={handleChange} placeholder="Type here" rows={2} />
          </div>

          <div className="field">
            <label>20 — Account Number <span className="req">*</span></label>
            <p className="hint">Please input an active 10-digit NUBAN account number</p>
            <div className="icon-input-wrap">
              <span className="input-icon">💳</span>
              <input type="tel" name="accountnum" value={formData.accountnum}
                onChange={(e) => setFormData({ ...formData, accountnum: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                placeholder="e.g. 0123456789" className="icon-input" maxLength={10} />
              <span className="acc-counter">{formData.accountnum.length}/10</span>
            </div>
          </div>

          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          <div className="submit-area">
            <p className="submit-note">All fields marked <span className="req">*</span> are required.</p>
            <button type="submit" className="submit-btn" disabled={status === 'uploading' || status === 'saving'}>
              {status === 'uploading' ? '⏳ Uploading files…' :
               status === 'saving' ? '⏳ Saving data…' : '✓ Submit'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default EmployeeForm