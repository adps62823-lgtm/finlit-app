import React, { useMemo, useState } from "react";
import { Upload, X } from "lucide-react";

const SAMPLE_ROWS = `primaryHolderName,email,mobile,city,familyName,relationshipStatus,notes,nextAction,nextReviewDate,assignedRmEmail
Rakesh Sharma,rakesh@example.com,9876543210,Varanasi,Sharma,active,Prefers quarterly review,Call for SIP top-up,2026-06-10,rahul@finlit.local
Neha Gupta,neha@example.com,9988776655,Lucknow,Gupta,prospect,Interested in retirement planning,Send plan options,2026-06-14,dsingh@finlit.local`;

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = lines[0].split(",").map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((acc, header, index) => {
      acc[header] = (values[index] || "").trim();
      return acc;
    }, {});
  });
}

export default function BulkClientImportModal({ open, onClose, onImport }) {
  const [text, setText] = useState(SAMPLE_ROWS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const previewCount = useMemo(() => {
    try {
      if (!text.trim()) return 0;
      if (text.trim().startsWith("[")) {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
      return parseCsv(text).length;
    } catch {
      return 0;
    }
  }, [text]);

  if (!open) return null;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const content = await file.text();
    setText(content);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let payload = [];
      const input = text.trim();
      if (!input) {
        throw new Error("Paste a CSV or JSON list of clients first.");
      }

      if (input.startsWith("[")) {
        payload = JSON.parse(input);
      } else {
        payload = parseCsv(input);
      }

      if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error("No client rows were found.");
      }

      await onImport(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <section className="dialog-shell import-dialog" role="dialog" aria-label="Bulk client import" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <div>
            <div className="section-kicker">Bulk import</div>
            <h3>Add many clients at once</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close import modal">
            <X size={16} />
          </button>
        </div>

        <p className="dialog-note">
          Paste CSV or JSON data exported from Excel, then the backend will upsert clients by code, email, or mobile.
        </p>

        <label className="file-dropzone">
          <Upload size={16} />
          <span>{fileName || "Upload CSV or JSON"}</span>
          <input type="file" accept=".csv,.json,.txt" onChange={handleFile} />
        </label>

        <textarea
          className="import-textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          spellCheck={false}
        />

        <div className="import-meta">
          <span>{previewCount} rows detected</span>
          <span>Columns: primaryHolderName, email, mobile, city, familyName, relationshipStatus, notes, nextAction, nextReviewDate, assignedRmEmail</span>
        </div>

        {error ? <div className="inline-error">{error}</div> : null}

        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={handleSubmit}>
            {busy ? "Importing..." : "Import clients"}
          </button>
        </div>
      </section>
    </div>
  );
}
