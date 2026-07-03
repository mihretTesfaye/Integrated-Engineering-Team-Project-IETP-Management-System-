import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';
import {
  LogOut, GraduationCap, Users, FileText, Star,
  CheckCircle, Clock, TrendingUp, MessageSquare, Loader2,
} from 'lucide-react';
import type { Page } from '../../App';
import { useAuth } from '../../context/AuthContext';
import {
  groupsApi, projectsApi, submissionsApi, progressLogsApi, feedbackApi, evaluationsApi,
  type ProjectGroup, type Project, type Submission, type ProgressLog,
} from '../../lib/api';

interface Props {
  onNavigate: (page: Page) => void;
}

const STAGE_PROGRESS: Record<Project['stage'], number> = {
  idea: 10, proposal: 25, planning: 40, development: 65, submitted: 90, archived: 100,
};

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-500',
  under_review: 'bg-blue-500',
  approved: 'bg-green-500',
  revision_required: 'bg-orange-500',
  rejected: 'bg-red-500',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AdvisorDashboard({ onNavigate }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<ProgressLog[]>([]);

  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { criterion: string; score: string; remarks: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, p, s, l] = await Promise.all([
        groupsApi.list(),
        projectsApi.list(),
        submissionsApi.list(),
        progressLogsApi.list(),
      ]);
      setGroups(g);
      setProjects(p);
      setSubmissions(s);
      setLogs(l);
    } catch (err: any) {
      setError(err.message || 'Could not load your groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const projectByGroup = (groupId: string) => projects.find((p) => p.group === groupId);
  const avgProgress = groups.length
    ? Math.round(
        groups.reduce((sum, g) => {
          const proj = projectByGroup(g.id);
          return sum + (proj ? STAGE_PROGRESS[proj.stage] : 0);
        }, 0) / groups.length
      )
    : 0;

  const proposals = submissions.filter((s) => s.submission_type === 'idea' || s.submission_type === 'proposal');
  const pendingProposals = proposals.filter((p) => p.status === 'pending' || p.status === 'under_review');
  const weeklyUpdates = logs.filter((l) => l.log_type === 'weekly_update').sort((a, b) => (a.log_date < b.log_date ? 1 : -1)).slice(0, 10);

  const projectTitleFor = (submission: Submission) => projects.find((p) => p.id === submission.project)?.title || 'Untitled project';
  const groupNameFor = (submission: Submission) => {
    const proj = projects.find((p) => p.id === submission.project);
    return proj?.group_detail.group_name || 'Unknown group';
  };
  const groupNameForLog = (log: ProgressLog) => {
    const proj = projects.find((p) => p.id === log.project);
    return proj?.group_detail.group_name || 'Unknown group';
  };

  const handleDecision = async (submission: Submission, status: Submission['status']) => {
    setBusy(submission.id);
    try {
      await submissionsApi.update(submission.id, { status, reviewed_at: new Date().toISOString() });
      const comment = feedbackDrafts[submission.id];
      if (comment && comment.trim()) {
        await feedbackApi.create({ submission: submission.id, comment });
      }
      setFeedbackDrafts((prev) => ({ ...prev, [submission.id]: '' }));
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not update this proposal.');
    } finally {
      setBusy(null);
    }
  };

  const handleLeaveFeedback = async (submissionId: string) => {
    const comment = feedbackDrafts[submissionId];
    if (!comment || !comment.trim()) return;
    setBusy(submissionId);
    try {
      await feedbackApi.create({ submission: submissionId, comment });
      setFeedbackDrafts((prev) => ({ ...prev, [submissionId]: '' }));
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not save your feedback.');
    } finally {
      setBusy(null);
    }
  };

  const handleEnterScore = async (projectId: string) => {
    const draft = scoreDrafts[projectId];
    const score = Number(draft?.score);
    if (!draft || !draft.criterion.trim() || Number.isNaN(score)) return;
    setBusy(projectId);
    try {
      await evaluationsApi.create({
        project: projectId,
        evaluation_type: 'advisor',
        criteria_scores: { [draft.criterion]: score },
        total_score: score,
        weight_percent: 62.5,
        remarks: draft.remarks || undefined,
      });
      setScoreDrafts((prev) => ({ ...prev, [projectId]: { criterion: '', score: '', remarks: '' } }));
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not save the score.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1F3A5F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#1F3A5F] rounded-full flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-[#1F3A5F]">Advisor Dashboard</h1>
              <p className="text-xs text-gray-500">{user?.full_name} &nbsp;·&nbsp; {user?.department || 'Faculty of Engineering'}</p>
            </div>
          </div>
          <Button onClick={() => onNavigate('login')} variant="outline" className="text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" />Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Assigned Groups', value: groups.length, sub: 'Active supervision' },
            { label: 'Avg Progress', value: `${avgProgress}%`, sub: 'Across all groups' },
            { label: 'Pending Proposals', value: pendingProposals.length, sub: 'Awaiting review' },
            { label: 'Weekly Updates', value: weeklyUpdates.length, sub: 'Recent submissions' },
          ].map(({ label, value, sub }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl text-[#1F3A5F] mt-1">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-gray-200 rounded-lg p-1 h-auto flex-wrap">
            {[
              { value: 'overview', label: 'My Groups', icon: Users },
              { value: 'proposals', label: 'Proposals', icon: FileText },
              { value: 'progress', label: 'Progress Monitoring', icon: TrendingUp },
              { value: 'evaluation', label: 'Evaluation & Scoring', icon: Star },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 text-xs">
                <Icon className="w-3.5 h-3.5" />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* My Groups */}
          <TabsContent value="overview" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />Assigned Project Groups
                </CardTitle>
                <CardDescription>Groups under your supervision this semester</CardDescription>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <p className="text-xs text-gray-400">No groups assigned to you yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Project Title</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map((g) => {
                        const proj = projectByGroup(g.id);
                        const progress = proj ? STAGE_PROGRESS[proj.stage] : 0;
                        return (
                          <TableRow key={g.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-sm">{g.group_name}</TableCell>
                            <TableCell className="text-sm max-w-xs truncate">{proj?.title || 'No project yet'}</TableCell>
                            <TableCell className="text-sm">{g.members.length}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div className="bg-[#1F3A5F] h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-xs text-gray-600">{progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{proj?.stage || 'idea'}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Proposals */}
          <TabsContent value="proposals" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />Proposal Review
                </CardTitle>
                <CardDescription>Review submitted proposals and grant approval or request revision</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {proposals.length === 0 && <p className="text-xs text-gray-400">No proposals submitted yet.</p>}
                {proposals.map((p) => (
                  <div key={p.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-[#1F3A5F]">{groupNameFor(p)}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{projectTitleFor(p)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDate(p.submitted_at)}</p>
                      </div>
                      <Badge className={`${statusColor[p.status]} text-xs`}>{p.status.replace('_', ' ')}</Badge>
                    </div>
                    <textarea
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30 resize-none"
                      placeholder="Leave a comment (optional for approve, recommended for revision)"
                      value={feedbackDrafts[p.id] || ''}
                      onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm" variant="outline" disabled={busy === p.id}
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        onClick={() => handleDecision(p, 'approved')}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                      </Button>
                      <Button
                        size="sm" variant="outline" disabled={busy === p.id}
                        className="text-orange-700 border-orange-300 hover:bg-orange-50"
                        onClick={() => handleDecision(p, 'revision_required')}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />Request Revision
                      </Button>
                      <Button
                        size="sm" variant="ghost" disabled={busy === p.id}
                        onClick={() => handleLeaveFeedback(p.id)}
                      >
                        Leave Comment Only
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Monitoring */}
          <TabsContent value="progress" className="space-y-4 mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />Group Progress Overview
                </CardTitle>
                <CardDescription>Progress bars across all assigned groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {groups.map((g) => {
                  const proj = projectByGroup(g.id);
                  const progress = proj ? STAGE_PROGRESS[proj.stage] : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{g.group_name}</span>
                        <span className="text-gray-500">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />Latest Weekly Updates
                </CardTitle>
                <CardDescription>Recent progress reports submitted by groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {weeklyUpdates.length === 0 && <p className="text-xs text-gray-400">No weekly updates yet.</p>}
                {weeklyUpdates.map((u) => (
                  <div key={u.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#1F3A5F]">{groupNameForLog(u)} — {u.title}</span>
                      <span className="text-xs text-gray-400">{formatDate(u.log_date)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{u.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evaluation & Scoring */}
          <TabsContent value="evaluation" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <Star className="w-4 h-4" />Evaluation Score Entry
                </CardTitle>
                <CardDescription>
                  Record formal assessment scores — advisor contribution is 62.5% of final grade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                  <strong>Grade Breakdown:</strong> Proposal Review (15%) + Prototype Demo (20%) + Final Report (15%) + Oral Presentation (12.5%) = 62.5% by Advisor &nbsp;·&nbsp; Peer Evaluation 5%
                </div>
                {groups.map((g) => {
                  const proj = projectByGroup(g.id);
                  if (!proj) return null;
                  const draft = scoreDrafts[proj.id] || { criterion: '', score: '', remarks: '' };
                  return (
                    <div key={g.id} className="border rounded-lg p-3">
                      <p className="text-sm font-medium text-[#1F3A5F] mb-2">{g.group_name} — {proj.title}</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                        <input
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                          placeholder="Criterion (e.g. prototype)"
                          value={draft.criterion}
                          onChange={(e) => setScoreDrafts((prev) => ({ ...prev, [proj.id]: { ...draft, criterion: e.target.value } }))}
                        />
                        <input
                          type="number"
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                          placeholder="Score"
                          value={draft.score}
                          onChange={(e) => setScoreDrafts((prev) => ({ ...prev, [proj.id]: { ...draft, score: e.target.value } }))}
                        />
                        <input
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                          placeholder="Remarks (optional)"
                          value={draft.remarks}
                          onChange={(e) => setScoreDrafts((prev) => ({ ...prev, [proj.id]: { ...draft, remarks: e.target.value } }))}
                        />
                        <Button
                          size="sm" className="bg-[#1F3A5F] hover:bg-[#152b47] text-xs"
                          disabled={busy === proj.id || !draft.criterion.trim() || !draft.score}
                          onClick={() => handleEnterScore(proj.id)}
                        >
                          Save Score
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
