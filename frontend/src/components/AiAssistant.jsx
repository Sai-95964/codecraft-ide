import React, { useState } from 'react';
import { requestAiHelp } from '../api/ai';

const ACTIONS = [
  { value: 'explain', label: 'Explain' },
  { value: 'improve', label: 'Improve' },
  { value: 'fix', label: 'Fix Issues' },
  { value: 'ask', label: 'Ask a Question' }
];

export default function AiAssistant({ code, onComplete }) {
  const [action, setAction] = useState('explain');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');

  const trimmedCode = code?.trim() || '';
  const trimmedQuestion = question.trim();
  const requiresQuestion = action === 'ask';
  const canAsk = requiresQuestion ? Boolean(trimmedQuestion) : Boolean(trimmedCode);

  const handleAsk = async () => {
    if (!canAsk) {
      setError(requiresQuestion
        ? 'Ask mode needs a question so the assistant knows what to answer.'
        : 'Add some code first so the assistant has context.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        type: action
      };

      if (trimmedCode) {
        payload.code = trimmedCode;
      }

      if (trimmedQuestion) {
        payload.question = trimmedQuestion;
      }

      const res = await requestAiHelp(payload);
      setResponse(res.data?.reply || 'No response received.');
    } catch (err) {
      let message = err.response?.data?.error || err.message || 'AI request failed';
      if (err.code === 'ECONNABORTED' || /timeout/i.test(message)) {
        message = 'The AI assistant took too long to respond. Please try again in a moment.';
      }
      setError(message);
      setResponse('');
    } finally {
      setLoading(false);
      onComplete?.();
    }
  };

  return (
    <div className="assistant-card__content">
      <div className="assistant-card__toolbar">
        <label className="field-group" htmlFor="assistant-mode">
          <span>Assistant mode</span>
          <select
            id="assistant-mode"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            disabled={loading}
          >
            {ACTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleAsk} disabled={loading || !canAsk} type="button">
          {loading ? 'Asking…' : 'Ask assistant'}
        </button>
      </div>

      <label className="field-group" htmlFor="assistant-question">
        <span>{requiresQuestion ? 'Question for the assistant' : 'Additional prompt (optional)'}</span>
        <textarea
          id="assistant-question"
          className="assistant-card__textarea"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          rows={requiresQuestion ? 4 : 3}
          placeholder={
            requiresQuestion
              ? 'What would you like to ask?'
              : 'Add extra instructions for the assistant (optional).'
          }
        />
      </label>

      {error && <div className="assistant-card__error">{error}</div>}

      <pre className="assistant-card__output">
        {response || 'Assistant responses will appear here.'}
      </pre>
    </div>
  );
}
