'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { Task, FilterState } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, FileText, Printer, Filter, Download } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/export';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const { theme } = useTheme();
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({});
  const [statuses, setStatuses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadReport();
  }, [filters]);

  const loadFilterOptions = async () => {
    const [s, d, e, g] = await Promise.all([
      supabase.from('task_statuses').select('*').eq('is_active', true),
      supabase.from('departments').select('*').eq('is_active', true),
      supabase.from('employees').select('*').eq('is_active', true),
      supabase.from('task_groups').select('*').eq('is_active', true),
    ]);
    if (s.data) setStatuses(s.data);
    if (d.data) setDepartments(d.data);
    if (e.data) setEmployees(e.data);
    if (g.data) setGroups(g.data);
  };

  const loadReport = async () => {
    let query = supabase
      .from('tasks')
      .select('*, task_statuses(name, name_en, color), departments(name, name_en, color), employees(full_name), task_groups(name, name_en)')
      .eq('is_active', true);

    if (filters.dateFrom) query = query.gte('start_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('end_date', filters.dateTo);
    if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
    if (filters.employeeId) query = query.eq('assignee_id', filters.employeeId);
    if (filters.statusId) query = query.eq('status_id', filters.statusId);
    if (filters.groupId) query = query.eq('group_id', filters.groupId);

    const { data } = await query.order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  // Generate chart data
  const statusChartData = statuses.map((s) => ({
    name: s.name_en || s.name,
    value: tasks.filter((t) => t.status_id === s.id).length,
    color: s.color,
  })).filter((d) => d.value > 0);

  const deptChartData = departments.map((d) => ({
    name: d.name_en || d.name,
    tasks: tasks.filter((t) => t.department_id === d.id).length,
    completed: tasks.filter((t) => t.department_id === d.id && t.progress_percentage === 100).length,
  })).filter((d) => d.tasks > 0);

  const completionRate = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.progress_percentage === 100).length / tasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => exportToExcel(tasks, 'report')}>
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> {t('exportExcel')}
          </Button>
          <Button variant="outline" onClick={() => exportToPDF(tasks, 'Report')}>
            <FileText className="w-4 h-4 mr-2 text-red-600" /> {t('exportPDF')}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> {t('print')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Input type="date" value={filters.dateFrom || ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} placeholder="From" />
            <Input type="date" value={filters.dateTo || ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} placeholder="To" />
            <Select value={filters.departmentId || 'all'} onValueChange={(v) => setFilters({ ...filters, departmentId: v === 'all' ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder={t('selectDepartment')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name_en || d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.employeeId || 'all'} onValueChange={(v) => setFilters({ ...filters, employeeId: v === 'all' ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder={t('selectEmployee')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.statusId || 'all'} onValueChange={(v) => setFilters({ ...filters, statusId: v === 'all' ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder={t('selectStatus')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statuses.map((s) => <SelectItem key={s.id} value={s.id}>{s.name_en || s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.groupId || 'all'} onValueChange={(v) => setFilters({ ...filters, groupId: v === 'all' ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder={t('selectGroup')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name_en || g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => setFilters({})}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold" style={{ color: theme.primaryColor }}>{tasks.length}</p>
            <p className="text-sm text-gray-500">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{tasks.filter(t => t.progress_percentage === 100).length}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{tasks.filter(t => t.progress_percentage > 0 && t.progress_percentage < 100).length}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{completionRate}%</p>
            <p className="text-sm text-gray-500">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>Tasks by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                  {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>Department Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deptChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="tasks" fill={theme.primaryColor} name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Task Details ({tasks.length} records)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task, idx) => (
                <TableRow key={task.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <Badge style={{ backgroundColor: task.task_statuses?.color + '20', color: task.task_statuses?.color }}>
                      {task.task_statuses?.name_en || task.task_statuses?.name}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.employees?.full_name || '-'}</TableCell>
                  <TableCell>{task.departments?.name_en || task.departments?.name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{task.priority}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${task.progress_percentage}%`, backgroundColor: task.progress_percentage === 100 ? '#10B981' : theme.primaryColor }} />
                      </div>
                      <span className="text-xs">{task.progress_percentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{task.start_date || '-'}</TableCell>
                  <TableCell className="text-sm">{task.end_date || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}