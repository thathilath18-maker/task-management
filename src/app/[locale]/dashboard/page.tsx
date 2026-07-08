'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
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

  const loadDashboardData = async (retryCount = 0) => {
    try {
      console.log('🔍 Loading dashboard data...');
      
      // ຶງຂໍ້ມນ tasks - ສະເພາະ columns ທີ່ຈຳເປັນ
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status_id,
          department_id,
          priority,
          progress_percentage,
          start_date,
          end_date,
          created_at,
          updated_at,
          is_active,
          task_statuses (
            id,
            name,
            name_en,
            color
          ),
          departments (
            id,
            name,
            name_en
          ),
          employees (
            id,
            full_name
          )
        `)
        .eq('is_active', true)
        .limit(100);

      if (tasksError) {
        console.error('❌ Tasks error:', tasksError);
        // ລອງໃໝ່້າຜິດພາດ (ສູງສຸດ 3 ຄັ້ງ)
        if (retryCount < 3) {
          console.log(`Retrying... (${retryCount + 1}/3)`);
          setTimeout(() => loadDashboardData(retryCount + 1), 1000);
          return;
        }
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

      const { data: departments } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true);

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
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // ຊ້ useMemo ເພື່ອ prevent re-renders
  const statCards = useMemo(() => [
    { title: 'Total Tasks', value: data?.totalTasks || 0, icon: ListTodo, color: 'from-blue-500 to-blue-600' },
    { title: 'Completed', value: data?.completedTasks || 0, icon: CheckCircle, color: 'from-green-500 to-green-600' },
    { title: 'In Progress', value: data?.inProgressTasks || 0, icon: Clock, color: 'from-blue-400 to-blue-500' },
    { title: 'Overdue', value: data?.overdueTasks || 0, icon: AlertTriangle, color: 'from-red-500 to-red-600' },
  ], [data]);

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

  // Empty State
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
                onClick={() => {
                  router.prefetch('/tasks');
                  router.push('/tasks');
                }}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5 mr-2" />
                ສ້າງໜ້າວຽກໃໝ່
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, idx) => (
            <Card key={idx} className="border-0 shadow-lg overflow-hidden">
              <div className={`bg-gradient-to-br ${card.color} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">{card.title}</p>
                    <p className="text-4xl font-bold mt-2">0</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <card.icon className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button 
          onClick={() => {
            router.prefetch('/tasks');
            router.push('/tasks');
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          ສ້າງໜ້າວຽກ
        </button>
      </div>

      {/* Stat Cards */}
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - Pie Chart */}
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

        {/* Priority Distribution - Donut Chart */}
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance - Bar Chart */}
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

        {/* Weekly Progress - Area Chart */}
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