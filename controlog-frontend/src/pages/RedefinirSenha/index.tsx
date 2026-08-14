import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/lib/api';

const schema = z
  .object({
    novaSenha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
    confirmarSenha: z.string().min(1, 'Confirme sua nova senha.'),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  });

type FormData = z.infer<typeof schema>;

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await resetPassword(token, data.novaSenha);
      toast.success('Senha redefinida com sucesso. Entre com sua nova senha.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível redefinir a senha.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Truck size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Redefinir senha</h1>
          <p className="text-sm text-gray-500">Escolha uma nova senha para sua conta.</p>
        </div>

        {!token ? (
          <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
            Link de redefinição inválido ou incompleto. Solicite um novo link.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <Input
                id="novaSenha"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('novaSenha')}
              />
              {errors.novaSenha && <p className="text-xs text-red-600">{errors.novaSenha.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmarSenha')}
              />
              {errors.confirmarSenha && (
                <p className="text-xs text-red-600">{errors.confirmarSenha.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full justify-center" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Redefinir senha'}
            </Button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-4 block text-center text-xs font-medium text-gray-600 hover:text-blue-600"
        >
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
