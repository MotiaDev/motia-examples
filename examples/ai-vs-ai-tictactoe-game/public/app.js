/**
 * AI Tic Tac Toe Tournament - Frontend Application
 */

const API_BASE = window.location.origin;
const WS_BASE = `ws://${window.location.host}`;

// State
const state = {
  models: null,
  currentGame: null,
  currentTournament: null,
  gameSocket: null,
  tournamentSocket: null
};

// DOM Elements
const elements = {
  // Navigation
  navBtns: document.querySelectorAll('.nav-btn'),
  views: document.querySelectorAll('.view'),
  
  // Game Setup
  playerXSelect: document.getElementById('player-x-model'),
  playerOSelect: document.getElementById('player-o-model'),
  playerXInfo: document.getElementById('player-x-info'),
  playerOInfo: document.getElementById('player-o-info'),
  startGameBtn: document.getElementById('start-game-btn'),
  
  // Game Board
  gameSetup: document.getElementById('game-setup'),
  gameBoardPanel: document.getElementById('game-board-panel'),
  gameBoard: document.getElementById('game-board'),
  gameStatus: document.getElementById('game-status'),
  gamePlayerX: document.getElementById('game-player-x'),
  gamePlayerO: document.getElementById('game-player-o'),
  thinkingOverlay: document.getElementById('thinking-overlay'),
  thinkingModel: document.getElementById('thinking-model'),
  moveList: document.getElementById('move-list'),
  moveCount: document.getElementById('move-count'),
  xTime: document.getElementById('x-time'),
  oTime: document.getElementById('o-time'),
  newGameBtn: document.getElementById('new-game-btn'),
  
  // Tournament
  tournamentName: document.getElementById('tournament-name'),
  createTournamentBtn: document.getElementById('create-tournament-btn'),
  tournamentSetup: document.getElementById('tournament-setup'),
  tournamentActive: document.getElementById('tournament-active'),
  tournamentTitle: document.getElementById('tournament-title'),
  tournamentProgressFill: document.getElementById('tournament-progress-fill'),
  tournamentProgressText: document.getElementById('tournament-progress-text'),
  standingsTable: document.getElementById('standings-table'),
  matchPlayerX: document.getElementById('match-player-x'),
  matchPlayerO: document.getElementById('match-player-o'),
  startTournamentBtn: document.getElementById('start-tournament-btn'),
  
  // Models
  modelsGrid: document.getElementById('models-grid'),
  
  // Modal
  winnerModal: document.getElementById('winner-modal'),
  winnerTitle: document.getElementById('winner-title'),
  winnerMessage: document.getElementById('winner-message'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  
  // Toast
  toastContainer: document.getElementById('toast-container'),
  
  // Status
  statusDot: document.querySelector('.status-dot'),
  statusText: document.querySelector('.status-text')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadModels();
  setupEventListeners();
});

// Navigation
function setupNavigation() {
  elements.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      
      // Update nav buttons
      elements.navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update views
      elements.views.forEach(v => v.classList.remove('active'));
      document.getElementById(`${view}-view`).classList.add('active');
    });
  });
}

// Event Listeners
function setupEventListeners() {
  // Model selection
  elements.playerXSelect.addEventListener('change', () => updateModelInfo('x'));
  elements.playerOSelect.addEventListener('change', () => updateModelInfo('o'));
  
  // Game controls
  elements.startGameBtn.addEventListener('click', startGame);
  elements.newGameBtn.addEventListener('click', resetGame);
  
  // Tournament controls
  elements.createTournamentBtn.addEventListener('click', createTournament);
  elements.startTournamentBtn.addEventListener('click', startTournament);
  
  // Modal
  elements.closeModalBtn.addEventListener('click', () => {
    elements.winnerModal.classList.remove('active');
    resetGame();
  });
}

// API Functions
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showToast('API connection error', 'error');
    throw error;
  }
}

// Load Models
async function loadModels() {
  try {
    const data = await fetchAPI('/models');
    state.models = data;
    populateModelSelects(data);
    renderModelsGrid(data);
    showToast('Models loaded', 'success');
  } catch (error) {
    showToast('Failed to load models', 'error');
  }
}

