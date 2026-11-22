const TAMANHOS = { porta_avioes: 5, encouracado: 4, submarino: 3, destroier: 2 };
const erro = (code, mensagem = code) => Object.assign(new Error(mensagem), { code });
const copia = valor => structuredClone(valor);

function inteiro(v, nome) {
  if (!Number.isInteger(v)) throw new TypeError(`${nome} deve ser inteiro`);
}
function jogadorValido(j) {
  inteiro(j, 'jogador');
  if (j !== 0 && j !== 1) throw new RangeError('jogador fora do intervalo');
}
function casas(n) {
  const tamanho = TAMANHOS[n.tipo];
  if (!tamanho) throw new RangeError('tipo de navio inválido');
  if (n.orientacao !== 'H' && n.orientacao !== 'V') throw new RangeError('orientação inválida');
  inteiro(n.linha, 'linha'); inteiro(n.coluna, 'coluna');
  if (n.linha < 0 || n.linha > 9 || n.coluna < 0 || n.coluna > 9) throw new RangeError('coordenada fora do tabuleiro');
  const resultado = [];
  for (let i = 0; i < tamanho; i++) {
    const linha = n.linha + (n.orientacao === 'V' ? i : 0);
    const coluna = n.coluna + (n.orientacao === 'H' ? i : 0);
    if (linha > 9 || coluna > 9) throw new RangeError('navio fora do tabuleiro');
    resultado.push({ linha, coluna });
  }
  return resultado;
}
function validarFrota(frota, completa = true) {
  if (!Array.isArray(frota)) throw new TypeError('frota deve ser array');
  const tipos = new Set(), ocupadas = new Set();
  for (const navio of frota) {
    if (!navio || typeof navio !== 'object') throw new TypeError('navio obrigatório');
    const coords = casas(navio);
    if (tipos.has(navio.tipo)) throw erro('NAVIO_DUPLICADO');
    tipos.add(navio.tipo);
    for (const {linha,coluna} of coords) {
      const chave = `${linha},${coluna}`;
      if (ocupadas.has(chave)) throw erro('NAVIOS_SOBREPOSTOS');
      ocupadas.add(chave);
    }
  }
  if (completa && tipos.size !== 4) throw erro('FROTA_INCOMPLETA');
}
export function criarJogo(opcoes) {
  if (opcoes === undefined) return { fase: 'posicionamento', turno: 0, vencedor: null, frotas: [[], []], tiros: [[], []] };
  if (!opcoes || typeof opcoes !== 'object') throw new TypeError('opções devem ser objeto');
  if (opcoes.frotas === undefined) return { fase: 'posicionamento', turno: 0, vencedor: null, frotas: [[], []], tiros: [[], []] };
  if (!Array.isArray(opcoes.frotas) || opcoes.frotas.length !== 2) throw new TypeError('duas frotas são obrigatórias');
  const frotas = copia(opcoes.frotas);
  frotas.forEach(f => validarFrota(f));
  return { fase: 'em_andamento', turno: 0, vencedor: null, frotas, tiros: [[], []] };
}
export function executarAcao(estado, acao) {
  if (!estado || typeof estado !== 'object' || !acao || typeof acao !== 'object') throw new TypeError('estado e ação são obrigatórios');
  if (estado.fase === 'encerrado') throw erro('JOGO_ENCERRADO');
  const e = copia(estado);
  if (acao.tipo === 'posicionar') {
    if (e.fase !== 'posicionamento') throw erro('FASE_INVALIDA');
    jogadorValido(acao.jogador);
    if (!acao.navio || typeof acao.navio !== 'object') throw new TypeError('navio obrigatório');
    const n = copia(acao.navio), coords = casas(n), frota = e.frotas[acao.jogador];
    if (frota.some(x => x.tipo === n.tipo)) throw erro('NAVIO_DUPLICADO');
    const ocupadas = new Set(frota.flatMap(x => casas(x).map(c => `${c.linha},${c.coluna}`)));
    if (coords.some(c => ocupadas.has(`${c.linha},${c.coluna}`))) throw erro('NAVIOS_SOBREPOSTOS');
    frota.push(n); return e;
  }
  if (acao.tipo === 'iniciar') {
    if (e.fase !== 'posicionamento') throw erro('FASE_INVALIDA');
    e.frotas.forEach(f => validarFrota(f)); e.fase = 'em_andamento'; return e;
  }
  if (acao.tipo === 'atirar') {
    if (e.fase !== 'em_andamento') throw erro('FASE_INVALIDA');
    jogadorValido(acao.jogador); inteiro(acao.linha, 'linha'); inteiro(acao.coluna, 'coluna');
    if (acao.linha < 0 || acao.linha > 9 || acao.coluna < 0 || acao.coluna > 9) throw new RangeError('coordenada fora do tabuleiro');
    if (acao.jogador !== e.turno) throw erro('FORA_DA_VEZ');
    if (e.tiros[acao.jogador].some(t => t.linha === acao.linha && t.coluna === acao.coluna)) throw erro('TIRO_REPETIDO');
    const alvo = e.frotas[1-acao.jogador].find(n => casas(n).some(c => c.linha === acao.linha && c.coluna === acao.coluna));
    let resultado = 'agua', navio = null;
    if (alvo) {
      navio = alvo.tipo; resultado = 'acerto';
      const atingidas = [...e.tiros[acao.jogador], {linha:acao.linha,coluna:acao.coluna}].filter(t => casas(alvo).some(c => c.linha === t.linha && c.coluna === t.coluna)).length;
      if (atingidas === TAMANHOS[navio]) {
        resultado = 'afundou';
        for (const t of e.tiros[acao.jogador]) if (t.navio === navio) t.resultado = 'acerto';
      }
    }
    e.tiros[acao.jogador].push({linha:acao.linha,coluna:acao.coluna,resultado,navio});
    const total = e.tiros[acao.jogador].filter(t => t.navio !== null).length;
    if (total === 14) { e.fase = 'encerrado'; e.vencedor = acao.jogador; e.turno = acao.jogador; }
    else e.turno = 1-acao.jogador;
    return e;
  }
  throw erro('ACAO_DESCONHECIDA');
}
export function obterVisao(estado, jogador) {
  jogadorValido(jogador);
  if (!estado || typeof estado !== 'object') throw new TypeError('estado obrigatório');
  return { fase: estado.fase, turno: estado.turno, vencedor: estado.vencedor,
    frotaPropria: copia(estado.frotas[jogador]), tirosProprios: copia(estado.tiros[jogador]),
    tirosRecebidos: copia(estado.tiros[1-jogador]) };
}

