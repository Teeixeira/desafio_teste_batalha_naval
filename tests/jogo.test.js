import { readFileSync } from 'node:fs';
import { expect, test } from '@jest/globals';
import { criarJogo, executarAcao, obterVisao } from '../src/jogo.js';

const frotas = JSON.parse(readFileSync(new URL('../fixtures/frotas.json', import.meta.url), 'utf8'));
const assert = {
  deepEqual: (actual, expected) => expect(actual).toEqual(expected),
  equal: (actual, expected) => expect(actual).toBe(expected),
  notStrictEqual: (actual, expected) => expect(actual).not.toBe(expected),
  throws: (callback, expected) => {
    if (typeof expected === 'function') return expect(callback).toThrow(expected);
    if (expected && typeof expected === 'object') return expect(callback).toThrow(expect.objectContaining(expected));
    return expect(callback).toThrow();
  }
};
const copiar = valor => structuredClone(valor);
const posicionar = (estado, jogador, navio) => executarAcao(estado, { tipo: 'posicionar', jogador, navio });
const atirar = (estado, jogador, linha, coluna) => executarAcao(estado, { tipo: 'atirar', jogador, linha, coluna });
const jogoPronto = () => criarJogo({ frotas: copiar(frotas) });
const alvos = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
  [2, 0], [2, 1], [2, 2], [2, 3],
  [4, 0], [4, 1], [4, 2],
  [6, 0], [6, 1]
];
const aguas = Array.from({ length: 13 }, (_, indice) => [9 - Math.floor(indice / 10), indice % 10]);

test('CT-01 — criar jogo sem opções inicia na fase de posicionamento', () => {
  assert.deepEqual(criarJogo(), {
    fase: 'posicionamento', turno: 0, vencedor: null, frotas: [[], []], tiros: [[], []]
  });
});

test('CT-02 — criar jogo com duas frotas completas e copiar as opções recebidas', () => {
  const opcoes = { frotas: copiar(frotas) };
  const estado = criarJogo(opcoes);
  assert.equal(estado.fase, 'em_andamento');
  assert.equal(estado.turno, 0);
  assert.deepEqual(estado.frotas, frotas);
  opcoes.frotas[0][0].linha = 9;
  assert.equal(estado.frotas[0][0].linha, 0);
});

test('CT-03 — rejeitar frotas incompletas, tipos duplicados e casas sobrepostas', () => {
  assert.throws(() => criarJogo({ frotas: [frotas[0]] }), TypeError);
  assert.throws(() => criarJogo({ frotas: [frotas[0], []] }), { code: 'FROTA_INCOMPLETA' });

  const duplicada = copiar(frotas);
  duplicada[0][1].tipo = 'porta_avioes';
  assert.throws(() => criarJogo({ frotas: duplicada }), { code: 'NAVIO_DUPLICADO' });

  const sobreposta = copiar(frotas);
  sobreposta[0][1].linha = 0;
  sobreposta[0][1].coluna = 3;
  assert.throws(() => criarJogo({ frotas: sobreposta }), { code: 'NAVIOS_SOBREPOSTOS' });
});

test('CT-04 — posicionar navios nas orientações horizontal e vertical', () => {
  let estado = criarJogo();
  estado = posicionar(estado, 0, { tipo: 'porta_avioes', linha: 9, coluna: 5, orientacao: 'H' });
  estado = posicionar(estado, 1, { tipo: 'encouracado', linha: 6, coluna: 9, orientacao: 'V' });
  assert.deepEqual(estado.frotas[0], [{ tipo: 'porta_avioes', linha: 9, coluna: 5, orientacao: 'H' }]);
  assert.deepEqual(estado.frotas[1], [{ tipo: 'encouracado', linha: 6, coluna: 9, orientacao: 'V' }]);
});

test('CT-05 — validar limites do tabuleiro para cada navio e orientação', () => {
  const tamanhos = [
    ['porta_avioes', 5], ['encouracado', 4], ['submarino', 3], ['destroier', 2]
  ];
  for (const [tipo, tamanho] of tamanhos) {
    for (const orientacao of ['H', 'V']) {
      const naBorda = {
        tipo,
        linha: orientacao === 'V' ? 10 - tamanho : 9,
        coluna: orientacao === 'H' ? 10 - tamanho : 9,
        orientacao
      };
      const estado = posicionar(criarJogo(), 0, naBorda);
      assert.deepEqual(estado.frotas[0], [naBorda], `${tipo} ${orientacao} deve caber na borda`);

      const foraDoLimite = {
        ...naBorda,
        linha: orientacao === 'V' ? 11 - tamanho : 9,
        coluna: orientacao === 'H' ? 11 - tamanho : 9
      };
      assert.throws(() => posicionar(criarJogo(), 0, foraDoLimite), RangeError, `${tipo} ${orientacao} não deve ultrapassar a borda`);
    }
  }
});

