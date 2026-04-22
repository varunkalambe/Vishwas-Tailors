import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import logoImage from "../assets/Logo.jpeg";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = signIn(username, password);
    if (result.success) navigate("/dashboard");
    else setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6 flex flex-col items-center">
          <img 
            src={logoImage} 
            alt="Vishwas Tailor Logo" 
            className="w-20 h-20 mb-3 object-cover rounded-full border-2 border-gray-100 shadow-sm"
          />
          <h1 className="text-xl font-bold text-gray-900 tracking-wide">Vishwas Tailor</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">🔒 Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>

          
        </form>
      </div>
    </div>
  );
}
