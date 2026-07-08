'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { TaskStatus, TaskGroup, Department, ActivityLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Palette, Type, Activity } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Poppins', 'Noto Sans Lao',
  'Lato', 'Montserrat', 'Raleway', 'Source Sans Pro', 'Ubuntu',
  'Nunito', 'Work Sans', 'Fira Sans', 'IBM Plex Sans', 'Quicksand',
];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { theme, updateTheme } = useTheme();
  const supabase = createClient();

  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [s, g, d, a] = await Promise.all([
      supabase.from('task_statuses').select('*').order('sort_order'),
      supabase.from('task_groups').select('*').order('created_at'),
      supabase.from('departments').select('*').order('created_at'),
      supabase.from('activity_logs').select('*, employees(full_name)').order('created_at', { ascending: false }).limit(50),
    ]);
    if (s.data) setStatuses(s.data);
    if (g.data) setGroups(g.data);
    if (d.data) setDepartments(d.data);
    if (a.data) setActivities(a.data);
  };

  // Status CRUD
  const handleSaveStatus = async () => {
    if (isEditing) {
      await supabase.from('task_statuses').update({
        name: editingItem.name, name_en: editingItem.name_en, name_lo: editingItem.name_lo,
        color: editingItem.color,
      }).eq('id', editingItem.id);
    } else {
      await supabase.from('task_statuses').insert({
        name: editingItem.name, name_en: editingItem.name_en, name_lo: editingItem.name_lo,
        color: editingItem.color || '#6B7280', sort_order: statuses.length + 1,
      });
    }
    toast.success('Status saved');
    setShowStatusDialog(false);
    loadAll();
  };

  const handleDeleteStatus = async (id: string) => {
    await supabase.from('task_statuses').update({ is_active: false }).eq('id', id);
    toast.success('Status removed');
    loadAll();
  };

  // Group CRUD
  const handleSaveGroup = async () => {
    if (isEditing) {
      await supabase.from('task_groups').update({
        name: editingItem.name, name_en: editingItem.name_en, name_lo: editingItem.name_lo,
        color: editingItem.color,
      }).eq('id', editingItem.id);
    } else {
      await supabase.from('task_groups').insert({
        name: editingItem.name, name_en: editingItem.name_en, name_lo: editingItem.name_lo,
        color: editingItem.color || '#8B5CF6',
      });
    }
    toast.success('Group saved');
    setShowGroupDialog(false);
    loadAll();
  };

  const handleDeleteGroup = async (id: string) => {
    await supabase.from('task_groups').update({ is_active: false }).eq('id', id);
    toast.success('Group removed');
    loadAll();
  };

  // Department CRUD
  const handleSaveDept = async () => {
    if (isEditing) {
      await supabase.from('departments').update({
        name: editingItem.name, name_en: editingItem.name_en, name_lo: editingItem.name_lo,
        color: editingItem.color,
      }).eq('id', editingItem.id);
    } else {
      await supabase.from('departments').insert({
        name: editingItem.name, name_en: editingItem.name_en, name_lo: editingItem.name_lo,
        color: editingItem.color || '#3B82F6',
      });
    }
    toast.success('Department saved');
    setShowDeptDialog(false);
    loadAll();
  };

  const handleDeleteDept = async (id: string) => {
    await supabase.from('departments').update({ is_active: false }).eq('id', id);
    toast.success('Department removed');
    loadAll();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Tabs defaultValue="appearance">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appearance">{t('appearance')}</TabsTrigger>
          <TabsTrigger value="statuses">{t('statuses')}</TabsTrigger>
          <TabsTrigger value="groups">{t('groups')}</TabsTrigger>
          <TabsTrigger value="departments">{t('departments')}</TabsTrigger>
          <TabsTrigger value="logs">{t('activityLog')}</TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6 mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center"><Palette className="w-5 h-5 mr-2" /> {t('colors')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input type="color" value={theme.primaryColor} onChange={(e) => updateTheme({ primaryColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={theme.primaryColor} onChange={(e) => updateTheme({ primaryColor: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input type="color" value={theme.secondaryColor} onChange={(e) => updateTheme({ secondaryColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={theme.secondaryColor} onChange={(e) => updateTheme({ secondaryColor: e.target.value })} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center"><Type className="w-5 h-5 mr-2" /> {t('fonts')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Font Family</Label>
                <Select value={theme.fontFamily} onValueChange={(v) => updateTheme({ fontFamily: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_FONTS.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: font }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Font Size</Label>
                <Select value={theme.fontSize} onValueChange={(v) => updateTheme({ fontSize: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12px">Small (12px)</SelectItem>
                    <SelectItem value="14px">Medium (14px)</SelectItem>
                    <SelectItem value="16px">Large (16px)</SelectItem>
                    <SelectItem value="18px">Extra Large (18px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Border Radius</Label>
                <Select value={theme.borderRadius} onValueChange={(v) => updateTheme({ borderRadius: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0px">Sharp (0px)</SelectItem>
                    <SelectItem value="4px">Small (4px)</SelectItem>
                    <SelectItem value="8px">Medium (8px)</SelectItem>
                    <SelectItem value="12px">Large (12px)</SelectItem>
                    <SelectItem value="16px">Extra Large (16px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-500 mb-2">Preview:</p>
                <p style={{ fontFamily: theme.fontFamily, fontSize: theme.fontSize }}>
                  The quick brown fox jumps over the lazy dog. ກ ຂ ຄ ງ ຈ ສ ນ ມ
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statuses Tab */}
        <TabsContent value="statuses" className="mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('statuses')}</CardTitle>
              <Button size="sm" style={{ backgroundColor: theme.primaryColor }} className="text-white" onClick={() => {
                setEditingItem({}); setIsEditing(false); setShowStatusDialog(true);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Status
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }} />
                      <span className="font-medium">{status.name_en || status.name}</span>
                      {status.name_lo && <span className="text-sm text-gray-400">({status.name_lo})</span>}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(status); setIsEditing(true); setShowStatusDialog(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteStatus(status.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('groups')}</CardTitle>
              <Button size="sm" style={{ backgroundColor: theme.primaryColor }} className="text-white" onClick={() => {
                setEditingItem({}); setIsEditing(false); setShowGroupDialog(true);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Group
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="font-medium">{group.name_en || group.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(group); setIsEditing(true); setShowGroupDialog(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('departments')}</CardTitle>
              <Button size="sm" style={{ backgroundColor: theme.primaryColor }} className="text-white" onClick={() => {
                setEditingItem({}); setIsEditing(false); setShowDeptDialog(true);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Department
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color }} />
                      <span className="font-medium">{dept.name_en || dept.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(dept); setIsEditing(true); setShowDeptDialog(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteDept(dept.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center"><Activity className="w-5 h-5 mr-2" /> {t('activityLog')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>{log.employees?.full_name || 'System'}</TableCell>
                      <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                      <TableCell className="text-sm">{log.entity_type} {log.entity_id?.substring(0, 8)}...</TableCell>
                      <TableCell className="text-sm text-gray-400">{log.ip_address || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Status' : 'Add Status'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name (EN)</Label><Input value={editingItem.name_en || ''} onChange={(e) => setEditingItem({ ...editingItem, name_en: e.target.value, name: e.target.value })} /></div>
            <div><Label>Name (LO)</Label><Input value={editingItem.name_lo || ''} onChange={(e) => setEditingItem({ ...editingItem, name_lo: e.target.value })} /></div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center space-x-2 mt-1">
                <input type="color" value={editingItem.color || '#6B7280'} onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                <Input value={editingItem.color || '#6B7280'} onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveStatus} style={{ backgroundColor: theme.primaryColor }} className="text-white">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Group' : 'Add Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name (EN)</Label><Input value={editingItem.name_en || ''} onChange={(e) => setEditingItem({ ...editingItem, name_en: e.target.value, name: e.target.value })} /></div>
            <div><Label>Name (LO)</Label><Input value={editingItem.name_lo || ''} onChange={(e) => setEditingItem({ ...editingItem, name_lo: e.target.value })} /></div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center space-x-2 mt-1">
                <input type="color" value={editingItem.color || '#8B5CF6'} onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                <Input value={editingItem.color || '#8B5CF6'} onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowGroupDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveGroup} style={{ backgroundColor: theme.primaryColor }} className="text-white">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name (EN)</Label><Input value={editingItem.name_en || ''} onChange={(e) => setEditingItem({ ...editingItem, name_en: e.target.value, name: e.target.value })} /></div>
            <div><Label>Name (LO)</Label><Input value={editingItem.name_lo || ''} onChange={(e) => setEditingItem({ ...editingItem, name_lo: e.target.value })} /></div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center space-x-2 mt-1">
                <input type="color" value={editingItem.color || '#3B82F6'} onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                <Input value={editingItem.color || '#3B82F6'} onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeptDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveDept} style={{ backgroundColor: theme.primaryColor }} className="text-white">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}