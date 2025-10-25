import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import AiAssistant from '../components/AiAssistant';
import HistoryPanel from '../components/HistoryPanel';
import { fetchHistory } from '../api/history';
import { useAuth } from '../context/AuthContext';
import FileManager from '../components/FileManager';

export default function Dashboard() {
  const [code, setCode] = useState("print('Hello from CodeCraft')");
  const [language, setLanguage] = useState('python');
  const [stdin, setStdin] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [fileMessage, setFileMessage] = useState('');
  const [filesVersion, setFilesVersion] = useState(0);
  const [rightTab, setRightTab] = useState('files');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetchHistory();
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setHistoryError(err.response?.data?.error || err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, loadHistory]);

  const handleActivityRecorded = useCallback(() => {
    loadHistory();
  }, [loadHistory]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    setCode(file.content ?? '');
    if (file.language) {
      setLanguage(file.language);
    }
    setFileMessage(`Loaded ${file.filename}`);
  }, []);

  const handleFileSaved = useCallback((filename) => {
    setFilesVersion((value) => value + 1);
    setFileMessage(`Saved ${filename} to your workspace`);
  }, []);

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <div className="dashboard-page__title">
          <h2>Workspace</h2>
          {user && (
            <p className="dashboard-page__subtitle">
              Signed in as {user.name || user.email}
            </p>
          )}
        </div>
        <button className="button button--ghost" onClick={handleLogout} type="button">
          Log out
        </button>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-main">
          <section className="panel-card editor-card">
            <CodeEditor
              code={code}
              onCodeChange={setCode}
              language={language}
              onLanguageChange={setLanguage}
              stdin={stdin}
              onStdinChange={setStdin}
              onRunComplete={handleActivityRecorded}
              onFileSaved={handleFileSaved}
            />
            {fileMessage && (
              <div className="editor-card__alert editor-card__alert--success">
                {fileMessage}
              </div>
            )}
          </section>
        </div>

        <aside className="dashboard-side">
          <section className="panel-card panel-card--tabs">
            <div className="tabs">
              <button
                type="button"
                className={`tabs__button ${rightTab === 'files' ? 'tabs__button--active' : ''}`}
                onClick={() => setRightTab('files')}
              >
                Files
              </button>
              <button
                type="button"
                className={`tabs__button ${rightTab === 'ai' ? 'tabs__button--active' : ''}`}
                onClick={() => setRightTab('ai')}
              >
                AI Assistant
              </button>
            </div>
            <div className="panel-card__tab-content">
              {rightTab === 'files' ? (
                <FileManager onSelect={handleFileSelect} refreshToken={filesVersion} />
              ) : (
                <div className="assistant-card">
                  <AiAssistant code={code} onComplete={handleActivityRecorded} />
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="panel-card">
        <div className="panel-card__header">
          <div>
            <h3>Recent Activity</h3>
            <p>Track what you and the assistant have been working on.</p>
          </div>
        </div>
        <HistoryPanel entries={history} loading={historyLoading} error={historyError} />
      </section>
    </div>
  );
}