function populateModelSelects(data) {
  const options = [];
  
  // Group by provider
  const providers = {
    anthropic: { label: '🟣 Claude', models: data.anthropic?.models || [] },
    google: { label: '🔵 Gemini', models: data.google?.models || [] },
    openai: { label: '🟢 OpenAI', models: data.openai?.models || [] }
  };
  
  Object.entries(providers).forEach(([provider, info]) => {
    if (info.models.length > 0) {
      options.push(`<optgroup label="${info.label}">`);
      info.models.forEach(model => {
        options.push(`<option value="${model.id}" data-provider="${provider}">${model.displayName}</option>`);
      });
      options.push('</optgroup>');
    }
  });
  
  const optionsHTML = '<option value="">Select a model...</option>' + options.join('');
  elements.playerXSelect.innerHTML = optionsHTML;
  elements.playerOSelect.innerHTML = optionsHTML;
  
  // Set default selections
  if (data.anthropic?.defaultModels?.[2]) {
    elements.playerXSelect.value = data.anthropic.defaultModels[2]; // Haiku for speed
  }
  if (data.openai?.defaultModels?.[2]) {
    elements.playerOSelect.value = data.openai.defaultModels[2]; // GPT-4o-mini
  }
  
  updateModelInfo('x');
  updateModelInfo('o');
}

function updateModelInfo(player) {
  const select = player === 'x' ? elements.playerXSelect : elements.playerOSelect;
  const infoEl = player === 'x' ? elements.playerXInfo : elements.playerOInfo;
  
  const modelId = select.value;
  if (!modelId || !state.models) {
    infoEl.textContent = '';
    return;
  }
  
  // Find the model
  let model = null;
  for (const provider of ['anthropic', 'google', 'openai']) {
    const found = state.models[provider]?.models?.find(m => m.id === modelId);
    if (found) {
      model = found;
      break;
    }
  }
  
  if (model) {
    infoEl.textContent = `${model.category} • ${model.latencyProfile} latency`;
  }
}

function renderModelsGrid(data) {
  const cards = [];
  
  const providerIcons = {
    anthropic: '🟣',
    google: '🔵',
    openai: '🟢'
  };
  
  Object.entries(data).forEach(([provider, info]) => {
    info.models?.forEach(model => {
      cards.push(`
        <div class="model-card ${provider}">
          <div class="model-card-header">
            <span class="model-card-icon">${providerIcons[provider]}</span>
            <span class="model-card-name">${model.displayName}</span>
          </div>
          <div class="model-card-id">${model.id}</div>
          <div class="model-card-desc">${model.description || 'AI model for Tic Tac Toe'}</div>
          <div class="model-card-tags">
            <span class="model-tag ${model.category}">${model.category}</span>
            <span class="model-tag">${model.reasoningMode}</span>
            <span class="model-tag">${model.latencyProfile} latency</span>
          </div>
        </div>
      `);
    });
  });
  
  elements.modelsGrid.innerHTML = cards.join('');
}

// Game Functions
async function startGame() {
  const playerXModel = elements.playerXSelect.value;
  const playerOModel = elements.playerOSelect.value;
  
  if (!playerXModel || !playerOModel) {
    showToast('Please select models for both players', 'error');
    return;
  }
  
  elements.startGameBtn.disabled = true;
  elements.startGameBtn.innerHTML = '<span class="btn-icon">⏳</span> Starting...';
  
  try {
    const data = await fetchAPI('/game', {
      method: 'POST',
      body: JSON.stringify({
        playerXModel,
        playerOModel,
        autoPlay: true
      })
    });
    
    state.currentGame = data;
    
    // Update UI
    elements.gameSetup.style.display = 'none';
    elements.gameBoardPanel.style.display = 'block';
    
    elements.gamePlayerX.textContent = truncateModel(data.playerX.modelId);
    elements.gamePlayerO.textContent = truncateModel(data.playerO.modelId);
    
    // Connect to WebSocket
    connectGameSocket(data.id);
    
    showToast('Game started!', 'success');
    
    // Show thinking indicator
    showThinking(data.playerX.modelId);
    
  } catch (error) {
    showToast('Failed to start game', 'error');
  } finally {
    elements.startGameBtn.disabled = false;
    elements.startGameBtn.innerHTML = '<span class="btn-icon">⚡</span> Start Battle';
  }
}

function truncateModel(modelId) {
  if (modelId.length > 20) {
    return modelId.substring(0, 17) + '...';
  }
  return modelId;
}

