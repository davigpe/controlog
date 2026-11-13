import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Cliente, ClienteInput } from './types'

const schema = z.object({
  codigo: z.string().trim().min(3, 'Código deve ter ao menos 3 caracteres.'),
  nome: z.string().trim().min(2, 'Informe o nome do cliente.'),
  endereco: z.string().trim().min(5, 'Informe o logradouro e o número.'),
  bairro: z.string().trim().min(2, 'Informe o bairro.'),
  cidade: z.string().trim().min(2, 'Informe a cidade.'),
  uf: z.string().trim().length(2, 'UF deve ter 2 letras.'),
  // z.number() com valueAsNumber no register (mesmo padrão do RotaModal), e não
  // z.coerce.number(): o coerce deixa o tipo de entrada como unknown e quebra os
  // genéricos do react-hook-form. A mensagem própria cobre o campo vazio, que
  // com valueAsNumber chega como NaN.
  lat: z
    .number({ message: 'Informe a latitude.' })
    .min(-90, 'Latitude inválida.')
    .max(90, 'Latitude inválida.'),
  lng: z
    .number({ message: 'Informe a longitude.' })
    .min(-180, 'Longitude inválida.')
    .max(180, 'Longitude inválida.'),
  ativo: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Props {
  aberto: boolean
  editando: Cliente | null
  salvando?: boolean
  onSalvar: (dados: ClienteInput) => void
  onFechar: () => void
}

export default function ClienteFormModal({
  aberto,
  editando,
  salvando,
  onSalvar,
  onFechar,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!aberto) return
    if (editando) {
      reset({
        codigo: editando.codigo,
        nome: editando.nome,
        endereco: editando.endereco,
        bairro: editando.bairro,
        cidade: editando.cidade,
        uf: editando.uf,
        lat: editando.coordenadas[0],
        lng: editando.coordenadas[1],
        ativo: editando.ativo,
      })
    } else {
      // Joinville e SC como padrão: é a praça da operação, e redigitar isso a
      // cada cadastro seria trabalho repetido.
      reset({
        codigo: '', nome: '', endereco: '', bairro: '',
        cidade: 'Joinville', uf: 'SC',
        lat: undefined, lng: undefined,
        ativo: true,
      })
    }
  }, [aberto, editando, reset])

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? `Editar ${editando.codigo}` : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            O endereço cadastrado aqui é onde os pedidos deste cliente vão cair no mapa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => onSalvar(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cliente-codigo">Código</Label>
              <Input id="cliente-codigo" {...register('codigo')} placeholder="CLI-024" />
              {errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="cliente-nome">Nome</Label>
              <Input id="cliente-nome" {...register('nome')} placeholder="Mercado Bom Preço" />
              {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cliente-endereco">Endereço</Label>
            <Input
              id="cliente-endereco"
              {...register('endereco')}
              placeholder="Rua das Palmeiras, 120"
            />
            {errors.endereco && <p className="text-xs text-red-600">{errors.endereco.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cliente-bairro">Bairro</Label>
              <Input id="cliente-bairro" {...register('bairro')} placeholder="Centro" />
              {errors.bairro && <p className="text-xs text-red-600">{errors.bairro.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cliente-cidade">Cidade</Label>
              <Input id="cliente-cidade" {...register('cidade')} />
              {errors.cidade && <p className="text-xs text-red-600">{errors.cidade.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cliente-uf">UF</Label>
              <Input id="cliente-uf" maxLength={2} {...register('uf')} />
              {errors.uf && <p className="text-xs text-red-600">{errors.uf.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cliente-lat">Latitude</Label>
              <Input id="cliente-lat" type="number" step="any" {...register('lat', { valueAsNumber: true })} placeholder="-26.303486" />
              {errors.lat && <p className="text-xs text-red-600">{errors.lat.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cliente-lng">Longitude</Label>
              <Input id="cliente-lng" type="number" step="any" {...register('lng', { valueAsNumber: true })} placeholder="-48.844667" />
              {errors.lng && <p className="text-xs text-red-600">{errors.lng.message}</p>}
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            A coordenada é obrigatória porque é ela que posiciona o cliente no mapa e
            alimenta a otimização de rotas. Para obtê-la, abra o endereço no Google Maps
            ou no OpenStreetMap, clique com o botão direito sobre o ponto e copie a
            latitude e a longitude.
          </p>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cliente-ativo"
              checked={watch('ativo') ?? true}
              onCheckedChange={(v) => setValue('ativo', v === true)}
            />
            <Label htmlFor="cliente-ativo" className="font-normal">
              Ativo — aparece nas sugestões ao gerar pedidos
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
