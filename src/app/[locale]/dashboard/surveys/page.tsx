'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Survey, SurveyQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Share2, Copy, ExternalLink, BarChart3, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function SurveysPage() {
  const t = useTranslations('surveys');
  const tc = useTranslations('common');
  const { employee } = useAuth();
  const { theme } = useTheme();
  const supabase = createClient();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSurvey, setNewSurvey] = useState({ title: '', description: '', is_public: true });
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Partial<SurveyQuestion>[]>([]);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    const { data } = await supabase
      .from('surveys')
      .select('*, survey_questions(*), survey_responses(id)')
      .order('created_at', { ascending: false });
    setSurveys(data || []);
    setLoading(false);
  };

  const handleCreateSurvey = async () => {
    if (!newSurvey.title.trim()) return;

    const { data: survey, error } = await supabase.from('surveys').insert({
      title: newSurvey.title,
      description: newSurvey.description,
      created_by: employee?.id,
      is_public: newSurvey.is_public,
      is_active: true,
    }).select().single();

    if (error) { toast.error(error.message); return; }

    // Add questions
    if (questions.length > 0 && survey) {
      const questionsToInsert = questions.map((q, idx) => ({
        survey_id: survey.id,
        question_text: q.question_text || '',
        question_type: q.question_type || 'multiple_choice',
        options: q.options || [],
        sort_order: idx,
        is_required: q.is_required ?? true,
      }));
      await supabase.from('survey_questions').insert(questionsToInsert);
    }

    toast.success('Survey created');
    setShowCreateDialog(false);
    setNewSurvey({ title: '', description: '', is_public: true });
    setQuestions([]);
    loadSurveys();
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      question_type: 'multiple_choice',
      options: [{ id: '1', text: '', points: 0 }],
      is_required: true,
    }]);
  };

  const updateQuestion = (index: number, updates: Partial<SurveyQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const addOption = (questionIdx: number) => {
    const updated = [...questions];
    const opts = updated[questionIdx].options || [];
    updated[questionIdx] = {
      ...updated[questionIdx],
      options: [...opts, { id: String(opts.length + 1), text: '', points: 0 }],
    };
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, field: string, value: string | number) => {
    const updated = [...questions];
    const opts = [...(updated[qIdx].options || [])];
    opts[oIdx] = { ...opts[oIdx], [field]: value };
    updated[qIdx] = { ...updated[qIdx], options: opts };
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    const opts = [...(updated[qIdx].options || [])];
    opts.splice(oIdx, 1);
    updated[qIdx] = { ...updated[qIdx], options: opts };
    setQuestions(updated);
  };

  const copyShareLink = (survey: Survey) => {
    const url = `${window.location.origin}/surveys/respond/${survey.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button style={{ backgroundColor: theme.primaryColor }} className="text-white" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('createSurvey')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {surveys.map((survey) => (
          <Card key={survey.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className={survey.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {survey.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">{survey.is_public ? 'Public' : 'Private'}</Badge>
              </div>
              <CardTitle className="text-lg mt-2">{survey.title}</CardTitle>
              <p className="text-sm text-gray-500 line-clamp-2">{survey.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>{survey.survey_questions?.length || 0} questions</span>
                <span>{(survey as any).survey_responses?.length || 0} responses</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => copyShareLink(survey)}>
                  <Share2 className="w-3 h-3 mr-1" /> {t('shareLink')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(`/surveys/respond/${survey.share_token}`, '_blank')}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Open
                </Button>
                <Button size="sm" variant="ghost">
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Survey Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('createSurvey')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Survey Title</Label>
                <Input value={newSurvey.title} onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newSurvey.description} onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={newSurvey.is_public} onCheckedChange={(v) => setNewSurvey({ ...newSurvey, is_public: v })} />
                <Label>Public (anyone with link can respond)</Label>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Questions</h3>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-1" /> {t('addQuestion')}
                </Button>
              </div>

              {questions.map((q, qIdx) => (
                <Card key={qIdx} className="border-2 border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-400">Q{qIdx + 1}</span>
                      <Input
                        placeholder={t('questionText')}
                        value={q.question_text || ''}
                        onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })}
                      />
                      <Select value={q.question_type || 'multiple_choice'} onValueChange={(v) => updateQuestion(qIdx, { question_type: v as SurveyQuestion['question_type'] })}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Single Choice</SelectItem>
                          <SelectItem value="checkbox">Multiple Choice</SelectItem>
                          <SelectItem value="rating">Rating</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options */}
                    <div className="ml-8 space-y-2">
                      {(q.options || []).map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center space-x-2">
                          <input type={q.question_type === 'checkbox' ? 'checkbox' : 'radio'} className="w-4 h-4" readOnly />
                          <Input
                            placeholder="Option text"
                            value={opt.text}
                            onChange={(e) => updateOption(qIdx, oIdx, 'text', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Pts"
                            value={opt.points}
                            onChange={(e) => updateOption(qIdx, oIdx, 'points', Number(e.target.value))}
                            className="w-20"
                          />
                          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => removeOption(qIdx, oIdx)}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => addOption(qIdx)} className="text-blue-500">
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{tc('cancel')}</Button>
              <Button onClick={handleCreateSurvey} style={{ backgroundColor: theme.primaryColor }} className="text-white">
                {tc('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}