// Car physics and rendering module
class Car {
    constructor(canvas, track) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.track = track;
        
        // Position and movement - Configurações originais de referência
        this.x = track.startLine.x;
        this.y = track.startLine.y;
        this.angle = track.startLine.angle;
        this.speed = 0;
        this.maxSpeed = 1.8; // Velocidade original mais conservadora
        this.acceleration = 0.08; // Aceleração mais gradual
        this.deceleration = 0.04; // Desaceleração mais suave
        this.turnSpeed = 0.04; // Controle mais preciso das curvas
        
        // Physics
        this.velocity = { x: 0, y: 0 };
        this.friction = 0.95;
        this.offTrackFriction = 0.85;
        
        // Visual properties
        this.width = 18;
        this.height = 10;
        this.color = '#FF0000';
        
        // Input state
        this.input = {
            left: false,
            right: false
        };
        
        // Lap tracking
        this.previousPosition = { x: this.x, y: this.y };
        this.currentLapStartTime = null;
        this.lapCompleted = false;
        
        // Directional validation for anti-cheat
        this.lastExitSide = null; // 'left' or 'right' - tracks which side we last exited from
        this.correctTrackDirection = null; // Track direction established from first valid lap
        this.establishedCrossingPattern = null; // Store the expected crossing pattern
        this.lapCount = 0; // Track number of completed laps
        
