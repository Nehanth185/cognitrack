import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { LoadingSpinner } from "../components/LoadingSpinner";

export function SettingsPage() {
  const { userId, logout } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = async () => {
    if (!userId) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/csv/${userId}`, {
        headers: { Accept: "text/csv" },
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cognitrack-data-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Data exported successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to export data" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || deleteConfirm !== "DELETE") return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/me`);
      logout();
      setMessage({ type: "success", text: "Account deleted successfully" });
      setTimeout(() => window.location.href = "/", 2000);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete account" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 mt-1">Manage your account and data</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-neutral-900">Account</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900">Anonymous ID</p>
              <p className="text-sm text-neutral-500 font-mono">{userId}</p>
            </div>
            <span className="badge badge-blue">Anonymous</span>
          </div>
          <div className="border-t border-neutral-200 pt-4">
            <p className="text-sm text-neutral-600 mb-3">
              Your account is fully anonymous. No email, no password, no personal information stored.
              Your data is linked only to this random ID stored in your browser.
            </p>
            <button onClick={logout} className="btn-secondary">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-neutral-900">Data Export</h2>
        </div>
        <div className="card-body space-y-4">
          <div>
            <p className="font-medium text-neutral-900 mb-1">Export All Data</p>
            <p className="text-sm text-neutral-600 mb-3">
              Download a CSV file containing all your sessions, trials, and computed analytics.
              This includes reaction times, accuracy, z-scores, and anomaly flags.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner size="sm" /> Exporting...
                </>
              ) : (
                "Download CSV"
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-neutral-900">Danger Zone</h2>
        </div>
        <div className="card-body space-y-4 border-t border-red-100">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-red-800">Delete Account</p>
                <p className="text-sm text-red-600 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                  All sessions, trials, baselines, and analytics will be permanently removed.
                </p>
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="delete-confirm" className="label">Type "DELETE" to confirm</label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="input font-mono"
              placeholder="DELETE"
              maxLength={6}
            />
            <button
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirm !== "DELETE"}
              className="btn-danger mt-2"
            >
              {isDeleting ? "Deleting..." : "Delete My Account Permanently"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-neutral-900">About CogniTrack</h2>
        </div>
        <div className="card-body space-y-4 text-sm text-neutral-600">
          <div>
            <h3 className="font-medium text-neutral-900 mb-1">Version</h3>
            <p>0.1.0 (Sprint MVP)</p>
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 mb-1">Privacy</h3>
            <p>All data stored locally in your browser and on our servers under your anonymous ID. No personal information collected.</p>
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 mb-1">Open Source</h3>
            <p>CogniTrack is MIT licensed. View source code on GitHub.</p>
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 mb-1">Not Medical Advice</h3>
            <p>CogniTrack is a personal tracking tool, not a medical device. Consult a healthcare professional for cognitive health concerns.</p>
          </div>
        </div>
      </div>
    </div>
  );
}