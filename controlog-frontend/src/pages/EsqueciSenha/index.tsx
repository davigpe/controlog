import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/lib/api';

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
});

type FormData = z.infer<typeof schema>;

export default function EsqueciSenha() {
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await forgotPassword(data.email);
      setEnviado(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
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
          <h1 className="text-xl font-bold text-gray-800">Esqueci minha senha</h1>
          <p className="text-sm text-gray-500">
            Informe seu e-mail cadastrado para receber o link de redefinição.
          </p>
        </div>

        {enviado ? (
          <p className="rounded-lg bg-blue-50 p-3 text-center text-sm text-blue-800">
            Se este e-mail estiver cadastrado, enviaremos um link de redefinição em instantes.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@empresa.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <Button type="submit" className="w-full justify-center" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar link de redefinição'}
            </Button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft size={14} />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