test('CT-06 — permitir navios encostados e rejeitar sobreposição ou tipo repetido', () => {
  const portaAvioes = { tipo: 'porta_avioes', linha: 0, coluna: 0, orientacao: 'H' };
  const estado = posicionar(criarJogo(), 0, portaAvioes);
  const encouracadoEncostado = { tipo: 'encouracado', linha: 1, coluna: 0, orientacao: 'H' };
  assert.equal(posicionar(estado, 0, encouracadoEncostado).frotas[0].length, 2);
  const destroierDiagonal = { tipo: 'destroier', linha: 1, coluna: 5, orientacao: 'H' };
  assert.equal(posicionar(estado, 0, destroierDiagonal).frotas[0].length, 2);
  assert.throws(() => posicionar(estado, 0, { ...encouracadoEncostado, linha: 0, coluna: 4 }), { code: 'NAVIOS_SOBREPOSTOS' });
  assert.throws(() => posicionar(estado, 0, { ...portaAvioes, linha: 5 }), { code: 'NAVIO_DUPLICADO' });
});

test('CT-07 — rejeitar orientação inválida e posicionamento fora do tabuleiro', () => {
  assert.throws(() => posicionar(criarJogo(), 0, { tipo: 'porta_avioes', linha: 5, coluna: 8, orientacao: 'H' }), RangeError);
  assert.throws(() => posicionar(criarJogo(), 0, { tipo: 'submarino', linha: 0, coluna: 0, orientacao: 'D' }), RangeError);
});

test('CT-08 — exigir as duas frotas completas e validar a fase das ações', () => {
  let estado = criarJogo();
  assert.throws(() => executarAcao(estado, { tipo: 'iniciar' }), { code: 'FROTA_INCOMPLETA' });
  assert.throws(() => atirar(estado, 0, 0, 0), { code: 'FASE_INVALIDA' });
  for (const jogador of [0, 1]) for (const navio of frotas[jogador]) estado = posicionar(estado, jogador, navio);
  estado = executarAcao(estado, { tipo: 'iniciar' });
  assert.equal(estado.fase, 'em_andamento');
  assert.equal(estado.turno, 0);
  assert.throws(() => posicionar(estado, 0, frotas[0][0]), { code: 'FASE_INVALIDA' });
  assert.throws(() => executarAcao(estado, { tipo: 'iniciar' }), { code: 'FASE_INVALIDA' });
});

test('CT-09 — registrar água ou acerto e alternar o turno após o disparo', () => {
  let estado = atirar(jogoPronto(), 0, 9, 9);
  assert.deepEqual(estado.tiros[0][0], { linha: 9, coluna: 9, resultado: 'agua', navio: null });
  assert.equal(estado.turno, 1);
  estado = atirar(estado, 1, 0, 0);
  assert.deepEqual(estado.tiros[1][0], { linha: 0, coluna: 0, resultado: 'acerto', navio: 'porta_avioes' });
  assert.equal(estado.turno, 0);
});

test('CT-10 — rejeitar disparos fora da vez e coordenadas repetidas sem alterar o estado', () => {
  const inicial = jogoPronto();
  assert.throws(() => atirar(inicial, 1, 9, 9), { code: 'FORA_DA_VEZ' });
  let estado = atirar(inicial, 0, 9, 9);
  estado = atirar(estado, 1, 9, 8);
  estado = atirar(estado, 0, 9, 7);
  estado = atirar(estado, 1, 9, 6);
  const antes = copiar(estado);
  assert.throws(() => atirar(estado, 0, 9, 7), { code: 'TIRO_REPETIDO' });
  assert.deepEqual(estado, antes);
});

test('CT-11 — registrar o afundamento no disparo final e preservar acertos anteriores', () => {
  let estado = jogoPronto();
  for (let coluna = 0; coluna < 5; coluna++) {
    estado = atirar(estado, 0, 0, coluna);
    if (coluna < 4) estado = atirar(estado, 1, 9, coluna);
  }
  assert.deepEqual(estado.tiros[0].map(tiro => tiro.resultado), ['acerto', 'acerto', 'acerto', 'acerto', 'afundou']);
  assert.equal(estado.tiros[0][4].navio, 'porta_avioes');
  assert.equal(estado.vencedor, null);
});

