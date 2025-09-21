/* eslint-disable @typescript-eslint/no-explicit-any */
// client/src/pages/LoginPage.tsx

import { useState } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import toast from "react-hot-toast";

// --- Using your local images from the /public folder ---
const localBackgroundImage = "/aura_bg.jpg";
const localLogoImage = "/aura_logo.png";

export default function LoginPage() {
  const { login } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password)
      return toast.error("Please enter both email and password.");

    setIsLoading(true);
    const toastId = toast.loading("Signing in...");
    try {
      await api.post("/auth/login", { email, password });
      toast.success("Welcome!", { id: toastId });
      setTimeout(() => login(), 500);
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Invalid credentials or server error.";
      toast.error(message, { id: toastId });
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password)
      return toast.error("Please enter both email and password.");
    if (password.length < 6)
      return toast.error("Password must be at least 6 characters long.");

    setIsLoading(true);
    const toastId = toast.loading("Creating your account...");
    try {
      await api.post("/auth/register", { email, password });
      toast.success("Account created! Please sign in.", { id: toastId });
      setIsLoginView(true);
      setPassword("");
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Registration failed or server error.";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (isLoginView) handleLogin();
    else handleRegister();
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${localBackgroundImage})` }}
    >
      {/* --- THE FIX IS HERE --- */}
      {/* We removed the grid layout and the image, and centered the single form container */}
      <div className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 text-white">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <img
            src={localLogoImage}
            alt="Aura Logo"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold">
            {isLoginView ? "Welcome Back" : "Create Your Account"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-300"
            >
              Email Id
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-transparent border border-white/30 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-transparent border border-white/30 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-green-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Processing..."
                : isLoginView
                ? "Login Now"
                : "Create Account"}
            </button>
            {isLoginView && (
              <a href="#" className="text-sm text-gray-300 hover:underline">
                Forgot Password?
              </a>
            )}
          </div>
        </form>

        {/* Bottom "Create Account" Link */}
        <div className="text-center mt-8 text-sm text-gray-300">
          {isLoginView
            ? "Don't have an account yet?"
            : "Already have an account?"}
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="font-semibold text-green-400 hover:underline ml-2"
          >
            {isLoginView ? "Create Account" : "Login Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
