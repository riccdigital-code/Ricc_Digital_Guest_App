import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {

  const navigate = useNavigate();

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {

    setError("");
    setLoading(true);

    try {

      const res = await api.post("/api/auth/login", {
        email,
        password,
      });

      login(res.data.token, res.data.user);

      navigate("/dashboard");

    } catch (err) {

      const status = err.response?.status;

      if (status === 401) {
        setError("Incorrect email or password.");
      } else {
        setError("Unable to connect to server.");
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">

      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md border border-yellow-600">

        <h1 className="text-3xl font-bold text-yellow-500 mb-2">
          RoomBoss
        </h1>

        <p className="text-zinc-400 mb-6">
          Hospitality Operations Platform
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded-lg bg-zinc-800 text-white mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded-lg bg-zinc-800 text-white mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-yellow-500 text-black font-bold p-3 rounded-lg"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>

      </div>

    </div>
  );
}