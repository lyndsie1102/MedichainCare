import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Heart, User, Lock, Eye, EyeOff, Stethoscope, Shield } from 'lucide-react';
import '../App.css';
import { login } from '../api/user-apis';

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { role } = useParams(); 

  const roleMap = {
    1: "patient",
    2: "doctor",
    3: "lab_staff"
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Send login request with role information (which is now in the URL params)
      const result = await login({
        username: formData.username,
        password: formData.password,
        role: role,  // Send the role from URL (e.g., "doctor", "patient", etc.)
      });

      if (!result.access_token) {
        throw new Error("Login failed");
      }

      const tokenData = jwtDecode(result.access_token);
      localStorage.setItem("access_token", result.access_token);

      // Decode the role from the token (automatically assigned based on backend)
      const userRole = roleMap[tokenData.role];
      localStorage.setItem("user", JSON.stringify({ role: userRole }));

      alert("Login successful!");
      navigate("/dashboard");

    } catch (err) {
      alert(`Login failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="login-wrapper">
      <div className="background-blobs">
        <div className="blob blob-top-right" />
        <div className="blob blob-bottom-left" />
        <div className="blob blob-center" />
      </div>

      <div className="login-container">
        <div className="logo-section">
          <div className="logo-circle">
            <Heart className="logo-icon" />
          </div>
          <h1 className="app-title">HealthConnect</h1>
          <p className="app-subtitle">Secure Healthcare Portal</p>
        </div>

        <div className="login-card">
          <div className="login-header">
            <div className="login-header-content">
              <Shield className="shield-icon" />
              <h2>Secure Login</h2>
            </div>
            <p>Access your healthcare dashboard</p>
          </div>

          <div className="login-form-wrapper">
            <form onSubmit={handleSubmit} className="login-form">
              <div>
                <label htmlFor="username">Username or Email</label>
                <div className="input-group">
                  <User className="input-icon" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username or email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password">Password</label>
                <div className="input-group">
                  <Lock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="toggle-password"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="login-button">
                {isLoading ? (
                  <div className="spinner-wrapper">
                    <div className="spinner" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="security-notice">
          <Stethoscope className="stethoscope-icon" />
          <span>HIPAA Compliant & Secure</span>
        </div>

        <footer className="login-footer">
          <p>© 2024 HealthConnect. All rights reserved.</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
          </div>
        </footer>
      </div>
    </div>
  );
}



export default LoginForm;
