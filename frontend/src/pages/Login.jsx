// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function Login() {
  const navigate       = useNavigate();
  const { login }      = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  //////////////////////////////////////////////////////////
  // HANDLE LOGIN
  //////////////////////////////////////////////////////////

  const handleLogin = async () => {

    //////////////////////////////////////////////////////////
    // CLIENT-SIDE VALIDATION
    //////////////////////////////////////////////////////////

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setError("");
    setLoading(true);

    try {

      const res = await api.post("/api/auth/login", { email, password });

      //////////////////////////////////////////////////////////
      // STORE TOKEN + USER IN AUTH CONTEXT
      //////////////////////////////////////////////////////////

      login(res.data.token, res.data.user);

      //////////////////////////////////////////////////////////
      // NAVIGATE TO DASHBOARD
      //////////////////////////////////////////////////////////

      navigate("/dashboard");

    } catch (err) {

      //////////////////////////////////////////////////////////
      // SHOW MEANINGFUL ERROR TO USER
      //////////////////////////////////////////////////////////

      const status  = err.response?.status;
      const message = err.response?.data?.error;

      if (status === 401) {
        setError("Incorrect email or password. Please try again.");
      } else if (status === 400) {
        setError(message || "Please check your inputs and try again.");
      } else if (status === 429) {
        setError("Too many login attempts. Please wait a few minutes.");
      } else {
        setError("Unable to connect to the server. Please try again.");
      }

    } finally {
      setLoading(false);
    }
  };

  //////////////////////////////////////////////////////////
  // ALLOW ENTER KEY TO SUBMIT
  //////////////////////////////////////////////////////////

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg">

        {/* Header */}
        <h1 className="text-2xl font-bold mb-2 text-center text-slate-900">
          RiccDigital
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Hotel Operations Platform
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Email Input */}
        <input
          className="w-full p-3 mb-3 border border-slate-200 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-black
                     text-slate-900 placeholder-slate-400"
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        {/* Password Input */}
        <input
          className="w-full p-3 mb-5 border border-slate-200 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-black
                     text-slate-900 placeholder-slate-400"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        {/* Submit Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-slate-900 text-white p-3 rounded-xl
                     font-semibold hover:bg-slate-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

      </div>
    </div>
  );
}