        // Reset protection to prevent immediate movement after reset
        this.justReset = false;
    }
    
    update(deltaTime) {
        // Otimização: deltaTime já foi limitado no gameLoop para evitar stuttering
        
        // Normalize deltaTime to 60 FPS standard (16.67ms per frame)
        // This ensures consistent speed across different devices and frame rates
        const TARGET_FRAME_TIME = 16.67; // 60 FPS target
        const timeMultiplier = deltaTime / TARGET_FRAME_TIME;
        
        this.previousPosition.x = this.x;
        this.previousPosition.y = this.y;
        
        // Handle input
        if (this.input.left) {
            this.angle -= this.turnSpeed * (this.speed / this.maxSpeed) * timeMultiplier;
        }
        if (this.input.right) {
            this.angle += this.turnSpeed * (this.speed / this.maxSpeed) * timeMultiplier;
        }
        
        // Automatic acceleration (like the original game)
        // But only if not just reset
        if (!this.justReset) {
            this.speed += this.acceleration * timeMultiplier;
            if (this.speed > this.maxSpeed) {
                this.speed = this.maxSpeed;
            }
        } else {
            // Clear the reset flag after a short delay to allow movement again
            // BUT only if the game is not waiting for user input
            setTimeout(() => {
                // Check if game is waiting for continue before clearing justReset
                const isWaitingForInput = window.game && (window.game.isWaitingForContinue || window.game.isPaused);
                if (!isWaitingForInput) {
                    console.log(`⏰ Car: Limpando justReset flag após delay - permitindo aceleração automática novamente`);
                    this.justReset = false;
                } else {
                    console.log(`⏰ Car: NÃO limpando justReset - jogo aguardando input do usuário`);
                }
            }, 100);
        }
        
        // Convert angle to velocity
        // Calculate new position
        const newX = this.x + Math.cos(this.angle) * this.speed * timeMultiplier;
        const newY = this.y + Math.sin(this.angle) * this.speed * timeMultiplier;
        
        // Check if movement is allowed
        const gameMode = window.game?.ui?.getGameMode ? window.game.ui.getGameMode() : 'classic';
        const tolerance = gameMode === 'continuous' ? 8 : 0; // Match the blue line tolerance
        
        // In continuous mode, check if new position is within blue boundaries
        if (gameMode === 'continuous') {
            const canMove = this.track.isOnTrack(newX, newY, tolerance);
            if (canMove) {
                // Movement allowed - update position
                this.x = newX;
                this.y = newY;
                this.velocity.x = Math.cos(this.angle) * this.speed * timeMultiplier;
                this.velocity.y = Math.sin(this.angle) * this.speed * timeMultiplier;
            } else {
                // Movement blocked by blue boundaries - don't update position
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        } else {
            // Classic mode - normal movement
            this.x = newX;
            this.y = newY;
            this.velocity.x = Math.cos(this.angle) * this.speed * timeMultiplier;
            this.velocity.y = Math.sin(this.angle) * this.speed * timeMultiplier;
        }
        
        // Check if on track and apply friction  
        const onTrack = this.track.isOnTrack(this.x, this.y, tolerance);
        
        // In continuous mode, check if car is in the blue tolerance zone
        if (gameMode === 'continuous') {
            const onOriginalTrack = this.track.isOnTrack(this.x, this.y, 0); // Check without tolerance
            const inToleranceZone = onTrack && !onOriginalTrack; // Within blue zone but not on original track
            
            if (inToleranceZone) {
                // Apply moderate friction penalty for tolerance zone
                // Much less aggressive than before - just like being "off track" but not blocking
                const frictionFactor = Math.pow(this.offTrackFriction, timeMultiplier);
                this.speed *= frictionFactor;
                this.velocity.x *= frictionFactor;
                this.velocity.y *= frictionFactor;
            } else if (onTrack) {
                // On original track - apply normal friction
                const frictionFactor = Math.pow(this.friction, timeMultiplier);
                this.speed *= frictionFactor;
                this.velocity.x *= frictionFactor;
                this.velocity.y *= frictionFactor;
            } else {
                // Shouldn't happen in continuous mode due to movement blocking
                const frictionFactor = Math.pow(this.offTrackFriction, timeMultiplier);
                this.speed *= frictionFactor;
                this.velocity.x *= frictionFactor;
                this.velocity.y *= frictionFactor;
            }
        } else {
            // Classic mode - original logic
            if (!onTrack) {
                // Off track - reduce speed significantly
                const frictionFactor = Math.pow(this.offTrackFriction, timeMultiplier);
                this.speed *= frictionFactor;
                this.velocity.x *= frictionFactor;
                this.velocity.y *= frictionFactor;
            } else {
                // On track - normal friction
                const frictionFactor = Math.pow(this.friction, timeMultiplier);
                this.speed *= frictionFactor;
                this.velocity.x *= frictionFactor;
                this.velocity.y *= frictionFactor;
            }
        }
        
        // Keep car within canvas bounds
        this.x = Math.max(this.width/2, Math.min(this.canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(this.canvas.height - this.height/2, this.y));
        
        // Monitor significant position changes (performance debugging)
        const positionChange = Math.hypot(this.x - this.previousPosition.x, this.y - this.previousPosition.y);
        if (positionChange > 100 * this.maxSpeed * 1.5 && deltaTime > 0) {
            console.warn(`[Car] Large position change detected: ${positionChange.toFixed(2)} units (deltaTime: ${limitedDeltaTime.toFixed(2)}ms)`);
        }
        
        // Check for lap completion
        this.checkLapCompletion();
    }
    
    checkLapCompletion() {
        const crossingInfo = this.track.checkStartLineCrossing(
            this.previousPosition.x, this.previousPosition.y,
            this.x, this.y
        );

        if (crossingInfo && crossingInfo.crossed) {
            console.log('🔍 Car: Line crossed', crossingInfo);
            
            if (this.currentLapStartTime !== null) {
                // Check if enough time has passed and direction is valid
                const currentTime = Date.now();
                const timeSinceStart = currentTime - this.currentLapStartTime;
                
                console.log(`🔍 Car: Lap in progress - Time: ${timeSinceStart}ms | From: ${crossingInfo.fromSide} → To: ${crossingInfo.toSide} | LastExit: ${this.lastExitSide} | ValidDirection: ${crossingInfo.validDirection}`);
                
                // ANTI-CHEAT VALIDATION: More sophisticated direction checking
                let isCheatAttempt = false;
                let cheatReason = '';
                
                // Check if car direction matches track direction (using arrows)
                const isDirectionCorrect = this.track.isCarDirectionCorrect(this.x, this.y, this.angle);
                if (!isDirectionCorrect) {
                    isCheatAttempt = true;
                    cheatReason = 'Wrong direction (against track arrows)';
                    console.log('❌ Car: Wrong direction detected - car is going against track arrows');
                }
                
                // After first lap, establish the expected crossing pattern
                if (this.lapCount === 0) {
                    // First lap - establish the pattern
                    this.establishedCrossingPattern = `${crossingInfo.fromSide}->${crossingInfo.toSide}`;
                    console.log(`📝 Car: Established crossing pattern: ${this.establishedCrossingPattern}`);
                } else {
                    // Subsequent laps - validate against established pattern
                    const currentPattern = `${crossingInfo.fromSide}->${crossingInfo.toSide}`;
                    
                    if (currentPattern !== this.establishedCrossingPattern) {
                        console.log(`🚨 Car: WRONG DIRECTION DETECTED!`);
                        console.log(`  - Expected pattern: ${this.establishedCrossingPattern}`);
                        console.log(`  - Current pattern: ${currentPattern}`);
                        console.log(`  - This indicates player is going the wrong way!`);
                        isCheatAttempt = true;
                        cheatReason = 'wrong-direction';
                    }
                }
                
                // Additional shortcut detection based on time
                if (this.lastExitSide && crossingInfo.toSide === this.lastExitSide && timeSinceStart < 5000) {
                    console.log(`🚨 Car: POTENTIAL SHORTCUT DETECTED!`);
                    console.log(`  - Last exit was to: ${this.lastExitSide}`);
                    console.log(`  - Now trying to return to same side: ${crossingInfo.toSide}`);
                    console.log(`  - Time since start: ${timeSinceStart}ms (minimum 5000ms for valid lap)`);
                    isCheatAttempt = true;
                    cheatReason = 'shortcut';
                }
                
                // For direction validation, we only care about crossing direction (validDirection from track)
                // Don't validate specific crossing patterns - just ensure proper track direction
                
                if (timeSinceStart > 3000 && crossingInfo.validDirection && !isCheatAttempt) {
                    // Valid lap completed - crossed from one side to the other AND not returning to same exit side
                    const lapTime = currentTime - this.currentLapStartTime;
                    this.lapCompleted = true;
                    
                    console.log(`🏁 Car: ✅ Valid lap completed in ${lapTime}ms`);
                    console.log(`🏁 Car: Tempo detalhado - currentTime=${currentTime}, currentLapStartTime=${this.currentLapStartTime}, diff=${lapTime}`);
                    console.log(`🏁 Car: Direction validation passed - crossed from ${crossingInfo.fromSide} to ${crossingInfo.toSide}`);
                    console.log(`🏁 Car: Anti-cheat validation passed - pattern matches: ${this.establishedCrossingPattern}`);
                    
                    // Increment lap count
                    this.lapCount++;
                    console.log(`� Car: Lap ${this.lapCount} completed`);
                    
                    // Update lastExitSide for the next lap - this should be the side we're going TO
                    this.lastExitSide = crossingInfo.toSide;
                    console.log(`📝 Car: Updated lastExitSide to: ${this.lastExitSide} for next lap`);
                    
                    // Trigger lap completion event
                    if (window.game && window.game.onLapCompleted) {
                        console.log(`🎮 Car: Chamando game.onLapCompleted com lapTime=${lapTime}ms`);
                        window.game.onLapCompleted(lapTime);
                    }
                    
                    // DON'T start new lap immediately - let the game handle it
                    // The game will call startLap() after handling the completion
                } else if (timeSinceStart <= 3000) {
                    console.log(`⏰ Car: ❌ Crossing too soon (${timeSinceStart}ms < 3000ms)`);
                } else if (!crossingInfo.validDirection) {
                    console.log(`🚫 Car: ❌ Invalid direction - going wrong way on track`);
                    
                    // Show error toast for wrong track direction  
                    if (window.game && window.game.ui && window.game.ui.showToast) {
                        window.game.ui.showToast('🚫 Volta Inválida: Direção incorreta!', 'error', 4000);
                    }
                } else if (isCheatAttempt) {
                    // CHEAT DETECTED - Show red overlay and end session
                    console.log(`🚫 Car: ❌ CHEAT DETECTED - ${cheatReason}`);
                    
                    // End the current session
                    if (window.game && window.game.endSession) {
                        window.game.endSession();
                    }
                    
                    // Show red overlay instead of toast
                    if (window.game && window.game.ui && window.game.ui.showOverlay) {
                        window.game.ui.showOverlay('cheat');
                    }
                    
                    // Reset the lap state
                    this.currentLapStartTime = null;
                    this.lapCompleted = false;
                }
            } else {
                // First time crossing - start lap
                console.log('🏁 Car: 🆕 Starting first lap');
                console.log(`🏁 Car: Initial crossing - From: ${crossingInfo.fromSide} → To: ${crossingInfo.toSide}`);
                this.currentLapStartTime = Date.now();
                this.lapCompleted = false;
                
                // Set initial exit side (but don't set direction yet - wait for first valid lap)
                this.lastExitSide = crossingInfo.toSide;
                console.log(`📝 Car: Set initial exit side: ${this.lastExitSide}`);
            }
        }
    }
    
    render() {
        this.ctx.save();
        
        // Move to car position
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.angle);
        
        // Draw car body
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Draw car outline
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Draw direction indicator (front of car)
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(this.width/2 - 1, -1, 2, 2);
        
        this.ctx.restore();
        
        // Debug: Draw position dot
        if (window.game && window.game.debug) {
            this.ctx.fillStyle = '#00FF00';
            this.ctx.beginPath();
            this.ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // Reset car to start position
    reset() {
        console.log(`🔄 Car reset: ANTES - X=${this.x.toFixed(2)}, Y=${this.y.toFixed(2)}, Speed=${this.speed.toFixed(3)}, Angle=${this.angle.toFixed(2)}`);
        
        this.x = this.track.startLine.x;
        this.y = this.track.startLine.y;
        this.angle = this.track.startLine.angle;
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
        this.currentLapStartTime = null;
        this.lapCompleted = false;
        this.justReset = true; // Prevent immediate acceleration
        
        console.log(`🔄 Car reset: DEPOIS - X=${this.x.toFixed(2)}, Y=${this.y.toFixed(2)}, Speed=${this.speed.toFixed(3)}, Angle=${this.angle.toFixed(2)}, justReset=${this.justReset}`);
    }
    
    // Reset only position (for continuous mode)
    resetPosition() {
        console.log(`🔄 Car resetPosition: ANTES - X=${this.x.toFixed(2)}, Y=${this.y.toFixed(2)}, Speed=${this.speed.toFixed(3)}, Angle=${this.angle.toFixed(2)}`);
        
        this.x = this.track.startLine.x;
        this.y = this.track.startLine.y;
        this.angle = this.track.startLine.angle;
        // Reset velocidade para zero no modo contínuo também
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
        
        console.log(`🔄 Car resetPosition: DEPOIS - X=${this.x.toFixed(2)}, Y=${this.y.toFixed(2)}, Speed=${this.speed.toFixed(3)}, Angle=${this.angle.toFixed(2)}`);
    }
    
    // Start a new lap
    startLap() {
        console.log(`🔄 Car: startLap() called - BEFORE: lastExitSide = ${this.lastExitSide}, trackDirection = ${this.correctTrackDirection}`);
        this.currentLapStartTime = Date.now();
        this.lapCompleted = false;
        // DON'T reset lastExitSide or correctTrackDirection - we need to remember for anti-cheat!
        console.log(`🔄 Car: startLap() - AFTER: lastExitSide = ${this.lastExitSide}, trackDirection = ${this.correctTrackDirection}`);
    }
    
    // Handle input
    setInput(left, right) {
        this.input.left = left;
        this.input.right = right;
    }
    
    // Get current speed as percentage
    getSpeedPercentage() {
        return (this.speed / this.maxSpeed) * 100;
    }
    
    // Check if car is moving
    isMoving() {
        return this.speed > 0.1;
    }
    
    // Update car color based on team selection
    updateTeamColor(teamValue) {
        const teamColors = {
            ferrari: '#E30907',        // Ferrari red (primary)
            redbull: '#1E41FF',        // Red Bull blue (primary)
            mercedes: '#000000',       // Mercedes black (primary)
            mclaren: '#FF8700',        // McLaren orange (primary)
            astonmartin: '#00FF80',    // Aston Martin green crystal (primary)
            alpine: '#FF69B4',         // Alpine pink (primary)
            williams: '#004080',       // Williams ocean blue (primary)
            rb: '#4169E1',             // RB royal blue (primary)
            sauber: '#228B22',         // Sauber/Stake green (primary)
            haas: '#000000'            // Haas black (primary)
        };
        
        this.color = teamColors[teamValue] || '#E30907';
    }
}

