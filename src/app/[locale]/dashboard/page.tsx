'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import { ListTodo, CheckCircle, Clock, AlertTriangle, TrendingUp, Users, Plus } from 'lucide-react';

interface DashboardData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  statusDistribution: { name: string; value: number; color: string }[];
  departmentPerformance: { name: string; completed: number; inProgress: number; total: number }[];
  weeklyProgress: { day: string; completed: number; created: number }[];
  priorityDistribution: { name: string; value: number; color: string }[];
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { theme } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('🔍 Loading dashboard data...');
      
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, task_statuses(name, name_en, color), departments(name, name_en), employees(full_name)')
        .eq('is_active', true);

      if (tasksError) console.error('Tasks error:', tasksError);
      else console.log('✅ Tasks loaded:', tasks?.length || 0);

      const { data: statuses, error: statusesError } = await supabase
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (statusesError) console.error('Statuses error:', statusesError);
      else console.log('✅ Statuses loaded:', statuses?.length || 0);

      const { data: departments } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true);

      if (!tasks || tasks.length === 0) {
        setData({
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          statusDistribution: [],
          departmentPerformance: [],
          weeklyProgress: [],
          priorityDistribution: [],
        });
        setLoading(false);
        return;
      }

      if (!statuses) {
        setLoading(false);
        return;
      }

      const statusDist = statuses.map((status) => ({
        name: status.name_en || status.name,
        value: tasks.filter((t) => t.status_id === status.id).length,
        color: status.color,
      }));

      const deptPerf = (departments || []).map((dept) => {
        const deptTasks = tasks.filter((t) => t.department_id === dept.id);
        return {
          name: dept.name_en || dept.name,
          completed: deptTasks.filter((t) => t.progress_percentage === 100).length,
          inProgress: deptTasks.filter((t) => t.progress_percentage > 0 && t.progress_percentage < 100).length,
          total: deptTasks.length,
        };
      });

      const weeklyProgress = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });
        
        const created = tasks.filter((t) => t.created_at?.startsWith(dateStr)).length;
        const completed = tasks.filter((t) => t.updated_at?.startsWith(dateStr) && t.progress_percentage === 100).length;
        
        weeklyProgress.push({ day: dayName, created, completed });
      }

      const priorities = [
        { name: 'Low', color: '#10B981' },
        { name: 'Medium', color: '#3B82F6' },
        { name: 'High', color: '#F59E0B' },
        { name: 'Urgent', color: '#EF4444' },
      ];
      const priorityDist = priorities.map((p) => ({
        name: p.name,
        value: tasks.filter((t) => t.priority === p.name.toLowerCase()).length,
        color: p.color,
      }));

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.progress_percentage === 100).length;
      const inProgressTasks = tasks.filter((t) => t.progress_percentage > 0 && t.progress_percentage < 100).length;
      const overdueTasks = tasks.filter((t) => {
        if (!t.end_date || t.progress_percentage === 100) return false;
        return new Date(t.end_date) < new Date();
      }).length;

      setData({
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        statusDistribution: statusDist,
        departmentPerformance: deptPerf,
        weeklyProgress,
        priorityDistribution: priorityDist,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">ກຳລັງໂຫດ...</p>
        </div>
      </div>
    );
  }

  if (!data || data.totalTasks === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8">
          <div className="flex items-start space-x-4">
            <div className="text-5xl">📋</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-blue-900 mb-2">
                ຍິນດີຕ້ອນຮັບ!
              </h2>
              <p className="text-blue-700 mb-6 text-lg">
                ຍັງບໍ່ມີໜ້າວຽກໃນລະບົບ. ເລີ່ມຕົ້ນສ້າງໜ້າວຽກທຳອິດຂອງເຈົ້າເລີຍ!
              </p>
              <button 
                onClick={() => router.push('/tasks')}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5 mr-2" />
                ສ້າງໜ້າວຽກໃໝ່
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Tasks</p>
                  <p className="text-4xl font-bold mt-2">0</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <ListTodo className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completed</p>
                  <p className="text-4xl font-bold mt-2">0</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-400 to-blue-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">In Progress</p>
                  <p className="text-4xl font-bold mt-2">0</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Overdue</p>
                  <p className="text-4xl font-bold mt-2">0</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Tasks', value: data.totalTasks, icon: ListTodo, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    { title: 'Completed', value: data.completedTasks, icon: CheckCircle, color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
    { title: 'In Progress', value: data.inProgressTasks, icon: Clock, color: 'from-blue-400 to-blue-500', bg: 'bg-blue-50' },
    { title: 'Overdue', value: data.overdueTasks, icon: AlertTriangle, color: 'from-red-500 to-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button 
          onClick={() => router.push('/tasks')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          ສ້າງໜ້າວຽກ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <Card key={idx} className="border-0 shadow-lg overflow-hidden">
            <div className={`bg-gradient-to-br ${card.color} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">{card.title}</p>
                  <p className="text-4xl font-bold mt-2">{card.value}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <card.icon className="w-8 h-8" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Task Distribution by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.statusDistribution.filter(s => s.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {data.statusDistribution.filter(s => s.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
              Tasks by Priority
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.priorityDistribution.filter(p => p.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {data.priorityDistribution.filter(p => p.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              Department Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inProgress" fill="#3B82F6" name="In Progress" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="completed" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="created" stackId="2" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}