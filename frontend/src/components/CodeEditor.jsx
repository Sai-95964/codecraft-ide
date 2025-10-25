import React, {
  useMemo,
  useRef,
  useState
} from 'react';
import { runCode } from '../api/run';
import { createFile } from '../api/files';

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'node', label: 'Node.js' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' }
];

export default function CodeEditor({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  stdin,
  onStdinChange,
  onRunComplete,
  onFileSaved,
  initialCode = "print('Hello from CodeCraft')",
  initialLanguage = 'python'
}) {
  const [localCode, setLocalCode] = useState(initialCode);
  const [localLanguage, setLocalLanguage] = useState(initialLanguage);
  const [localStdin, setLocalStdin] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const uploadInputRef = useRef(null);

  const effectiveCode = code !== undefined ? code : localCode;
  const effectiveLanguage = language !== undefined ? language : localLanguage;
  const effectiveStdin = stdin !== undefined ? stdin : localStdin;

  const languages = useMemo(() => {
    if (LANGUAGE_OPTIONS.some(opt => opt.value === effectiveLanguage)) {
      return LANGUAGE_OPTIONS;
    }
    return [{ value: effectiveLanguage, label: effectiveLanguage }, ...LANGUAGE_OPTIONS];
  }, [effectiveLanguage]);

  const updateCode = (value) => {
    if (code === undefined) {
      setLocalCode(value);
    }
    onCodeChange?.(value);
  };

  const updateLanguage = (value) => {
    if (language === undefined) {
      setLocalLanguage(value);
    }
    onLanguageChange?.(value);
  };

  const updateStdin = (value) => {
    if (stdin === undefined) {
      setLocalStdin(value);
    }
    onStdinChange?.(value);
  };

  const onRun = async () => {
    if (!effectiveCode.trim()) {
      setError('Please enter code before running.');
      return;
    }

    setRunning(true);
    setError('');
    setOutput('Running...');
    setNotice('');

    try {
      const payload = {
        language: effectiveLanguage,
        code: effectiveCode,
        stdin: effectiveStdin
      };

      const res = await runCode(payload);
      const run = res.data?.run;
      const details = run?.run || run || {};

      const stdout = details.stdout ?? details.output ?? '';
      const stderr = details.stderr ?? '';

      let combined = stdout;
      if (stderr) {
        combined = `${combined}${combined ? '\n' : ''}[stderr]\n${stderr}`;
      }

      if (!combined) {
        combined = JSON.stringify(details, null, 2);
      }

      setOutput(combined);
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      setError(message);
      setOutput('');
    } finally {
      setRunning(false);
      onRunComplete?.();
    }
  };

  const inferExtension = (lang) => {
    switch (lang) {
      case 'java':
        return '.java';
      case 'javascript':
      case 'node':
        return '.js';
      case 'typescript':
        return '.ts';
      case 'go':
        return '.go';
      case 'ruby':
        return '.rb';
      case 'php':
        return '.php';
      case 'c':
        return '.c';
      case 'cpp':
      case 'c++':
        return '.cpp';
      default:
        return '.py';
    }
  };

  const handleSave = async () => {
    if (saving) return;

    setUploadError('');
    setNotice('');
    setError('');

    if (!effectiveCode.trim()) {
      setError('Write some code before saving.');
      return;
    }

    const suggestedExt = inferExtension(effectiveLanguage);
    const defaultName = `snippet${suggestedExt}`;
    const name = window.prompt('Save file as', defaultName);
    if (!name) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setError('File name cannot be empty.');
      return;
    }

    const finalName = trimmed.toLowerCase().includes('.')
      ? trimmed
      : `${trimmed}${suggestedExt}`;

    setSaving(true);
    try {
      await createFile({
        filename: finalName,
        content: effectiveCode,
        language: effectiveLanguage
      });
      setNotice(`Saved to your workspace as ${finalName}`);
      onFileSaved?.(finalName);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = () => {
    setUploadError('');
    uploadInputRef.current?.click();
  };

  const detectLanguageFromName = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.py')) return 'python';
    if (lower.endsWith('.java')) return 'java';
    if (lower.endsWith('.js')) return 'javascript';
    if (lower.endsWith('.ts')) return 'typescript';
    if (lower.endsWith('.go')) return 'go';
    if (lower.endsWith('.rb')) return 'ruby';
    if (lower.endsWith('.php')) return 'php';
    if (lower.endsWith('.c')) return 'c';
    if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx')) return 'cpp';
    return null;
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');
    const allowed = ['.py', '.java', '.js', '.ts', '.go', '.rb', '.php'];
    const lowerName = file.name.toLowerCase();
    const isAllowed = allowed.some((ext) => lowerName.endsWith(ext));

    if (!isAllowed) {
      setUploadError('Upload a supported source file (.py, .java, .js, .ts, .go, .rb, .php).');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result ?? '';
      if (code === undefined) {
        setLocalCode(String(text));
      }
      onCodeChange?.(String(text));

      const detected = detectLanguageFromName(file.name);
      if (detected) {
        updateLanguage(detected);
      }

      setNotice(`Loaded ${file.name}`);
      setUploadError('');
      event.target.value = '';
    };
    reader.onerror = () => {
      setUploadError('Could not read the selected file.');
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="editor-card__content">
      <div className="editor-card__toolbar">
        <label className="field-group" htmlFor="editor-language">
          <span>Language</span>
          <select
            id="editor-language"
            className="editor-card__select"
            value={effectiveLanguage}
            onChange={(e) => updateLanguage(e.target.value)}
            disabled={running}
          >
            {languages.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="editor-card__toolbar-actions">
          <button onClick={onRun} disabled={running || saving} type="button">
            {running ? 'Running…' : 'Run code'}
          </button>
          <button
            className="button button--ghost"
            onClick={handleSave}
            disabled={saving || running}
            type="button"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="button button--ghost" onClick={handleUploadClick} type="button">
            Upload
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".py,.java,.js,.ts,.go,.rb,.php"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <label className="field-group" htmlFor="editor-source">
        <span>Source code</span>
        <textarea
          id="editor-source"
          className="editor-card__textarea"
          value={effectiveCode}
          onChange={(e) => updateCode(e.target.value)}
          rows={16}
        />
      </label>

      <label className="field-group" htmlFor="editor-stdin">
        <span>Standard input (optional)</span>
        <textarea
          id="editor-stdin"
          className="editor-card__textarea editor-card__textarea--compact"
          value={effectiveStdin}
          onChange={(e) => updateStdin(e.target.value)}
          rows={4}
        />
      </label>

      {error && (
        <div className="editor-card__alert editor-card__alert--error">
          Run failed: {error}
        </div>
      )}
      {uploadError && (
        <div className="editor-card__alert editor-card__alert--error">
          {uploadError}
        </div>
      )}
      {notice && !error && (
        <div className="editor-card__alert editor-card__alert--success">
          {notice}
        </div>
      )}

      <pre className="editor-card__output">{output}</pre>
    </div>
  );
}
