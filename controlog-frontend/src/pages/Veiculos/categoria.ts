import type { CategoriaVeiculo } from './types'

/**
 * Categorias na mesma ordem do enum VeiculoCategoria do backend (do menor
 * porte ao maior). Ficam num .ts próprio porque o formulário, o filtro e o
 * card usam os três — e um .tsx só pode exportar componentes (react-refresh).
 */
export const CATEGORIAS_VEICULO: CategoriaVeiculo[] = [
  'MOTO',
  'PASSEIO',
  'UTILITARIO',
  'VAN',
  'VUC',
  'TRES_QUARTOS',
  'TOCO',
  'TRUCK',
  'CARRETA',
  'OUTRO',
]

export const CATEGORIA_VEICULO_LABEL: Record<CategoriaVeiculo, string> = {
  MOTO: 'Moto',
  PASSEIO: 'Passeio',
  UTILITARIO: 'Utilitário',
  VAN: 'Van',
  VUC: 'VUC',
  TRES_QUARTOS: '3/4',
  TOCO: 'Toco',
  TRUCK: 'Truck',
  CARRETA: 'Carreta',
  OUTRO: 'Não categorizado',
}

/**
 * Porte típico de cada categoria, mostrado como apoio na hora de escolher —
 * "VUC" e "3/4" só são óbvios para quem já é da área, e o sistema também é
 * operado por quem está começando.
 */
export const CATEGORIA_VEICULO_AJUDA: Record<CategoriaVeiculo, string> = {
  MOTO: 'Motofrete, entregas leves',
  PASSEIO: 'Carro de passeio',
  UTILITARIO: 'Furgão pequeno, até ~1 t',
  VAN: 'Van de carga, até ~1,5 t',
  VUC: 'Veículo Urbano de Carga, até ~3 t',
  TRES_QUARTOS: 'Caminhão 3/4, até ~4 t',
  TOCO: 'Caminhão toco, até ~8 t',
  TRUCK: 'Caminhão truck, até ~16 t',
  CARRETA: 'Carreta / cavalo mecânico',
  OUTRO: 'Fora das categorias acima',
}
