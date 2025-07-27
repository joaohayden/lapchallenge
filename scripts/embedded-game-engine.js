// Embedded Game Engine - Reusable game engine for track visualization
// Based on the main game engine but simplified for embedded use

class EmbeddedGameEngine {
    constructor(canvas, trackPoints) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.trackPoints = trackPoints;
        
        // Game state - Same as game-new.js
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = false;
        this.gameJustStarted = Date.now();
        this.gameLoop = null;
        this.lastTime = performance.now();
        this.deltaTime = 16.67;
        
        // Use continuous mode for embedded visualizer
        this.gameMode = 'continuous';
        
        // Initialize scale and game area
        this.scale = Math.min(this.canvas.width, this.canvas.height) / 400;
        this.gameWidth = 320 * this.scale;
        this.gameHeight = 280 * this.scale;
        this.canvasCenterX = this.canvas.width / 2;
        this.canvasCenterY = this.canvas.height / 2;
        this.gameAreaX = this.canvasCenterX - this.gameWidth / 2;
        this.gameAreaY = this.canvasCenterY - this.gameHeight / 2;
        
        // Car controller - Same as game-new.js
        this.carController = new EmbeddedCarController(this.scale);
        
        // Set global reference for car controller integration
        window.embeddedGameEngine = this;
        
        // Track and timing
        this.currentTime = 0;
        this.lapTimes = [];
        this.bestLap = null;
        this.lapCount = 0;
        
        // Car colors
        this.carColor = '#E30907'; // Ferrari red
        this.carSecondaryColor = '#FFD700'; // Ferrari yellow
        
        // Track bounds for collision detection
        this.leftBound = [];
        this.rightBound = [];
        
        // Initialize
        this.setupTrack();
        this.generateTrackBounds();
        this.bindInputs();
        this.resetCarPosition();
        
