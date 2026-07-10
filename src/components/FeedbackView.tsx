import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, MessageSquareText, Plus, X, RefreshCw, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import {
  fetchFeedbackOverview, fetchSurveyQuestions, createSurveyQuestion,
  toggleSurveyQuestion, deleteSurveyQuestion,
} from '../services/api';
import { FeedbackOverview, SurveyQuestion } from '../types';

interface FeedbackViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function FeedbackView({ adminSecret, addToast }: FeedbackViewProps) {
  const [tab, setTab] = useState<'overview' | 'questions'>('overview');
  const [overview, setOverview] = useState<FeedbackOverview | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ question_text: '', question_type: 'text', options: '' });

  const loadOverview = async () => {
    setIsLoading(true);
    const result = await fetchFeedbackOverview(adminSecret);
    if (result) setOverview(result);
    setIsLoading(false);
  };

  const loadQuestions = async () => {
    setIsLoading(true);
    const result = await fetchSurveyQuestions(adminSecret);
    setQuestions(result);
    setIsLoading(false);
  };

  useEffect(() => {
    if (tab === 'overview') loadOverview();
    else loadQuestions();
  }, [tab]);

  const handleAddQuestion = async () => {
    if (!newQuestion.question_text.trim()) {
      addToast('warning', 'Question text is required');
      return;
    }
    const payload: any = {
      question_text: newQuestion.question_text,
      question_type: newQuestion.question_type,
    };
    if (newQuestion.question_type === 'multiple_choice') {
      const opts = newQuestion.options.split(',').map(o => o.trim()).filter(Boolean);
      if (opts.length < 2) {
        addToast('warning', 'Add at least 2 comma-separated options');
        return;
      }
      payload.options = opts;
    }
    const result = await createSurveyQuestion(adminSecret, payload);
    if (result.success) {
      addToast('success', 'Question added to pool');
      setShowAddModal(false);
      setNewQuestion({ question_text: '', question_type: 'text', options: '' });
      loadQuestions();
    } else {
      addToast('error', 'Failed to add question');
    }
  };

  const handleToggle = async (q: SurveyQuestion) => {
    const result = await toggleSurveyQuestion(adminSecret, q.id, !q.is_active);
    if (result.success) {
      addToast('success', `Question ${!q.is_active ? 'activated' : 'deactivated'}`);
      loadQuestions();
    }
  };

  const handleDelete = async (q: SurveyQuestion) => {
    if (!confirm(`Delete this question? "${q.question_text}"`)) return;
    const result = await deleteSurveyQuestion(adminSecret, q.id);
    if (result.success) {
      addToast('success', 'Question deleted');
      loadQuestions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feedback & Surveys</h1>
          <p className="text-sm text-text-muted mt-1">Weekly ratings, survey responses, and question pool management.</p>
        </div>
        <button
          onClick={() => tab === 'overview' ? loadOverview() : loadQuestions()}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-blue' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'overview' as const, label: 'Overview & Responses' },
          { id: 'questions' as const, label: 'Manage Questions' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition cursor-pointer ${
              tab === t.id ? 'border-primary-blue text-primary-blue' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <>
          {isLoading && (
            <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-16 text-center">
              <RefreshCw className="w-8 h-8 text-primary-blue mx-auto mb-3 animate-spin" />
            </div>
          )}

          {overview && !isLoading && (
            <>
              {/* Rating summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                      <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-slate-900">
                        {overview.ratings_summary.average_rating ?? '—'}
                        <span className="text-sm text-slate-400 font-normal">/5</span>
                      </p>
                      <p className="text-xs text-slate-500">{overview.ratings_summary.total_ratings} total ratings</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {overview.ratings_summary.breakdown.slice().reverse().map(b => (
                      <div key={b.star} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 w-8">{b.star}★</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${overview.ratings_summary.total_ratings > 0 ? (b.count / overview.ratings_summary.total_ratings) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-6 text-right">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Survey Engagement</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-2xl font-black text-primary-blue">{overview.survey_stats.total_responses}</p>
                      <p className="text-[10px] text-slate-400">Answers</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-success">{overview.survey_stats.total_completed_surveys}</p>
                      <p className="text-[10px] text-slate-400">Completed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-slate-400">{overview.survey_stats.total_dismissed}</p>
                      <p className="text-[10px] text-slate-400">Dismissed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent ratings with comments */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Recent Ratings</h3>
                <div className="bg-white rounded-xl border border-slate-105 shadow-geometric divide-y divide-[#EEF1F8] max-h-96 overflow-y-auto">
                  {overview.recent_ratings.length === 0 && (
                    <p className="p-8 text-center text-slate-400 text-sm">No ratings yet</p>
                  )}
                  {overview.recent_ratings.map((r, i) => (
                    <div key={i} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm text-slate-900">{r.users?.full_name ?? 'Unknown'}</p>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-3.5 h-3.5 ${j < r.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-xs text-slate-500 italic">"{r.comment}"</p>}
                      <p className="text-[10px] text-slate-300 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent survey answers */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Recent Survey Responses</h3>
                <div className="bg-white rounded-xl border border-slate-105 shadow-geometric divide-y divide-[#EEF1F8] max-h-96 overflow-y-auto">
                  {overview.recent_survey_responses.length === 0 && (
                    <p className="p-8 text-center text-slate-400 text-sm">No survey responses yet</p>
                  )}
                  {overview.recent_survey_responses.map((r, i) => (
                    <div key={i} className="p-4">
                      <p className="text-[11px] font-bold text-primary-blue mb-1">{r.survey_questions?.question_text}</p>
                      <p className="text-sm text-slate-700 mb-1">{r.answer_text}</p>
                      <p className="text-[10px] text-slate-400">{r.users?.full_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══ QUESTIONS TAB ═══ */}
      {tab === 'questions' && (
        <>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-primary-blue text-white flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>

          <div className="bg-white rounded-xl border border-slate-105 shadow-geometric divide-y divide-[#EEF1F8]">
            {questions.map(q => (
              <div key={q.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${q.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                    {q.question_text}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {q.question_type}{q.options ? ` · ${q.options.length} options` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggle(q)} className="cursor-pointer">
                    {q.is_active
                      ? <ToggleRight className="w-6 h-6 text-success" />
                      : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                  </button>
                  <button onClick={() => handleDelete(q)} className="cursor-pointer text-danger">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900">Add Survey Question</h3>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <textarea
                placeholder="Question text"
                value={newQuestion.question_text}
                onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                rows={2}
              />
              <select
                value={newQuestion.question_type}
                onChange={e => setNewQuestion({ ...newQuestion, question_type: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              >
                <option value="text">Text (open answer)</option>
                <option value="multiple_choice">Multiple Choice</option>
              </select>
              {newQuestion.question_type === 'multiple_choice' && (
                <input
                  placeholder="Options, comma separated (e.g. Yes, No, Maybe)"
                  value={newQuestion.options}
                  onChange={e => setNewQuestion({ ...newQuestion, options: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                />
              )}
            </div>
            <button onClick={handleAddQuestion} className="w-full mt-4 py-3 bg-primary-blue text-white font-bold rounded-xl text-sm cursor-pointer">
              Add to Pool
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
