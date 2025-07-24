// Main game module
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game objects
        this.track = null;
        this.car = null;
        this.ui = null;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = false; // For classic mode
        this.debug = false;
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameStartTime = 0;
        this.currentLapStartTime = 0;
        
        // Input handling
        this.keys = {};
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        this.initialize();
    }
    
    initialize() {
        // Initialize UI first
        this.ui = new UI();
        
        // Initialize game objects
        this.track = new Track(this.canvas);
        this.car = new Car(this.canvas, this.track);
        
        // Initialize share manager
        this.shareManager = new ShareManager(this);
        
        // Set up input handlers
        this.setupInputHandlers();
        
        // Set up resize handler
        this.setupResizeHandler();
        
        // Initial render
        this.render();
        
        // Make game globally accessible for UI callbacks
        window.game = this;
        
        console.log('HotLap Daily game initialized');
    }
    
    setupInputHandlers() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input field
            const activeElement = document.activeElement;
            const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');
            
            // Only handle game controls if not typing in input fields
            if (!isTyping) {
                this.keys[e.code] = true;
                
                // Prevent default for game keys only when not typing
                if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
                    e.preventDefault();
                }
                
                // Handle space key for different contexts
                if (e.code === 'Space') {
                    if (this.isWaitingForContinue) {
                        // Esconde overlay e continua
                        if (this.ui && typeof this.ui.hideOverlay === 'function') {
                            this.ui.hideOverlay();
                        }
                        this.isWaitingForContinue = false;
                        this.continueFromLapComplete();
                    } else if (!this.isRunning && this.ui.gameState === 'menu') {
                        // Start game from menu
                        this.ui.startGame();
                    }
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
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        this.resizeCanvas();
    }
    
    resizeCanvas() {
        // Keep canvas responsive and fill container completely
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Make canvas fill the container completely
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // Update canvas internal dimensions to match container
        // Maintain original aspect ratio for game logic
        const maxWidth = Math.min(containerWidth, 400);
        const aspectRatio = 300 / 400; // Original canvas ratio
        
        // Set internal canvas dimensions
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * aspectRatio;
    }
    
    start() {
        if (this.isRunning) return;
        
        console.log('Starting game...');
        
        this.isRunning = true;
        this.isPaused = false;
        this.gameStartTime = Date.now();
        this.currentLapStartTime = Date.now();
        
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
        this.isWaitingForContinue = true;
        this.isPaused = true;
    }
    
    continueFromLapComplete() {
        if (this.isWaitingForContinue) {
            this.isWaitingForContinue = false;
            this.isPaused = false;
            
            // Reset car to start position for next lap
            this.car.reset();
            
            // Hide ambos overlays
            if (this.ui && typeof this.ui.hideLapComplete === 'function') {
                this.ui.hideLapComplete();
            }
            if (this.ui && typeof this.ui.hideOverlay === 'function') {
                this.ui.hideOverlay();
            }
            
            // Start new lap
            this.car.startLap();
        }
    }
    
    pause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastTime = performance.now();
        }
    }
    
    resetGame() {
        console.log('Resetting game...');
        
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = false;
        
        // Reset car
        this.car.reset();
        
        // Hide lap complete overlay if visible
        this.ui.hideLapComplete();
        
        // Reset UI
        this.ui.resetGame();
        
        // Render static scene
        this.render();
    }
    
    gameLoop(currentTime = performance.now()) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            this.update(this.deltaTime);
        }
        
        this.render();
        
        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
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
            if (!this.track.isOnTrack(this.car.x, this.car.y)) {
                this.isRunning = false;
                this.isPaused = false;
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
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render track
        this.track.render();
        
        // Render car
        this.car.render();
        
        // Debug rendering
        if (this.debug) {
            this.renderDebug();
        }
    }
    
    renderDebug() {
        // Debug info
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Speed: ${this.car.speed.toFixed(2)}`, 10, 20);
        this.ctx.fillText(`Angle: ${(this.car.angle * 180 / Math.PI).toFixed(1)}°`, 10, 35);
        this.ctx.fillText(`Position: ${this.car.x.toFixed(1)}, ${this.car.y.toFixed(1)}`, 10, 50);
        this.ctx.fillText(`On Track: ${this.track.isOnTrack(this.car.x, this.car.y)}`, 10, 65);
        
        // Show FPS
        const fps = Math.round(1000 / this.deltaTime);
        this.ctx.fillText(`FPS: ${fps}`, 10, 80);
    }
    
    // Callback for lap completion
    onLapCompleted(lapTime) {
        console.log(`Lap completed in ${TimeUtils.formatTime(lapTime)}`);
        
        // Check if we're in classic mode
        const gameMode = this.ui.getGameMode ? this.ui.getGameMode() : 'classic';
        
        if (gameMode === 'classic') {
            // In classic mode, reset car to start position
            this.car.reset();
            this.pauseForLapComplete();
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
    
    console.log('HotLap Daily loaded successfully!');
});

