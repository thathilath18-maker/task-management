'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Task, TaskStatus, TaskGroup, Department, Employee, FilterState } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Search, Filter, Download, Upload, MoreVertical,
  Calendar as CalendarIcon, MessageSquare, CheckSquare,
  Edit, Trash2, ChevronDown, X, FileSpreadsheet, FileText, Image, File
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF, exportToWord, exportToImage, importFromExcel } from '@/lib/export';

export default function TasksPage() {
  const t = useTranslations('tasks');
  const tc = useTranslations('common');
  const { employee } = useAuth();
  const { theme } = useTheme();
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [inlineNewTask, setInlineNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (statuses.length > 0) loadTasks();
  }, [filters, statuses]);

  const loadInitialData = async () => {
    const [statusRes, groupRes, deptRes, empRes] = await Promise.all([
      supabase.from('task_statuses').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('task_groups').select('*').eq('is_active', true),
      supabase.from('departments').select('*').eq('is_active', true),
      supabase.from('employees').select('*').eq('is_active', true),
    ]);

    if (statusRes.data) setStatuses(statusRes.data);
    if (groupRes.data) setGroups(groupRes.data);
    if (deptRes.data) setDepartments(deptRes.data);
    if (empRes.data) setEmployees(empRes.data);
    setLoading(false);
  };

  const loadTasks = async () => {
    let query = supabase
      .from('tasks')
      .select('*, task_statuses(*), task_groups(*), departments(name, name_en, name_lo, color), employees(full_name, avatar_url)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filters.statusId) query = query.eq('status_id', filters.statusId);
    if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
    if (filters.employeeId) query = query.eq('assignee_id', filters.employeeId);
    if (filters.groupId) query = query.eq('group_id', filters.groupId);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.dateFrom) query = query.gte('start_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('end_date', filters.dateTo);
    if (filters.search) query = query.ilike('title', `%${filters.search}%`);

    const { data } = await query;
    setTasks(data || []);
  };

  // Inline add task
  const handleInlineAdd = async () => {
    if (!newTaskTitle.trim()) return;

    const { data, error } = await supabase.from('tasks').insert({
      title: newTaskTitle,
      status_id: statuses[0]?.id,
      created_by: employee?.id,
      department_id: employee?.department_id,
      priority: 'medium',
      progress_percentage: 0,
    }).select().single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setTasks([data, ...tasks]);
    setNewTaskTitle('');
    setInlineNewTask(false);
    toast.success('Task created successfully');
  };

  // Update task
  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    const { error } = await supabase
      .from('tasks')
      .update({
        ...editingTask,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedTask.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Task updated');
    loadTasks();
    setShowTaskDialog(false);
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_active: false })
      .eq('id', taskId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTasks(tasks.filter((t) => t.id !== taskId));
    toast.success('Task deleted');
  };

  // Update status inline
  const handleStatusChange = async (taskId: string, statusId: string) => {
    await supabase.from('tasks').update({ status_id: statusId, updated_at: new Date().toISOString() }).eq('id', taskId);
    loadTasks();
  };

  // Export functions
  const handleExportExcel = () => exportToExcel(tasks, 'tasks');
  const handleExportPDF = () => exportToPDF(tasks, 'Tasks Report');
  const handleExportWord = () => exportToWord(tasks, 'Tasks Report');
  const handleExportImage = () => exportToImage(tasks);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const importedData = await importFromExcel(file);
    if (importedData) {
      const { error } = await supabase.from('tasks').insert(
        importedData.map((item: Record<string, unknown>) => ({
          title: item.title,
          status_id: statuses[0]?.id,
          created_by: employee?.id,
          priority: 'medium',
          progress_percentage: 0,
        }))
      );
      if (!error) {
        toast.success(`Imported ${importedData.length} tasks`);
        loadTasks();
      }
    }
  };

  const getStatusColor = (statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.color || '#6B7280';
  };

  const getStatusName = (statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    return status?.name_en || status?.name || 'Unknown';
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center space-x-2">
          {/* Import/Export Icons */}
          <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-lg border p-1">
            <Button variant="ghost" size="icon" onClick={handleExportExcel} title="Export Excel">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExportPDF} title="Export PDF">
              <FileText className="w-4 h-4 text-red-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExportWord} title="Export Word">
              <File className="w-4 h-4 text-blue-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExportImage} title="Export Image">
              <Image className="w-4 h-4 text-purple-600" />
            </Button>
            <label className="cursor-pointer">
              <Button variant="ghost" size="icon" title="Import" asChild>
                <span>
                  <Upload className="w-4 h-4 text-orange-600" />
                </span>
              </Button>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            </label>
          </div>

          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            {tc('filter')}
          </Button>

          <Button style={{ backgroundColor: theme.primaryColor }} className="text-white" onClick={() => setInlineNewTask(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addTask')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Input
                placeholder={tc('search') + '...'}
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="col-span-2"
              />
              <Select value={filters.statusId || 'all'} onValueChange={(v) => setFilters({ ...filters, statusId: v === 'all' ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder={tc('status')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name_en || s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.departmentId || 'all'} onValueChange={(v) => setFilters({ ...filters, departmentId: v === 'all' ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder={tc('department')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name_en || d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.employeeId || 'all'} onValueChange={(v) => setFilters({ ...filters, employeeId: v === 'all' ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder={tc('assignee')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.groupId || 'all'} onValueChange={(v) => setFilters({ ...filters, groupId: v === 'all' ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder={t('group')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name_en || g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                placeholder="From Date"
              />
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                <X className="w-4 h-4 mr-1" /> Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t('taskTitle')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{tc('assignee')}</TableHead>
                <TableHead>{tc('department')}</TableHead>
                <TableHead>{t('group')}</TableHead>
                <TableHead>{tc('progress')}</TableHead>
                <TableHead>{tc('startDate')}</TableHead>
                <TableHead>{tc('endDate')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Inline Add Row */}
              {inlineNewTask && (
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell colSpan={9}>
                    <div className="flex items-center space-x-2">
                      <Input
                        autoFocus
                        placeholder={t('inlineAdd')}
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd()}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleInlineAdd} style={{ backgroundColor: theme.primaryColor }} className="text-white">
                        {tc('save')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setInlineNewTask(false); setNewTaskTitle(''); }}>
                        {tc('cancel')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {tasks.map((task, idx) => (
                <TableRow key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => { setSelectedTask(task); setEditingTask(task); setShowTaskDialog(true); }}>
                  <TableCell className="text-gray-400">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <Select
                      value={task.status_id || ''}
                      onValueChange={(v) => handleStatusChange(task.id, v)}
                    >
                      <SelectTrigger className="w-[130px] h-8 border-0 p-0" onClick={(e) => e.stopPropagation()}>
                        <Badge style={{ backgroundColor: getStatusColor(task.status_id || '') + '20', color: getStatusColor(task.status_id || ''), border: 'none' }}>
                          {getStatusName(task.status_id || '')}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: s.color }}></div>
                              {s.name_en || s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{task.employees?.full_name || '-'}</TableCell>
                  <TableCell>
                    {task.departments && (
                      <Badge variant="outline" style={{ borderColor: task.departments.color, color: task.departments.color }}>
                        {task.departments.name_en || task.departments.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{task.task_groups?.name_en || task.task_groups?.name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${task.progress_percentage}%`,
                            backgroundColor: task.progress_percentage === 100 ? '#10B981' : theme.primaryColor,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{task.progress_percentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{task.start_date || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{task.end_date || '-'}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedTask(task); setEditingTask(task); setShowTaskDialog(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {tasks.length === 0 && !inlineNewTask && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-gray-400">
                    {t('noTasks')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments">{tc('comments')}</TabsTrigger>
              <TabsTrigger value="checklist">{tc('checklist')}</TabsTrigger>
              <TabsTrigger value="progress">{tc('progress')}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('taskTitle')}</label>
                  <Input
                    value={editingTask.title || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{tc('priority')}</label>
                  <Select value={editingTask.priority || 'medium'} onValueChange={(v) => setEditingTask({ ...editingTask, priority: v as Task['priority'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{tc('status')}</label>
                  <Select value={editingTask.status_id || ''} onValueChange={(v) => setEditingTask({ ...editingTask, status_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name_en || s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{tc('assignee')}</label>
                  <Select value={editingTask.assignee_id || 'none'} onValueChange={(v) => setEditingTask({ ...editingTask, assignee_id: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{tc('department')}</label>
                  <Select value={editingTask.department_id || 'none'} onValueChange={(v) => setEditingTask({ ...editingTask, department_id: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name_en || d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('group')}</label>
                  <Select value={editingTask.group_id || 'none'} onValueChange={(v) => setEditingTask({ ...editingTask, group_id: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Group</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name_en || g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{tc('startDate')}</label>
                  <Input type="date" value={editingTask.start_date || ''} onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">{tc('endDate')}</label>
                  <Input type="date" value={editingTask.end_date || ''} onChange={(e) => setEditingTask({ ...editingTask, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('description')}</label>
                <Textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('solution')}</label>
                <Textarea
                  value={editingTask.solution || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, solution: e.target.value })}
                  rows={3}
                  placeholder="Enter solution/fix for this task..."
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleUpdateTask} style={{ backgroundColor: theme.primaryColor }} className="text-white">
                  {tc('save')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <TaskComments taskId={selectedTask?.id || ''} employee={employee} />
            </TabsContent>

            <TabsContent value="checklist" className="mt-4">
              <TaskChecklist taskId={selectedTask?.id || ''} employee={employee} />
            </TabsContent>

            <TabsContent value="progress" className="mt-4">
              <TaskProgressLog taskId={selectedTask?.id || ''} employee={employee} currentProgress={selectedTask?.progress_percentage || 0} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// Task Comments Component
// ==========================================
function TaskComments({ taskId, employee }: { taskId: string; employee: Employee | null }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'general' | 'solution' | 'update'>('general');
  const supabase = createClient();

  useEffect(() => {
    if (taskId) loadComments();
  }, [taskId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('task_comments')
      .select('*, employees(full_name, avatar_url)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const addComment = async () => {
    if (!newComment.trim() || !employee) return;
    await supabase.from('task_comments').insert({
      task_id: taskId,
      employee_id: employee.id,
      comment: newComment,
      comment_type: commentType,
    });
    setNewComment('');
    loadComments();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="flex space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
              {c.employees?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{c.employees?.full_name}</span>
                <Badge variant="outline" className="text-xs">{c.comment_type}</Badge>
                <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1">{c.comment}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <Select value={commentType} onValueChange={(v) => setCommentType(v as any)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="solution">Solution</SelectItem>
            <SelectItem value="update">Update</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addComment()}
          className="flex-1"
        />
        <Button onClick={addComment}>
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// Task Checklist Component
// ==========================================
function TaskChecklist({ taskId, employee }: { taskId: string; employee: Employee | null }) {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (taskId) loadChecklist();
  }, [taskId]);

  const loadChecklist = async () => {
    const { data } = await supabase
      .from('task_checklists')
      .select('*')
      .eq('task_id', taskId)
      .order('sort_order');
    setItems(data || []);
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    await supabase.from('task_checklists').insert({
      task_id: taskId,
      item_text: newItem,
      sort_order: items.length,
    });
    setNewItem('');
    loadChecklist();
  };

  const toggleItem = async (item: any) => {
    await supabase.from('task_checklists').update({
      is_completed: !item.is_completed,
      completed_by: !item.is_completed ? employee?.id : null,
      completed_at: !item.is_completed ? new Date().toISOString() : null,
    }).eq('id', item.id);
    loadChecklist();
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from('task_checklists').delete().eq('id', itemId);
    loadChecklist();
  };

  const completedCount = items.filter((i) => i.is_completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{completedCount}/{items.length} completed ({progress}%)</span>
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={item.is_completed}
              onChange={() => toggleItem(item)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-gray-400' : ''}`}>
              {item.item_text}
            </span>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => deleteItem(item.id)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Input
          placeholder="Add checklist item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <Button onClick={addItem} size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// Task Progress Log Component
// ==========================================
function TaskProgressLog({ taskId, employee, currentProgress }: { taskId: string; employee: Employee | null; currentProgress: number }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [newProgress, setNewProgress] = useState(currentProgress);
  const [note, setNote] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (taskId) loadLogs();
  }, [taskId]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from('task_progress_log')
      .select('*, employees(full_name)')
      .eq('task_id', taskId)
      .order('log_date', { ascending: false });
    setLogs(data || []);
  };

  const addLog = async () => {
    if (!employee) return;
    await supabase.from('task_progress_log').insert({
      task_id: taskId,
      employee_id: employee.id,
      log_date: new Date().toISOString().split('T')[0],
      progress_percentage: newProgress,
      note: note || null,
    });
    // Update task progress
    await supabase.from('tasks').update({ progress_percentage: newProgress }).eq('id', taskId);
    setNote('');
    loadLogs();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <label className="text-sm font-medium">Current Progress: {newProgress}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={newProgress}
            onChange={(e) => setNewProgress(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
        <Input
          placeholder="Note (optional)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-48"
        />
        <Button onClick={addLog} size="sm">Log Progress</Button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <span className="text-sm font-medium">{log.log_date}</span>
              <span className="text-xs text-gray-400 ml-2">by {log.employees?.full_name}</span>
            </div>
            <div className="flex items-center space-x-3">
              {log.note && <span className="text-xs text-gray-500">{log.note}</span>}
              <Badge style={{ backgroundColor: log.progress_percentage === 100 ? '#10B981' : '#3B82F6' }} className="text-white">
                {log.progress_percentage}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}