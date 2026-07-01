'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Survey, SurveyQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SurveyRespondPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondentName, setRespondentName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadSurvey();
  }, [token]);

  const loadSurvey = async () => {
    const { data } = await supabase
      .from('surveys')
      .select('*, survey_questions(*)')
      .eq('share_token', token)
      .eq('is_active', true)
      .single();

    if (data) {
      setSurvey(data);
      // Sort questions
      data.survey_questions?.sort((a: SurveyQuestion, b: SurveyQuestion) => a.sort_order - b.sort_order);
    }
    setLoading(false);
  };

  const handleSelectOption = (questionId: string, optionId: string, type: string) => {
    if (type === 'checkbox') {
      const current = answers[questionId] || [];
      if (current.includes(optionId)) {
        setAnswers({ ...answers, [questionId]: current.filter((id) => id !== optionId) });
      } else {
        setAnswers({ ...answers, [questionId]: [...current, optionId] });
      }
    } else {
      setAnswers({ ...answers, [questionId]: [optionId] });
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Calculate score
    let totalScore = 0;
    const formattedAnswers = survey.survey_questions?.map((q) => {
      const selectedIds = answers[q.id] || [];
      const selectedOptions = q.options.filter((opt) => selectedIds.includes(opt.id));
      const score = selectedOptions.reduce((sum, opt) => sum + opt.points, 0);
      totalScore += score;
      return { question_id: q.id, selected_options: selectedIds };
    }) || [];

    const { error } = await supabase.from('survey_responses').insert({
      survey_id: survey.id,
      respondent_name: respondentName || null,
      total_score: totalScore,
      answers: formattedAnswers,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!survey) return <div className="min-h-screen flex items-center justify-center">Survey not found or inactive.</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
            <p className="text-gray-500">Your response has been recorded successfully.</p>
            <p className="text-lg font-semibold mt-4">Score: {survey && Object.entries(answers).reduce((total, [qId, selectedIds]) => {
              const question = survey.survey_questions?.find(q => q.id === qId);
              return total + (question?.options.filter(o => selectedIds.includes(o.id)).reduce((s, o) => s + o.points, 0) || 0);
            }, 0)} points</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.description && <p className="text-gray-500 mt-2">{survey.description}</p>}
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Label>Your Name (optional)</Label>
              <Input value={respondentName} onChange={(e) => setRespondentName(e.target.value)} placeholder="Enter your name..." />
            </CardContent>
          </Card>

          {survey.survey_questions?.map((question, idx) => (
            <Card key={question.id} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start space-x-2 mb-4">
                  <span className="text-sm font-bold text-gray-400 mt-0.5">{idx + 1}.</span>
                  <div className="flex-1">
                    <p className="font-medium">{question.question_text}</p>
                    {question.is_required && <span className="text-red-500 text-sm">*</span>}
                  </div>
                </div>

                <div className="ml-6 space-y-3">
                  {question.options.map((option) => (
                    <label key={option.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type={question.question_type === 'checkbox' ? 'checkbox' : 'radio'}
                        name={question.id}
                        checked={(answers[question.id] || []).includes(option.id)}
                        onChange={() => handleSelectOption(question.id, option.id, question.question_type)}
                        className="w-4 h-4"
                      />
                      <span className="flex-1">{option.text}</span>
                      {option.points > 0 && <span className="text-xs text-gray-400">({option.points} pts)</span>}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              onClick={handleSubmit}
              className="px-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Submit Survey
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}