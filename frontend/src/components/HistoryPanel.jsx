import React from 'react';

function formatTimestamp(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    return String(value);
  }
}

export default function HistoryPanel({ entries, loading, error }) {
  if (loading) {
    return <div className="loading-indicator">Loading recent activity…</div>;
  }

  if (error) {
    return <div className="flash flash--error">Unable to load history: {error}</div>;
  }

  if (!entries?.length) {
    return <div className="history-empty">No activity yet. Run code or ask the assistant to see history here.</div>;
  }

  return (
    <div className="history-list">
      {entries.map((entry) => {
        const key = entry._id || entry.id || `${entry.action}-${entry.createdAt}`;
        const preview = entry.output || entry.error || '';
        const trimmed = preview.length > 160 ? `${preview.slice(0, 157)}…` : preview;
        const suffix = (() => {
          if (entry.action === 'ai') {
            return entry.meta?.type ? `· ${entry.meta.type}` : '';
          }
          return entry.language ? `· ${entry.language}` : '';
        })();

        return (
          <div className="history-item" key={key}>
            <span className="history-item__timestamp">{formatTimestamp(entry.createdAt)}</span>
            <span className="history-item__title">
              {entry.action?.toUpperCase()}
              {' '}
              {suffix}
            </span>
            <div className="history-item__body">{trimmed || 'No output recorded.'}</div>
          </div>
        );
      })}
    </div>
  );
}
