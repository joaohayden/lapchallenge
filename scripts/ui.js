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
            lapTimer: document.getElementById('lap-timer-side'),
            bestLap: document.getElementById('best-lap-timer-side'),
            lapCount: document.getElementById('lap-count-side'),
            lapCountBox: document.getElementById('lap-count-box-side'),
            // Elementos da coluna lateral para layout 3 colunas
            lapTimerSide: document.getElementById('lap-timer-side'),
            bestLapSide: document.getElementById('best-lap-timer-side'),
            lapCountSide: document.getElementById('lap-count-side'),
            lapCountBoxSide: document.getElementById('lap-count-box-side'),
            sparklineSide: document.getElementById('sparkline-side'),
            gameContainer: document.querySelector('.game-container'),
            sparkline: document.getElementById('sparkline-side'),
        };
        
        this.gameState = 'menu'; // 'menu', 'playing', 'paused'
        this.currentTime = 0;
        this.lastCompletedLapTime = null; // Para manter o último tempo da volta
        this.lapTimes = [];
        this.bestTimeClassic = null; // Melhor tempo no modo clássico
        this.bestTimeContinuous = null; // Melhor tempo no modo contínuo
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
                console.log('DEBUG: Space pressed in ui.js');
                console.log('  gameState:', this.gameState);
                console.log('  window.game exists:', !!window.game);
                console.log('  window.game.isRunning:', window.game?.isRunning);
                console.log('  window.game.isWaitingForContinue:', window.game?.isWaitingForContinue);
                
                // Só processa se for caso específico do UI
                if (window.game && window.game.isWaitingForContinue) {
                    console.log('  UI processing: waiting for continue');
                    e.preventDefault();
                    e.stopPropagation();
                    // Clear visual elements when continuing
                    this.stopTimerBlinking();
                    this.hideToast();
                    // Continue from lap complete in classic mode
                    window.game.continueFromLapComplete();
                    return;
                }
                
                // Se o jogo existe e está configurado, deixa ele processar
                if (window.game && typeof window.game.startGame === 'function') {
                    console.log('  UI ignoring - game will handle');
                    return; // NÃO previne default - deixa game processar
                }
                
                // Só processa no UI se não há jogo disponível
                if (this.gameState === 'menu') {
                    console.log('  UI processing: no game available, starting from UI');
                    e.preventDefault();
                    e.stopPropagation();
                    this.startGame();
                    return;
                }
                
                console.log('  UI ignoring - unknown state');
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
            this.updateLapDisplay(); // Atualiza o display para mostrar o novo modo
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
        this.updateLapCountVisibility(); // Garante visibilidade inicial correta
        
        // CORREÇÃO: Forçar atualização do display após carregar o gameMode
        // Isso garante que o melhor tempo apareça corretamente no modo contínuo
        console.log('🔄 Forçando atualização após carregar gameMode:', this.gameMode);
        this.updateLapDisplay();
        
        // Set initial car color and visual style when page loads
        setTimeout(() => {
            if (window.game && window.game.car) {
                window.game.car.updateTeamColor(this.elements.teamSelect.value);
            }
            // Apply initial team visual style
            this.updateTeamSelectStyle(this.elements.teamSelect.value);
        }, 100);
    }
    
    toggleGameMode() {
        const wasPlaying = this.gameState === 'playing';
        
        this.gameMode = this.gameMode === 'classic' ? 'continuous' : 'classic';
        this.elements.gameModeSelect.value = this.gameMode;
        this.updateModeDescription();
        this.updateGameModeDisplay();
        this.updateLapCountVisibility();
        this.updateLapDisplay(); // Atualiza o display para mostrar o novo modo
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
        const isVisible = this.gameMode === 'continuous';
        
        if (this.elements.lapCountBox) {
            this.elements.lapCountBox.style.display = isVisible ? 'block' : 'none';
        }
        
        // Sincronizar com elemento lateral para layout 3 colunas
        if (this.elements.lapCountBoxSide) {
            this.elements.lapCountBoxSide.style.display = isVisible ? 'block' : 'none';
        }
        
        console.log('Lap count visibility updated:', { 
            gameMode: this.gameMode, 
            isVisible, 
            lapCountBox: this.elements.lapCountBox?.style.display,
            lapCountBoxSide: this.elements.lapCountBoxSide?.style.display 
        });
    }
    
    updateModeDescription() {
        const mode = this.gameMode;
        const descriptions = {
            classic: 'Faça uma volta rápida e no menor tempo possível - Pequena margem de tolerância permitida',
            continuous: 'Sem parar! Bater nos limites da pista reduz sua velocidade - resista o máximo que puder'
        };
        this.elements.modeDescription.textContent = descriptions[mode] || descriptions.classic;
    }

    setupMobileControls() {
        const leftControl = document.getElementById('leftControl');
        const rightControl = document.getElementById('rightControl');

        console.log('Setting up mobile controls:', { leftControl, rightControl });

        // Ajusta o tamanho dos controles baseado no botão "Pressione espaço"
        this.adjustControlSize();

        if (leftControl) {
            console.log('Adding listeners to left control');
            
            // Touch events for mobile - otimizados para responsividade
            leftControl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                leftControl.classList.add('active');
                this.simulateKeyPress('ArrowLeft', true);
            }, { passive: false });
            
            leftControl.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                leftControl.classList.remove('active');
                this.simulateKeyPress('ArrowLeft', false);
            }, { passive: false });
            
            // Prevenir contexto menu e outros eventos que podem causar delay
            leftControl.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                leftControl.classList.remove('active');
                this.simulateKeyPress('ArrowLeft', false);
            }, { passive: false });
            
            leftControl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
            
            // Mouse events for desktop testing
            leftControl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                leftControl.classList.add('active');
                this.simulateKeyPress('ArrowLeft', true);
            });
            leftControl.addEventListener('mouseup', (e) => {
                e.preventDefault();
                leftControl.classList.remove('active');
                this.simulateKeyPress('ArrowLeft', false);
            });
            leftControl.addEventListener('mouseleave', (e) => {
                leftControl.classList.remove('active');
                this.simulateKeyPress('ArrowLeft', false);
            });
        } else {
            console.log('Left control not found!');
        }

        if (rightControl) {
            console.log('Adding listeners to right control');
            
            // Touch events for mobile - otimizados para responsividade
            rightControl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                rightControl.classList.add('active');
                this.simulateKeyPress('ArrowRight', true);
            }, { passive: false });
            
            rightControl.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                rightControl.classList.remove('active');
                this.simulateKeyPress('ArrowRight', false);
            }, { passive: false });
            
            // Prevenir contexto menu e outros eventos que podem causar delay
            rightControl.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                rightControl.classList.remove('active');
                this.simulateKeyPress('ArrowRight', false);
            }, { passive: false });
            
            rightControl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
            
            // Mouse events for desktop testing
            rightControl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                rightControl.classList.add('active');
                this.simulateKeyPress('ArrowRight', true);
            });
            rightControl.addEventListener('mouseup', (e) => {
                e.preventDefault();
                rightControl.classList.remove('active');
                this.simulateKeyPress('ArrowRight', false);
            });
            rightControl.addEventListener('mouseleave', (e) => {
                rightControl.classList.remove('active');
                this.simulateKeyPress('ArrowRight', false);
            });
        } else {
            console.log('Right control not found!');
        }
    }

    adjustControlSize() {
        // Mede o botão "Pressione espaço" e considera o gap entre os controles
        const startButton = this.elements.startButton;
        if (startButton) {
            setTimeout(() => {
                const buttonWidth = startButton.offsetWidth;
                
                // Obter o gap entre os controles do CSS (normalmente 10px)
                const leftControl = document.getElementById('leftControl');
                const rightControl = document.getElementById('rightControl');
                
                if (leftControl && rightControl) {
                    // Calcular o gap atual entre os controles
                    const containerStyle = window.getComputedStyle(leftControl.parentElement);
                    const gap = parseFloat(containerStyle.gap) || 10; // fallback para 10px se gap não estiver definido
                    
                    // Largura de cada controle = (largura total - gap) / 2
                    const controlWidth = Math.floor((buttonWidth - gap) / 2);
                    
                    console.log(`Botão "Pressione espaço": ${buttonWidth}px, Gap: ${gap}px, Controles: ${controlWidth}px cada`);
                    
                    // Aplica a largura aos controles
                    leftControl.style.width = controlWidth + 'px';
                    rightControl.style.width = controlWidth + 'px';
                }
            }, 100); // Aguarda o DOM carregar completamente
        }
    }

    simulateKeyPress(key, isPressed) {
        if (!window.game) return;

        // Input direto no sistema de keys do game - mais rápido
        if (key === 'ArrowLeft') {
            window.game.keys.ArrowLeft = isPressed;
            window.game.keys.KeyA = isPressed; // Backup para tecla A
        } else if (key === 'ArrowRight') {
            window.game.keys.ArrowRight = isPressed;
            window.game.keys.KeyD = isPressed; // Backup para tecla D
        }
        
        // Input direto no carro se disponível (bypass do delay)
        if (window.game.car && window.game.isRunning) {
            if (key === 'ArrowLeft') {
                window.game.car.setInput(isPressed, window.game.keys.ArrowRight || window.game.keys.KeyD);
            } else if (key === 'ArrowRight') {
                window.game.car.setInput(window.game.keys.ArrowLeft || window.game.keys.KeyA, isPressed);
            }
        }
    }
    
    showOverlay(type, lapTime) {
        console.log(`📺 UI: showOverlay chamado - type=${type}, lapTime=${lapTime}ms (${TimeUtils.formatTime(lapTime)})`);
        const overlay = document.getElementById('gameOverlay');
        const content = document.getElementById('overlayContent');
        let html = '';
        
        // Store the overlay type for later reference
        this.currentOverlayType = type;
        
        if (type === 'crash') {
            html += `<div class="overlay-header">`;
            html += `<i class="overlay-icon">💥</i>`;
            html += `<h2 class="overlay-title">CRASH!</h2>`;
            html += `</div>`;
            html += `<div class="overlay-body">`;
            html += `<div class="overlay-message">Você bateu nos limites da pista!</div>`;
            html += `<div class="overlay-time">${TimeUtils.formatTimeShort(lapTime)}</div>`;
            html += `<div class="overlay-subtitle">Tempo parcial</div>`;
            html += `</div>`;
            html += `<div class="overlay-footer">`;
            html += `<div class="overlay-instruction">Pressione <kbd>ESPAÇO</kbd> para tentar novamente</div>`;
            html += `</div>`;
        } else if (type === 'bestlap') {
            html += `<div class="overlay-header">`;
            html += `<i class="overlay-icon">🏆</i>`;
            html += `<h2 class="overlay-title">NOVO RECORDE!</h2>`;
            html += `</div>`;
            html += `<div class="overlay-body">`;
            html += `<div class="overlay-message">Volta completa - Melhor tempo pessoal!</div>`;
            html += `<div class="overlay-time">${TimeUtils.formatTimeShort(lapTime)}</div>`;
            html += `<div class="overlay-subtitle">Recorde estabelecido</div>`;
            html += `</div>`;
            html += `<div class="overlay-footer">`;
            html += `<div class="overlay-instruction">Pressione <kbd>ESPAÇO</kbd> para continuar</div>`;
            html += `</div>`;
        } else if (type === 'complete') {
            html += `<div class="overlay-header">`;
            html += `<i class="overlay-icon">🏁</i>`;
            html += `<h2 class="overlay-title">VOLTA COMPLETA!</h2>`;
            html += `</div>`;
            html += `<div class="overlay-body">`;
            html += `<div class="overlay-message">Parabéns! Volta finalizada com sucesso</div>`;
            html += `<div class="overlay-time">${TimeUtils.formatTimeShort(lapTime)}</div>`;
            html += `<div class="overlay-subtitle">Tempo da volta</div>`;
            html += `</div>`;
            html += `<div class="overlay-footer">`;
            html += `<div class="overlay-instruction">Pressione <kbd>ESPAÇO</kbd> para continuar</div>`;
            html += `</div>`;
        } else if (type === 'cheat') {
            html += `<div class="overlay-header overlay-header-red">`;
            html += `<i class="overlay-icon">🚫</i>`;
            html += `<h2 class="overlay-title">DIREÇÃO INCORRETA!</h2>`;
            html += `</div>`;
            html += `<div class="overlay-body">`;
            html += `<div class="overlay-message">Você está indo na direção errada!</div>`;
            html += `<div class="overlay-submessage">Siga as setas verdes da pista</div>`;
            html += `</div>`;
            html += `<div class="overlay-footer">`;
            html += `<div class="overlay-instruction">Pressione <kbd>ESPAÇO</kbd> para reiniciar a sessão</div>`;
            html += `</div>`;
        }
        
        content.innerHTML = html;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
        
        // Adiciona animação de entrada
        setTimeout(() => {
            content.style.transform = 'scale(1)';
            content.style.opacity = '1';
        }, 10);
    }
    
    showContinuousStats(lapCount, bestLap, lapTimes) {
        console.log('showContinuousStats called with lapCount:', lapCount);
        const overlay = document.getElementById('gameOverlay');
        const content = document.getElementById('overlayContent');
        
        let html = `<div class="overlay-header">`;
        html += `<i class="overlay-icon">🏁</i>`;
        html += `<h2 class="overlay-title">SESSÃO FINALIZADA</h2>`;
        html += `</div>`;
        
        html += `<div class="overlay-body">`;
        html += `<div class="overlay-message">Modo Contínuo - Estatísticas da sessão</div>`;
        
        html += `<div class="stats-grid">`;
        html += `<div class="stat-item">`;
        html += `<div class="stat-value">${lapCount}</div>`;
        html += `<div class="stat-label">VOLTAS COMPLETADAS</div>`;
        html += `</div>`;
        
        if (bestLap > 0) {
            html += `<div class="stat-item">`;
            html += `<div class="stat-value">${TimeUtils.formatTimeShort(bestLap)}</div>`;
            html += `<div class="stat-label">MELHOR VOLTA</div>`;
            html += `</div>`;
        }
        html += `</div>`;
        
        if (lapTimes && lapTimes.length > 0) {
            html += `<div class="recent-laps">`;
            html += `<div class="recent-laps-title">ÚLTIMAS VOLTAS:</div>`;
            const recentLaps = lapTimes.slice(-5).reverse(); // Mostra apenas as 5 últimas
            recentLaps.forEach((time, index) => {
                html += `<div class="recent-lap">${recentLaps.length - index}. ${TimeUtils.formatTimeShort(time)}</div>`;
            });
            html += `</div>`;
        }
        
        html += `</div>`;
        
        html += `<div class="overlay-footer">`;
        html += `<div class="overlay-instruction">Pressione <kbd>ESPAÇO</kbd> para reiniciar</div>`;
        html += `</div>`;
        
        content.innerHTML = html;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
        
        // Adiciona animação de entrada
        setTimeout(() => {
            content.style.transform = 'scale(1)';
            content.style.opacity = '1';
        }, 10);
    }
    
    hideOverlay() {
        console.log('hideOverlay called');
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.style.visibility = 'hidden'; // Adiciona mais uma camada de ocultação
            console.log('Game overlay hidden');
        }
        
        // Clear the overlay type
        this.currentOverlayType = null;
    }
    
    getGameMode() {
        return this.gameMode || 'classic';
    }
    
    getCurrentBestTime() {
        const bestTime = this.gameMode === 'classic' ? this.bestTimeClassic : this.bestTimeContinuous;
        console.log(`🔍 getCurrentBestTime() - gameMode: ${this.gameMode}, bestTimeClassic: ${this.bestTimeClassic}, bestTimeContinuous: ${this.bestTimeContinuous}, returning: ${bestTime}`);
        return bestTime;
    }
    
    setCurrentBestTime(time) {
        if (this.gameMode === 'classic') {
            this.bestTimeClassic = time;
        } else {
            this.bestTimeContinuous = time;
        }
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
        
        // Para o piscar amarelo do timer se estiver ativo
        this.stopTimerBlinking();
        
        // Esconde o toast se estiver visível
        this.hideToast();
        
        // CORREÇÃO: Forçar atualização do display para garantir que o melhor tempo apareça corretamente
        console.log('🔄 Forçando atualização do display antes de iniciar - gameMode:', this.gameMode);
        console.log('🏆 Melhor tempo contínuo atual:', this.bestTimeContinuous);
        this.updateLapDisplay();
        
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
        const currentBest = this.getCurrentBestTime();
        if (currentBest) {
            html += `<div class="continue-instruction">Melhor tempo: ${TimeUtils.formatTimeShort(currentBest)}</div>`;
        }
        html += `<div class="continue-instruction">Pressione espaço para jogar novamente</div>`;
        
        content.innerHTML = html;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
    }
    
    updateTimer(milliseconds) {
        // Log apenas se estivermos em um overlay para evitar spam
        if (this.overlayVisible) {
            console.log(`⏰ UI: updateTimer chamado com ${milliseconds}ms (${TimeUtils.formatTime(milliseconds)}) - overlayVisible=${this.overlayVisible}`);
        }
        this.currentTime = milliseconds;
        this.updateLapDisplay(); // Usa updateLapDisplay em vez de atualizar diretamente
    }
    
    resetTimer() {
        this.currentTime = 0;
        this.updateLapDisplay();
    }
    
    onLapCompleted(lapTime) {
        console.log(`🎯 UI: onLapCompleted recebido com lapTime=${lapTime}ms (${TimeUtils.formatTime(lapTime)})`);
        
        this.lapTimes.push(lapTime);
        this.previousTime = lapTime;
        this.lastCompletedLapTime = lapTime; // Armazena o tempo da volta completada
        
        console.log(`🎯 UI: Tempos armazenados - lapTimes.length=${this.lapTimes.length}, previousTime=${this.previousTime}, lastCompletedLapTime=${this.lastCompletedLapTime}`);
        
        // Check if it's a new best time for current mode
        const currentBest = this.getCurrentBestTime();
        const isBestLap = !currentBest || lapTime < currentBest;
        
        console.log(`🎯 UI: Best time check - currentBest=${currentBest}, isBestLap=${isBestLap}`);
        
        // Update best time for current mode
        if (isBestLap) {
            console.log(`🏆 UI: Novo recorde! Atualizando de ${currentBest} para ${lapTime}`);
            this.setCurrentBestTime(lapTime);
            this.saveBestTimes();
            
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
            if (isBestLap) {
                // Determinar tipo de recorde
                const isFirstTimeEver = !this.lapTimes || this.lapTimes.length === 1;
                const isPreviousBestBreaten = this.bestTimeClassic && lapTime < this.bestTimeClassic;
                
                if (isFirstTimeEver) {
                    // Primeiro tempo da pista - verde
                    this.showToast(`🎯 PRIMEIRO TEMPO DA PISTA! ${TimeUtils.formatTimeShort(lapTime)} - Pressione ESPAÇO para tentar bater`, 'success', -1);
                } else {
                    // Novo recorde batido - roxo (F1 style)
                    this.showToast(`🏆 NOVO RECORDE BATIDO! ${TimeUtils.formatTimeShort(lapTime)} - Pressione ESPAÇO para tentar bater novamente`, 'purple', -1);
                }
                
                // Start green blinking animation on timer for record
                this.startTimerBlinking('green');
                // Ensure game waits for user input even for records
                if (window.game) {
                    window.game.isWaitingForContinue = true;
                    window.game.isPaused = true; // Actually pause for records too
                    window.game.isRunning = false; // Stop the game completely
                }
            } else {
                // Verificar se é uma melhoria pessoal (mas não recorde absoluto)
                const sessionTimes = this.lapTimes || [];
                const previousPersonalBest = sessionTimes.length > 1 ? Math.min(...sessionTimes.slice(0, -1)) : null;
                
                if (previousPersonalBest && lapTime < previousPersonalBest) {
                    // Melhoria pessoal - amarelo com sparkles
                    this.showToast(`✨ TEMPO MELHORADO! ${TimeUtils.formatTimeShort(lapTime)} - Pressione ESPAÇO para continuar`, 'warning', -1);
                } else {
                    // Tempo normal - mensagem padrão
                    this.showToast('Pressione ESPAÇO para tentar um menor tempo', 'info', -1);
                }
                
                // Start yellow blinking animation on timer
                this.startTimerBlinking('yellow');
                // Set flag for game to know it's waiting for continue
                if (window.game) {
                    window.game.isWaitingForContinue = true;
                    window.game.isPaused = false; // Don't actually pause, just wait for input
                }
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
        const currentBest = this.getCurrentBestTime();
        
        // Atualiza o label do card para indicar o modo atual
        const bestLapLabel = document.querySelector('.top-time-box:nth-child(2) .top-time-label');
        if (bestLapLabel) {
            const modeText = this.gameMode === 'classic' ? 'Clássico' : 'Contínuo';
            bestLapLabel.textContent = `Melhor Volta (${modeText})`;
        }
        
        // Sincroniza com elemento lateral
        const bestLapLabelSide = document.querySelector('.best-lap-side .top-time-label');
        if (bestLapLabelSide) {
            const modeText = this.gameMode === 'classic' ? 'Clássico' : 'Contínuo';
            bestLapLabelSide.textContent = `Melhor Volta (${modeText})`;
        }
        
        if (currentBest) {
            this.elements.bestLap.textContent = TimeUtils.formatTimeShort(currentBest);
            // Sincronizar com elemento lateral
            if (this.elements.bestLapSide) {
                this.elements.bestLapSide.textContent = TimeUtils.formatTimeShort(currentBest);
            }
        } else {
            // Se não há melhor tempo para o modo atual, mostra --:---
            this.elements.bestLap.textContent = '--:---';
            if (this.elements.bestLapSide) {
                this.elements.bestLapSide.textContent = '--:---';
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
                // Para o piscar se estiver correndo
                this.stopTimerBlinking();
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
        
        // ALGORITMO MELHORADO: Cálculo proporcional mais inteligente
        const bestTimeEver = Math.min(...this.lapTimes); // Melhor tempo de todas as voltas
        const worstInView = Math.max(...lapTimes); // Pior tempo das últimas 5 visíveis
        const bestInView = Math.min(...lapTimes); // Melhor tempo das últimas 5 visíveis
        
        // Parâmetros de altura
        const minHeight = 6;  // Altura mínima (tempos piores)
        const maxHeight = 28; // Altura máxima (tempos melhores)
        const baseHeight = 16; // Altura base para tempos medianos
        
        lapTimes.forEach((time, index) => {
            const bar = document.createElement('div');
            bar.className = 'sparkline-bar';
            
            let height;
            
            if (lapTimes.length === 1) {
                // Se só há 1 tempo, usar altura base
                height = baseHeight;
            } else {
                // Cálculo proporcional INVERTIDO (tempos menores = barras maiores)
                const viewRange = worstInView - bestInView;
                
                if (viewRange === 0) {
                    // Todos os tempos iguais
                    height = baseHeight;
                } else {
                    // Quanto MENOR o tempo, MAIOR a barra
                    const ratio = (worstInView - time) / viewRange;
                    height = Math.round(minHeight + ratio * (maxHeight - minHeight));
                    
                    // Garantir limites
                    height = Math.max(minHeight, Math.min(maxHeight, height));
                }
                
                // Boost especial para record pessoal absoluto
                if (time === bestTimeEver) {
                    height = Math.max(height, maxHeight - 2); // Quase altura máxima para recordes
                }
            }
            
            bar.style.height = height + 'px';
            
            // Aplica cores baseadas na lógica da F1
            const absoluteIndex = this.lapTimes.length - lapTimes.length + index;
            
            if (absoluteIndex === 0 && this.lapTimes.length === 1) {
                // Primeira volta ever - Verde
                bar.classList.add('first-lap');
                bar.title = `Primeira volta: ${TimeUtils.formatTimeShort(time)}`;
            } else if (time === bestTimeEver) {
                // Melhor tempo pessoal absoluto - Roxo
                bar.classList.add('personal-best');
                bar.title = `Recorde pessoal: ${TimeUtils.formatTimeShort(time)}`;
            } else if (time === bestInView && time !== bestTimeEver) {
                // Melhor da sessão atual, mas não recorde - Verde claro
                bar.classList.add('first-lap');
                bar.title = `Melhor desta sessão: ${TimeUtils.formatTimeShort(time)}`;
            } else {
                // Tempo mais lento - Amarelo
                bar.classList.add('slower');
                bar.title = `Volta ${absoluteIndex + 1}: ${TimeUtils.formatTimeShort(time)}`;
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
    
    showToast(text, type = 'info', duration = 3000) {
        // Remove any existing toast first
        const existingToast = document.querySelector('.game-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Define colors based on type
        let backgroundColor, borderColor, shadowColor, textColor;
        
        switch(type) {
            case 'error':
            case 'invalid':
                backgroundColor = 'rgba(220, 53, 69, 0.95)'; // Red
                borderColor = '#dc3545';
                shadowColor = 'rgba(220, 53, 69, 0.3)';
                textColor = '#fff';
                break;
            case 'purple':
            case 'record':
                backgroundColor = 'rgba(130, 70, 175, 0.95)'; // Purple (F1 style)
                borderColor = '#8246af';
                shadowColor = 'rgba(130, 70, 175, 0.3)';
                textColor = '#fff';
                break;
            case 'success':
            case 'personal':
                backgroundColor = 'rgba(40, 167, 69, 0.95)'; // Green (primeiro tempo da pista/dia)
                borderColor = '#28a745';
                shadowColor = 'rgba(40, 167, 69, 0.3)';
                textColor = '#fff';
                break;
            case 'warning':
            case 'improvement':
                backgroundColor = 'rgba(255, 193, 7, 0.95)'; // Yellow (menor que melhor tempo atual)
                borderColor = '#ffc107';
                shadowColor = 'rgba(255, 193, 7, 0.3)';
                textColor = '#333';
                break;
            case 'info':
            default:
                backgroundColor = 'rgba(108, 117, 125, 0.95)'; // Gray
                borderColor = '#6c757d';
                shadowColor = 'rgba(108, 117, 125, 0.3)';
                textColor = '#fff';
                break;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `game-toast ${type}`;
        toast.textContent = text;
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${backgroundColor};
            color: ${textColor};
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 1001;
            border: 2px solid ${borderColor};
            box-shadow: 0 4px 12px ${shadowColor};
            animation: toastSlideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Only auto-remove if duration is provided and not permanent (-1)
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'toastSlideOut 0.3s ease';
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                }
            }, duration);
        }
    }
    
    hideToast() {
        const toast = document.querySelector('.game-toast');
        if (toast) {
            toast.style.animation = 'toastSlideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }
    
    startTimerBlinking(color = 'yellow') {
        // Add blinking class to timer elements
        const blinkClass = color === 'green' ? 'timer-blink-green' : 'timer-blink-yellow';
        
        if (this.elements.lapTimer) {
            this.elements.lapTimer.classList.add(blinkClass);
        }
        if (this.elements.lapTimerSide) {
            this.elements.lapTimerSide.classList.add(blinkClass);
        }
    }
    
    stopTimerBlinking() {
        // Remove all blinking classes from timer elements
        if (this.elements.lapTimer) {
            this.elements.lapTimer.classList.remove('timer-blink-yellow', 'timer-blink-green');
        }
        if (this.elements.lapTimerSide) {
            this.elements.lapTimerSide.classList.remove('timer-blink-yellow', 'timer-blink-green');
        }
    }
    
    resetGame() {
        console.log('resetGame called');
        
        // Esconde todos os overlays
        this.hideOverlay();
        
        // Para o piscar amarelo do timer
        this.stopTimerBlinking();
        
        // Esconde o toast se estiver visível
        this.hideToast();
        
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
    
    saveBestTimes() {
        if (this.bestTimeClassic) {
            localStorage.setItem('hotlap_best_time_classic', this.bestTimeClassic.toString());
        }
        if (this.bestTimeContinuous) {
            localStorage.setItem('hotlap_best_time_continuous', this.bestTimeContinuous.toString());
        }
    }
    
    saveLapTimes() {
        const recentTimes = this.lapTimes.slice(-20); // Keep last 20 times
        localStorage.setItem('hotlap_lap_times', JSON.stringify(recentTimes));
    }
    
    loadSavedData() {
        // Load best times for both modes
        const savedBestTimeClassic = localStorage.getItem('hotlap_best_time_classic');
        if (savedBestTimeClassic) {
            this.bestTimeClassic = parseInt(savedBestTimeClassic);
            console.log('📁 Loaded classic best time:', this.bestTimeClassic);
        }
        
        const savedBestTimeContinuous = localStorage.getItem('hotlap_best_time_continuous');
        if (savedBestTimeContinuous) {
            this.bestTimeContinuous = parseInt(savedBestTimeContinuous);
            console.log('📁 Loaded continuous best time:', this.bestTimeContinuous);
        }
        
        // Migrate old best time to classic mode if exists
        const oldBestTime = localStorage.getItem('hotlap_best_time');
        if (oldBestTime && !this.bestTimeClassic) {
            this.bestTimeClassic = parseInt(oldBestTime);
            this.saveBestTimes();
            localStorage.removeItem('hotlap_best_time'); // Remove old key
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
        
        // CORREÇÃO: Debug e atualização forçada
        console.log('🔧 FINAL loadSavedData() - gameMode:', this.gameMode, 'bestTimeClassic:', this.bestTimeClassic, 'bestTimeContinuous:', this.bestTimeContinuous);
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
            nextTrackLabel.innerHTML = `próxima pista em: <strong>${hours}h ${minutes}m ${seconds}s</strong>`;
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
        
        // Apply visual styling to the select element
        this.updateTeamSelectStyle(teamValue);
    }
    
    // Apply team colors to the select element
    updateTeamSelectStyle(teamValue) {
        if (!this.elements.teamSelect) return;
        
        // Remove all existing team classes
        const teamClasses = ['ferrari', 'redbull', 'mercedes', 'mclaren', 'astonmartin', 'alpine', 'williams', 'rb', 'sauber', 'haas'];
        teamClasses.forEach(team => {
            this.elements.teamSelect.classList.remove(team);
        });
        
        // Add the new team class
        if (teamValue) {
            this.elements.teamSelect.classList.add(teamValue);
        }
    }
}

// Add CSS for message animation if not already added
if (!document.querySelector('#ui-animations-css')) {
    const style = document.createElement('style');
    style.id = 'ui-animations-css';
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
}
