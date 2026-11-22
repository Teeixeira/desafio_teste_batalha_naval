import { criarJogo, executarAcao, obterVisao } from './src/jogo.js';

const ships = [
  { tipo: 'porta_avioes', nome: 'Porta-aviões', casas: 5 },
  { tipo: 'encouracado', nome: 'Encouraçado', casas: 4 },
  { tipo: 'submarino', nome: 'Submarino', casas: 3 },
  { tipo: 'destroier', nome: 'Destroier', casas: 2 }
];
const $ = id => document.getElementById(id);
const labels = 'ABCDEFGHIJ';
let state = criarJogo();
let player = 0;
let selected = ships[0].tipo;
let orientation = 'H';
let mode = 'placement';
let awaiting = false;
let toastTimer;

function showToast(message) {
  const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function cellsFor(ship, row, col, direction = orientation) {
  return Array.from({ length: ship.casas }, (_, i) => ({
    linha: row + (direction === 'V' ? i : 0),
    coluna: col + (direction === 'H' ? i : 0)
  }));
}
function shipAt(fleet, row, col) {
  return fleet.find(ship => cellsFor(ship, ship.linha, ship.coluna, ship.orientacao)
    .some(cell => cell.linha === row && cell.coluna === col));
}
function renderFleet() {
  const fleet = state.frotas[player];
  $('fleet-player').textContent = `Jogador ${player + 1}`;
  $('fleet-count').textContent = `${fleet.length} / 4`;
  $('fleet-list').innerHTML = ships.map(ship => {
    const done = fleet.some(placed => placed.tipo === ship.tipo);
    const active = selected === ship.tipo && mode === 'placement' && !done;
    return `<button type="button" class="ship-option${active ? ' selected' : ''}${done ? ' placed' : ''}" data-ship="${ship.tipo}" ${done || mode !== 'placement' ? 'disabled' : ''}>
      <span class="ship-art" aria-hidden="true">${'<i></i>'.repeat(ship.casas)}</span>
      <span class="ship-text"><strong>${ship.nome}</strong><small>${ship.casas} casas</small></span>
      <span class="ship-check">${done ? '✓' : ''}</span></button>`;
  }).join('');
  $('fleet-list').querySelectorAll('[data-ship]').forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.ship; render();
  }));
  const currentShip = ships.find(ship => ship.tipo === selected);
  $('fleet-note').textContent = mode === 'placement'
    ? `Escolhido: ${currentShip?.nome ?? '—'}. ${orientation === 'H' ? 'Horizontal' : 'Vertical'} · navios podem se encostar.`
    : mode === 'ended' ? 'Partida finalizada.' : 'Acerte todos os navios inimigos para vencer.';
}
function renderBoard() {
  const board = $('board');
  const putting = mode === 'placement';
  const targeting = mode === 'game' || mode === 'ended';
  const ownPlayer = player;
  const fleet = targeting ? [] : state.frotas[ownPlayer];
  const view = mode === 'game' || mode === 'ended' ? obterVisao(state, ownPlayer) : null;
  const shots = new Map((targeting ? view?.tirosProprios : view?.tirosRecebidos ?? []).map(shot => [`${shot.linha},${shot.coluna}`, shot]));
  $('board-kicker').textContent = putting ? 'POSICIONAMENTO' : targeting ? 'MAPA DE DISPAROS' : 'TABULEIRO PRÓPRIO';
  $('board-title').textContent = putting ? 'Seu tabuleiro' : targeting ? 'Alvos do adversário' : 'Sua frota';
  board.setAttribute('aria-label', putting ? `Tabuleiro de posicionamento do Jogador ${player + 1}` : targeting ? `Alvos do Jogador ${player + 1}` : `Frota do Jogador ${player + 1}`);
  let html = '<div class="coord"></div>';
  for (const letter of labels) html += `<div class="coord">${letter}</div>`;
  for (let row = 0; row < 10; row++) {
    html += `<div class="coord">${String(row + 1).padStart(2, '0')}</div>`;
    for (let col = 0; col < 10; col++) {
      const key = `${row},${col}`;
      const ship = shipAt(fleet, row, col);
      const shot = putting ? null : shots.get(key);
      const classes = ['cell'];
      if (ship) classes.push('own-ship');
      if (shot?.resultado === 'agua') classes.push('miss');
      if (shot?.resultado === 'acerto') classes.push('hit');
      if (shot?.resultado === 'afundou') classes.push('sunk');
      const mark = shot ? (shot.resultado === 'agua' ? '·' : '×') : '';
      const description = `Linha ${row + 1}, coluna ${labels[col]}${ship ? `, ${ships.find(item => item.tipo === ship.tipo).nome}` : ''}${shot ? `, ${shot.resultado}` : ''}`;
      html += `<button type="button" role="gridcell" class="${classes.join(' ')}" data-row="${row}" data-col="${col}" aria-label="${description}" ${targeting ? mode === 'ended' ? 'disabled' : '' : putting ? '' : 'disabled'}>${mark}</button>`;
    }
  }
  board.innerHTML = html;
  if (putting) board.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', () => placeShip(Number(cell.dataset.row), Number(cell.dataset.col))));
}
function renderHeader() {
  const putting = mode === 'placement';
  $('orientation-button').classList.toggle('hidden', !putting);
  $('phase-label').textContent = putting ? 'FASE 01 — POSICIONAMENTO' : mode === 'ended' ? 'PARTIDA ENCERRADA' : 'FASE 02 — BATALHA';
  $('headline').textContent = putting ? 'Prepare sua frota.' : mode === 'ended' ? `Jogador ${(state.vencedor ?? 0) + 1} venceu.` : 'Encontre a frota inimiga.';
  $('subhead').textContent = putting
    ? 'Escolha um navio e clique no tabuleiro para posicioná-lo.'
    : mode === 'ended' ? 'Todos os navios adversários foram afundados.' : 'Um disparo por turno. As frotas ficam ocultas para o adversário.';
  $('status-icon').textContent = mode === 'ended' ? '✓' : String(player + 1);
  $('status-title').textContent = mode === 'ended' ? `Vitória do Jogador ${(state.vencedor ?? 0) + 1}` : `Vez do Jogador ${player + 1}`;
  $('status-message').textContent = putting
    ? `Posicione os navios restantes do Jogador ${player + 1}.`
    : mode === 'ended' ? 'A batalha terminou.' : 'Dispare em uma casa do tabuleiro adversário.';
  $('orientation-button').innerHTML = `${orientation === 'H' ? '↔' : '↕'} <span>${orientation === 'H' ? 'Horizontal' : 'Vertical'}</span>`;
  const action = $('action-button');
  action.classList.toggle('hidden', mode !== 'placement');
  action.disabled = mode === 'ended' || (putting && state.frotas[player].length < ships.length);
  action.innerHTML = putting ? 'Frota posicionada <span>→</span>' : mode === 'ended' ? 'Partida encerrada' : 'Aguardando disparo';
  $('rules-note').textContent = mode === 'ended' ? `Partida finalizada · Jogador ${player + 1} venceu` : 'Frota completa: 14 casas · Vence quem afundar todos os navios';
}
function render() {
  renderHeader(); renderFleet(); renderBoard();
  $('handoff').classList.toggle('hidden', !awaiting);
  if (awaiting) {
    const isPlacement = mode === 'placement';
    $('handoff-title').textContent = isPlacement ? `Passe ao Jogador ${player + 1}.` : `Passe ao Jogador ${player + 1}.`;
    $('handoff-copy').textContent = isPlacement
      ? `Jogador ${player + 1}, posicione sua frota sem ver a do outro jogador.`
      : `Entregue o dispositivo ao Jogador ${player + 1} antes de continuar.`;
    $('handoff-button').textContent = 'Estou pronto →';
  }
}
function placeShip(row, col) {
  const ship = ships.find(item => item.tipo === selected);
  if (!ship) return;
  try {
    const navio = { tipo: ship.tipo, linha: row, coluna: col, orientacao: orientation };
    state = executarAcao(state, { tipo: 'posicionar', jogador: player, navio });
    const next = ships.find(item => !state.frotas[player].some(placed => placed.tipo === item.tipo));
    selected = next?.tipo ?? null;
    if (state.frotas[player].length === ships.length) {
      if (player === 0) {
        player = 1; selected = ships.find(item => !state.frotas[1].some(placed => placed.tipo === item.tipo)).tipo;
        awaiting = true;
      } else {
        state = executarAcao(state, { tipo: 'iniciar' }); mode = 'game'; player = 0; awaiting = true;
      }
    }
    render();
  } catch (error) { showToast(error.message === 'NAVIOS_SOBREPOSTOS' ? 'Esse navio se sobrepõe a outro. Escolha outra casa.' : 'Esse navio não cabe nessa posição.'); }
}
function fire(row, col) {
  try {
    state = executarAcao(state, { tipo: 'atirar', jogador: player, linha: row, coluna: col });
    const shot = state.tiros[player].at(-1);
    if (state.fase === 'encerrado') { mode = 'ended'; render(); return; }
    player = state.turno; awaiting = true;
    showToast(shot.resultado === 'agua' ? 'Água! A vez passa para o outro jogador.' : shot.resultado === 'afundou' ? `${ships.find(ship => ship.tipo === shot.navio).nome} afundado! A vez passa para o outro jogador.` : 'Acertou! A vez passa para o outro jogador.');
    render();
  } catch (error) { showToast(error.message); }
}

$('orientation-button').addEventListener('click', () => { orientation = orientation === 'H' ? 'V' : 'H'; render(); });
$('handoff-button').addEventListener('click', () => { awaiting = false; render(); });
$('board').addEventListener('click', event => {
  const cell = event.target.closest('.cell');
  if (cell && mode === 'game') fire(Number(cell.dataset.row), Number(cell.dataset.col));
});
render();

