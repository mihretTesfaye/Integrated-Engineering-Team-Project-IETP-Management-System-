import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  LogOut, GraduationCap, Users, UserPlus, Settings,
  Archive, TrendingUp, CheckCircle, BookOpen, ShieldCheck, Loader2,
  Eye, EyeOff, UserCog, Trash2,
} from 'lucide-react';
import type { Page } from '../../App';
import { useAuth } from '../../context/AuthContext';
import {
  usersApi, groupsApi, projectsApi, advisorAssignmentsApi, archiveApi, groupMembersApi,
  type User, type ProjectGroup, type Project, type ArchiveEntry, type Role,
} from '../../lib/api';

interface Props {
  onNavigate: (page: Page) => void;
}

const STAGE_PROGRESS: Record<Project['stage'], number> = {
  idea: 10, proposal: 25, planning: 40, development: 65, submitted: 90, archived: 100,
};

const roleColor: Record<string, string> = {
  student: 'bg-blue-100 text-blue-800',
  advisor: 'bg-purple-100 text-purple-800',
  admin: 'bg-gray-100 text-gray-800',
};

export function AdminDashboard({ onNavigate }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('groups');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');

  const [newGroup, setNewGroup] = useState({ group_name: '', academic_year: '', semester: '', department_mix: '' });
  const [newUser, setNewUser] = useState({ full_name: '', email: '', role: 'student' as Role, department: '', password: '' });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [assignDraft, setAssignDraft] = useState({ group: '', advisor: '' });
  const [memberDraft, setMemberDraft] = useState({ group: '', student: '', role_in_group: 'member' as 'leader' | 'member' });

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, g, p, a] = await Promise.all([
        usersApi.list(), groupsApi.list(), projectsApi.list(), archiveApi.list(),
      ]);
      setUsers(u);
      setGroups(g);
      setProjects(p);
      setArchiveEntries(a);
      if (g[0]) {
        setAssignDraft((prev) => ({ ...prev, group: prev.group || g[0].id }));
        setMemberDraft((prev) => ({ ...prev, group: prev.group || g[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Could not load system data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const advisors = users.filter((u) => u.role === 'advisor');
  const students = users.filter((u) => u.role === 'student');
  const selectedMemberGroup = groups.find((g) => g.id === memberDraft.group);
  const memberGroupStudentIds = new Set((selectedMemberGroup?.members || []).map((m) => m.student));
  const availableStudentsForGroup = students.filter((s) => !memberGroupStudentIds.has(s.id));
  const projectByGroup = (groupId: string) => projects.find((p) => p.group === groupId);
  const pendingArchiveCount = archiveEntries.length; // archive entries here are already published; "pending" would be completed projects w/o an entry
  const completedUnarchivedProjects = projects.filter(
    (p) => p.stage === 'submitted' && !archiveEntries.some((a) => a.project === p.id)
  );

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !userSearch ||
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'All roles' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateGroup = async () => {
    if (!newGroup.group_name.trim() || !newGroup.academic_year.trim() || !newGroup.semester.trim()) return;
    setBusy(true);
    try {
      await groupsApi.create(newGroup);
      setNewGroup({ group_name: '', academic_year: '', semester: '', department_mix: '' });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not create the group.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name.trim() || !newUser.email.trim() || newUser.password.length < 8) {
      setError('Fill in name and email, and use a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await usersApi.create(newUser);
      setNewUser({ full_name: '', email: '', role: 'student', department: '', password: '' });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not create the user.');
    } finally {
      setBusy(false);
    }
  };

  const handleAssignAdvisor = async () => {
    if (!assignDraft.group || !assignDraft.advisor) return;
    setBusy(true);
    try {
      await advisorAssignmentsApi.create({ group: assignDraft.group, advisor: assignDraft.advisor });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not assign the advisor.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberDraft.group || !memberDraft.student) return;
    setBusy(true);
    try {
      await groupMembersApi.create({
        group: memberDraft.group,
        student: memberDraft.student,
        role_in_group: memberDraft.role_in_group,
      });
      setMemberDraft((prev) => ({ ...prev, student: '' }));
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not add this student to the group.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setBusy(true);
    try {
      await groupMembersApi.remove(memberId);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not remove this student from the group.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    setBusy(true);
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not update this user.');
    } finally {
      setBusy(false);
    }
  };

  const handlePublishArchive = async (project: Project, file: File) => {
    setBusy(true);
    try {
      await archiveApi.create({
        project: project.id,
        final_title: project.title,
        department_mix: project.group_detail.department_mix || '',
        academic_year: project.group_detail.academic_year,
        keywords: project.sdg_alignment || '',
        abstract: project.description || '',
        report_file: file,
      });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Could not publish this project to the archive.');
    } finally {
      setBusy(false);
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
              <h1 className="text-xl text-[#1F3A5F]">Administrator Dashboard</h1>
              <p className="text-xs text-gray-500">{user?.full_name} &nbsp;·&nbsp; IETP Coordinator</p>
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
            { label: 'Total Groups', value: groups.length, sub: 'Active this semester' },
            { label: 'Total Users', value: users.length, sub: 'Students & advisors' },
            { label: 'Advisors', value: advisors.length, sub: 'Faculty assigned' },
            { label: 'Ready to Archive', value: completedUnarchivedProjects.length, sub: 'Awaiting publish' },
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
              { value: 'groups', label: 'Project Groups', icon: BookOpen },
              { value: 'users', label: 'User Management', icon: Users },
              { value: 'progress', label: 'All Progress', icon: TrendingUp },
              { value: 'archive', label: 'Archive', icon: Archive },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 text-xs">
                <Icon className="w-3.5 h-3.5" />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Project Groups */}
          <TabsContent value="groups" className="mt-4 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />Manage Project Groups
                    </CardTitle>
                    <CardDescription>Create multidisciplinary teams and assign advisors</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm md:col-span-2" placeholder="Group name"
                    value={newGroup.group_name} onChange={(e) => setNewGroup({ ...newGroup, group_name: e.target.value })} />
                  <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Academic year e.g. 2025/2026"
                    value={newGroup.academic_year} onChange={(e) => setNewGroup({ ...newGroup, academic_year: e.target.value })} />
                  <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Semester"
                    value={newGroup.semester} onChange={(e) => setNewGroup({ ...newGroup, semester: e.target.value })} />
                  <Button className="bg-[#1F3A5F] hover:bg-[#152b47] text-sm" disabled={busy} onClick={handleCreateGroup}>
                    <UserPlus className="w-4 h-4 mr-2" />Create Group
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Project Title</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Advisor(s)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((g) => (
                      <TableRow key={g.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-sm">{g.group_name}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{projectByGroup(g.id)?.title || '—'}</TableCell>
                        <TableCell className="text-sm">{g.members.length}</TableCell>
                        <TableCell className="text-sm">
                          {g.advisor_assignments.length
                            ? g.advisor_assignments.map((a) => a.advisor_detail.full_name).join(', ')
                            : 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <Badge className={g.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}>{g.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Assign Advisor panel */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />Assign Advisor to Group
                </CardTitle>
                <CardDescription>Link advisors to each project group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Select Group</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                      value={assignDraft.group}
                      onChange={(e) => setAssignDraft({ ...assignDraft, group: e.target.value })}
                    >
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.group_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Select Advisor</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                      value={assignDraft.advisor}
                      onChange={(e) => setAssignDraft({ ...assignDraft, advisor: e.target.value })}
                    >
                      <option value="">Choose an advisor…</option>
                      {advisors.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                  <Button className="bg-[#1F3A5F] hover:bg-[#152b47] text-sm" disabled={busy || !assignDraft.advisor} onClick={handleAssignAdvisor}>
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Assign Students panel */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <UserCog className="w-4 h-4" />Assign Students to Group
                </CardTitle>
                <CardDescription>Add students so their dashboard shows the group's project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Select Group</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                      value={memberDraft.group}
                      onChange={(e) => setMemberDraft({ ...memberDraft, group: e.target.value, student: '' })}
                    >
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.group_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Select Student</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                      value={memberDraft.student}
                      onChange={(e) => setMemberDraft({ ...memberDraft, student: e.target.value })}
                    >
                      <option value="">Choose a student…</option>
                      {availableStudentsForGroup.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Role in Group</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                      value={memberDraft.role_in_group}
                      onChange={(e) => setMemberDraft({ ...memberDraft, role_in_group: e.target.value as 'leader' | 'member' })}
                    >
                      <option value="member">Member</option>
                      <option value="leader">Leader</option>
                    </select>
                  </div>
                  <Button className="bg-[#1F3A5F] hover:bg-[#152b47] text-sm" disabled={busy || !memberDraft.student} onClick={handleAddMember}>
                    <UserPlus className="w-4 h-4 mr-2" />Add to Group
                  </Button>
                </div>

                {selectedMemberGroup && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Current members of {selectedMemberGroup.group_name} ({selectedMemberGroup.members.length})
                    </p>
                    {selectedMemberGroup.members.length === 0 ? (
                      <p className="text-xs text-gray-400">No students assigned yet. This group won't show up on any student's dashboard until you add someone.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedMemberGroup.members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{m.student_detail.full_name}</span>
                              <span className="text-xs text-gray-400">{m.student_detail.email}</span>
                              {m.role_in_group === 'leader' && (
                                <Badge className="bg-[#1F3A5F] text-xs">Leader</Badge>
                              )}
                            </div>
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                              disabled={busy} onClick={() => handleRemoveMember(m.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />Add User
                </CardTitle>
                <CardDescription>Create an account and assign a role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                  <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm md:col-span-2" placeholder="Full name"
                    value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
                  <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm md:col-span-2" placeholder="Email"
                    value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                  <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}>
                    <option value="student">student</option>
                    <option value="advisor">advisor</option>
                    <option value="admin">admin</option>
                  </select>
                  <div className="relative">
                    <input className="border border-gray-200 rounded-lg px-2 py-1.5 pr-8 text-sm w-full" type={showNewUserPassword ? 'text' : 'password'} placeholder="Temp password"
                      value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showNewUserPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button className="bg-[#1F3A5F] hover:bg-[#152b47] text-sm" disabled={busy} onClick={handleCreateUser}>
                    <UserPlus className="w-4 h-4 mr-2" />Create Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />User Accounts
                </CardTitle>
                <CardDescription>Manage access for existing accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]/30"
                    placeholder="Search users by name or email…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option>All roles</option>
                    <option value="student">student</option>
                    <option value="advisor">advisor</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-sm">{u.full_name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role]}`}>{u.role}</span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{u.department || '—'}</TableCell>
                        <TableCell>
                          <Badge className={u.is_active ? 'bg-green-500' : 'bg-gray-400'}>{u.is_active ? 'active' : 'inactive'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy} onClick={() => handleToggleActive(u)}>
                            {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Progress */}
          <TabsContent value="progress" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />System-Wide Progress Overview
                </CardTitle>
                <CardDescription>Monitor progress across all active project groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {groups.map((g) => {
                  const proj = projectByGroup(g.id);
                  const progress = proj ? STAGE_PROGRESS[proj.stage] : 0;
                  return (
                    <div key={g.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-[#1F3A5F]">{g.group_name}</p>
                          <p className="text-xs text-gray-500">{proj?.title || 'No project yet'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            Advisor: {g.advisor_assignments[0]?.advisor_detail.full_name || 'Unassigned'}
                          </p>
                          <Badge className={`text-xs mt-1 ${g.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}>{g.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-[#1F3A5F] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">{progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Archive */}
          <TabsContent value="archive" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1F3A5F] text-base flex items-center gap-2">
                  <Archive className="w-4 h-4" />Project Archive Management
                </CardTitle>
                <CardDescription>Publish completed projects to the read-only archive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedUnarchivedProjects.length === 0 && archiveEntries.length === 0 && (
                  <p className="text-xs text-gray-400">Nothing to archive yet.</p>
                )}
                {completedUnarchivedProjects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div>
                      <p className="text-sm font-medium text-[#1F3A5F]">{p.group_detail.group_name} — {p.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Stage: {p.stage}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-yellow-500 text-xs">Pending</Badge>
                      <label>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handlePublishArchive(p, e.target.files[0])}
                        />
                        <span className="cursor-pointer inline-flex items-center rounded-md bg-[#1F3A5F] hover:bg-[#152b47] text-white text-xs px-3 py-1.5">
                          <CheckCircle className="w-3.5 h-3.5 mr-1 inline" />Publish (choose report file)
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
                {archiveEntries.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div>
                      <p className="text-sm font-medium text-[#1F3A5F]">{item.final_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Published {new Date(item.published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500 text-xs">Published</Badge>
                      <a href={item.report_file} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="text-xs">
                          <Settings className="w-3.5 h-3.5 mr-1" />View
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
