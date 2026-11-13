/**
 * Carteira de clientes de demonstração.
 *
 * São 23 endereços REAIS de Joinville, geocodificados uma vez com o Nominatim
 * (OpenStreetMap) e gravados aqui literalmente. Nenhuma chamada a serviço
 * externo acontece em execução: o seed não depende de rede nem de chave, e as
 * coordenadas não mudam entre ambientes.
 *
 * Por que importa serem reais: antes disto, cada pedido fictício sorteava uma
 * rua de uma lista e um ponto aleatório perto do centro do bairro. O endereço
 * escrito não correspondia ao ponto no mapa, e nenhum pedido podia coincidir
 * com outro — o que escondia justamente o caso que a operação enfrenta todo
 * dia: várias entregas no mesmo endereço.
 *
 * Os nomes de empresa são inventados; os logradouros e as coordenadas, não.
 */
export const CLIENTES_DEMO = [
  { codigo: 'CLI-001', nome: 'Mercado Bom Preço', endereco: 'Rua das Palmeiras, 120', bairro: 'Centro', lat: -26.303486, lng: -48.844667 },
  { codigo: 'CLI-002', nome: 'Farmácia Vida', endereco: 'Rua XV de Novembro, 455', bairro: 'Centro', lat: -26.300811, lng: -48.843885 },
  { codigo: 'CLI-003', nome: 'Auto Peças União', endereco: 'Rua do Príncipe, 1030', bairro: 'Centro', lat: -26.304076, lng: -48.845561 },
  { codigo: 'CLI-004', nome: 'Supermercado Ideal', endereco: 'Rua Nove de Março, 87', bairro: 'Centro', lat: -26.301535, lng: -48.846886 },
  { codigo: 'CLI-005', nome: 'Loja Center Móveis', endereco: 'Rua Jerônimo Coelho, 2210', bairro: 'Centro', lat: -26.302562, lng: -48.845055 },
  { codigo: 'CLI-006', nome: 'Distribuidora Sul', endereco: 'Rua Visconde de Taunay, 640', bairro: 'Centro', lat: -26.302263, lng: -48.848855 },
  { codigo: 'CLI-007', nome: 'Comércio Estrela', endereco: 'Rua Blumenau, 310', bairro: 'América', lat: -26.285361, lng: -48.849986 },
  { codigo: 'CLI-008', nome: 'Atacado Popular', endereco: 'Rua Iguaçu, 1575', bairro: 'América', lat: -26.264716, lng: -48.855348 },
  { codigo: 'CLI-009', nome: 'Mercearia Cantinho', endereco: 'Rua Timbó, 98', bairro: 'América', lat: -26.29321, lng: -48.85737 },
  { codigo: 'CLI-010', nome: 'Ferragens Rocha', endereco: 'Rua Ministro Calógeras, 760', bairro: 'América', lat: -26.307379, lng: -48.843922 },
  { codigo: 'CLI-011', nome: 'Padaria Pão Quente', endereco: 'Avenida Getúlio Vargas, 1840', bairro: 'Anita Garibaldi', lat: -26.308939, lng: -48.845626 },
  { codigo: 'CLI-012', nome: 'Ótica Visão Clara', endereco: 'Rua Pastor Guilherme Rau, 225', bairro: 'Anita Garibaldi', lat: -26.294537, lng: -48.83048 },
  { codigo: 'CLI-013', nome: 'Petshop Amigo Fiel', endereco: 'Rua Max Colin, 505', bairro: 'Bucarein', lat: -26.294547, lng: -48.85213 },
  { codigo: 'CLI-014', nome: 'Material de Construção Alvorada', endereco: 'Rua Albano Schmidt, 1290', bairro: 'Costa e Silva', lat: -26.306923, lng: -48.826462 },
  { codigo: 'CLI-015', nome: 'Papelaria do Saber', endereco: 'Rua Waldemiro José Borges, 66', bairro: 'Costa e Silva', lat: -26.361258, lng: -48.841231 },
  { codigo: 'CLI-016', nome: 'Restaurante Sabor Caseiro', endereco: 'Rua Almirante Jaceguay, 980', bairro: 'Glória', lat: -26.273553, lng: -48.867525 },
  { codigo: 'CLI-017', nome: 'Eletro Center', endereco: 'Rua Doutor João Colin, 415', bairro: 'Glória', lat: -26.282974, lng: -48.849267 },
  { codigo: 'CLI-018', nome: 'Casa das Tintas', endereco: 'Rua Dona Francisca, 1720', bairro: 'Saguaçu', lat: -26.285743, lng: -48.839845 },
  { codigo: 'CLI-019', nome: 'Floricultura Primavera', endereco: 'Rua Ottokar Doerffel, 150', bairro: 'Saguaçu', lat: -26.312488, lng: -48.857731 },
  { codigo: 'CLI-020', nome: 'Açougue Boi Gordo', endereco: 'Avenida Santos Dumont, 2050', bairro: 'Santo Antônio', lat: -26.256626, lng: -48.851649 },
  { codigo: 'CLI-021', nome: 'Livraria Página Viva', endereco: 'Rua Tuiuti, 335', bairro: 'Iririú', lat: -26.266033, lng: -48.821428 },
  { codigo: 'CLI-022', nome: 'Lanchonete Ponto Certo', endereco: 'Rua Anita Garibaldi, 870', bairro: 'Iririú', lat: -26.316509, lng: -48.846723 },
  { codigo: 'CLI-023', nome: 'Bazar Tudo Aqui', endereco: 'Rua Marechal Deodoro, 1105', bairro: 'Centro', lat: -26.29581, lng: -48.850287 },
];
