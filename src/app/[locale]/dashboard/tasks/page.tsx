'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Filter, X, Upload, FileSpreadsheet, FileText, File, Image as ImageIcon,
  MessageSquare, CheckSquare, Edit, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface Task {
  id: string;
  title: string;
  description?: string;
  solution?: string;
  status_id: string;
  department_id?: string;
  group_id?: string;
  assignee_id?: string;
  created_by?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress_percentage: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task_statuses?: { id: string; name: string; name_en: string; color: string };
  departments?: { id: string; name: string; name_en: string; color: string };
  task_groups?: { id: string; name: string; name_en: string };
  employees?: { id: string; full_name: string; avatar_url?: string };
}

interface TaskStatus {
  id: string;
  name: string;
  name_en: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

interface Department {
  id: string;
  name: string;
  name_en: string;
  color: string;
  is_active: boolean;
}

interface TaskGroup {
  id: string;
  name: string;
  name_en: string;
  is_active: boolean;
}

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
  const [inlineNewTask, setInlineNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);

  // ໂຫຼດຂໍ້ມູນເບື້ອງຕົ້ນ
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      console.log('🔍 Loading initial data...');
      
      const [statusRes, groupRes, deptRes, empRes] = await Promise.all([
        supabase.from('task_statuses').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('task_groups').select('*').eq('is_active', true),
        supabase.from('departments').select('*').eq('is_active', true),
        supabase.from('employees').select('*').eq('is_active', true),
      ]);

