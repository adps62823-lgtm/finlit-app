import React, { useMemo, useState } from "react";
import { Upload, X } from "lucide-react";

const SAMPLE_ROWS = `primaryHolderName,email,mobile,city,familyName,relationshipStatus,notes,nextAction,nextReviewDate,assignedRmEmail
Rakesh Sharma,rakesh@example.com,9876543210,Varanasi,Sharma,active,Review,SIP top-up,2026-06-10,rahul@finlit.local
Neha Gupta,neha@example.com,9988776655,Lucknow,Gupta,prospect,Plan options,Call back,2026-06-14,dsingh@finlit.local`;

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((value) => value.trim());
  return lines.slice(1).map((line) =>
    headers.reduce((acc, header, index) => {
      acc[header] = (line.split(",")[index] || "").trim();
      return acc;
    }, {})
  );
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
    setText(await file.text());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input = text.trim();
      if (!input) throw new Error("Paste data first.");

      const payload = input.startsWith("[") ? JSON.parse(input) : parseCsv(input);
      if (!Array.isArray(payload) || payload.length === 0) throw new Error("No rows found.");

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
            <div className="section-kicker">Import</div>
            <h3>Clients</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <label className="file-dropzone">
          <Upload size={16} />
          <span>{fileName || "CSV / JSON"}</span>
          <input type="file" accept=".csv,.json,.txt" onChange={handleFile} />
        </label>

        <textarea
          className="import-textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={10}
          spellCheck={false}
        />

        <div className="import-meta">
          <span>{previewCount} rows</span>
        </div>

        {error ? <div className="inline-error">{error}</div> : null}

        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={handleSubmit} type="button">
            {busy ? "Importing..." : "Import"}
          </button>
        </div>
      </section>
    </div>
  );
}
