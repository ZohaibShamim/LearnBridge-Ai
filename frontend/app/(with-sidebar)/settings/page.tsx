"use client";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Settings</h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <p className="text-slate-700">Manage your application settings here.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-blue-600 mb-2">Notification Settings</h3>
            <p className="text-sm text-slate-600">Control how you receive notifications.</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-indigo-600 mb-2">Privacy Settings</h3>
            <p className="text-sm text-slate-600">Adjust your privacy preferences.</p>
          </div>
        </div>
      </div>
    </div>
  );
}