/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); // For disabling the button

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Signing in...");
    try {
      await api.post("/auth/login", { email, password });
      toast.success("Welcome!", { id: toastId });

      // THE FIX for the "rolling toast":
      // Wait a moment for the toast to be visible before changing the page.
      setTimeout(() => {
        login();
      }, 500); // 0.5 second delay
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Invalid credentials or server error.";
      toast.error(message, { id: toastId });
      setIsLoading(false); // Re-enable the button on error
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Creating your account...");
    try {
      await api.post("/auth/register", { email, password });
      toast.success("Account created! Please sign in.", { id: toastId });
      setIsLoginView(true); // Switch to login view
      setPassword(""); // Clear password field for security
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Registration failed or server error.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false); // Always re-enable the button after registration attempt
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent submission while loading

    if (isLoginView) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="p-8 bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold">Aura</h1>
          <p className="text-purple-400 mt-2 text-lg">
            {isLoginView ? "Sign in to your dashboard" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-400"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Processing..."
              : isLoginView
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            {isLoginView
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              onClick={toggleView}
              className="font-semibold text-purple-400 hover:underline ml-2"
              disabled={isLoading}
            >
              {isLoginView ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
