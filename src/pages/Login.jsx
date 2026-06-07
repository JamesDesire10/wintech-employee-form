import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Login.css";
import logo from "../assets/logo.jpg";

const Login = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Verify password securely on the server
      const { data: valid, error: authError } = await supabase.rpc(
        "verify_admin_password",
        { input_password: password },
      );

      if (authError) throw authError;

      if (valid) {
        const token = crypto.randomUUID();
        const expiry = Date.now() + 8 * 60 * 60 * 1000;
        sessionStorage.setItem(
          "wintech_admin",
          JSON.stringify({ token, expiry }),
        );
        navigate("/dashboard");
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-brand">
          <img src={logo} alt="WINTECH Global" className="login-logo" />
          <div className="login-brand-text">
            <span className="login-brand-name">WINTECH</span>
            <span className="login-brand-sub">Global</span>
          </div>
        </div>

        <div className="login-header">
          <h1>Admin Dashboard</h1>
          <p>Enter your password to access submissions</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
            />
          </div>

          {error && <div className="login-error">⚠ {error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !password}
          >
            {loading ? "⏳ Verifying..." : "🔐 Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
