"use client";

import { useState } from "react";

export default function AccountSettingsPage() {
  const [email, setEmail] = useState("user@example.com");
  const [username, setUsername] = useState("username");

  const handleSave = () => {
    // Logic to save account settings
    alert("Account settings saved successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Account Settings</h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring focus:ring-blue-200"
          />
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}