function connectGameSocket(gameId) {
  if (state.gameSocket) {
    state.gameSocket.close();
  }
  
  const wsUrl = `${WS_BASE}/streams/gameState/games/${gameId}`;
  state.gameSocket = new WebSocket(wsUrl);
  
  state.gameSocket.onopen = () => {
    console.log('Game WebSocket connected');
    updateConnectionStatus(true);
  };
  
  state.gameSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleGameUpdate(data);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };
  
  state.gameSocket.onclose = () => {
    console.log('Game WebSocket closed');
  };
  
  state.gameSocket.onerror = (error) => {
    console.error('Game WebSocket error:', error);
    updateConnectionStatus(false);
  };
  
  // Also poll for updates as backup
  startPolling(gameId);
}

let pollingInterval = null;

function startPolling(gameId) {
  if (pollingInterval) clearInterval(pollingInterval);
  
  pollingInterval = setInterval(async () => {
    try {
      const data = await fetchAPI(`/game/${gameId}`);
      if (data && data.id) {
        handleGameUpdate(data);
        
        // Stop polling if game is over
        if (data.status !== 'in_progress') {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }, 1000);
}

function handleGameUpdate(data) {
  if (!data) return;
  
  // Handle ephemeral stream events
  if (data.type === 'move_made') {
    const moveData = data.data;
    addMoveToLog(moveData.player, moveData.position, moveData.modelId, moveData.thinkingTime);
    return;
  }
  
  if (data.type === 'game_completed') {
    return;
  }
  
  // State update
  state.currentGame = { ...state.currentGame, ...data };
  
  // Update board
  updateBoard(data.board);
  
  // Update move count - try different sources
  let moveCount = 0;
  if (data.stats && typeof data.stats.totalMoves === 'number') {
    moveCount = data.stats.totalMoves;
  } else if (typeof data.moveCount === 'number') {
    moveCount = data.moveCount;
  } else if (data.moves && Array.isArray(data.moves)) {
    moveCount = data.moves.length;
  }
  
  document.getElementById('move-count').textContent = String(moveCount);
  
  // Update timing stats
  if (data.stats) {
    if (data.stats.avgThinkingTimeX > 0) {
      document.getElementById('x-time').textContent = `${Math.round(data.stats.avgThinkingTimeX)}ms`;
    }
    if (data.stats.avgThinkingTimeO > 0) {
      document.getElementById('o-time').textContent = `${Math.round(data.stats.avgThinkingTimeO)}ms`;
    }
  }
  
  // Update move list from moves array
  if (data.moves && data.moves.length > 0) {
    data.moves.forEach(move => {
      addMoveToLog(move.player, move.position, move.modelId, move.thinkingTime);
    });
  }
  
  // Handle lastMove format (from streams)
  if (data.lastMove) {
    addMoveToLog(
      data.lastMove.player,
      { row: data.lastMove.row, col: data.lastMove.col },
      data.lastMove.modelId,
      data.lastMove.thinkingTime
    );
    
    if (data.lastMove.player === 'X' && data.lastMove.thinkingTime) {
      document.getElementById('x-time').textContent = `${data.lastMove.thinkingTime}ms`;
    } else if (data.lastMove.player === 'O' && data.lastMove.thinkingTime) {
      document.getElementById('o-time').textContent = `${data.lastMove.thinkingTime}ms`;
    }
  }
  
  // Update status and thinking indicator
  if (data.status === 'in_progress') {
    const currentModel = data.currentPlayer === 'X' 
      ? data.playerX?.modelId 
      : data.playerO?.modelId;
    
    updateTurnIndicator(data.currentPlayer);
    showThinking(currentModel);
  } else {
    hideThinking();
    handleGameEnd(data);
  }
}

function updateBoard(board) {
  if (!board) return;
  
  const cells = elements.gameBoard.querySelectorAll('.cell');
  cells.forEach((cell, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const value = board[row]?.[col];
    
    cell.className = 'cell';
    cell.textContent = '';
    
    if (value === 'X') {
      cell.classList.add('x');
      cell.textContent = 'X';
    } else if (value === 'O') {
      cell.classList.add('o');
      cell.textContent = 'O';
    }
  });
}

function updateTurnIndicator(player) {
  const indicator = elements.gameStatus.querySelector('.turn-indicator');
  indicator.className = 'turn-indicator';
  indicator.textContent = `${player}'s Turn`;
}

function showThinking(modelId) {
  elements.thinkingOverlay.classList.add('active');
  elements.thinkingModel.textContent = `${truncateModel(modelId)} is thinking...`;
}

function hideThinking() {
  elements.thinkingOverlay.classList.remove('active');
}

const moveLogHistory = new Set();

function addMoveToLog(player, position, modelId, thinkingTime) {
  const moveKey = `${player}-${position.row}-${position.col}`;
  if (moveLogHistory.has(moveKey)) return;
  moveLogHistory.add(moveKey);
  
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="move-player ${player.toLowerCase()}">${player}</span>
    → (${position.row}, ${position.col})
    <span class="move-time">${thinkingTime ? `${thinkingTime}ms` : ''}</span>
  `;
  elements.moveList.appendChild(li);
  elements.moveList.scrollTop = elements.moveList.scrollHeight;
}

function handleGameEnd(data) {
  const indicator = elements.gameStatus.querySelector('.turn-indicator');
  
  // Highlight winning line
  if (data.winningLine) {
    data.winningLine.forEach(pos => {
      const index = pos.row * 3 + pos.col;
      const cell = elements.gameBoard.children[index];
      cell.classList.add('winner');
    });
  }
  
  if (data.status === 'x_wins' || data.status === 'o_wins') {
    const winner = data.status === 'x_wins' ? 'X' : 'O';
    const winnerModel = winner === 'X' ? data.playerX?.modelId : data.playerO?.modelId;
    
    indicator.className = 'turn-indicator winner';
    indicator.textContent = `${winner} Wins!`;
    
    // Show modal
    elements.winnerTitle.textContent = '🎉 Victory!';
    elements.winnerMessage.textContent = `${truncateModel(winnerModel)} wins the battle!`;
    elements.winnerModal.classList.add('active');
    
  } else if (data.status === 'draw') {
    indicator.className = 'turn-indicator draw';
    indicator.textContent = "It's a Draw!";
    
    elements.winnerTitle.textContent = '🤝 Draw!';
    elements.winnerMessage.textContent = 'Both AIs fought to a stalemate!';
    elements.winnerModal.classList.add('active');
  }
  
  // Stop polling
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function resetGame() {
  // Close WebSocket
  if (state.gameSocket) {
    state.gameSocket.close();
    state.gameSocket = null;
  }
  
  // Stop polling
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  
  // Reset state
  state.currentGame = null;
  moveLogHistory.clear();
  
  // Reset UI
  elements.gameSetup.style.display = 'block';
  elements.gameBoardPanel.style.display = 'none';
  elements.winnerModal.classList.remove('active');
  
  // Clear board
  const cells = elements.gameBoard.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.className = 'cell';
    cell.textContent = '';
  });
  
  // Clear move log
  elements.moveList.innerHTML = '';
  elements.moveCount.textContent = '0';
  elements.xTime.textContent = '0ms';
  elements.oTime.textContent = '0ms';
  
  hideThinking();
}

// Tournament Functions
async function createTournament() {
  const name = elements.tournamentName.value || 'AI Championship 2025';
  
  elements.createTournamentBtn.disabled = true;
  elements.createTournamentBtn.innerHTML = '<span class="btn-icon">⏳</span> Creating...';
  
  try {
    const data = await fetchAPI('/tournament', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    
    state.currentTournament = data;
    
    // Update UI
    elements.tournamentSetup.style.display = 'none';
    elements.tournamentActive.style.display = 'block';
    
    elements.tournamentTitle.textContent = data.name;
    updateTournamentProgress(0, data.totalMatches);
    
    // Initialize standings
    renderStandings([
      { rank: 1, teamName: 'Team Claude', provider: 'anthropic', points: 0, wins: 0, draws: 0, losses: 0 },
      { rank: 2, teamName: 'Team Gemini', provider: 'google', points: 0, wins: 0, draws: 0, losses: 0 },
      { rank: 3, teamName: 'Team OpenAI', provider: 'openai', points: 0, wins: 0, draws: 0, losses: 0 }
    ]);
    
    showToast(`Tournament created with ${data.totalMatches} matches!`, 'success');
    
  } catch (error) {
    showToast('Failed to create tournament', 'error');
  } finally {
    elements.createTournamentBtn.disabled = false;
    elements.createTournamentBtn.innerHTML = '<span class="btn-icon">🚀</span> Create Tournament';
  }
}

async function startTournament() {
  if (!state.currentTournament) {
    showToast('No tournament to start', 'error');
    return;
  }
  
  elements.startTournamentBtn.disabled = true;
  elements.startTournamentBtn.innerHTML = '<span class="btn-icon">⏳</span> Starting...';
  
  try {
    const data = await fetchAPI('/tournament/start', {
      method: 'POST',
      body: JSON.stringify({ tournamentId: state.currentTournament.id })
    });
    
    // Update current match display
    if (data.currentMatch) {
      elements.matchPlayerX.textContent = truncateModel(data.currentMatch.playerXModel);
      elements.matchPlayerO.textContent = truncateModel(data.currentMatch.playerOModel);
    }
    
    // Connect to WebSocket
    connectTournamentSocket(state.currentTournament.id);
    
    // Start polling tournament status
    startTournamentPolling(state.currentTournament.id);
    
    elements.startTournamentBtn.innerHTML = '<span class="btn-icon">🔴</span> Tournament Running';
    showToast('Tournament started!', 'success');
    
  } catch (error) {
    showToast('Failed to start tournament', 'error');
    elements.startTournamentBtn.disabled = false;
    elements.startTournamentBtn.innerHTML = '<span class="btn-icon">▶️</span> Start Tournament';
  }
}

function connectTournamentSocket(tournamentId) {
  if (state.tournamentSocket) {
    state.tournamentSocket.close();
  }
  
  const wsUrl = `${WS_BASE}/streams/tournamentState/tournaments/${tournamentId}`;
  state.tournamentSocket = new WebSocket(wsUrl);
  
  state.tournamentSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleTournamentUpdate(data);
    } catch (e) {
      console.error('Failed to parse tournament WebSocket message:', e);
    }
  };
}

let tournamentPollingInterval = null;

function startTournamentPolling(tournamentId) {
  if (tournamentPollingInterval) clearInterval(tournamentPollingInterval);
  
  tournamentPollingInterval = setInterval(async () => {
    try {
      const data = await fetchAPI(`/tournament/${tournamentId}`);
      if (data && data.id) {
        handleTournamentUpdate(data);
        
        // Stop polling if tournament is complete
        if (data.status === 'completed') {
          clearInterval(tournamentPollingInterval);
          tournamentPollingInterval = null;
        }
      }
    } catch (e) {
      console.error('Tournament polling error:', e);
    }
  }, 2000);
}

function handleTournamentUpdate(data) {
  if (!data) return;
  
  // Handle ephemeral events
  if (data.type === 'match_started' || data.type === 'tournament_completed') {
    return;
  }
  
  // Update progress
  if (data.progress) {
    updateTournamentProgress(data.progress.completedMatches, data.progress.totalMatches);
  }
  
  // Update standings
  if (data.standings) {
    renderStandings(data.standings);
  }
  
  // Update current match
  if (data.currentMatch) {
    elements.matchPlayerX.textContent = truncateModel(data.currentMatch.playerXModel);
    elements.matchPlayerO.textContent = truncateModel(data.currentMatch.playerOModel);
  }
  
  // Handle completion
  if (data.status === 'completed') {
    elements.startTournamentBtn.innerHTML = '<span class="btn-icon">🏆</span> Tournament Complete!';
    showToast('Tournament finished!', 'success');
    
    if (data.standings?.[0]) {
      elements.winnerTitle.textContent = '🏆 Tournament Champion!';
      elements.winnerMessage.textContent = `${data.standings[0].teamName} wins with ${data.standings[0].points} points!`;
      elements.winnerModal.classList.add('active');
    }
  }
}

function updateTournamentProgress(completed, total) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  elements.tournamentProgressFill.style.width = `${percentage}%`;
  elements.tournamentProgressText.textContent = `${completed}/${total} matches`;
}

function renderStandings(standings) {
  const providerIcons = {
    anthropic: '🟣',
    google: '🔵',
    openai: '🟢'
  };
  
  const rankIcons = ['🥇', '🥈', '🥉'];
  
  const rows = standings.map((team, index) => `
    <div class="standing-row ${index === 0 ? 'first' : ''}">
      <div class="rank">${rankIcons[index] || index + 1}</div>
      <div class="standing-team">
        <span class="standing-team-icon">${providerIcons[team.provider]}</span>
        <span class="standing-team-name">${team.teamName}</span>
      </div>
      <div class="standing-points">${team.points}</div>
      <div class="standing-record">${team.wins}W ${team.draws}D ${team.losses}L</div>
    </div>
  `);
  
  elements.standingsTable.innerHTML = rows.join('');
}

// Utility Functions
function updateConnectionStatus(connected) {
  if (connected) {
    elements.statusDot.style.background = 'var(--accent-green)';
    elements.statusText.textContent = 'Connected';
  } else {
    elements.statusDot.style.background = 'var(--accent-red)';
    elements.statusText.textContent = 'Disconnected';
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  elements.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    elements.winnerModal.classList.remove('active');
  }
});

