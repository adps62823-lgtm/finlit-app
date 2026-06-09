import React, { useMemo, useState } from "react";
import { Upload, X } from "lucide-react";

export default function BulkClientImportModal({ busy, onClose, onImport, open }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const previewCount = useMemo(() => {
    const draft = text.trim();
    if (!draft) return 0;
    return draft.split(/\r?\n/).filter(Boolean).length;
  }, [text]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      if (!file && !text.trim()) {
        throw new Error("Upload an Excel or CSV file, or paste rows.");
      }
      await onImport({ file, text: text.trim() });
      setText("");
      setFile(null);
      onClose();
    } catch (err) {
      setError(err.message || "Bulk import failed");
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-shell import-modal-shell" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <div className="panel-kicker">Bulk import</div>
            <h3>Add clients in one shot</h3>
            <p className="panel-subtext">Upload Excel, CSV, or paste rows. Only the name is mandatory.</p>
          </div>
          <button className="secondary" onClick={onClose} type="button">
            <X size={16} />
            <span>Close</span>
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>File</span>
            <div className="file-pill">
              <Upload size={16} />
              <span>{file ? file.name : "Choose .xlsx, .xlsm, .csv, or .txt"}</span>
              <input
                accept=".xlsx,.xlsm,.csv,.txt"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                type="file"
              />
            </div>
          </label>

          <label className="field">
            <span>Paste rows</span>
            <textarea
              rows="8"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={`S.No | Name | PAN | Mobile | City
1 | Rahul Sharma | ABCDE1234F | 9876543210 | Varanasi`}
            />
          </label>

          <div className="import-help-row">
            <span>{previewCount} pasted lines</span>
            <span>Name-only import is allowed</span>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="modal-actions">
            <button className="secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button disabled={busy} type="submit">
              <Upload size={16} />
              <span>{busy ? "Importing..." : "Import clients"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
