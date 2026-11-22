# Testes do jogo Batalha Naval

Este projeto contém testes automatizados em JavaScript para validar as regras implementadas no módulo `src/jogo.js`.

## Participantes do grupo

| Nome | RA |
|---|---|
| Leonardo Teixeira de Carvalho | 24159859-2 |
| Matheus Eduardo Polizelli | 24129411-2 |

## Requisitos

- Node.js 22
- npm

Os testes usam o framework Jest. Instale as dependências com `npm install`.

## Executar os testes

Na pasta do projeto, execute:

```sh
npm test
```

O script executa Jest em modo ESM para testar diretamente os módulos JavaScript do projeto.

## Regras verificadas

A suíte valida a criação de um jogo para dois jogadores, o uso de frotas completas, o posicionamento de navios dentro de um tabuleiro 10 × 10, as orientações horizontal e vertical, a proibição de sobreposição e a possibilidade de navios encostados.

Também verifica o início da partida, a alternância de turnos, tiros de água e acerto, tiros repetidos, o registro de navios afundados, a vitória ao atingir as 14 casas inimigas, o encerramento do jogo, a visão de cada jogador e a validação de jogadores e coordenadas.

## Identificação dos casos de teste

Cada caso recebe um identificador sequencial no formato **CT-XX** (“Caso de Teste”), seguido de uma descrição do objetivo coberto. Por exemplo, `CT-01` identifica o cenário de criação do jogo sem opções. Os identificadores facilitam referenciar os casos em relatórios de QA e localizar falhas no resultado do Jest.

## Organização

- `tests/jogo.test.js`: casos automatizados para as regras e funções do jogo.
- `fixtures/frotas.json`: duas frotas completas usadas para preparar partidas nos testes.
- `src/jogo.js`: módulo JavaScript exercitado pela suíte.