test('CT-12 — validar a quantidade de casas necessária para afundar cada navio', () => {
  const tamanhos = [
    ['porta_avioes', 5],
    ['encouracado', 4],
    ['submarino', 3],
    ['destroier', 2]
  ];
  for (const [tipo, tamanho] of tamanhos) {
    let estado = jogoPronto();
    const navio = estado.frotas[1].find(item => item.tipo === tipo);
    for (let indice = 0; indice < tamanho; indice++) {
      const linha = navio.linha + (navio.orientacao === 'V' ? indice : 0);
      const coluna = navio.coluna + (navio.orientacao === 'H' ? indice : 0);
      estado = atirar(estado, 0, linha, coluna);
      assert.equal(estado.tiros[0].at(-1).resultado, indice === tamanho - 1 ? 'afundou' : 'acerto', tipo);
      if (indice < tamanho - 1) estado = atirar(estado, 1, 9, indice);
    }
    assert.equal(estado.tiros[0].filter(tiro => tiro.navio === tipo).length, tamanho, tipo);
  }
});

test('CT-13 — declarar vitória ao atingir as 14 casas e bloquear ações posteriores', () => {
  let estado = jogoPronto();
  for (let indice = 0; indice < alvos.length; indice++) {
    estado = atirar(estado, 0, ...alvos[indice]);
    assert.equal(estado.vencedor, indice === alvos.length - 1 ? 0 : null, `resultado após ${indice + 1} acerto(s)`);
    if (indice < alvos.length - 1) estado = atirar(estado, 1, ...aguas[indice]);
  }
  assert.equal(estado.fase, 'encerrado');
  assert.equal(estado.vencedor, 0);
  assert.equal(estado.turno, 0);
  assert.equal(estado.tiros[0].length, 14);
  assert.deepEqual(estado.tiros[0].filter(tiro => tiro.resultado === 'afundou').map(tiro => tiro.navio), [
    'porta_avioes', 'encouracado', 'submarino', 'destroier'
  ]);
  assert.throws(() => atirar(estado, 1, 8, 8), { code: 'JOGO_ENCERRADO' });
});

test('CT-14 — exibir a visão própria sem revelar a frota adversária', () => {
  let estado = atirar(jogoPronto(), 0, 0, 0);
  const visao = obterVisao(estado, 0);
  assert.deepEqual(Object.keys(visao), ['fase', 'turno', 'vencedor', 'frotaPropria', 'tirosProprios', 'tirosRecebidos']);
  assert.deepEqual(visao.frotaPropria, frotas[0]);
  assert.deepEqual(visao.tirosProprios, estado.tiros[0]);
  assert.deepEqual(visao.tirosRecebidos, []);
  visao.frotaPropria[0].linha = 7;
  visao.tirosProprios[0].resultado = 'agua';
  assert.equal(estado.frotas[0][0].linha, 0);
  assert.equal(estado.tiros[0][0].resultado, 'acerto');
  assert.deepEqual(obterVisao(estado, 1).tirosRecebidos, estado.tiros[0]);
});

test('CT-15 — validar tipos e limites de jogadores e coordenadas', () => {
  const estado = jogoPronto();
  assert.throws(() => atirar(estado, '0', 0, 0), TypeError);
  assert.throws(() => atirar(estado, 2, 0, 0), RangeError);
  assert.throws(() => atirar(estado, 0, 0.5, 0), TypeError);
  for (const [linha, coluna] of [[-1, 0], [10, 0], [0, -1], [0, 10]]) {
    assert.throws(() => atirar(estado, 0, linha, coluna), RangeError, `coordenada (${linha},${coluna}) fora do tabuleiro`);
  }
  assert.throws(() => obterVisao(estado, -1), RangeError);
  assert.throws(() => executarAcao(estado, { tipo: 'sonar' }), { code: 'ACAO_DESCONHECIDA' });
});

test('CT-16 — rejeitar navio desconhecido e frota predefinida fora do tabuleiro', () => {
  const tipoDesconhecido = copiar(frotas);
  tipoDesconhecido[0][0].tipo = 'iate';
  assert.throws(() => criarJogo({ frotas: tipoDesconhecido }), RangeError);

  const navioForaDoTabuleiro = copiar(frotas);
  navioForaDoTabuleiro[0][0].coluna = 6;
  assert.throws(() => criarJogo({ frotas: navioForaDoTabuleiro }), RangeError);
});

test('CT-17 — preservar o estado anterior e a ação após executar uma jogada', () => {
  const estado = criarJogo();
  const acao = { tipo: 'posicionar', jogador: 0, navio: { tipo: 'destroier', linha: 2, coluna: 3, orientacao: 'V' } };
  const estadoAntes = copiar(estado);
  const acaoAntes = copiar(acao);
  const proximo = executarAcao(estado, acao);
  assert.deepEqual(estado, estadoAntes);
  assert.deepEqual(acao, acaoAntes);
  assert.notStrictEqual(proximo, estado);
});

