'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Mail, Phone, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    position: '',
    department_id: '',
    role: 'employee' as 'employee' | 'manager' | 'admin',
  });

  // ໂຫຼດ departments
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) setDepartments(data);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email.trim()) {
      toast.error('ກະລຸນາໃສ່ email');
      return;
    }

    if (!formData.password) {
      toast.error('ກະລຸນາໃສ່ລະຫັດຜ່ານ');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('ລະຫັດຜ່ານບໍ່ກົງກັນ');
      return;
    }

    if (!formData.full_name.trim()) {
      toast.error('ກະລນາໃສ່ຊື່');
      return;
    }

    setLoading(true);

    try {
      // 1. ສ້າງ Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('ບໍ່ສາມາດສ້າງບັນຊີໄດ້');

      // 2. ສ້າງ Employee Record
      const employeeData: any = {
        user_id: authData.user.id,
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name,
        role: formData.role,
        is_active: true,
      };

      if (formData.phone) employeeData.phone = formData.phone;
      if (formData.position) employeeData.position = formData.position;
      if (formData.department_id) employeeData.department_id = formData.department_id;

      const { error: employeeError } = await supabase
        .from('employees')
        .insert(employeeData);

      if (employeeError) {
        console.error('Employee creation error:', employeeError);
        // ລຶບ auth user ຖ້າສ້າງ employee ບໍ່ໄດ້
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('ບໍ່ສາມາດສ້າງຂໍ້ມູນພະນັກງານໄດ້');
      }

      toast.success('ລົງທະບຽນສຳເລັດ! ກຳລັງເຂົ້າສູ່ລະບົບ...');

      // 3. ໍຖ້າແລ້ວ redirect ໄປ dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'ເກີດຂໍ້ຜິດພາດໃນການລົງທະບຽນ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center">
            {t('signUpTitle') || 'ສ້າງບັນຊີໃໝ່'}
          </CardTitle>
          <CardDescription className="text-center">
            {t('signUpDescription') || 'ກະລຸນາໃສ່ຂໍ້ມູນຂອງທ່ານເພື່ອລົງທະບຽນເຂົ້າໃຊ້ງານລະບົບ'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {/* າກສ່ວນຂໍ້ມູນບັນຊີ */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                ໍ້ມູນບັນຊີ
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    <User className="w-4 h-4 inline mr-2" />
                    ຊື່-ນາມສະກຸນ <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="ື່ ແລະ ນາມສະກຸນ"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">ລະຫັດຜ່ານ <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="ຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">ຢືນຢັນລະຫັດຜ່ານ <span className="text-red-500">*</span></Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="ຢືນຢັນລະຫັດຜ່ານ"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* ພາກສ່ວນຂໍ້ມູນພະນັກງານ */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                ຂໍ້ມູນພະນັກງານ
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="w-4 h-4 inline mr-2" />
                    ເບີໂທລະສັບ
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="020 XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">ຕຳແໜ່ງ</Label>
                  <Input
                    id="position"
                    type="text"
                    placeholder="ຕແໜ່ງວຽກ"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    ພະແນກ
                  </Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ເລືອກພະແນກ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">ບໍ່ມີພະແນກ</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name_en || dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">ບົດບາດ</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">ພະນັກງານ</SelectItem>
                      <SelectItem value="manager">ຫົວ້າ</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ກຳລັງລົງທະບຽນ...
                  </span>
                ) : (
                  'ລົງທະບຽນ'
                )}
              </Button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                ມີບັນຊີຢູ່ແລ້ວ?{' '}
                <Link 
                  href="/login" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ເຂົ້າສູ່ລະບົບ
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}