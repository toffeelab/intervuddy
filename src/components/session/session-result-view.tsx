import { MessageSquare, Star, StarHalf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type {
  InterviewSession,
  SessionParticipantInfo,
  SessionQuestionRecord,
} from '@/data-access/types';
import { cn } from '@/lib/utils';

interface Props {
  session: InterviewSession;
  participants: SessionParticipantInfo[];
  records: SessionQuestionRecord[];
}

const roleLabel: Record<string, string> = {
  interviewer: '면접관',
  interviewee: '지원자',
  reviewer: '리뷰어',
};

function StarDisplay({ score, size = 'sm' }: { score: number; size?: 'sm' | 'xs' }) {
  const sizeClass = size === 'sm' ? 'size-3.5' : 'size-2.5';

  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, idx) => {
        const starValue = idx + 1;
        if (score >= starValue) {
          return <Star key={idx} className={cn(sizeClass, 'fill-yellow-400 text-yellow-400')} />;
        }
        if (score >= starValue - 0.5) {
          return (
            <span key={idx} className="relative inline-block">
              <Star className={cn(sizeClass, 'text-iv-text3')} />
              <StarHalf
                className={cn(sizeClass, 'absolute inset-0 fill-yellow-400 text-yellow-400')}
              />
            </span>
          );
        }
        return <Star key={idx} className={cn(sizeClass, 'text-iv-text3')} />;
      })}
    </span>
  );
}

export function SessionResultView({ session, participants, records }: Props) {
  // Calculate average score across all feedbacks
  const allScores = records.flatMap((r) =>
    r.feedbacks.filter((f) => f.score !== null).map((f) => f.score!)
  );
  const averageScore =
    allScores.length > 0
      ? (allScores.reduce((sum, s) => sum + s, 0) / allScores.length).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Session meta */}
      <div className="border-iv-border bg-iv-bg2 rounded-lg border p-4">
        <h3 className="text-iv-text text-lg font-medium">{session.title}</h3>
        <div className="text-iv-text3 mt-2 flex flex-wrap items-center gap-3 text-xs">
          {session.startedAt && (
            <span>시작: {new Date(session.startedAt).toLocaleString('ko-KR')}</span>
          )}
          {session.endedAt && (
            <span>종료: {new Date(session.endedAt).toLocaleString('ko-KR')}</span>
          )}
          {averageScore !== null && (
            <span className="flex items-center gap-1">
              <StarDisplay score={parseFloat(averageScore)} size="sm" />
              평균 {averageScore}/5
            </span>
          )}
        </div>

        {/* Participants */}
        <div className="mt-3 flex flex-wrap gap-2">
          {participants.map((p) => (
            <Badge key={p.id} variant="secondary" className="text-xs">
              {p.displayName ?? p.userId.slice(0, 6)} ({roleLabel[p.role] ?? p.role})
            </Badge>
          ))}
        </div>
      </div>

      {/* Summary (총평) */}
      {session.summary && (
        <div className="border-iv-border rounded-lg border p-4">
          <h4 className="text-iv-text mb-2 text-sm font-medium">총평</h4>
          <p className="text-iv-text2 text-sm leading-relaxed whitespace-pre-wrap">
            {session.summary}
          </p>
        </div>
      )}

      {/* Question records */}
      {records.length === 0 ? (
        <p className="text-iv-text3 py-8 text-center text-sm">기록된 질문이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const questionScores = record.feedbacks
              .filter((f) => f.score !== null)
              .map((f) => f.score!);
            const questionAvg =
              questionScores.length > 0
                ? (questionScores.reduce((sum, s) => sum + s, 0) / questionScores.length).toFixed(1)
                : null;

            return (
              <div key={record.id} className="border-iv-border overflow-hidden rounded-lg border">
                {/* Question header */}
                <div className="bg-iv-bg2 flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-iv-text3 text-xs">Q{record.displayOrder}</span>
                    <p className="text-iv-text mt-0.5 text-sm leading-relaxed">{record.content}</p>
                  </div>
                  {questionAvg !== null && (
                    <div className="flex shrink-0 items-center gap-1">
                      <StarDisplay score={parseFloat(questionAvg)} size="sm" />
                      <span className="text-iv-text text-sm font-medium">{questionAvg}</span>
                    </div>
                  )}
                </div>

                {/* Answer */}
                {record.answer && (
                  <div className="border-iv-border border-t p-4">
                    <p className="text-iv-text3 mb-1 text-xs font-medium">답변</p>
                    <p className="text-iv-text text-sm leading-relaxed whitespace-pre-wrap">
                      {record.answer.content}
                    </p>
                  </div>
                )}

                {/* Feedbacks */}
                {record.feedbacks.length > 0 && (
                  <div className="border-iv-border border-t p-4">
                    <p className="text-iv-text3 mb-2 text-xs font-medium">
                      <MessageSquare className="mr-1 inline size-3" />
                      피드백 ({record.feedbacks.length})
                    </p>
                    <div className="space-y-2">
                      {record.feedbacks.map((fb, i) => {
                        const feedbackAuthor =
                          participants.find((p) => p.userId === fb.userId)?.displayName ??
                          fb.userId.slice(0, 8);
                        return (
                          <div key={i} className="bg-iv-bg rounded-md p-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-iv-text3 text-[10px]">{feedbackAuthor}</span>
                              {fb.score !== null && <StarDisplay score={fb.score} size="xs" />}
                            </div>
                            {fb.content && (
                              <p className="text-iv-text2 mt-1 text-xs leading-relaxed">
                                {fb.content}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
