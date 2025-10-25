import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFile, getFile, listFiles, uploadFile } from '../api/files';

const SUPPORTED_LANGUAGES = {
  python: { label: 'Python', extensions: '.py' },
  java: { label: 'Java', extensions: '.java' },
  javascript: { label: 'JavaScript', extensions: '.js' },
  typescript: { label: 'TypeScript', extensions: '.ts' },
  go: { label: 'Go', extensions: '.go' },
  ruby: { label: 'Ruby', extensions: '.rb' },
  php: { label: 'PHP', extensions: '.php' },
  c: { label: 'C', extensions: '.c' },
  cpp: { label: 'C++', extensions: '.cpp,.cc,.cxx' }
};

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    return String(value);
  }
}

export default function FileManager({ onSelect, refreshToken = 0 }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [manualFilename, setManualFilename] = useState('main.py');
  const [manualContent, setManualContent] = useState("print('Hello from saved file')\n");
  const [manualBusy, setManualBusy] = useState(false);

  const [uploadBusy, setUploadBusy] = useState(false);
  const uploadInputRef = useRef(null);
  const [selectingId, setSelectingId] = useState(null);

  const languageSummary = useMemo(() => ({
    python: 'Python (.py)',
    java: 'Java (.java)',
    javascript: 'JavaScript (.js)',
    typescript: 'TypeScript (.ts)',
    go: 'Go (.go)',
    ruby: 'Ruby (.rb)',
    php: 'PHP (.php)',
    c: 'C (.c)',
    cpp: 'C++ (.cpp/.cc/.cxx)'
  }), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listFiles();
      const items = Array.isArray(res.data) ? res.data : [];
      setFiles(items);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);

  const handleManualCreate = async (event) => {
    event.preventDefault();
    if (!manualFilename.trim()) {
      setError('Enter a filename before saving.');
      return;
    }

    setManualBusy(true);
    setError('');
    try {
      await createFile({ filename: manualFilename.trim(), content: manualContent });
      await refresh();
      setManualFilename('main.py');
      setManualContent("print('Hello from saved file')\n");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setManualBusy(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    const selected = uploadInputRef.current?.files?.[0];
    if (!selected) {
      setError('Select a file to upload first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selected);

    setUploadBusy(true);
    setError('');
    try {
      await uploadFile(formData);
      await refresh();
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploadBusy(false);
    }
  };

  const handleSelect = useCallback(async (entry) => {
    if (!entry) return;
    const id = entry._id || entry.id;
    if (!id) return;

    setSelectingId(id);
    setError('');
    try {
      const res = await getFile(id);
      onSelect?.(res.data || entry);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSelectingId(null);
    }
  }, [onSelect]);

  return (
    <div className="file-manager">
      <header className="file-manager__header">
        <div>
          <h3>Your files</h3>
          <p className="file-manager__subtitle">
            Supported uploads:
            {' '}
            {Object.values(languageSummary).join(', ')}
          </p>
        </div>
        <button onClick={refresh} disabled={loading} type="button">
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && <div className="file-manager__error">{error}</div>}

      {loading ? (
        <div className="loading-indicator">Loading files…</div>
      ) : (
        <div className="file-manager__list">
          {files.length === 0 ? (
            <div className="file-manager__empty">No saved files yet. Create or upload one to get started.</div>
          ) : (
            files.map((file) => (
              <button
                type="button"
                key={file._id || file.id}
                className="file-manager__item"
                onClick={() => handleSelect(file)}
                disabled={selectingId === (file._id || file.id)}
              >
                <span className="file-manager__item-title">{file.filename}</span>
                <span className="file-manager__item-meta">
                  Language: {SUPPORTED_LANGUAGES[file.language]?.label || file.language}
                  {' '}
                  • Last updated {formatDate(file.updatedAt)}
                </span>
                {typeof file.size === 'number' ? (
                  <span className="file-manager__item-note">Size: {file.size} bytes</span>
                ) : null}
                {selectingId === (file._id || file.id) ? (
                  <span className="file-manager__item-note file-manager__item-note--active">Loading…</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      )}

      <div className="file-manager__forms">
        <form className="file-manager__form" onSubmit={handleManualCreate}>
          <h4>Create a file manually</h4>
          <label className="field-group" htmlFor="file-create-name">
            <span>Filename</span>
            <input
              id="file-create-name"
              value={manualFilename}
              onChange={(e) => setManualFilename(e.target.value)}
              disabled={manualBusy}
              placeholder="main.py"
              required
            />
          </label>
          <label className="field-group" htmlFor="file-create-content">
            <span>Content</span>
            <textarea
              id="file-create-content"
              className="file-manager__textarea"
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              rows={5}
              disabled={manualBusy}
            />
          </label>
          <button type="submit" disabled={manualBusy}>
            {manualBusy ? 'Saving…' : 'Save file'}
          </button>
        </form>

        <form className="file-manager__form" onSubmit={handleUpload}>
          <h4>Upload a file</h4>
          <input
            type="file"
            accept={Object.values(SUPPORTED_LANGUAGES).map((meta) => meta.extensions).join(',')}
            ref={uploadInputRef}
            disabled={uploadBusy}
          />
          <button type="submit" disabled={uploadBusy}>
            {uploadBusy ? 'Uploading…' : 'Upload file'}
          </button>
        </form>
      </div>
    </div>
  );
}
