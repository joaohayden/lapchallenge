// Car physics and rendering module
class Car {
    constructor(canvas, track) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.track = track;
        
        // Position and movement
        this.x = track.startLine.x;
        this.y = track.startLine.y;
        this.angle = track.startLine.angle;
        this.speed = 0;
        this.maxSpeed = 3;
        this.acceleration = 0.1;
        this.deceleration = 0.05;
        this.turnSpeed = 0.08;
        
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
        
        // Reset protection to prevent immediate movement after reset
        this.justReset = false;
    }
    
    update(deltaTime) {
        this.previousPosition.x = this.x;
        this.previousPosition.y = this.y;
        
        // Handle input
        if (this.input.left) {
            this.angle -= this.turnSpeed * (this.speed / this.maxSpeed);
        }
        if (this.input.right) {
            this.angle += this.turnSpeed * (this.speed / this.maxSpeed);
        }
        
        // Automatic acceleration (like the original game)
        // But only if not just reset
        if (!this.justReset) {
            this.speed += this.acceleration;
            if (this.speed > this.maxSpeed) {
                this.speed = this.maxSpeed;
            }
        } else {
            // Clear the reset flag after a short delay to allow movement again
            setTimeout(() => {
                this.justReset = false;
            }, 100);
        }
        
        // Convert angle to velocity
        // Calculate new position
        const newX = this.x + Math.cos(this.angle) * this.speed;
        const newY = this.y + Math.sin(this.angle) * this.speed;
        
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
                this.velocity.x = Math.cos(this.angle) * this.speed;
                this.velocity.y = Math.sin(this.angle) * this.speed;
            } else {
                // Movement blocked by blue boundaries - don't update position
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        } else {
            // Classic mode - normal movement
            this.x = newX;
            this.y = newY;
            this.velocity.x = Math.cos(this.angle) * this.speed;
            this.velocity.y = Math.sin(this.angle) * this.speed;
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
                this.speed *= this.offTrackFriction; // Use the same as normal off-track (0.85)
                this.velocity.x *= this.offTrackFriction;
                this.velocity.y *= this.offTrackFriction;
            } else if (onTrack) {
                // On original track - apply normal friction
                this.speed *= this.friction;
                this.velocity.x *= this.friction;
                this.velocity.y *= this.friction;
            } else {
                // Shouldn't happen in continuous mode due to movement blocking
                this.speed *= this.offTrackFriction;
                this.velocity.x *= this.offTrackFriction;
                this.velocity.y *= this.offTrackFriction;
            }
        } else {
            // Classic mode - original logic
            if (!onTrack) {
                // Off track - reduce speed significantly
                this.speed *= this.offTrackFriction;
                this.velocity.x *= this.offTrackFriction;
                this.velocity.y *= this.offTrackFriction;
            } else {
                // On track - normal friction
                this.speed *= this.friction;
                this.velocity.x *= this.friction;
                this.velocity.y *= this.friction;
            }
        }
        
        // Keep car within canvas bounds
        this.x = Math.max(this.width/2, Math.min(this.canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(this.canvas.height - this.height/2, this.y));
        
        // Check for lap completion
        this.checkLapCompletion();
    }
    
    checkLapCompletion() {
        if (this.track.checkStartLineCrossing(
            this.previousPosition.x, this.previousPosition.y,
            this.x, this.y
        )) {
            if (this.currentLapStartTime !== null) {
                // Check if enough time has passed to avoid immediate completion
                const currentTime = Date.now();
                const timeSinceStart = currentTime - this.currentLapStartTime;
                
                if (timeSinceStart > 3000) { // At least 3 seconds must pass
                    // Lap completed
                    const lapTime = currentTime - this.currentLapStartTime;
                    this.lapCompleted = true;
                    
                    // Trigger lap completion event
                    if (window.game && window.game.onLapCompleted) {
                        window.game.onLapCompleted(lapTime);
                    }
                    
                    // Start new lap
                    this.currentLapStartTime = currentTime;
                    this.lapCompleted = false;
                }
            } else {
                // First time crossing - start lap
                this.currentLapStartTime = Date.now();
                this.lapCompleted = false;
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
        this.x = this.track.startLine.x;
        this.y = this.track.startLine.y;
        this.angle = this.track.startLine.angle;
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
        this.currentLapStartTime = null;
        this.lapCompleted = false;
        this.justReset = true; // Prevent immediate acceleration
    }
    
    // Reset only position (for continuous mode)
    resetPosition() {
        this.x = this.track.startLine.x;
        this.y = this.track.startLine.y;
        this.angle = this.track.startLine.angle;
        // Reset velocidade para zero no modo contínuo também
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
    }
    
    // Start a new lap
    startLap() {
        this.currentLapStartTime = Date.now();
        this.lapCompleted = false;
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
            ferrari: '#DC143C',        // Ferrari red
            redbull: '#1E41FF',        // Red Bull blue
            mercedes: '#00D2BE',       // Mercedes teal
            mclaren: '#FF8700',        // McLaren orange
            astonmartin: '#006F62',    // Aston Martin green
            alpine: '#0090FF',         // Alpine blue
            williams: '#005AFF',       // Williams blue
            rb: '#6692FF',             // RB light blue
            sauber: '#52C41A',         // Sauber green
            haas: '#787878'            // Haas gray (more visible than white)
        };
        
        this.color = teamColors[teamValue] || '#FF0000';
    }
}

