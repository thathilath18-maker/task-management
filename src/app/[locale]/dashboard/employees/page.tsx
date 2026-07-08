'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { Employee, Department } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Search, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const t = useTranslations('employees');
  const tc = useTranslations('common');
  const { theme } = useTheme();
  const supabase = createClient();

  const [employees, setEmployees] = useState<(Employee & { departments?: Department })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [empRes, deptRes] = await Promise.all([
      supabase.from('employees').select('*, departments(*)').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('is_active', true),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (deptRes.data) setDepartments(deptRes.data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (isEditing && editingEmployee.id) {
      const { error } = await supabase.from('employees').update({
        full_name: editingEmployee.full_name,
        email: editingEmployee.email,
        phone: editingEmployee.phone,
        position: editingEmployee.position,
        department_id: editingEmployee.department_id,
        role: editingEmployee.role,
        is_active: editingEmployee.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', editingEmployee.id);

      if (error) { toast.error(error.message); return; }
      toast.success('Employee updated');
    } else {
      const { error } = await supabase.from('employees').insert({
        full_name: editingEmployee.full_name,
        email: editingEmployee.email,
        phone: editingEmployee.phone,
        position: editingEmployee.position,
        department_id: editingEmployee.department_id,
        role: editingEmployee.role || 'employee',
        is_active: true,
      });

      if (error) { toast.error(error.message); return; }
      toast.success('Employee added');
    }

    setShowDialog(false);
    setEditingEmployee({});
    setIsEditing(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from('employees').update({ is_active: false }).eq('id', id);
    toast.success('Employee deactivated');
    loadData();
  };

  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button style={{ backgroundColor: theme.primaryColor }} className="text-white" onClick={() => {
          setEditingEmployee({});
          setIsEditing(false);
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addEmployee')}
        </Button>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={tc('search') + '...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t('fullName')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('phone')}</TableHead>
                <TableHead>{t('position')}</TableHead>
                <TableHead>{tc('department')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp, idx) => (
                <TableRow key={emp.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>{emp.phone || '-'}</TableCell>
                  <TableCell>{emp.position || '-'}</TableCell>
                  <TableCell>
                    {emp.departments && (
                      <Badge variant="outline" style={{ borderColor: emp.departments.color, color: emp.departments.color }}>
                        {emp.departments.name_en || emp.departments.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      emp.role === 'admin' ? 'bg-red-100 text-red-700' :
                      emp.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {emp.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {emp.is_active ? (
                      <Badge className="bg-green-100 text-green-700"><UserCheck className="w-3 h-3 mr-1" /> Active</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700"><UserX className="w-3 h-3 mr-1" /> Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingEmployee(emp);
                      setIsEditing(true);
                      setShowDialog(true);
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Employee Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Employee' : t('addEmployee')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('fullName')}</Label>
                <Input value={editingEmployee.full_name || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, full_name: e.target.value })} />
              </div>
              <div>
                <Label>{t('email')}</Label>
                <Input type="email" value={editingEmployee.email || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })} />
              </div>
              <div>
                <Label>{t('phone')}</Label>
                <Input value={editingEmployee.phone || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })} />
              </div>
              <div>
                <Label>{t('position')}</Label>
                <Input value={editingEmployee.position || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })} />
              </div>
              <div>
                <Label>{tc('department')}</Label>
                <Select value={editingEmployee.department_id || 'none'} onValueChange={(v) => setEditingEmployee({ ...editingEmployee, department_id: v === 'none' ? null : v })}>
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
                <Label>{t('role')}</Label>
                <Select value={editingEmployee.role || 'employee'} onValueChange={(v) => setEditingEmployee({ ...editingEmployee, role: v as Employee['role'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={editingEmployee.is_active !== false} onCheckedChange={(v) => setEditingEmployee({ ...editingEmployee, is_active: v })} />
              <Label>{tc('status')}</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{tc('cancel')}</Button>
              <Button onClick={handleSave} style={{ backgroundColor: theme.primaryColor }} className="text-white">{tc('save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}