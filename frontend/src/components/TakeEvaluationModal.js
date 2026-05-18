/**
 * Take Evaluation modal — renders a 360 template's sections + questions,
 * collects responses, and POSTs them to /api/leadership/360/:id/respond/.
 *
 * Expects template.sections shaped like:
 *   [
 *     {
 *       title: "Communication",
 *       description: "Optional intro shown under the heading",
 *       questions: [
 *         { text: "Speaks up", kind: "rating", scale_min: 1, scale_max: 5 },
 *         { text: "Anything else?", kind: "text" }
 *       ]
 *     }
 *   ]
 *
 * Responses are saved keyed by `${sectionIdx}.${qIdx}`.
 */

import React, { useEffect, useState } from 'react';
import { FormModal, TextArea } from './ui';
import leadershipService from '../services/leadership';

const TakeEvaluationModal = ({ isOpen, evaluation, template, onClose, onSubmitted }) => {
  const [responses, setResponses] = useState({});
  const [error, setError] = useState('');

  // Reset when a different evaluation is opened.
  useEffect(() => {
    if (isOpen) {
      setResponses({});
      setError('');
    }
  }, [isOpen, evaluation?.id]);

  const sections = Array.isArray(template?.sections) ? template.sections : [];
  const hasContent = sections.some(s => Array.isArray(s.questions) && s.questions.length > 0);

  const setAnswer = (key, value) => {
    setResponses(r => ({ ...r, [key]: value }));
  };

  const submit = async () => {
    if (!evaluation?.id) return;
    // Require all rating questions to be answered before submit.
    for (let s = 0; s < sections.length; s++) {
      const qs = sections[s].questions || [];
      for (let q = 0; q < qs.length; q++) {
        const question = qs[q];
        const key = `${s}.${q}`;
        if (question.kind === 'rating' && responses[key] == null) {
          setError(`Please rate every question (missing: ${sections[s].title} → "${question.text}")`);
          throw new Error('Missing rating');
        }
      }
    }
    try {
      await leadershipService.respondToEvaluation360(evaluation.id, responses);
      if (onSubmitted) await onSubmitted();
      onClose();
    } catch (err) {
      setError(err?.data?.detail || err?.message || 'Could not submit.');
      throw err;
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={`360 Evaluation — ${evaluation?.evaluatee_name || 'team member'}`}
      submitLabel="Submit Responses"
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      submitDisabled={!hasContent}
      errorMessage={error}
    >
      {!hasContent ? (
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          This template doesn't have any questions yet. An admin can add
          sections + questions to the template; come back here once they have.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Rate the team member on each item. Your responses are anonymized
            in aggregate results.
          </p>

          {sections.map((sec, sIdx) => (
            <section
              key={sIdx}
              style={{
                background: '#f9fafb',
                border: '1px solid #f3f4f6',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#111827' }}>
                {sec.title || `Section ${sIdx + 1}`}
              </h3>
              {sec.description && (
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
                  {sec.description}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(sec.questions || []).map((q, qIdx) => {
                  const key = `${sIdx}.${qIdx}`;
                  return (
                    <div key={qIdx}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'block', marginBottom: 6 }}>
                        {q.text}
                      </label>

                      {q.kind === 'rating' && (
                        <RatingScale
                          min={q.scale_min || 1}
                          max={q.scale_max || 5}
                          value={responses[key]}
                          onChange={(v) => setAnswer(key, v)}
                        />
                      )}

                      {q.kind === 'text' && (
                        <TextArea
                          value={responses[key] || ''}
                          onChange={(v) => setAnswer(key, v)}
                          rows={3}
                          placeholder="Share specific examples or context…"
                        />
                      )}

                      {q.kind !== 'rating' && q.kind !== 'text' && (
                        <p style={{ fontSize: 12, color: '#9ca3af' }}>
                          Unsupported question type: <code>{String(q.kind)}</code>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </FormModal>
  );
};

const RatingScale = ({ min, max, value, onChange }) => {
  const buttons = [];
  for (let i = min; i <= max; i++) {
    const selected = value === i;
    buttons.push(
      <button
        key={i}
        type="button"
        onClick={() => onChange(i)}
        style={{
          appearance: 'none',
          width: 36,
          height: 36,
          borderRadius: 999,
          border: selected ? '2px solid #E51636' : '1px solid #d1d5db',
          background: selected ? '#E51636' : '#ffffff',
          color: selected ? '#ffffff' : '#374151',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.12s ease',
        }}
      >
        {i}
      </button>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>Low</span>
      {buttons}
      <span style={{ fontSize: 11, color: '#9ca3af' }}>High</span>
    </div>
  );
};

export default TakeEvaluationModal;
