import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  LogOut, GraduationCap, BookOpen, FileText, Lightbulb,
  Upload, Archive, Milestone, TrendingUp, Leaf, Loader2,
} from 'lucide-react';
import type { Page } from '../../App';
import { useAuth } from '../../context/AuthContext';
import {
  projectsApi, progressLogsApi, submissionsApi, archiveApi, documentsApi,
  type Project, type ProgressLog, type Submission, type ArchiveEntry,
} from '../../lib/api';

interface Props {
  onNavigate: (page: Page) => void;
}

const STAGE_PROGRESS: Record<Project['stage'], number> = {
  idea: 10,
  proposal: 25,
  planning: 40,
  development: 65,
  submitted: 90,
  archived: 100,
};

const statusColor: Record<string, string> = {
  completed: 'bg-green-500',
  approved: 'bg-green-500',
  submitted: 'bg-green-500',
  under_review: 'bg-blue-500',
  pending: 'bg-yellow-500',
  revision_required: 'bg-orange-500',
  rejected: 'bg-red-500',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function StudentDashboard({ onNavigate }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [archiveProjects, setArchiveProjects] = useState<ArchiveEntry[]>([]);

  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [savingIdea, setSavingIdea] = useState(false);

  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneNote, setMilestoneNote] = useState('');
  const [savingMilestone, setSavingMilestone] = useState(false);

  const [updateSummary, setUpdateSummary] = useState('');
  const [updateBlockers, setUpdateBlockers] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  const [uploading, setUploading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, allLogs, allSubmissions, archived] = await Promise.all([
        projectsApi.list(),
        progressLogsApi.list(),
        submissionsApi.list(),
        archiveApi.list(),
      ]);
      const myProject = projects[0] || null;
      setProject(myProject);
      setDescriptionDraft(myProject?.description || '');
      setLogs(allLogs);
      setSubmissions(allSubmissions);
      setArchiveProjects(archived);
    } catch (err: any) {
      setError(err.message || 'Could not load your project data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const milestones = logs.filter((l) => l.log_type === 'milestone').sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
  const weeklyUpdates = logs.filter((l) => l.log_type === 'weekly_update').sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
  const documents = submissions.flatMap((s) => s.documents);
  const ideaSubmission = submissions.find((s) => s.submission_type === 'idea' || s.submission_type === 'proposal');
  const progress = project ? STAGE_PROGRESS[project.stage] : 0;

  const handleSaveIdea = async () => {
    if (!project) return;
    setSavingIdea(true);
    try {
      await projectsApi.update(project.id, { description: descriptionDraft });
      if (!ideaSubmission) {
        await submissionsApi.create({ project: project.id, submission_type: 'idea' });
      }
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not save your idea.');
    } finally {
      setSavingIdea(false);
    }
  };

  const handleLogMilestone = async () => {
    if (!project || !milestoneTitle.trim()) return;
    setSavingMilestone(true);
    try {
      await progressLogsApi.create({
        project: project.id,
        log_type: 'milestone',
        title: milestoneTitle,
        description: milestoneNote,
        log_date: new Date().toISOString().slice(0, 10),
      });
      setMilestoneTitle('');
      setMilestoneNote('');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not log the milestone.');
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleSubmitUpdate = async () => {
    if (!project || !updateSummary.trim()) return;
    setSavingUpdate(true);
    try {
      const weekNumber = weeklyUpdates.length + 1;
      await progressLogsApi.create({
        project: project.id,
        log_type: 'weekly_update',
        title: `Week ${weekNumber}`,
        description: updateSummary,
        blockers: updateBlockers || undefined,
        log_date: new Date().toISOString().slice(0, 10),
      });
      setUpdateSummary('');
      setUpdateBlockers('');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not submit this update.');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!project) return;
    setUploading(true);
    try {
      let targetSubmission = submissions[0];
      if (!targetSubmission) {
        targetSubmission = await submissionsApi.create({ project: project.id, submission_type: 'progress_report' });
      }
      await documentsApi.upload({ submission: targetSubmission.id, file });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#1F3A5F] rounded-full flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-[#1F3A5F]">Student Dashboard</h1>
              <p className="text-xs text-gray-500">
                {user?.full_name} {project ? <>&nbsp;·&nbsp;{project.group_detail.group_name}</> : null}
              </p>
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

        {!project ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 text-sm text-gray-600">
              You're not assigned to a project group yet. Ask your IETP coordinator to add you to one.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Overall Progress', value: `${progress}%`, sub: 'Project completion' },
                { label: 'Milestones', value: `${milestones.length}`, sub: 'Logged to date' },
                { label: 'Weekly Updates', value: `${weeklyUpdates.length}`, sub: 'Submitted' },
                { label: 'Documents', value: `${documents.length}`, sub: 'Uploaded files' },
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white border border-gray-200 rounded-lg p-1 h-auto flex-wrap">
                {[
                  { value: 'overview', label: 'Overview', icon: BookOpen },
                  { value: 'idea', label: 'Project Idea', icon: Lightbulb },
                  { value: 'progress', label: 'Progress', icon: TrendingUp },
                  { value: 'documents', label: 'Documents', icon: FileText },
                  { value: 'archive', label: 'Archive', icon: Archive },
                ].map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 text-xs">
                    <Icon className="w-3.5 h-3.5" />{label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-[#1F3A5F] text-base">My Project</CardTitle>
                      <CardDescription>{project.title}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Advisor</span>
                        <span className="font-medium text-gray-700">
                          {project.group_detail.advisor_assignments[0]?.advisor_detail?.full_name || 'Not assigned yet'}
                        </span>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      {project.sdg_alignment && (
                        <div className="pt-1">
                          <p className="text-xs text-gray-500 mb-2">SDG Alignment</p>
                          <div className="flex flex-wrap gap-2">
                            {project.sdg_alignment.split(',').map((s) => (
                              <span key={s} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                                <Leaf className="w-3 h-3" />{s.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-[#1F3A5F] text-base">Group Members</CardTitle>
                      <CardDescription>{project.group_detail.department_mix || 'Multidisciplinary team'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {project.group_detail.members.map((m) => (
                        <div key={m.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{m.student_detail.full_name}</span>
                          <Badge variant="outline" className="text-xs">{m.role_in_group}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Project Idea */}
              <TabsContent value="idea" className="mt-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />Project Idea
                    </CardTitle>
                    <CardDescription>Describe your project so your advisor can review it</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Description</label>
                      <textarea
                        rows={4}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30 resize-none"
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        placeholder="What problem does your project solve, and how?"
                      />
                    </div>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload concept sketches or diagrams</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF — max 10 MB</p>
                      <label className="inline-block mt-3">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0])}
                        />
                        <span className="cursor-pointer inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
                          Browse Files
                        </span>
                      </label>
                    </div>
                    {ideaSubmission && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg">
                        <Badge className={`${statusColor[ideaSubmission.status]} text-xs`}>{ideaSubmission.status.replace('_', ' ')}</Badge>
                        <p className="text-xs text-gray-700">
                          Submitted {formatDate(ideaSubmission.submitted_at)}
                          {ideaSubmission.feedback.length > 0 && ` — ${ideaSubmission.feedback[ideaSubmission.feedback.length - 1].comment}`}
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={handleSaveIdea}
                      disabled={savingIdea}
                      className="bg-[#1F3A5F] hover:bg-[#152b47] w-full"
                    >
                      {savingIdea ? 'Saving…' : ideaSubmission ? 'Update Idea' : 'Submit Idea'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Progress */}
              <TabsContent value="progress" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                        <Milestone className="w-4 h-4" />Milestones
                      </CardTitle>
                      <CardDescription>Key project achievements logged</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {milestones.length === 0 && (
                        <p className="text-xs text-gray-400">No milestones logged yet.</p>
                      )}
                      {milestones.map((m, idx) => (
                        <div key={m.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-[#1F3A5F] mt-1 shrink-0" />
                            {idx < milestones.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                          </div>
                          <div className="pb-3">
                            <p className="text-sm font-medium text-[#1F3A5F]">{m.title}</p>
                            <p className="text-xs text-gray-400">{formatDate(m.log_date)}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{m.description}</p>
                          </div>
                        </div>
                      ))}
                      <div className="space-y-2 pt-2 border-t">
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                          placeholder="Milestone title"
                          value={milestoneTitle}
                          onChange={(e) => setMilestoneTitle(e.target.value)}
                        />
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                          placeholder="Short note"
                          value={milestoneNote}
                          onChange={(e) => setMilestoneNote(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          className="w-full text-sm"
                          disabled={savingMilestone || !milestoneTitle.trim()}
                          onClick={handleLogMilestone}
                        >
                          {savingMilestone ? 'Logging…' : '+ Log New Milestone'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />Weekly Progress Updates
                      </CardTitle>
                      <CardDescription>Submitted weekly reports</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {weeklyUpdates.length === 0 && (
                        <p className="text-xs text-gray-400">No weekly updates submitted yet.</p>
                      )}
                      {weeklyUpdates.map((u) => (
                        <div key={u.id} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#1F3A5F]">{u.title}</span>
                            <Badge className="bg-green-500 text-xs">submitted</Badge>
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(u.log_date)}</p>
                          <p className="text-xs text-gray-700 mt-1">{u.description}</p>
                          {u.blockers && <p className="text-xs text-orange-600 mt-1">Blockers: {u.blockers}</p>}
                        </div>
                      ))}
                      <div className="space-y-2 pt-2 border-t">
                        <textarea
                          rows={2}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30 resize-none"
                          placeholder="What did you get done this week?"
                          value={updateSummary}
                          onChange={(e) => setUpdateSummary(e.target.value)}
                        />
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                          placeholder="Any blockers? (optional)"
                          value={updateBlockers}
                          onChange={(e) => setUpdateBlockers(e.target.value)}
                        />
                        <Button
                          className="w-full bg-[#1F3A5F] hover:bg-[#152b47] text-sm"
                          disabled={savingUpdate || !updateSummary.trim()}
                          onClick={handleSubmitUpdate}
                        >
                          {savingUpdate ? 'Submitting…' : "Submit This Week's Update"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Documents */}
              <TabsContent value="documents" className="mt-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                          <FileText className="w-4 h-4" />My Documents
                        </CardTitle>
                        <CardDescription>All project files uploaded by your group</CardDescription>
                      </div>
                      <label>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0])}
                        />
                        <span className="cursor-pointer inline-flex items-center justify-center rounded-md bg-[#1F3A5F] hover:bg-[#152b47] text-white text-sm px-3 py-1.5">
                          <Upload className="w-4 h-4 mr-2 inline" />{uploading ? 'Uploading…' : 'Upload File'}
                        </span>
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {documents.length === 0 && (
                        <p className="text-xs text-gray-400">No documents uploaded yet.</p>
                      )}
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#1F3A5F]/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-[#1F3A5F]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{doc.file_name}</p>
                              <p className="text-xs text-gray-400">{doc.file_size_kb} KB &nbsp;·&nbsp; {formatDate(doc.uploaded_at)}</p>
                            </div>
                          </div>
                          <a href={doc.file} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost">View</Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Archive */}
              <TabsContent value="archive" className="mt-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                      <Archive className="w-4 h-4" />Project Archive
                    </CardTitle>
                    <CardDescription>Browse completed projects from previous years for reference and inspiration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {archiveProjects.length === 0 && (
                        <p className="text-xs text-gray-400">Nothing published to the archive yet.</p>
                      )}
                      {archiveProjects.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                          <div>
                            <p className="text-sm font-medium text-[#1F3A5F]">{p.final_title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{p.department_mix} &nbsp;·&nbsp; {p.academic_year}</p>
                          </div>
                          <a href={p.report_file} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">View</Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
