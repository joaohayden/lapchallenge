// Main game module
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Otimizações de performance para suavidade
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Game objects
        this.track = null;
        this.car = null;
        this.ui = null;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = false; // For classic mode
        this.isCrashed = false; // Track if crashed
        this.isShowingContinuousStats = false; // Track if showing continuous mode stats
        this.isProcessingSpaceKey = false; // Prevent double processing of space key
        this.gameJustStarted = 0; // Timestamp when game was started to prevent immediate stop
        this.mode = 'classic'; // Current game mode
        this.debug = false;
        
        // Timing with performance optimizations
        this.lastTime = performance.now();
        this.deltaTime = 16.67; // Start with 60 FPS target
        this.gameStartTime = 0;
        this.frameCount = 0;
        this.lastFPSTime = performance.now(); // Initialize with current time
        this.currentFPS = 60; // Initialize with target FPS
        
        // Input handling
        this.keys = {};
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        this.initialize();
    }
    
    initialize() {
        // Initialize UI first
        this.ui = new UI();
        
        // Initialize game objects - use original Track class
        this.track = new Track(this.canvas);
        this.car = new Car(this.canvas, this.track);
        
        // Initialize share manager
        this.shareManager = new ShareManager(this);
        
        // Set up input handlers
        this.setupInputHandlers();
        
        // Set up resize handler
        this.setupResizeHandler();
        
        // Start continuous render loop
        this.startRenderLoop();
        
        // Make game globally accessible for UI callbacks
        window.game = this;
        
        console.log('speedlaps.run game initialized');
    }
    
    setupInputHandlers() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input field
            const activeElement = document.activeElement;
            const isTyping = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.tagName === 'SELECT' ||
                activeElement.contentEditable === 'true'
            );
            
            // Only handle game controls if not typing in input fields
            if (!isTyping) {
                this.keys[e.code] = true;
                
                // Prevent default for game keys only when not typing
                if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
                    e.preventDefault();
                }
                
                // Handle space key for different contexts
                if (e.code === 'Space') {
                    // Prevent double processing of the same space key event
                    if (this.isProcessingSpaceKey) {
                        return;
                    }
                    
                    // Set flag immediately to prevent any re-processing
                    this.isProcessingSpaceKey = true;
                    
                    // Add a small delay to prevent synchronous re-processing
                    setTimeout(() => {
                        if (this.isWaitingForContinue) {
                            // Check if it's a cheat overlay
                            if (this.ui && this.ui.currentOverlayType === 'cheat') {
                                // Cheat detected - reset the entire session
                                this.ui.hideOverlay();
                                this.isWaitingForContinue = false;
                                this.resetGame(); // Full reset for cheat
                            } else {
                                // Normal overlay handling
                                // Esconde overlay e continua
                                if (this.ui && typeof this.ui.hideOverlay === 'function') {
                                    this.ui.hideOverlay();
                                }
                                this.isWaitingForContinue = false;
                                
                                // Se estiver no estado de crash, reiniciar a volta
                                if (this.isCrashed) {
                                    this.isCrashed = false; // Reset flag
                                    this.restartAfterCrash();
                                } else {
                                    // Caso contrário, continuar para próxima volta
                                    this.continueFromLapComplete();
                                }
                            }
                        } else if (!this.isRunning) {
                            // Start game from menu (prioridade para iniciar o jogo)
                            this.ui.startGame();
                        } else if (this.isRunning && this.ui.getGameMode && this.ui.getGameMode() === 'continuous') {
                            // Check if game just started (prevent immediate stop within 500ms)
                            const timeSinceStart = Date.now() - this.gameJustStarted;
                            
                            if (timeSinceStart >= 500) {
                                // Stop continuous mode and show stats (só quando jogo já está rodando)
                                this.stopContinuousMode();
                            }
                        }
                        
                        // Reset flag after processing
                        setTimeout(() => {
                            this.isProcessingSpaceKey = false;
                        }, 50);
                    }, 10);
                }
                
                // Debug toggle
                if (e.code === 'KeyF1') {
                    this.debug = !this.debug;
                    console.log('Debug mode:', this.debug);
                }
                
                // Reset game
                if (e.code === 'KeyR' && this.isRunning) {
                    this.resetGame();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Touch input for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.touchStartX = touch.clientX - rect.left;
            this.touchStartY = touch.clientY - rect.top;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.isRunning) return;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            
            const deltaX = touchX - this.touchStartX;
            const threshold = 20;
            
            // Reset input
            this.car.setInput(false, false);
            
            if (deltaX < -threshold) {
                this.car.setInput(true, false); // Left
            } else if (deltaX > threshold) {
                this.car.setInput(false, true); // Right
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.isRunning) {
                this.car.setInput(false, false);
            }
        });
        
        // Mouse input (for desktop testing)
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.isRunning) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const centerX = this.canvas.width / 2;
            
            if (mouseX < centerX) {
                this.car.setInput(true, false); // Left
            } else {
                this.car.setInput(false, true); // Right
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isRunning) {
                this.car.setInput(false, false);
            }
        });
    }
    
    setupResizeHandler() {
        // Handler para mudanças de viewport
        const handleViewportChange = () => {
            this.resizeCanvas();
            // Forçar re-render após mudanças
            this.render();
        };
        
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange);
        window.addEventListener('orientationchange', handleViewportChange);
        
        // Detectar zoom usando visualViewport se disponível
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
        }
        
        // Initial setup
        this.resizeCanvas();
    }
    
    startRenderLoop() {
        // Continuous render loop to prevent canvas going blank
        const renderLoop = () => {
            // Sempre renderizar, mesmo quando o jogo não está rodando
            this.render();
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }
    
    resizeCanvas() {
        // Verificar se o canvas ainda existe
        if (!this.canvas || !this.canvas.parentElement) {
            return;
        }
        
        // Keep canvas responsive and fill container completely
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Verificar se as dimensões são válidas
        if (containerWidth <= 0 || containerHeight <= 0) {
            return;
        }
        
        // Make canvas fill the container completely
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // Manter dimensões internas fixas para consistência do jogo
        // O canvas sempre terá 400x300 internamente
        this.canvas.width = 400;
        this.canvas.height = 300;
        
        // Recriar contexto se necessário
        if (!this.ctx || this.ctx.canvas !== this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
        
        // Garantir que as configurações do contexto estejam corretas
        this.ctx.imageSmoothingEnabled = false;
    }
    
    start() {
        if (this.isRunning) return;
        
        // Update current mode
        this.mode = this.ui.getGameMode ? this.ui.getGameMode() : 'classic';
        
        this.isRunning = true;
        this.isPaused = false;
        this.gameStartTime = Date.now();
        this.gameJustStarted = Date.now(); // Mark when game started
        
        // Reset car
        this.car.reset();
        this.car.startLap();
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
        
        // Update UI timer
        this.updateTimer();
    }
    
    pauseForLapComplete() {
        console.log('Game: pauseForLapComplete() - Pausando o jogo para aguardar espaço');
        this.isWaitingForContinue = true;
        this.isPaused = true;
        this.isRunning = false; // Garantir que o jogo pare completamente
    }
    
    continueFromLapComplete() {
        console.log('Game: continueFromLapComplete() - Continuando após completar volta');
        if (this.isWaitingForContinue) {
            this.isWaitingForContinue = false;
            this.isPaused = false;
            
            // Verificar se estamos voltando das estatísticas contínuas
            if (this.isShowingContinuousStats) {
                console.log('Game: Saindo das estatísticas do modo contínuo');
                this.isShowingContinuousStats = false;
                
                // Para modo contínuo, reiniciar completamente o jogo
                this.resetGame();
                return;
            }
            
            // Verificar o modo de jogo para volta normal
            const gameMode = this.ui.getGameMode ? this.ui.getGameMode() : 'classic';
            console.log(`Game: Modo de jogo detectado: ${gameMode}`);
            
            // Log car state before reset
            console.log(`Game: Estado do carro antes do reset - Speed: ${this.car.speed}, X: ${this.car.x}, Y: ${this.car.y}`);
            
            if (gameMode === 'classic') {
                // No modo clássico, resetar completamente o carro (apenas uma vez aqui)
                console.log('Game: Resetando carro para modo clássico');
                this.car.reset();
                
                // Check if reset position is on track (sempre sem tolerância no reset)
                const isOnTrack = this.track.isOnTrack(this.car.x, this.car.y, 0);
                console.log(`Game: Posição após reset está na pista? ${isOnTrack} - X: ${this.car.x}, Y: ${this.car.y}`);
                
                this.car.startLap(); // Garantir que startLap seja chamado após reset
                
                // Add small delay before restarting to ensure car stays at rest
                setTimeout(() => {
                    // Clear justReset flag manually since we're ready to continue
                    console.log('Game: Limpando justReset flag manualmente - usuário pressionou espaço');
                    this.car.justReset = false;
                    this.isRunning = true; // Reiniciar o jogo após delay
                    console.log(`Game: Jogo reiniciado após delay - Speed: ${this.car.speed}`);
                }, 100);
            } else {
                // No modo contínuo, só resetar a posição mas manter a velocidade baixa
                console.log('Game: Resetando posição para modo contínuo');
                this.car.resetPosition();
                this.car.startLap(); // Garantir que startLap seja chamado
                this.isRunning = true; // Reiniciar o jogo
            }
            
            // Log car state after reset
            console.log(`Game: Estado do carro após reset - Speed: ${this.car.speed}, X: ${this.car.x}, Y: ${this.car.y}`);
            
            // Hide ambos overlays
            if (this.ui && typeof this.ui.hideLapComplete === 'function') {
                this.ui.hideLapComplete();
            }
            if (this.ui && typeof this.ui.hideOverlay === 'function') {
                this.ui.hideOverlay();
            }
            
            // Reset timer to prevent immediate crash detection
            this.gameJustStarted = Date.now();
            
            // Reiniciar gameLoop se necessário
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }
    
    restartAfterCrash() {
        console.log('Restarting after crash...');
        
        // Reset crash state
        this.isWaitingForContinue = false;
        this.isCrashed = false;
        this.isPaused = false;
        
        // Hide overlay
        if (this.ui && typeof this.ui.hideOverlay === 'function') {
            this.ui.hideOverlay();
        }
        
        // Reset car to start position
        this.car.reset();
        
        // Start game properly (same logic as start())
        this.isRunning = true;
        this.gameStartTime = Date.now();
        
        // Start car lap
        this.car.startLap();
        
        // Reset timer
        this.ui.resetTimer();
        
        // Start game loop
        this.gameLoop();
    }
    
    pause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastTime = performance.now();
        }
    }
    
    stopContinuousMode() {
        if (this.isRunning && this.ui.getGameMode && this.ui.getGameMode() === 'continuous') {
            this.isRunning = false;
            this.isPaused = false;
            
            // Marcar que estamos no estado de estatísticas contínuas
            this.isShowingContinuousStats = true;
            
            // Mostrar overlay com estatísticas do modo contínuo
            const stats = this.getStats();
            const lapCount = this.ui.lapCount || 0;
            const bestLap = this.ui.bestTime || 0;
            
            // Exibir overlay personalizado para modo contínuo
            if (this.ui && typeof this.ui.showContinuousStats === 'function') {
                this.ui.showContinuousStats(lapCount, bestLap, this.ui.lapTimes);
            } else if (this.ui && typeof this.ui.showOverlay === 'function') {
                // Fallback para overlay padrão
                this.ui.showOverlay('continuous-complete', { lapCount, bestLap });
            }
            
            this.isWaitingForContinue = true;
        }
    }
    
    resetGame() {
        console.log('Resetting game...');
        
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = false;
        this.isCrashed = false; // Reset crash flag
        
        // Reset car
        this.car.reset();
        
        // Hide lap complete overlay if visible
        this.ui.hideLapComplete();
        
        // Reset UI
        this.ui.resetGame();
        
        // Render static scene
        this.render();
    }
    
    endSession() {
        console.log('Ending session due to cheat detection...');
        
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = true; // Wait for user to restart
        this.isCrashed = false;
        
        // Stop the car but don't reset position yet
        this.car.speed = 0;
        this.car.velocity = { x: 0, y: 0 };
        
        // Don't reset lap count or stats yet - let user see the overlay first
        
        // Render static scene
        this.render();
    }
    
    gameLoop(currentTime = performance.now()) {
        // Sempre continuar o loop para poder renderizar, mas verificar states
        if (!this.isRunning && !this.isPaused) {
            // Se não está rodando e não está pausado, parar completamente
            return;
        }
        
        // Calculate delta time with better frame limiting
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Limit deltaTime to prevent stuttering and ensure smooth gameplay
        // Cap at 33ms (equivalent to 30 FPS minimum) to prevent big jumps
        this.deltaTime = Math.min(this.deltaTime, 33);

        // Só atualizar se não estiver pausado
        if (!this.isPaused && this.isRunning) {
            this.update(this.deltaTime);
        }

        this.render();

        // Continue loop apenas se estiver rodando ou pausado (para manter renderização)
        if (this.isRunning || this.isPaused) {
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
    
    update(deltaTime) {
        // Handle keyboard input
        const leftPressed = this.keys['ArrowLeft'] || this.keys['KeyA'];
        const rightPressed = this.keys['ArrowRight'] || this.keys['KeyD'];
        
        this.car.setInput(leftPressed, rightPressed);
        
        // Update car
        this.car.update(deltaTime);
        
        // Check for crash
        this.checkCrash();
        
        // Update timer
        this.updateTimer();
    }
    
    checkCrash() {
        if (this.isRunning && !this.isPaused && this.ui.getGameMode && this.ui.getGameMode() === 'classic') {
            // Add small delay after game start to prevent immediate crash after reset
            const timeSinceStart = Date.now() - this.gameJustStarted;
            if (timeSinceStart < 100) { // 100ms delay after reset
                return;
            }
            
            // No modo clássico, crash se sair da pista (sem tolerância)
            // No modo contínuo, não há crash, apenas redução de velocidade com tolerância
            if (!this.track.isOnTrack(this.car.x, this.car.y, 0)) {
                console.log(`Game: Crash detected at X: ${this.car.x}, Y: ${this.car.y}`);
                this.isRunning = false;
                this.isPaused = false;
                this.isCrashed = true; // Marcar que crashou
                // Mostra overlay fixo
                if (this.ui && typeof this.ui.showOverlay === 'function') {
                    this.ui.showOverlay('crash', this.ui.currentTime);
                    this.isWaitingForContinue = true;
                }
            }
        }
    }
    
    updateTimer() {
        if (this.isRunning && this.car.currentLapStartTime) {
            const currentTime = Date.now() - this.car.currentLapStartTime;
            this.ui.updateTimer(currentTime);
        }
    }
    
    render() {
        // Verificar se o contexto está válido
        if (!this.ctx || !this.canvas) {
            console.warn('Canvas context lost, attempting to restore...');
            this.resizeCanvas();
            return;
        }
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render track
        if (this.track) {
            this.track.render();
        }
        
        // Render car
        if (this.car) {
            this.car.render();
        }
        
        // Always show FPS counter for performance monitoring
        this.renderFPSCounter();
        
        // Debug rendering
        if (this.debug) {
            this.renderDebug();
        }
    }
    
    renderFPSCounter() {
        // FPS counter simples e sempre visível
        const instantFPS = Math.round(1000 / this.deltaTime);
        
        // Background para legibilidade
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width - 100, 5, 95, 25);
        
        // Color coding: Green (60+), Yellow (45-59), Red (<45)
        let color = '#00FF00'; // Green
        if (instantFPS < 60) color = '#FFFF00'; // Yellow  
        if (instantFPS < 45) color = '#FF0000'; // Red
        
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(`FPS: ${instantFPS}`, this.canvas.width - 95, 20);
        
        // Performance indicator
        const performance = instantFPS >= 60 ? '🟢' : instantFPS >= 45 ? '🟡' : '🔴';
        this.ctx.fillText(performance, this.canvas.width - 30, 20);
    }
    
    renderDebug() {
        // Debug info
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Speed: ${this.car.speed.toFixed(2)}`, 10, 20);
        this.ctx.fillText(`Angle: ${(this.car.angle * 180 / Math.PI).toFixed(1)}°`, 10, 35);
        this.ctx.fillText(`Position: ${this.car.x.toFixed(1)}, ${this.car.y.toFixed(1)}`, 10, 50);
        const gameMode = this.ui.getGameMode ? this.ui.getGameMode() : 'classic';
        const tolerance = gameMode === 'continuous' ? 3 : 0;
        this.ctx.fillText(`On Track: ${this.track.isOnTrack(this.car.x, this.car.y, tolerance)}`, 10, 65);
        
        // Show FPS
        const fps = Math.round(1000 / this.deltaTime);
        this.ctx.fillText(`FPS: ${fps}`, 10, 80);
    }
    
    // Callback for lap completion
    onLapCompleted(lapTime) {
        console.log(`Lap completed in ${TimeUtils.formatTime(lapTime)}`);
        
        // Check if we're in classic mode
        const gameMode = this.ui.getGameMode ? this.ui.getGameMode() : 'classic';
        console.log(`Game: onLapCompleted - Modo: ${gameMode}`);
        
        if (gameMode === 'classic') {
            // In classic mode, just pause - don't reset car here (will be reset in continueFromLapComplete)
            console.log('Game: Pausando para aguardar input do usuário no modo clássico');
            this.pauseForLapComplete();
        } else {
            // In continuous mode, automatically start a new lap
            console.log('Game: Modo contínuo - iniciando nova volta automaticamente');
            this.car.startLap();
        }
        
        this.ui.onLapCompleted(lapTime);
    }
    
    // Get game statistics
    getStats() {
        return {
            bestTime: this.ui.bestTime,
            lapTimes: this.ui.lapTimes,
            currentTime: this.ui.currentTime,
            playerInfo: this.ui.getPlayerInfo()
        };
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // Update next track timer every second
    setInterval(() => {
        if (game.ui) {
            game.ui.updateNextTrackTimer();
        }
    }, 1000);
    
    console.log('speedlaps.run loaded successfully!');
});
