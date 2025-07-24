// UI management module
class UI {
    constructor() {
        this.elements = {
            playerName: document.getElementById('playerName'),
            teamSelect: document.getElementById('teamSelect'),
            gameModeSelect: document.getElementById('gameModeSelect'),
            gameModeToggle: document.getElementById('gameModeToggle'),
            modeDescription: document.getElementById('modeDescription'),
            startButton: document.getElementById('startButton'),
            lapTimer: document.getElementById('lap-timer'),
            bestLap: document.getElementById('best-lap-timer'),
            lapCount: document.getElementById('lap-count'),
            lapCountBox: document.getElementById('lap-count-box'),
            // Elementos da coluna lateral para layout 3 colunas
            lapTimerSide: document.getElementById('lap-timer-side'),
            bestLapSide: document.getElementById('best-lap-timer-side'),
            lapCountSide: document.getElementById('lap-count-side'),
            lapCountBoxSide: document.getElementById('lap-count-box-side'),
            sparklineSide: document.getElementById('sparkline-side'),
            gameContainer: document.querySelector('.game-container'),
            sparkline: document.getElementById('sparkline'),
        };
        
        this.gameState = 'menu'; // 'menu', 'playing', 'paused'
        this.currentTime = 0;
        this.lastCompletedLapTime = null; // Para manter o último tempo da volta
        this.lapTimes = [];
        this.bestTime = null;
        this.previousTime = null;
        this.gameMode = 'classic'; // 'classic' ou 'continuous'
        this.lapCount = 0; // Contador de voltas para modo contínuo
        this.selectedTeam = null; // Team selecionado para aplicar cor
        
        this.initializeEventListeners();
        this.loadSavedData();
    }
    
    initializeEventListeners() {
        // Start button - múltiplos eventos para garantir compatibilidade mobile
        if (this.elements.startButton) {
            console.log('Setting up start button listeners');
            
            // Evento click padrão
            this.elements.startButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Start button clicked');
                this.startGame();
            });
            
