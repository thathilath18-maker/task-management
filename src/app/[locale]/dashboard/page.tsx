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
import { ListTodo, CheckCircle, Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';

interface DashboardData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  statusDistribution: { name: string; value: number; color: string }[];
  departmentPerformance: { name: string; completed: number; inProgress: number; total: number }[];
  weeklyProgress: { day: string; completed: number; created: number }[];
  priorityDistribution: { name: string; value: number; color: string }[];
  recentActivities: { action: string; employee: string; time: string }[];
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { theme } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
  try {
    console.log('🔍 Loading dashboard data...');
    
    // Fetch all tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, task_statuses(name, name_en, color), departments(name, name_en), employees(full_name)')
      .eq('is_active', true);

    if (tasksError) {
      console.error('❌ Tasks error:', tasksError);
    } else {
      console.log('✅ Tasks loaded:', tasks?.length || 0);
    }

    const { data: statuses, error: statusesError } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (statusesError) {
      console.error('❌ Statuses error:', statusesError);
    } else {
      console.log('✅ Statuses loaded:', statuses?.length || 0);
    }

    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true);

    if (departmentsError) {
      console.error('❌ Departments error:', departmentsError);
    } else {
      console.log('✅ Departments loaded:', departments?.length || 0);
    }

    // ຖ້າບໍ່ມີຂໍ້ມູນ → ສະແດງ empty state
    if (!tasks || tasks.length === 0) {
      console.log('⚠️ No tasks found - showing empty state');
      setData({
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        statusDistribution: [],
        departmentPerformance: [],
        weeklyProgress: [],
        priorityDistribution: [],
        recentActivities: [],
      });
      setLoading(false);
      return;
    }

    if (!statuses) {
      console.log('⚠️ No statuses found');
      setLoading(false);
      return;
    }

      // Status distribution
      const statusDist = statuses.map((status) => ({
        name: status.name_en || status.name,
        value: tasks.filter((t) => t.status_id === status.id).length,
        color: status.color,
      }));

      // Department performance
      const deptPerf = (departments || []).map((dept) => {
        const deptTasks = tasks.filter((t) => t.department_id === dept.id);
        return {
          name: dept.name_en || dept.name,
          completed: deptTasks.filter((t) => t.progress_percentage === 100).length,
          inProgress: deptTasks.filter((t) => t.progress_percentage > 0 && t.progress_percentage < 100).length,
          total: deptTasks.length,
        };
      });

      // Weekly progress (last 7 days)
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

      // Priority distribution
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
        recentActivities: [],
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
  return <div className="flex items-center justify-center h-64">Loading...</div>;
}

// ແທນທີ່ຈະ return null → ສະແດງ empty state
if (!data || data.totalTasks === 0) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-4xl mr-4">📋</div>
          <div>
            <h2 className="text-lg font-semibold text-blue-900">
              ຍິນດີຕ້ອນຮັບ!
            </h2>
            <p className="text-blue-700 mt-1">
              ຍັງບໍ່ມີໜ້າວຽກໃນລະບົບ. ເລີ່ມຕົ້ນສ້າງໜ້າວຽກທຳອິດຂອງເຈົ້າ!
            </p>
            <button 
              onClick={() => router.push('/tasks')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + ສ້າງໜ້າວຽກໃໝ່
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards (empty state) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('totalTasks')}</p>
                <p className="text-3xl font-bold mt-1">0</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50">
                <ListTodo className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('completedTasks')}</p>
                <p className="text-3xl font-bold mt-1">0</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-50">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('inProgressTasks')}</p>
                <p className="text-3xl font-bold mt-1">0</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('overdueTasks')}</p>
                <p className="text-3xl font-bold mt-1">0</p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

  const statCards = [
    { title: t('totalTasks'), value: data.totalTasks, icon: ListTodo, color: theme.primaryColor },
    { title: t('completedTasks'), value: data.completedTasks, icon: CheckCircle, color: '#10B981' },
    { title: t('inProgressTasks'), value: data.inProgressTasks, icon: Clock, color: '#3B82F6' },
    { title: t('overdueTasks'), value: data.overdueTasks, icon: AlertTriangle, color: '#EF4444' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <Card key={idx} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + '20' }}>
                  <card.icon className="w-6 h-6" style={{ color: card.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - Pie Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">{t('taskDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
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

        {/* Priority Distribution - Donut Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">{t('tasksByPriority')}</CardTitle>
          </CardHeader>
          <CardContent>
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance - Bar Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">{t('departmentPerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
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

        {/* Weekly Progress - Area Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">{t('weeklyProgress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
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