      if (statusRes.data) {
        console.log('✅ Statuses loaded:', statusRes.data.length);
        setStatuses(statusRes.data);
      }
      if (groupRes.data) setGroups(groupRes.data);
      if (deptRes.data) setDepartments(deptRes.data);
      if (empRes.data) setEmployees(empRes.data);
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      toast.error('ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້');
      setLoading(false);
    }
  };

  // ໂຫຼດ tasks
  const loadTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_statuses(id, name, name_en, color),
          task_groups(id, name, name_en),
          departments(id, name, name_en, color),
          employees(id, full_name, avatar_url)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Tasks loaded:', data?.length || 0);
      setTasks(data || []);
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      toast.error('ບໍ່ສາມາດໂຫຼດໜ້າວຽກໄດ້');
    }
  }, [supabase]);

  useEffect(() => {
    if (statuses.length > 0) {
      loadTasks();
    }
  }, [statuses, loadTasks]);

  // ສ້າງໜ້າວຽກໃໝ່ (Inline)
  const handleInlineAdd = async () => {
    if (!newTaskTitle.trim()) {
      toast.error('ກະລຸນາໃສ່ຊື່ໜ້າວຽກ');
      return;
    }

    if (!statuses || statuses.length === 0) {
      toast.error('ບໍ່ມີສະຖານະໃນລະບົບ');
      return;
    }

    if (!employee) {
      toast.error('ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້');
      return;
    }

    setSaving(true);
    try {
      console.log('🔍 Creating task:', { title: newTaskTitle, employee });

      const insertData: any = {
        title: newTaskTitle.trim(),
        status_id: statuses[0]?.id,
        priority: 'medium',
        progress_percentage: 0,
        is_active: true,
      };

      // ເພີ່ມ created_by ຖ້າມີ
      if (employee.id) {
        insertData.created_by = employee.id;
      }

      // ເພີ່ມ department_id ຖ້າມີ
      if (employee.department_id) {
        insertData.department_id = employee.department_id;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating task:', error);
        throw error;
      }

      console.log('✅ Task created:', data);
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setInlineNewTask(false);
      toast.success('ສ້າງໜ້າວຽກສຳເລັດ!');
    } catch (error: any) {
      console.error('❌ Failed to create task:', error);
      toast.error(`ເກີດຂໍ້ຜິດພາດ: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ອັບເດດໜ້າວຽກ
  const handleUpdateTask = async () => {
    if (!selectedTask || !editingTask) {
      toast.error('ບໍ່ມີຂໍ້ມູນທີ່ຈະອັບເດດ');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          ...editingTask,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast.success('ອັບເດດໜ້າວຽກສຳເລັດ');
      loadTasks();
      setShowTaskDialog(false);
      setSelectedTask(null);
      setEditingTask({});
    } catch (error: any) {
      console.error('❌ Error updating task:', error);
      toast.error(`ເກີດຂໍ້ຜິດພາດ: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ລຶບໜ້າວຽກ (Soft delete)
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('ຕ້ອງການລຶບໜ້າວຽກນີ້ແທ້ບໍ່?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: false })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success('ລຶບໜ້າວຽກສຳເລັດ');
    } catch (error: any) {
      console.error('❌ Error deleting task:', error);
      toast.error(`ເກີດຂໍ້ຜິດພາດ: ${error.message}`);
    }
  };

  // ປ່ຽນສະຖານະ
  const handleStatusChange = async (taskId: string, statusId: string) => {
    try {
      await supabase
        .from('tasks')
        .update({ 
          status_id: statusId, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId);
      
      loadTasks();
      toast.success('ອັບເດດສະຖານະສຳເລັດ');
    } catch (error) {
      console.error('❌ Error updating status:', error);
      toast.error('ບໍ່ສາມາດອັບເດດສະຖານະໄດ້');
    }
  };

  // Export functions (placeholder)
  const handleExportExcel = () => {
    toast.info('ຟັງຊັນ Export Excel ກຳລັງພັດທະນາ');
  };

  const handleExportPDF = () => {
    toast.info('ຟັງຊັນ Export PDF ກຳລັງພັດທະນາ');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.info('ກຳລັງນຳເຂົ້າຂໍ້ມູນ...');
      // TODO: Implement Excel import
      console.log('📥 Importing file:', file.name);
      toast.success('ນຳເຂົ້າຂໍ້ມູນສຳເລັດ');
    } catch (error) {
      console.error('❌ Import failed:', error);
      toast.error('ການນຳເຂົ້າລົ້ມເຫຼວ');
    }
  };

  const getStatusColor = (statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.color || '#6B7280';
  };

  const getStatusName = (statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    return status?.name_en || status?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">ກຳລັງໂຫຼດ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title') || 'ຈັດການໜ້າວຽກ'}</h1>
        <div className="flex items-center space-x-2">
          {/* Export Buttons */}
          <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-lg border p-1">
            <Button variant="ghost" size="icon" onClick={handleExportExcel} title="Export Excel">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExportPDF} title="Export PDF">
              <FileText className="w-4 h-4 text-red-600" />
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

          <Button 
            style={{ backgroundColor: theme.primaryColor }} 
            className="text-white" 
            onClick={() => setInlineNewTask(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addTask') || 'ເພີ່ມໜ້າວຽກ'}
          </Button>
        </div>
      </div>

      {/* Tasks Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t('taskTitle') || 'ຊື່ໜ້າວຽກ'}</TableHead>
                <TableHead>{tc('status') || 'ສະຖານະ'}</TableHead>
                <TableHead>{tc('assignee') || 'ຜູ້ຮັບຜິດຊອບ'}</TableHead>
                <TableHead>{tc('department') || 'ພະແນກ'}</TableHead>
                <TableHead>{tc('progress') || 'ຄວາມຄືບໜ້າ'}</TableHead>
                <TableHead>{tc('startDate') || 'ວັນເລີ່ມ'}</TableHead>
                <TableHead>{tc('endDate') || 'ວັນສິ້ນສຸດ'}</TableHead>
                <TableHead className="text-right">{tc('actions') || 'ຈັດການ'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Inline Add Row */}
              {inlineNewTask && (
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell colSpan={8}>
                    <div className="flex items-center space-x-2">
                      <Input
                        autoFocus
                        placeholder="ໃສ່ຊື່ໜ້າວຽກ..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd()}
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleInlineAdd} 
                        disabled={saving}
                        style={{ backgroundColor: theme.primaryColor }} 
                        className="text-white"
                      >
                        {saving ? 'ກຳລັງບັນທຶກ...' : (tc('save') || 'ບັນທຶກ')}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { 
                          setInlineNewTask(false); 
                          setNewTaskTitle(''); 
                        }}
                      >
                        {tc('cancel') || 'ຍົກເລີກ'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Tasks List */}
              {tasks.map((task, idx) => (
                <TableRow 
                  key={task.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => { 
                    setSelectedTask(task); 
                    setEditingTask(task); 
                    setShowTaskDialog(true); 
                  }}
                >
                  <TableCell className="text-gray-400">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={task.status_id || ''}
                        onValueChange={(v) => handleStatusChange(task.id, v)}
                      >
                        <SelectTrigger className="w-[130px] h-8 border-0 p-0">
                          <Badge 
                            style={{ 
                              backgroundColor: getStatusColor(task.status_id || '') + '20', 
                              color: getStatusColor(task.status_id || ''),
                              border: 'none' 
                            }}
                          >
                            {getStatusName(task.status_id || '')}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center">
                                <div 
                                  className="w-2 h-2 rounded-full mr-2" 
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.name_en || s.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>{task.employees?.full_name || '-'}</TableCell>
                  <TableCell>
                    {task.departments && (
                      <Badge 
                        variant="outline" 
                        style={{ 
                          borderColor: task.departments.color, 
                          color: task.departments.color 
                        }}
                      >
                        {task.departments.name_en || task.departments.name}
                      </Badge>
                    )}
                  </TableCell>
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { 
                          setSelectedTask(task); 
                          setEditingTask(task); 
                          setShowTaskDialog(true); 
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Empty State */}
              {tasks.length === 0 && !inlineNewTask && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-gray-400">
                    {t('noTasks') || 'ຍັງບໍ່ມີໜ້າວຽກ. ຄລິກປຸ່ມ "ເພີ່ມໜ້າວຽກ" ເພື່ອເລີ່ມຕົ້ນ!'}
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">ລາຍລະອຽດ</TabsTrigger>
              <TabsTrigger value="comments">ຄຳເຫັນ</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">ຊື່ໜ້າວຽກ</label>
                  <Input
                    value={editingTask.title || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ລຳດັບຄວາມສຳຄັນ</label>
                  <Select 
                    value={editingTask.priority || 'medium'} 
                    onValueChange={(v) => setEditingTask({ ...editingTask, priority: v as Task['priority'] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">ຕ່ຳ</SelectItem>
                      <SelectItem value="medium">ປານກາງ</SelectItem>
                      <SelectItem value="high">ສູງ</SelectItem>
                      <SelectItem value="urgent">ດ່ວນ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">ສະຖານະ</label>
                  <Select 
                    value={editingTask.status_id || ''} 
                    onValueChange={(v) => setEditingTask({ ...editingTask, status_id: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name_en || s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">ວັນທີເລີ່ມ</label>
                  <Input 
                    type="date" 
                    value={editingTask.start_date || ''} 
                    onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ວັນທີສິ້ນສຸດ</label>
                  <Input 
                    type="date" 
                    value={editingTask.end_date || ''} 
                    onChange={(e) => setEditingTask({ ...editingTask, end_date: e.target.value })} 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">ລາຍລະອຽດ</label>
                <Textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">ວິທີແກ້ໄຂ</label>
                <Textarea
                  value={editingTask.solution || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, solution: e.target.value })}
                  rows={3}
                  placeholder="ບັນທຶກວິທີແກ້ໄຂ..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                  ປິດ
                </Button>
                <Button 
                  onClick={handleUpdateTask} 
                  disabled={saving}
                  style={{ backgroundColor: theme.primaryColor }} 
                  className="text-white"
                >
                  {saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              {selectedTask?.id && (
                <TaskComments taskId={selectedTask.id} employee={employee as Employee} />
              )}
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
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (taskId) loadComments();
  }, [taskId]);

  const loadComments = async () => {
    try {
      const { data } = await supabase
        .from('task_comments')
        .select('*, employees(full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !employee) return;

    setLoading(true);
    try {
      await supabase.from('task_comments').insert({
        task_id: taskId,
        employee_id: employee.id,
        comment: newComment,
        comment_type: 'general',
      });
      setNewComment('');
      loadComments();
      toast.success('ເພີ່ມຄຳເຫັນສຳເລັດ');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('ບໍ່ສາມາດເພີ່ມຄຳເຫັນໄດ້');
    } finally {
      setLoading(false);
    }
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
                <span className="text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleString('lo-LA')}
                </span>
              </div>
              <p className="text-sm mt-1">{c.comment}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-center text-gray-400 py-4">ຍັງບໍ່ມີຄຳເຫັນ</p>
        )}
      </div>
      <div className="flex space-x-2">
        <Input
          placeholder="ເພີ່ມຄຳເຫັນ..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addComment()}
          className="flex-1"
        />
        <Button onClick={addComment} disabled={loading}>
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}