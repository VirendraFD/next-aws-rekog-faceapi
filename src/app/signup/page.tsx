"use client";
import { useState } from "react";
import axios from "axios";

export default function SignupPage() {
  const [form, setForm] = useState({
    business_unique_id:"",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle form input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Form validation
  const validateForm = () => {
    if (!form.username || !form.email || !form.password || !form.business_unique_id) {
      setError("All fields are required.");
      return false;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    setError("");
    return true;
  };

  // Handle signup request
  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      const res = await axios.post("/api/auth/signup", form);
      setSuccess("Signup successful! You can now login.");
      setError("");
      setForm({ username: "", email: "", password: "" , business_unique_id:""});
    } catch (err: any) {
      setError(err.response?.data?.error || "Signup failed.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold text-center">Sign Up</h2>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      {success && <p className="text-green-500 text-sm text-center">{success}</p>}

      <div className="mt-4">
        <label className="block text-sm font-medium">Business Unique Id</label>
        <input
          type="text"
          name="business_unique_id"
          value={form.business_unique_id}
          onChange={handleChange}
          className="w-full p-2 border rounded mt-1"
          placeholder="Enter Business Unique Id"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">Username</label>
        <input
          type="text"
          name="username"
          value={form.username}
          onChange={handleChange}
          className="w-full p-2 border rounded mt-1"
          placeholder="Enter username"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 border rounded mt-1"
          placeholder="Enter email"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          className="w-full p-2 border rounded mt-1"
          placeholder="Enter password"
        />
      </div>

      <button
        onClick={handleSignup}
        className="w-full bg-blue-500 text-white py-2 rounded mt-4 hover:bg-blue-600"
      >
        Sign Up
      </button>

      <p className="text-sm text-center mt-3">
        Already have an account? <a href="/login" className="text-blue-500">Login</a>
      </p>
    </div>
  );
}