        // Initial render
        this.render();
    }
    
    setupTrack() {
        // Convert track points to canvas coordinates
        this.canvasTrackPoints = this.trackPoints.map(point => ({
            x: this.gameAreaX + point.x * this.gameWidth,
            y: this.gameAreaY + point.y * this.gameHeight
        }));
        
        // Set start line
        if (this.canvasTrackPoints.length > 1) {
            this.startLine = {
                x: this.canvasTrackPoints[0].x,
                y: this.canvasTrackPoints[0].y,
                angle: Math.atan2(
                    this.canvasTrackPoints[1].y - this.canvasTrackPoints[0].y,
                    this.canvasTrackPoints[1].x - this.canvasTrackPoints[0].x
                )
            };
        }
        
        this.trackWidth = 50 * this.scale;
    }
    
    generateTrackBounds() {
        this.leftBound = [];
        this.rightBound = [];
        
        const halfWidth = this.trackWidth / 2;
        
        for (let i = 0; i < this.canvasTrackPoints.length; i++) {
            const current = this.canvasTrackPoints[i];
            const next = this.canvasTrackPoints[(i + 1) % this.canvasTrackPoints.length];
            
            // Calculate perpendicular direction
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                const perpX = -dy / length;
                const perpY = dx / length;
                
                this.leftBound.push({
                    x: current.x + perpX * halfWidth,
                    y: current.y + perpY * halfWidth
                });
                
                this.rightBound.push({
                    x: current.x - perpX * halfWidth,
                    y: current.y - perpY * halfWidth
                });
            } else {
                this.leftBound.push({ x: current.x, y: current.y });
                this.rightBound.push({ x: current.x, y: current.y });
            }
        }
    }
    
    bindInputs() {
        // Focus canvas for input
        this.canvas.tabIndex = 1;
        this.canvas.focus();
        
        this.keyDownHandler = (e) => {
            if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            
            // Controls only work when game is running - Same as game-new.js
            if (this.isRunning) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.carController.setControls(true, false);
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.carController.setControls(false, true);
                }
            }
            
            // Space logic - Same as game-new.js
            if (e.code === 'Space') {
                if (this.isWaitingForContinue) {
                    this.isWaitingForContinue = false;
                    this.resetGame();
                } else if (!this.isRunning) {
                    // Start the game
                    this.startGame();
                } else {
                    // Reset during game
                    this.resetGame();
                }
            }
        };
        
        this.keyUpHandler = (e) => {
            if (this.isRunning) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.carController.setControls(false, this.carController.controls.right);
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.carController.setControls(this.carController.controls.left, false);
                }
            }
        };
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        
        // Click to focus
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
    }
    
    startGame() {
        if (this.isRunning) {
            console.log('🚫 Game already running, ignoring start request');
            return;
        }
        
        console.log('🎮 Starting embedded game...');
        
        // Reset car position BEFORE setting isRunning
        this.resetCarPosition();
        
        // IMPORTANT: ENSURE CONTROLS ARE CLEAN
        this.carController.setControls(false, false);
        
        // Set game state
        this.isRunning = true;
        this.isPaused = false;
        this.isWaitingForContinue = false;
        this.gameJustStarted = Date.now();
        
        // IMPORTANT: Ensure justReset is false when starting
        this.carController.justReset = false;
        this.carController.justResetClearedManually = true;
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame(() => this.update());
    }
    
    resetGame() {
        this.isRunning = false;
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        this.resetCarPosition();
        this.currentTime = 0;
        this.lapCount = 0;
        this.render();
    }
    
    resetCarPosition() {
        if (this.startLine) {
            this.carController.setPosition(this.startLine.x, this.startLine.y, this.startLine.angle);
        }
        this.currentTime = 0;
    }
    
    start() {
        // Compatibility method
        this.startGame();
    }
    
    stop() {
        this.isRunning = false;
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        // Clean up global reference
        if (window.embeddedGameEngine === this) {
            window.embeddedGameEngine = null;
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused && this.isRunning) {
            this.lastTime = performance.now();
            this.gameLoop = requestAnimationFrame(() => this.update());
        }
    }
    
    reset() {
        this.resetGame();
    }
    
    update() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = Math.min(currentTime - this.lastTime, 50); // Cap at 50ms
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            // Update car physics - Same as game-new.js
            this.carController.update();
            
            // Check collision with track bounds
            this.checkCollision();
            
            // Check lap completion
            this.checkCheckpoints();
            
            // Update timer
            this.currentTime += deltaTime;
        }
        
        this.render();
        
        if (this.isRunning) {
            this.gameLoop = requestAnimationFrame(() => this.update());
        }
    }
    
    checkCollision() {
        if (!this.isRunning || this.isPaused) return;
        
        const carX = this.carController.position.x;
        const carY = this.carController.position.y;
        
        // Adicionar pequeno delay após o reset para evitar crash imediato
        const timeSinceStart = Date.now() - (this.gameJustStarted || 0);
        if (timeSinceStart < 200) { // 200ms delay após reset
            return;
        }
        
        // Admin visualizer uses continuous mode rules
        // Check if car is in tolerance zone (blue zone) for speed reduction
        const tolerance = 8; // Blue zone tolerance like in continuous mode
        const onOriginalTrack = this.isOnTrack(carX, carY, 0);
        const onTrackWithTolerance = this.isOnTrack(carX, carY, tolerance);
        const inToleranceZone = onTrackWithTolerance && !onOriginalTrack;
        
        if (inToleranceZone) {
            // Apply speed reduction in blue zone (like in car.js original)
            const toleranceFriction = 0.88; // Moderate reduction
            this.carController.speed *= toleranceFriction;
        }
        
        // Only block movement if completely outside tolerance zone (no crash)
        if (!onTrackWithTolerance) {
            // Block movement but don't crash - just prevent going further
            this.carController.velocity.x = 0;
            this.carController.velocity.y = 0;
        }
    }
    
    checkCheckpoints() {
        if (!this.canvasTrackPoints || this.canvasTrackPoints.length === 0) return;
        
        // Simple lap detection - check if car is near start line
        const startPoint = this.canvasTrackPoints[0];
        const distance = Math.hypot(
            this.carController.position.x - startPoint.x, 
            this.carController.position.y - startPoint.y
        );
        
        // If close to start line and has been running for at least 5 seconds
        if (distance < 30 && this.currentTime > 5000) {
            // Completed a lap
            this.lapCount++;
            
            const lapTime = this.currentTime;
            this.lapTimes.push(lapTime);
            
            if (!this.bestLap || lapTime < this.bestLap) {
                this.bestLap = lapTime;
            }
            
            this.currentTime = 0; // Reset for next lap
        }
    }
    
    // Implementar a mesma lógica isOnTrack do game-new.js
    isOnTrack(x, y, tolerance = 0) {
        const distanceFromCenter = this.getDistanceFromCenterLine(x, y);
        const visualTrackRadius = this.trackWidth / 2;
        
        if (tolerance > 0) {
            return distanceFromCenter <= (visualTrackRadius + tolerance);
        } else {
            return distanceFromCenter <= visualTrackRadius;
        }
    }
    
    // Calcular distância mínima do ponto para a linha central da pista
    getDistanceFromCenterLine(x, y) {
        let minDistance = Infinity;
        
        for (let i = 0; i < this.canvasTrackPoints.length; i++) {
            const current = this.canvasTrackPoints[i];
            const next = this.canvasTrackPoints[(i + 1) % this.canvasTrackPoints.length];
            
            const dist = this.distanceToLineSegment(x, y, current.x, current.y, next.x, next.y);
            minDistance = Math.min(minDistance, dist);
        }
        
        return minDistance;
    }
    
    // Função auxiliar para calcular distância de ponto para linha
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            return Math.sqrt(A * A + B * B);
        }
        
        const param = dot / lenSq;
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render track - Same as game-new.js
        this.renderTrack();
        
        // Render car - Same as game-new.js
        this.renderCar();
        
        // Render UI overlays
        this.renderUI();
    }
    
    renderTrack() {
        if (!this.canvasTrackPoints || this.canvasTrackPoints.length < 2) return;
        
        // Draw track background (wide gray line) - Same as game-new.js
        this.ctx.strokeStyle = '#E5E5E5';
        this.ctx.lineWidth = this.trackWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasTrackPoints[0].x, this.canvasTrackPoints[0].y);
        for (let i = 1; i < this.canvasTrackPoints.length; i++) {
            this.ctx.lineTo(this.canvasTrackPoints[i].x, this.canvasTrackPoints[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw center line (dashed) - Same as game-new.js
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasTrackPoints[0].x, this.canvasTrackPoints[0].y);
        for (let i = 1; i < this.canvasTrackPoints.length; i++) {
            this.ctx.lineTo(this.canvasTrackPoints[i].x, this.canvasTrackPoints[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw direction arrows - Same as game-new.js
        this.drawDirectionArrows();
        
        // Draw start line - Same as reference project
        this.drawStartLine();
    }
    
    drawDirectionArrows() {
        const arrowSpacing = 6; // More arrows for better visibility
        const chevronSize = 8; // Bigger arrows
        
        this.ctx.strokeStyle = '#00FF00'; // Bright green
        this.ctx.lineWidth = 3; // Thicker
        this.ctx.lineCap = 'round';
        
        for (let i = 0; i < this.canvasTrackPoints.length; i += arrowSpacing) {
            const current = this.canvasTrackPoints[i];
            const next = this.canvasTrackPoints[(i + 1) % this.canvasTrackPoints.length];
            
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                const dirX = dx / length;
                const dirY = dy / length;
                const perpX = -dirY;
                const perpY = dirX;
                
                // Arrow chevron pointing in direction
                const centerX = current.x + dirX * (chevronSize * 2);
                const centerY = current.y + dirY * (chevronSize * 2);
                
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - dirX * chevronSize + perpX * chevronSize/2, 
                               centerY - dirY * chevronSize + perpY * chevronSize/2);
                this.ctx.lineTo(centerX + dirX * chevronSize, centerY + dirY * chevronSize);
                this.ctx.lineTo(centerX - dirX * chevronSize - perpX * chevronSize/2, 
                               centerY - dirY * chevronSize - perpY * chevronSize/2);
                this.ctx.stroke();
            }
        }
    }
    
    drawStartLine() {
        // Use EXACT same logic as reference project (beautified.js line 8877-8879)
        const start = this.canvasTrackPoints[0];
        
        const s = 40 * this.scale; // width of start line (same as reference)
        const y = 10 * this.scale; // height of start line (same as reference)
        
        // Draw checkered pattern - EXACT same logic as reference
        for (let e = 0; e < 8; e++) {
            for (let t = 0; t < 2; t++) {
                this.ctx.fillStyle = (e + t) % 2 == 0 ? "#1A1A1A" : "#FFFFFF";
                this.ctx.fillRect(
                    start.x - s / 2 + e * s / 8, 
                    start.y - y + t * y, 
                    s / 8, 
                    y
                );
            }
        }
    }
    
    renderCar() {
        const car = this.carController.position;
        
        this.ctx.save();
        this.ctx.translate(car.x, car.y);
        this.ctx.rotate(car.angle - Math.PI/2); // Rotate -90 degrees so front is correct
        
        // Car scale (adjust size based on original SVG 213x313)
        const carScale = 0.08; // Small scale to be proportional to game
        const carWidth = 213 * carScale;
        const carHeight = 313 * carScale;
        
        // Center the car
        this.ctx.translate(-carWidth/2, -carHeight/2);
        this.ctx.scale(carScale, carScale);
        
        // Draw car SVG with dynamic color
        this.drawCarSVG(this.carColor, this.carSecondaryColor);
        
        this.ctx.restore();
    }
    
    drawCarSVG(primaryColor, secondaryColor) {
        // Black base of car (first path)
        this.ctx.fillStyle = '#020202';
        this.ctx.beginPath();
        this.ctx.moveTo(33, 0);
        this.ctx.lineTo(181, 0);
        this.ctx.lineTo(181, 33);
        this.ctx.lineTo(163, 33);
        this.ctx.lineTo(163, 50);
        this.ctx.lineTo(131, 50);
        this.ctx.lineTo(131, 66);
        this.ctx.lineTo(164, 66);
        this.ctx.lineTo(164, 50);
        this.ctx.lineTo(213, 50);
        this.ctx.lineTo(213, 116);
        this.ctx.lineTo(164, 116);
        this.ctx.lineTo(164, 131);
        this.ctx.lineTo(180, 131);
        this.ctx.lineTo(180, 199);
        this.ctx.lineTo(164, 199);
        this.ctx.lineTo(164, 214);
        this.ctx.lineTo(213, 214);
        this.ctx.lineTo(213, 280);
        this.ctx.lineTo(180, 280);
        this.ctx.lineTo(180, 313);
        this.ctx.lineTo(33, 313);
        this.ctx.lineTo(33, 280);
        this.ctx.lineTo(0, 280);
        this.ctx.lineTo(0, 214);
        this.ctx.lineTo(50, 214);
        this.ctx.lineTo(50, 199);
        this.ctx.lineTo(33, 199);
        this.ctx.lineTo(33, 131);
        this.ctx.lineTo(50, 131);
        this.ctx.lineTo(50, 116);
        this.ctx.lineTo(0, 116);
        this.ctx.lineTo(0, 50);
        this.ctx.lineTo(50, 50);
        this.ctx.lineTo(50, 34);
        this.ctx.lineTo(33, 34);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Main car body (PRIMARY COLOR - where red #E30907 was)
        this.ctx.fillStyle = primaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(99, 50);
        this.ctx.lineTo(115, 50);
        this.ctx.lineTo(115, 82);
        this.ctx.lineTo(131, 82);
        this.ctx.lineTo(131, 115);
        this.ctx.lineTo(148, 115);
        this.ctx.lineTo(148, 132);
        this.ctx.lineTo(163, 132);
        this.ctx.lineTo(163, 198);
        this.ctx.lineTo(147, 198);
        this.ctx.lineTo(147, 215);
        this.ctx.lineTo(131, 215);
        this.ctx.lineTo(131, 264);
        this.ctx.lineTo(122, 264);
        this.ctx.lineTo(122, 296);
        this.ctx.lineTo(92, 296);
        this.ctx.lineTo(92, 264);
        this.ctx.lineTo(83, 264);
        this.ctx.lineTo(83, 215);
        this.ctx.lineTo(66, 215);
        this.ctx.lineTo(66, 198);
        this.ctx.lineTo(50, 198);
        this.ctx.lineTo(50, 132);
        this.ctx.lineTo(66, 132);
        this.ctx.lineTo(66, 115);
        this.ctx.lineTo(83, 115);
        this.ctx.lineTo(83, 82);
        this.ctx.lineTo(99, 82);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Secondary color details (where yellow #FFD700 was)
        this.ctx.fillStyle = secondaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(83, 66);
        this.ctx.lineTo(131, 66);
        this.ctx.lineTo(131, 82);
        this.ctx.lineTo(83, 82);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    renderUI() {
        // No UI overlays - clean embedded visualizer
    }
}

// Embedded Car Controller - Based on CarController from game-new.js
class EmbeddedCarController {
    constructor(scale) {
        this.controls = {
            left: false,
            right: false
        };
        this.position = {
            x: 0,
            y: 0,
            angle: 0
        };
        
        // Physics - Same as game-new.js
        this.speed = 0;
        this.maxSpeed = 2.2;
        this.acceleration = 0.10;
        this.deceleration = 0.045;
        this.turnSpeed = 0.05;
        this.friction = 0.95;
        
        // Protection against automatic movement
        this.justReset = false;
        this.justResetClearedManually = false;
        this.automaticCleanupScheduled = false;
        
        this.velocity = { x: 0, y: 0 };
        this.lastUpdateTime = performance.now();
    }
    
    setPosition(x, y, angle = 0) {
        this.position.x = x;
        this.position.y = y;
        this.position.angle = angle;
        
        // Reset velocity when repositioning
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
        this.justReset = true; // Prevent immediate acceleration
        this.justResetClearedManually = false;
        this.automaticCleanupScheduled = false;
        this.lastUpdateTime = performance.now();
    }
    
    setControls(left, right) {
        this.controls.left = left;
        this.controls.right = right;
    }
    
    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        const limitedDeltaTime = Math.min(deltaTime, 50); // Max 50ms
        const timeMultiplier = limitedDeltaTime / 16.67; // 16.67ms = 60fps
        
        // AUTOMATIC ACCELERATION - but only if not just reset
        if (!this.justReset) {
            if (this.speed < this.maxSpeed) {
                this.speed += this.acceleration * timeMultiplier;
                if (this.speed > this.maxSpeed) {
                    this.speed = this.maxSpeed;
                }
            }
        } else {
            // Clear automatically only if not cleared manually
            if (!this.justResetClearedManually && !this.automaticCleanupScheduled) {
                this.automaticCleanupScheduled = true;
                setTimeout(() => {
                    if (!this.justResetClearedManually) {
                        this.justReset = false;
                    }
                    this.automaticCleanupScheduled = false;
                }, 100);
            }
        }
        
        // Turning (only if moving)
        if (this.speed > 0.1) {
            if (this.controls.left) {
                this.position.angle -= this.turnSpeed * (this.speed / this.maxSpeed) * timeMultiplier;
            }
            if (this.controls.right) {
                this.position.angle += this.turnSpeed * (this.speed / this.maxSpeed) * timeMultiplier;
            }
        }
        
        // Convert angle to velocity
        this.velocity.x = Math.cos(this.position.angle) * this.speed * timeMultiplier;
        this.velocity.y = Math.sin(this.position.angle) * this.speed * timeMultiplier;
        
        // Update position with continuous mode rules
        const newX = this.position.x + this.velocity.x;
        const newY = this.position.y + this.velocity.y;
        
        // In continuous mode, check movement boundaries
        const tolerance = 8; // Same tolerance as continuous mode
        const canMove = this.isWithinToleranceZone(newX, newY, tolerance);
        
        if (canMove) {
            // Movement allowed - update position
            this.position.x = newX;
            this.position.y = newY;
        } else {
            // Movement blocked by tolerance boundaries - stop
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
    }
    
    // Helper function to check if position is within tolerance zone
    isWithinToleranceZone(x, y, tolerance) {
        // This will be called from the game engine that has the track data
        if (window.embeddedGameEngine) {
            return window.embeddedGameEngine.isOnTrack(x, y, tolerance);
        }
        return true; // Fallback - allow movement
    }
}