            // Evento touch específico para mobile
            this.elements.startButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                console.log('Start button touched');
                this.startGame();
            });
            
            // Backup com mousedown para garantir responsividade
            this.elements.startButton.addEventListener('mousedown', (e) => {
                console.log('Start button mousedown');
            });
        } else {
            console.log('Start button not found!');
        }
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (window.game && window.game.isWaitingForContinue) {
                    // Continue from lap complete in classic mode
                    window.game.continueFromLapComplete();
                } else if (this.gameState === 'menu') {
                    // Start game from menu
                    this.startGame();
                }
                // Nota: Lógica do modo contínuo é tratada no game.js
            }
        });
        
        // Player name input
        this.elements.playerName.addEventListener('input', (e) => {
            this.savePlayerData();
        });
        
        // Team selection
        this.elements.teamSelect.addEventListener('change', (e) => {
            this.savePlayerData();
            // Update car color based on team selection
            this.updateCarColor(e.target.value);
        });
        
        // Game mode selection
        this.elements.gameModeSelect.addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            this.updateModeDescription();
            this.savePlayerData();
            // Reinicia o jogo automaticamente quando o modo for alterado
            if (this.gameState === 'playing') {
                this.resetGame();
                setTimeout(() => {
                    this.startGame();
                }, 100);
            }
        });

        // Game mode toggle button
        if (this.elements.gameModeToggle) {
            this.elements.gameModeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleGameMode();
            });
        }

        // Mobile controls
        this.setupMobileControls();

        // Load saved player name
        const savedName = localStorage.getItem('hotlap_player_name');
        if (savedName) {
            this.elements.playerName.value = savedName;
        } else {
            // Nome padrão para facilitar testes mobile
            this.elements.playerName.value = 'Piloto';
        }
        
        const savedTeam = localStorage.getItem('hotlap_team');
        if (savedTeam) {
            this.elements.teamSelect.value = savedTeam;
            this.selectedTeam = savedTeam;
        } else {
            this.selectedTeam = this.elements.teamSelect.value;
        }
        
        const savedMode = localStorage.getItem('hotlap_game_mode');
        if (savedMode) {
            this.elements.gameModeSelect.value = savedMode;
            this.gameMode = savedMode;
        }
        
        this.updateModeDescription();
        this.updateGameModeDisplay();
        
        // Set initial car color when page loads
        setTimeout(() => {
            if (window.game && window.game.car) {
                window.game.car.updateTeamColor(this.elements.teamSelect.value);
            }
        }, 100);
    }
    
    toggleGameMode() {
        const wasPlaying = this.gameState === 'playing';
        
        this.gameMode = this.gameMode === 'classic' ? 'continuous' : 'classic';
        this.elements.gameModeSelect.value = this.gameMode;
        this.updateModeDescription();
        this.updateGameModeDisplay();
        this.updateLapCountVisibility();
        this.savePlayerData();
        
        // Reset lap count when switching modes
        this.lapCount = 0;
        if (this.elements.lapCount) {
            this.elements.lapCount.textContent = this.lapCount;
        }
        
        // Only restart if was playing, otherwise just stop
        if (wasPlaying) {
            this.resetGame(); // Stop current game but don't auto-start
        }
    }
    
    updateGameModeDisplay() {
        if (this.elements.gameModeToggle) {
            const modeText = this.gameMode === 'classic' ? '🏁 Clássico' : '🔄 Contínuo';
            this.elements.gameModeToggle.textContent = modeText;
        }
    }
    
    updateLapCountVisibility() {
        if (this.elements.lapCountBox) {
            if (this.gameMode === 'continuous') {
                this.elements.lapCountBox.style.display = 'block';
            } else {
                this.elements.lapCountBox.style.display = 'none';
            }
        }
    }
    
    updateModeDescription() {
        const mode = this.gameMode;
        const descriptions = {
            classic: 'Clássico: Para após cada volta, pressione espaço para continuar',
            continuous: 'Contínuo: Jogo roda sem parar, voltas consecutivas'
        };
        this.elements.modeDescription.textContent = descriptions[mode] || descriptions.classic;
    }

    setupMobileControls() {
        const leftControl = document.getElementById('leftControl');
        const rightControl = document.getElementById('rightControl');

        console.log('Setting up mobile controls:', { leftControl, rightControl });

        if (leftControl) {
            console.log('Adding listeners to left control');
            // Touch events for mobile
            leftControl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                console.log('Left touch start');
                this.simulateKeyPress('ArrowLeft', true);
            });
            leftControl.addEventListener('touchend', (e) => {
                e.preventDefault();
                console.log('Left touch end');
                this.simulateKeyPress('ArrowLeft', false);
            });
            
            // Mouse events for desktop testing
            leftControl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                console.log('Left mouse down');
                this.simulateKeyPress('ArrowLeft', true);
            });
            leftControl.addEventListener('mouseup', (e) => {
                e.preventDefault();
                console.log('Left mouse up');
                this.simulateKeyPress('ArrowLeft', false);
            });
        } else {
            console.log('Left control not found!');
        }

        if (rightControl) {
            console.log('Adding listeners to right control');
            // Touch events for mobile
            rightControl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                console.log('Right touch start');
                this.simulateKeyPress('ArrowRight', true);
            });
            rightControl.addEventListener('touchend', (e) => {
                e.preventDefault();
                console.log('Right touch end');
                this.simulateKeyPress('ArrowRight', false);
            });
            
            // Mouse events for desktop testing
            rightControl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                console.log('Right mouse down');
                this.simulateKeyPress('ArrowRight', true);
            });
            rightControl.addEventListener('mouseup', (e) => {
                e.preventDefault();
                console.log('Right mouse up');
                this.simulateKeyPress('ArrowRight', false);
            });
        } else {
            console.log('Right control not found!');
        }
    }

    simulateKeyPress(key, isPressed) {
        if (!window.game) return;

        // Simula input direto no sistema de keys do game
        if (key === 'ArrowLeft') {
            window.game.keys.ArrowLeft = isPressed;
        } else if (key === 'ArrowRight') {
            window.game.keys.ArrowRight = isPressed;
        }
        
        // Debug log para verificar se está funcionando
        console.log(`Mobile control: ${key} = ${isPressed}`);
    }
    
    showLapComplete(lapTime, isBestLap = false) {
        // Only show lap complete overlay in classic mode
        const gameMode = this.getGameMode();
        if (gameMode !== 'classic') return;
        // Usa overlay fixo
        const overlay = document.getElementById('gameOverlay');
        const content = document.getElementById('overlayContent');
        let html = '';
        if (isBestLap) {
            html += '<div class="best-lap-indicator">🏆 NOVO RECORDE PESSOAL! 🏆</div>';
        }
        html += `<div class="lap-complete-message">VOLTA COMPLETA</div>`;
        html += `<div class="lap-time-display">${TimeUtils.formatTime(lapTime)}</div>`;
        html += `<div class="continue-instruction">Pressione espaço para continuar</div>`;
        content.innerHTML = html;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible'; // Garante visibilidade quando mostra
    }
    hideLapComplete() {
        console.log('hideLapComplete called');
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.style.visibility = 'hidden'; // Adiciona mais uma camada de ocultação
            console.log('Overlay hidden');
        }
    }
    showGameOver(crashed, lapTime) {
        // Usa overlay fixo
        const overlay = document.getElementById('gameOverlay');
        const content = document.getElementById('overlayContent');
        let html = '';
        if (crashed) {
            html += `<div class="lap-complete-message">Você bateu!</div>`;
            html += `<div class="lap-time-display">${TimeUtils.formatTime(lapTime)}</div>`;
            html += `<div class="continue-instruction">Pressione espaço para tentar novamente</div>`;
        } else {
            html += `<div class="best-lap-indicator">🏆 NOVO RECORDE PESSOAL! 🏆</div>`;
            html += `<div class="lap-complete-message">VOLTA COMPLETA</div>`;
            html += `<div class="lap-time-display">${TimeUtils.formatTime(lapTime)}</div>`;
            html += `<div class="continue-instruction">Pressione espaço para continuar</div>`;
        }
        content.innerHTML = html;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible'; // Garante visibilidade quando mostra
    }
    
    showOverlay(type, lapTime) {
        console.log('showOverlay called with type:', type);
        const overlay = document.getElementById('gameOverlay');
        const content = document.getElementById('overlayContent');
        let html = '';
        if (type === 'crash') {
            html += `<div class="lap-complete-message">Você bateu!</div>`;
            html += `<div class="lap-time-display">${TimeUtils.formatTime(lapTime)}</div>`;
            html += `<div class="continue-instruction">Pressione espaço para tentar novamente</div>`;
        } else if (type === 'bestlap') {
            html += `<div class="best-lap-indicator">🏆 NOVO RECORDE PESSOAL! 🏆</div>`;
            html += `<div class="lap-complete-message">VOLTA COMPLETA</div>`;
            html += `<div class="lap-time-display">${TimeUtils.formatTime(lapTime)}</div>`;
            html += `<div class="continue-instruction">Pressione espaço para continuar</div>`;
        }
        content.innerHTML = html;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible'; // Garante visibilidade quando mostra
    }
    
    showContinuousStats(lapCount, bestLap, lapTimes) {
        console.log('showContinuousStats called with lapCount:', lapCount);
        const overlay = document.getElementById('gameOverlay');
        const content = document.getElementById('overlayContent');
        
        let html = `<div class="continuous-stats">`;
        html += `<div class="stats-title">🏁 SESSÃO CONTÍNUA FINALIZADA</div>`;
        html += `<div class="stats-grid">`;
        html += `<div class="stat-item">`;
        html += `<div class="stat-label">VOLTAS COMPLETADAS</div>`;
        html += `<div class="stat-value">${lapCount}</div>`;
        html += `</div>`;
        
        if (bestLap > 0) {
            html += `<div class="stat-item">`;
            html += `<div class="stat-label">MELHOR VOLTA</div>`;
            html += `<div class="stat-value">${TimeUtils.formatTime(bestLap)}</div>`;
            html += `</div>`;
        }
        
        html += `</div>`;
        
        if (lapTimes && lapTimes.length > 0) {
            html += `<div class="recent-laps">`;
            html += `<div class="recent-laps-title">ÚLTIMAS VOLTAS:</div>`;
            const recentLaps = lapTimes.slice(-10).reverse();
            recentLaps.forEach((time, index) => {
                html += `<div class="recent-lap">${recentLaps.length - index}. ${TimeUtils.formatTime(time)}</div>`;
            });
            html += `</div>`;
        }
        
        html += `<div class="continue-instruction">Pressione espaço para reiniciar</div>`;
        html += `</div>`;
        
        content.innerHTML = html;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
    }
    hideOverlay() {
        console.log('hideOverlay called');
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.style.visibility = 'hidden'; // Adiciona mais uma camada de ocultação
            console.log('Game overlay hidden');
        }
    }
    
    getGameMode() {
        return this.gameMode || 'classic';
    }
    
    startGame() {
        console.log('startGame called');
        console.log('Player name:', this.elements.playerName.value);
        
        if (!this.elements.playerName.value.trim()) {
            console.log('No player name, showing message');
            this.elements.playerName.focus();
            this.showMessage('Digite seu nome para começar!');
            return;
        }
        
        console.log('Starting game...');
        
        // Esconde qualquer overlay que possa estar visível
        this.hideOverlay();
        this.hideLapComplete();
        
        // Configure lap count visibility and reset
        this.updateLapCountVisibility();
        this.lapCount = 0;
        if (this.elements.lapCount) {
            this.elements.lapCount.textContent = this.lapCount;
        }
        
        this.gameState = 'playing';
        this.elements.gameContainer.classList.add('playing');
        
        // Trigger game start event
        if (window.game && window.game.start) {
            window.game.start();
        }
        
        // Set car color based on current team selection
        if (window.game && window.game.car) {
            const selectedTeam = this.selectedTeam || this.elements.teamSelect.value;
            window.game.car.updateTeamColor(selectedTeam);
        }
    }
    
    stopGame() {
        console.log('stopGame called - stopping continuous mode');
        
        if (this.gameState === 'playing') {
            // Show final stats for continuous mode
            this.showContinuousGameComplete();
            
            // Stop the game
            this.gameState = 'menu';
            this.elements.gameContainer.classList.remove('playing');
            
            if (window.game) {
                window.game.isRunning = false;
                window.game.isPaused = false;
            }
        }
    }
    
    showContinuousGameComplete() {
        const overlay = document.getElementById('gameOverlay');
        const content = document.getElementById('overlayContent');
        
        let html = '';
        html += `<div class="lap-complete-message">JOGO FINALIZADO</div>`;
        if (this.lapCount > 0) {
            html += `<div class="lap-time-display">Voltas completadas: ${this.lapCount}</div>`;
        }
        if (this.bestTime) {
            html += `<div class="continue-instruction">Melhor tempo: ${TimeUtils.formatTimeShort(this.bestTime)}</div>`;
        }
        html += `<div class="continue-instruction">Pressione espaço para jogar novamente</div>`;
        
        content.innerHTML = html;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
    }
    
    updateTimer(milliseconds) {
        this.currentTime = milliseconds;
        this.updateLapDisplay(); // Usa updateLapDisplay em vez de atualizar diretamente
    }
    
    resetTimer() {
        this.currentTime = 0;
        this.updateLapDisplay();
    }
    
    onLapCompleted(lapTime) {
        this.lapTimes.push(lapTime);
        this.previousTime = lapTime;
        this.lastCompletedLapTime = lapTime; // Armazena o tempo da volta completada
        
        // Check if it's a new best time
        const isBestLap = !this.bestTime || lapTime < this.bestTime;
        
        // Update best time
        if (isBestLap) {
            this.bestTime = lapTime;
            this.saveBestTime();
            
            // Show message only in continuous mode
            if (this.getGameMode() === 'continuous') {
                this.showMessage('Novo recorde pessoal!', 'success');
            }
        }
        
        this.updateLapDisplay();
        this.updateSparkline();
        
        // Save lap times
        this.saveLapTimes();
        
        // Handle mode-specific behavior
        const gameMode = this.getGameMode();
        if (gameMode === 'classic') {
            // Show lap complete overlay and pause game
            this.showLapComplete(lapTime, isBestLap);
            
            // Pause the game
            if (window.game && window.game.pauseForLapComplete) {
                window.game.pauseForLapComplete();
            }
        } else if (gameMode === 'continuous') {
            // Increment lap count in continuous mode
            this.lapCount++;
            if (this.elements.lapCount) {
                this.elements.lapCount.textContent = this.lapCount;
                // Sincronizar com elemento lateral
                if (this.elements.lapCountSide) {
                    this.elements.lapCountSide.textContent = this.lapCount;
                }
            }
        }
    }
    
    updateLapDisplay() {
        if (this.bestTime) {
            this.elements.bestLap.textContent = TimeUtils.formatTimeShort(this.bestTime);
            // Sincronizar com elemento lateral
            if (this.elements.bestLapSide) {
                this.elements.bestLapSide.textContent = TimeUtils.formatTimeShort(this.bestTime);
            }
        }
        
        // Se não está correndo e temos um tempo de volta completada, mostra ele
        // Senão mostra o tempo atual
        if (this.elements.lapTimer) {
            let timeToShow;
            if (!window.game || !window.game.isRunning || window.game.isWaitingForContinue) {
                // Mostra o último tempo da volta quando parado/esperando
                if (this.lastCompletedLapTime !== null) {
                    timeToShow = TimeUtils.formatTimeShort(this.lastCompletedLapTime);
                } else {
                    timeToShow = TimeUtils.formatTimeShort(this.currentTime);
                }
            } else {
                // Mostra o tempo atual quando correndo
                timeToShow = TimeUtils.formatTimeShort(this.currentTime);
            }
            
            this.elements.lapTimer.textContent = timeToShow;
            // Sincronizar com elemento lateral
            if (this.elements.lapTimerSide) {
                this.elements.lapTimerSide.textContent = timeToShow;
            }
        }
        
        // Sincronizar contador de voltas
        if (this.elements.lapCount && this.elements.lapCountSide) {
            this.elements.lapCountSide.textContent = this.elements.lapCount.textContent;
        }
        
        // Sincronizar visibilidade do box de voltas
        if (this.elements.lapCountBox && this.elements.lapCountBoxSide) {
            this.elements.lapCountBoxSide.style.display = this.elements.lapCountBox.style.display;
        }
    }
    
    updateSparkline() {
        if (!this.elements.sparkline) return;
        const lapTimes = this.lapTimes.slice(-5); // Apenas últimas 5 voltas
        
        // Limpa o sparkline
        this.elements.sparkline.innerHTML = '';
        
        if (lapTimes.length === 0) {
            // Preenche com barras vazias
            for (let i = 0; i < 5; i++) {
                const bar = document.createElement('div');
                bar.className = 'sparkline-bar empty';
                bar.style.height = '4px';
                this.elements.sparkline.appendChild(bar);
            }
            return;
        }
        
        // Calcula altura baseada no tempo (mais rápido = mais alto)
        const bestTime = Math.min(...this.lapTimes); // Melhor tempo de todas as voltas
        const worstDisplayTime = Math.max(...lapTimes); // Pior tempo das últimas 5
        const timeRange = worstDisplayTime - bestTime;
        
        lapTimes.forEach((time, index) => {
            const bar = document.createElement('div');
            bar.className = 'sparkline-bar';
            
            // Calcula altura: melhor tempo = altura máxima (26px), outros proporcionais
            let height;
            if (timeRange === 0 || time === bestTime) {
                height = 26; // Altura máxima para melhor tempo
            } else {
                // Quanto melhor o tempo, mais alta a barra
                const ratio = (worstDisplayTime - time) / timeRange;
                height = Math.max(4, Math.floor(6 + ratio * 20)); // Min 4px, max 26px
            }
            
            bar.style.height = height + 'px';
            
            // Aplica cores baseadas na lógica da F1
            const absoluteIndex = this.lapTimes.length - lapTimes.length + index;
            
            if (absoluteIndex === 0 && this.lapTimes.length === 1) {
                // Primeira volta ever - Verde
                bar.classList.add('first-lap');
            } else if (time === bestTime) {
                // Melhor tempo pessoal - Roxo
                bar.classList.add('personal-best');
            } else {
                // Tempo mais lento que o melhor - Amarelo
                bar.classList.add('slower');
            }
            
            this.elements.sparkline.appendChild(bar);
        });
        
        // Preenche espaços vazios se necessário
        while (this.elements.sparkline.children.length < 5) {
            const bar = document.createElement('div');
            bar.className = 'sparkline-bar empty';
            bar.style.height = '4px';
            this.elements.sparkline.appendChild(bar);
        }
        
        // Sincronizar com sparkline lateral
        if (this.elements.sparklineSide) {
            this.elements.sparklineSide.innerHTML = this.elements.sparkline.innerHTML;
        }
    }

    showMessage(text, type = 'info') {
        // Create temporary message element
        const message = document.createElement('div');
        message.className = `game-message ${type}`;
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 1rem;
            z-index: 1000;
            border: 2px solid ${type === 'success' ? '#00FF00' : '#FF0000'};
            animation: fadeInOut 2s ease-in-out;
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 2000);
    }
    
    resetGame() {
        console.log('resetGame called');
        
        // Esconde todos os overlays
        this.hideOverlay();
        this.hideLapComplete();
        
        this.gameState = 'menu';
        this.elements.gameContainer.classList.remove('playing');
        this.currentTime = 0;
        this.lastCompletedLapTime = null; // Reset do último tempo da volta
        this.updateTimer(0);
        if (window.game) {
            window.game.isRunning = false;
            window.game.isPaused = false;
            window.game.isWaitingForContinue = false;
        }
    }
    
    // Data persistence
    savePlayerData() {
        localStorage.setItem('hotlap_player_name', this.elements.playerName.value);
        localStorage.setItem('hotlap_team', this.elements.teamSelect.value);
        localStorage.setItem('hotlap_game_mode', this.elements.gameModeSelect.value);
    }
    
    saveBestTime() {
        if (this.bestTime) {
            localStorage.setItem('hotlap_best_time', this.bestTime.toString());
        }
    }
    
    saveLapTimes() {
        const recentTimes = this.lapTimes.slice(-20); // Keep last 20 times
        localStorage.setItem('hotlap_lap_times', JSON.stringify(recentTimes));
    }
    
    loadSavedData() {
        // Load best time
        const savedBestTime = localStorage.getItem('hotlap_best_time');
        if (savedBestTime) {
            this.bestTime = parseInt(savedBestTime);
        }
        
        // Load lap times
        const savedLapTimes = localStorage.getItem('hotlap_lap_times');
        if (savedLapTimes) {
            try {
                this.lapTimes = JSON.parse(savedLapTimes);
            } catch (e) {
                this.lapTimes = [];
            }
        }
        
        this.updateLapDisplay();
        this.updateSparkline();
    }
    
    // Get player info
    getPlayerInfo() {
        return {
            name: this.elements.playerName.value.trim() || 'Piloto Anônimo',
            team: this.elements.teamSelect.value,
            teamName: this.elements.teamSelect.options[this.elements.teamSelect.selectedIndex].text,
            gameMode: this.elements.gameModeSelect.value,
            gameModeName: this.elements.gameModeSelect.options[this.elements.gameModeSelect.selectedIndex].text
        };
    }
    
    // Update next track timer (placeholder)
    updateNextTrackTimer() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const timeUntilTomorrow = tomorrow - now;
        const hours = Math.floor(timeUntilTomorrow / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilTomorrow % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeUntilTomorrow % (1000 * 60)) / 1000);
        
        const nextTrackLabel = document.getElementById('next-track-label');
        if (nextTrackLabel) {
            nextTrackLabel.textContent = `Próxima pista em: ${hours}h ${minutes}m ${seconds}s`;
        }
    }
    
    // Update car color immediately when team is selected
    updateCarColor(teamValue) {
        // Update immediately if game exists
        if (window.game && window.game.car) {
            window.game.car.updateTeamColor(teamValue);
        }
        
        // Store the selected team to apply when game initializes
        this.selectedTeam = teamValue;
    }
}

// Add CSS for message animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
`;
document.head.appendChild(style);

