# Dados de demonstração

Como a carteira de clientes de exemplo foi montada, e como refazê-la.

## O que está no seed

`controlog-backend/prisma/clientesDemo.js` traz **200 clientes**: 10 em cada um
de 20 bairros de Joinville, do Centro aos distritos mais afastados.

| | |
|---|---|
| Endereços | reais — logradouro, número de porta e coordenada |
| Origem | OpenStreetMap, via Overpass API |
| Nomes de empresa | inventados |
| Extensão da base | 17,4 km norte-sul, 14,9 km leste-oeste |
| Distância ao depósito | 0,3 km (mínima), 3,8 km (mediana), 13,5 km (máxima) |

Bairros cobertos: Centro, Saguaçu, América, Atiradores, Anita Garibaldi,
Bucarein, Glória, Costa e Silva, Iririú, Boa Vista, Santo Antônio, Bom Retiro,
Floresta, Itaum, Jardim Paraíso, Aventureiro, Petrópolis, Vila Nova,
Pirabeiraba e Paranaguamirim.

## Por que endereços reais

A geração anterior sorteava uma rua de uma lista fixa, um número qualquer e um
ponto aleatório num raio em volta do centro do bairro. Isso produzia dois
defeitos que atrapalhavam justamente o que o sistema demonstra:

1. **O endereço escrito não correspondia ao ponto no mapa.** "Rua Blumenau, 847"
   podia cair no meio de um quarteirão sem relação com a Rua Blumenau.
2. **Nenhum pedido coincidia com outro.** Como cada um ganhava um ponto próprio,
   nunca havia duas entregas no mesmo endereço — e esse é o caso mais comum da
   operação real: o cliente que compra mais de um item.

Com o cadastro, o pedido nasce na coordenada do cliente. O texto bate com o
ponto, e pedidos do mesmo cliente caem exatamente no mesmo lugar — que é o que o
mapa agora agrupa e conta.

## Por que 10 por bairro, em ruas distintas

Dez portas na mesma quadra não exercitam roteirização: a ordem ótima é trivial e
o traçado não sai do lugar. Espalhados por 20 bairros, os pedidos geram rotas
que cruzam a cidade, com diferença visível entre a ordem original e a otimizada.

A seleção toma **uma porta por rua** em rodadas, até completar dez, justamente
para evitar concentração.

## Como refazer

Nada disto roda em execução. O procedimento abaixo é de autoria do dado, feito
uma vez, e o resultado fica gravado literalmente no arquivo — o seed não depende
de rede, de chave nem de serviço externo, e as coordenadas não mudam entre
ambientes.

### 1. Extrair os endereços

Uma consulta à Overpass API por bairro, pedindo nós que tenham número de porta e
rua:

```overpassql
[out:json][timeout:90];
area["name"="Joinville"]["boundary"="administrative"]["admin_level"="8"]->.a;
node["addr:housenumber"]["addr:street"]["addr:suburb"="Centro"](area.a);
out body 80;
```

> **Uma consulta por bairro, não uma para a cidade toda.** Uma consulta única com
> limite de resultados devolve os primeiros que encontrar, e eles se concentram
> nos bairros com mais endereços mapeados — na tentativa inicial, Saguaçu e
> América sozinhos responderam por 4.878 dos 6.000 resultados, enquanto Glória
> apareceu com três. Por bairro, cada um tem sua própria cota.

> **Espere falha por limite de requisição.** Quatro dos vinte bairros voltaram
> `HTTPError` na primeira passada. Não era ausência de dado: repetidos com
> intervalo maior, todos devolveram 80 endereços. Concluir "este bairro não tem
> cobertura" a partir de um erro de transporte teria produzido uma base com
> buracos.

### 2. Selecionar

Agrupar por rua e tomar uma porta de cada, em rodadas, até dez por bairro.

### 3. Conferir antes de usar

Geocodificação erra, e erra longe. Antes de gravar, verifique:

- Toda coordenada dentro de uma caixa que contenha Joinville
- Nenhuma coordenada repetida entre clientes distintos
- Distância ao depósito plausível (nenhum cliente a 200 km)
- Códigos `CLI-XXX` únicos e nomes de empresa sem repetição

### 4. Semear

```bash
npm run db:seed
```

O seed usa `upsert` pelo código: rodar de novo atualiza os dados sem criar
duplicata e sem desvincular os pedidos que já apontam para o cliente.

## Pedidos

Os pedidos de demonstração são gerados pela aplicação (Planejamento → Pedidos),
sorteando um cliente ativo **com reposição** — por isso o mesmo cliente recebe
mais de um pedido, que é o comportamento pretendido.

Sem nenhum cliente ativo, a geração falha com mensagem explícita em vez de
inventar um endereço. Inventar reintroduziria exatamente o problema que o
cadastro resolve.
