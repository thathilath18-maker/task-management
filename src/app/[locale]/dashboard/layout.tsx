'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useParams, useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, ListTodo, Users, ClipboardList, BarChart3,
  Settings, LogOut, Menu, X, Globe, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const menuItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'tasks', icon: ListTodo, path: '/tasks' },
  { key: 'employees', icon: Users, path: '/employees' },
  { key: 'surveys', icon: ClipboardList, path: '/surveys' },
  { key: 'reports', icon: BarChart3, path: '/reports' },
  { key: 'settings', icon: Settings, path: '/settings' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const { employee, signOut, isLoading: authLoading } = useAuth();
  const { theme, updateTheme } = useTheme();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = params.locale as string;
  const [sidebarOpen, setSidebarOpen] = useState(!theme.sidebarCollapsed);
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // ປ້ອງກັນ hydration error
  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname?.includes(path);

  const navigate = (path: string) => {
    setIsNavigating(true);
    // Prefetch ກ່ອນ navigate
    router.prefetch(`/${locale}${path}`);
    router.push(`/${locale}${path}`);
    // Reset ຫຼັງຈາກ 500ms
    setTimeout(() => setIsNavigating(false), 500);
  };

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    updateTheme({ sidebarCollapsed: !newState });
  };

  const changeLocale = (newLocale: string) => {
    const newPath = pathname?.replace(`/${locale}`, `/${newLocale}`);
    if (newPath) {
      router.push(newPath);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ະແດງ loading ໃນຂະນະທີ່ກຳລັງໂຫຼດ
  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">ກຳລັງຫຼດ...</p>
        </div>
      </div>
    );
  }

  // ສະແດງ error ້າບໍ່ມີ employee data
  if (!employee) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້</p>
          <Button onClick={handleSignOut}>Logout</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Loading bar ເວລາ navigate */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-blue-600 animate-pulse z-50" />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <span className="text-lg font-bold" style={{ color: theme.primaryColor }}>
              {t('appName')}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
              style={isActive(item.path) ? { backgroundColor: theme.primaryColor } : {}}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="ml-3">{t(item.key)}</span>}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Avatar className="w-9 h-9">
              <AvatarFallback style={{ backgroundColor: theme.primaryColor }} className="text-white text-sm">
                {employee?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{employee?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{employee?.role || 'Employee'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn('flex-1 flex flex-col transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-20')}>
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <Select value={locale} onValueChange={changeLocale}>
              <SelectTrigger className="w-[130px]">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="lo">🇱🇦 າວ</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={handleSignOut} title={t('logout')}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}