// Track Generator v2.1 - Fixed scale and GitHub Pages sync
class TrackDesignValidator {
    constructor(trackWidth) {
        this.trackWidth = trackWidth;
        this.MIN_BOUNDARY_DISTANCE = 0.1 * trackWidth;
    }

    validateTrackDesign(segments) {
        const issues = [];
        
        for (let i = 0; i < segments.length; i++) {
            for (let j = i + 3; j < segments.length; j++) {
                const segmentA = segments[i];
                const segmentB = segments[j];
                
                if (this.areSegmentsAdjacent(i, j, segments.length)) {
                    continue;
                }
                
                if (this.doSegmentsActuallyCross(segmentA, segmentB)) {
                    issues.push({
                        type: "centerline_intersection",
                        segments: [i, j],
                        severity: "error",
                        message: `Segments ${i + 1} and ${j + 1} intersect - creates shortcut`
                    });
                    continue;
                }
                
                const boundaryCheck = this.checkBoundaryOverlap(segmentA, segmentB);
                if (boundaryCheck.overlapping && boundaryCheck.type === "boundary_intersects_area") {
                    issues.push({
                        type: "boundary_overlap",
                        segments: [i, j],
                        severity: "error",
                        message: `Segments ${i + 1} and ${j + 1} track boundaries overlap significantly - creates shortcut`
                    });
                }
            }
        }
        
        const errors = issues.filter(issue => issue.severity === "error");
        const isValid = errors.length === 0;
        let message = "";
        
        if (!isValid) {
            message = errors[0].message;
            if (errors.length > 1) {
                message += ` (and ${errors.length - 1} more issue${errors.length > 2 ? "s" : ""})`;
            }
        }
        
        return {
            isValid: isValid,
            message: message,
            issues: issues
        };
    }

    areSegmentsAdjacent(i, j, totalSegments) {
        return Math.abs(i - j) <= 2 || 
               (i === 0 && j >= totalSegments - 3) || 
               (j === 0 && i >= totalSegments - 3) ||
               (i === 1 && j >= totalSegments - 2) || 
               (j === 1 && i >= totalSegments - 2);
    }

    doSegmentsActuallyCross(segA, segB) {
        // Line intersection algorithm
        const x1 = segA.startX, y1 = segA.startY;
        const x2 = segA.endX, y2 = segA.endY;
        const x3 = segB.startX, y3 = segB.startY;
        const x4 = segB.endX, y4 = segB.endY;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return false;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        return t > 0.1 && t < 0.9 && u > 0.1 && u < 0.9;
    }

    checkBoundaryOverlap(segA, segB) {
        // Simplified boundary overlap check
        const distanceThreshold = this.trackWidth * 0.8;
        
        const distances = [
            this.pointToLineDistance({x: segA.startX, y: segA.startY}, segB),
            this.pointToLineDistance({x: segA.endX, y: segA.endY}, segB),
            this.pointToLineDistance({x: segB.startX, y: segB.startY}, segA),
            this.pointToLineDistance({x: segB.endX, y: segB.endY}, segA)
        ];
        
        const minDistance = Math.min(...distances);
        
        return {
            overlapping: minDistance < distanceThreshold,
            type: minDistance < distanceThreshold ? "boundary_intersects_area" : "safe"
        };
    }

    pointToLineDistance(point, segment) {
        const A = point.x - segment.startX;
        const B = point.y - segment.startY;
        const C = segment.endX - segment.startX;
        const D = segment.endY - segment.startY;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            return Math.sqrt(A * A + B * B);
        }
        
        const param = Math.max(0, Math.min(1, dot / lenSq));
        const xx = segment.startX + param * C;
        const yy = segment.startY + param * D;
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class TrackGenerator {
    constructor() {
        this.trackPoints = [];
        this.canvas = null;
        this.ctx = null;
        this.GAME_BASE_WIDTH = 320;
        this.GAME_BASE_HEIGHT = 280;
        this.isDrawing = false;
        this.drawingPoints = [];
        this.lastDrawPoint = null;
        this.drawingMode = true;
        this.minDrawDistance = 15;
        this.generatedCode = "";
        
        // Modal elements
        this.modal = null;
        this.modalSubmitBtn = null;
        this.closeBtn = null;
        this.nameInput = null;
        this.modalStatusMsg = null;
        
        // Game mode variables
        this.gameLoop = null;
        this.gameStartTime = null;
        this.originalInstructions = null;
        
        this.initializeCanvas();
        this.initializeModal();
        this.bindEvents();
        this.bindDrawingEvents();
        this.renderGridWithOffset();
        
        // Initialize button states
        this.updateSubmitButton();
    }

    initializeCanvas() {
        this.canvas = document.getElementById('trackCanvas');
        
        if (!this.canvas) {
            console.error('trackCanvas element not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to match the main game EXACTLY
        // Main game uses width="400" height="300" in HTML
        this.canvas.width = 400;
        this.canvas.height = 300;
        
        // Removido GAME_OFFSET_Y - agora pode desenhar em todo o canvas
        this.canvas.style.cursor = 'crosshair';
    }

    initializeModal() {
        this.modal = document.getElementById('submitModal');
        if (this.modal) {
            this.modalSubmitBtn = document.getElementById('modalSubmitBtn');
            this.closeBtn = document.getElementById('closeModal');
            this.trackNameInput = document.getElementById('trackName');
            this.nameInput = document.getElementById('pilotName');
            this.modalStatusMsg = document.getElementById('statusMessage');
        }
    }

    bindEvents() {
        const undoBtn = document.getElementById('undoBtn');
        const clearBtn = document.getElementById('clearBtn');
        const loadExampleBtn = document.getElementById('loadExampleBtn');
        const copyCodeBtn = document.getElementById('copyCodeBtn');
        const submitBtn = document.getElementById('submitTrackBtn');
        const testTrackBtn = document.getElementById('testTrackBtn');
        
        if (undoBtn) undoBtn.addEventListener('click', () => this.undoLastPoint());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearAllPoints());
        if (loadExampleBtn) loadExampleBtn.addEventListener('click', () => this.loadExample());
        if (copyCodeBtn) copyCodeBtn.addEventListener('click', () => this.copyCode());
        if (submitBtn) submitBtn.addEventListener('click', () => this.openSubmitModal());
        if (testTrackBtn) testTrackBtn.addEventListener('click', () => this.testTrackInGame());
        
        if (this.modal && this.closeBtn && this.modalSubmitBtn) {
            this.closeBtn.addEventListener('click', () => this.closeSubmitModal());
            this.modalSubmitBtn.addEventListener('click', () => this.submitTrack());
            window.addEventListener('click', (event) => {
                if (event.target == this.modal) {
                    this.closeSubmitModal();
                }
            });
        }
    }

    bindDrawingEvents() {
        if (!this.canvas) {
            console.error('Canvas not available for binding drawing events');
            return;
        }
        
        this.canvas.addEventListener('mousedown', (e) => this.handleDrawStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleDrawMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleDrawEnd());
        this.canvas.addEventListener('mouseleave', () => this.handleDrawEnd());
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleDrawStart(this.createTouchEvent(touch));
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleDrawMove(this.createTouchEvent(touch));
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleDrawEnd();
        });
        
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.handleDrawEnd();
        });
    }

    createTouchEvent(touch) {
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        };
    }

    getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        // Agora pode desenhar em todo o canvas
        return {
            x: Math.max(0, Math.min(this.canvas.width, x)),
            y: Math.max(0, Math.min(this.canvas.height, y))
        };
    }

    // This is the KEY function - matching exactly the original!
    getGameScale() {
        return Math.min(this.canvas.width, this.canvas.height) / 400;
    }

    getGameTrackWidth() {
        return 50 * this.getGameScale();
    }

    handleDrawStart(event) {
        if (!this.drawingMode) return;
        
        this.isDrawing = true;
        this.drawingPoints = [];
        
        const coords = this.getCanvasCoordinates(event);
        this.drawingPoints.push(coords);
        this.lastDrawPoint = coords;
        
        // Clear existing track
        this.trackPoints = [];
        this.updatePointList();
        this.updateCodeOutput();
        this.renderGridWithOffset();
        
        // Draw starting point - agora sem clip
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(coords.x, coords.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    handleDrawMove(event) {
        if (!this.drawingMode || !this.isDrawing) return;
        
        const coords = this.getCanvasCoordinates(event);
        
        if (this.lastDrawPoint) {
            const distance = Math.hypot(coords.x - this.lastDrawPoint.x, coords.y - this.lastDrawPoint.y);
            if (distance < this.minDrawDistance) return;
        }
        
        // Check if we're close to the starting point for auto-close
        if (this.drawingPoints.length > 3) {
            const startPoint = this.drawingPoints[0];
            const distanceToStart = Math.hypot(coords.x - startPoint.x, coords.y - startPoint.y);
            
            // If close to start point (within 25 pixels), auto-close the track
            if (distanceToStart < 25) {
                // Add the start point as the final point to close the loop
                this.drawingPoints.push(startPoint);
                this.handleDrawEnd();
                return;
            }
        }
        
        this.drawingPoints.push(coords);
        this.lastDrawPoint = coords;
        this.renderDrawingPath();
    }

    handleDrawEnd() {
        if (!this.drawingMode || !this.isDrawing) return;
        
        this.isDrawing = false;
        
        if (this.drawingPoints.length < 2) {
            this.renderGridWithOffset();
        } else {
            this.convertDrawingToTrack();
            this.drawingPoints = [];
            this.lastDrawPoint = null;
            this.updatePointList();
            this.updateCodeOutput();
            this.renderTrack();
        }
    }

    // This is the EXACT function from the original - the key to correct scaling!
    convertDrawingToTrack() {
        if (this.drawingPoints.length < 2) return;
        
        const scale = this.getGameScale();
        const gameWidth = this.GAME_BASE_WIDTH * scale;
        const gameHeight = this.GAME_BASE_HEIGHT * scale;
        
        const canvasCenterX = this.canvas.width / 2;
        const canvasCenterY = this.canvas.height / 2;
        
        const gameAreaX = canvasCenterX - gameWidth / 2;
        const gameAreaY = canvasCenterY - gameHeight / 2;
        
        // Convert drawing points to normalized track coordinates
        const normalizedPoints = this.drawingPoints.map(point => ({
            x: Math.round((point.x - gameAreaX) / gameWidth * 1000) / 1000,
            y: Math.round((point.y - gameAreaY) / gameHeight * 1000) / 1000
        }));
        
        // Simplify the path using Douglas-Peucker algorithm
        const simplifiedPoints = this.douglasPeucker(normalizedPoints, 0.02);
        
        // Ensure we have at least 3 points
        if (simplifiedPoints.length < 3) {
            while (simplifiedPoints.length < 3 && simplifiedPoints.length < normalizedPoints.length) {
                const insertIndex = Math.floor(normalizedPoints.length / (4 - simplifiedPoints.length));
                if (insertIndex < normalizedPoints.length) {
                    simplifiedPoints.splice(1, 0, normalizedPoints[insertIndex]);
                }
            }
        }
        
        // Calculate start angle
        if (simplifiedPoints.length > 1) {
            const dx = simplifiedPoints[1].x - simplifiedPoints[0].x;
            const dy = simplifiedPoints[1].y - simplifiedPoints[0].y;
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            simplifiedPoints[0].angle = Math.round(angle);
        }
        
        this.trackPoints = simplifiedPoints;
    }

    douglasPeucker(points, epsilon) {
        if (points.length <= 2) return points;
        
        let maxDistance = 0;
        let maxIndex = 0;
        const start = points[0];
        const end = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(points[i], start, end);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        if (maxDistance > epsilon) {
            const firstHalf = this.douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
            const secondHalf = this.douglasPeucker(points.slice(maxIndex), epsilon);
            return firstHalf.slice(0, -1).concat(secondHalf);
        } else {
            return [start, end];
        }
    }

    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        if (dx === 0 && dy === 0) {
            return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
        }
        
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        
        const projX = lineStart.x + clampedT * dx;
        const projY = lineStart.y + clampedT * dy;
        
        return Math.hypot(point.x - projX, point.y - projY);
    }

    renderDrawingPath() {
        this.renderGridWithOffset();
        
        if (this.drawingPoints.length < 2) return;
        
        // Sem clip - pode desenhar em todo o canvas
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.drawingPoints[0].x, this.drawingPoints[0].y);
        
        for (let i = 1; i < this.drawingPoints.length; i++) {
            this.ctx.lineTo(this.drawingPoints[i].x, this.drawingPoints[i].y);
        }
        
        this.ctx.stroke();
        
        // Draw points
        this.ctx.fillStyle = '#00ff00';
        this.drawingPoints.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
        });
        
        // Highlight start point if we can auto-close
        if (this.drawingPoints.length > 3) {
            const startPoint = this.drawingPoints[0];
            const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
            const distanceToStart = Math.hypot(lastPoint.x - startPoint.x, lastPoint.y - startPoint.y);
            
            if (distanceToStart < 25) {
                // Draw a pulsing circle around start point to indicate auto-close
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(startPoint.x, startPoint.y, 15, 0, 2 * Math.PI);
                this.ctx.stroke();
                
                // Draw connection line preview
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(lastPoint.x, lastPoint.y);
                this.ctx.lineTo(startPoint.x, startPoint.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }

    renderGridWithOffset() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid - simples, sem área oculta
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = i / 10 * this.canvas.width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = 0; i <= 10; i++) {
            const y = i / 10 * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw center point
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Labels
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px IBM Plex Mono';
        this.ctx.fillText('🎮 Track Generator', 5, 15);
        this.ctx.fillText('Center', centerX + 10, centerY - 10);
    }

    renderTrack() {
        if (this.trackPoints.length < 2) {
            this.renderGridWithOffset();
            this.updateValidationDisplay();
            return;
        }
        
        this.renderGridWithOffset();
        
        const scale = this.getGameScale();
        const gameWidth = this.GAME_BASE_WIDTH * scale;
        const gameHeight = this.GAME_BASE_HEIGHT * scale;
        
        const canvasCenterX = this.canvas.width / 2;
        const canvasCenterY = this.canvas.height / 2;
        
        const gameAreaX = canvasCenterX - gameWidth / 2;
        const gameAreaY = canvasCenterY - gameHeight / 2;
        
        // Convert track points to canvas coordinates
        const canvasPoints = this.trackPoints.map(point => ({
            x: gameAreaX + point.x * gameWidth,
            y: gameAreaY + point.y * gameHeight,
            angle: point.angle
        }));
        
        // Sem clip - renderiza em todo o canvas
        const trackWidth = this.getGameTrackWidth();
        this.renderGameStyleTrack(canvasPoints, trackWidth, scale);
    }

    renderGameStyleTrack(canvasPoints, trackWidth, scale) {
        const validationResult = this.validateTrackDesign();
        const hasErrors = !validationResult.isValid;
        
        // Draw track background (wide line)
        this.ctx.strokeStyle = hasErrors ? '#ffcccc' : '#E5E5E5';
        this.ctx.lineWidth = trackWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        
        for (let i = 1; i < canvasPoints.length; i++) {
            this.ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        
        this.ctx.stroke();
        
        // Highlight overlapping segments if there are errors
        if (hasErrors) {
            this.highlightOverlappingSegments(canvasPoints, trackWidth);
        }
        
        // Draw center line
        this.ctx.strokeStyle = hasErrors ? '#ff9999' : '#999';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        
        for (let i = 1; i < canvasPoints.length; i++) {
            this.ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        
        this.ctx.stroke();
        
        // Draw game elements (setas, linha de largada, pontos) - igual ao geradorref.js
        this.drawGameElements(canvasPoints, scale);
        
        this.updateValidationDisplay();
    }

    drawGameViewIndicator(visibleHeight) {
        // This is just a visual helper - no changes needed for scaling
    }

    // Funções do geradorref.js para desenhar elementos do jogo
    drawGameElements(canvasPoints, scale) {
        this.drawGameStyleArrows(canvasPoints, scale);
        this.drawGameStyleCheckpoints(canvasPoints);
        this.drawGameStyleStartFinish(canvasPoints[0], scale);
        
        // Draw start arrow if angle is defined
        if (canvasPoints.length > 0 && canvasPoints[0].angle !== undefined) {
            this.drawStartArrow(canvasPoints[0].x, canvasPoints[0].y, canvasPoints[0].angle);
        }
    }

    drawGameStyleArrows(canvasPoints, scale) {
        for (let i = 0; i < canvasPoints.length - 1; i++) {
            const current = canvasPoints[i];
            const next = canvasPoints[i + 1];
            const angle = Math.atan2(next.y - current.y, next.x - current.x);
            const distance = Math.hypot(next.x - current.x, next.y - current.y);
            
            const arrowSpacing = 80 * scale;
            const numArrows = Math.max(1, Math.floor(distance / arrowSpacing));
            
            for (let j = 1; j <= numArrows; j++) {
                const t = j / (numArrows + 1);
                const arrowX = current.x + (next.x - current.x) * t;
                const arrowY = current.y + (next.y - current.y) * t;
                this.drawDirectionArrow(arrowX, arrowY, angle, scale);
            }
        }
    }

    drawGameStyleCheckpoints(canvasPoints) {
        canvasPoints.forEach((point, index) => {
            // Color based on type
            if (index === 0) {
                this.ctx.fillStyle = '#00ff00'; // Start point - green
            } else if (index === canvasPoints.length - 1) {
                this.ctx.fillStyle = '#ff0000'; // End point - red
            } else {
                this.ctx.fillStyle = '#0066ff'; // Regular checkpoint - blue
            }
            
            // Draw point circle
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // White border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Point number
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px IBM Plex Mono';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText((index + 1).toString(), point.x + 10, point.y + 4);
            this.ctx.fillText((index + 1).toString(), point.x + 10, point.y + 4);
        });
    }

    drawGameStyleStartFinish(startPoint, scale) {
        if (!startPoint) return;
        
        const width = 40 * scale;
        const height = 10 * scale;
        
        // Draw checkered pattern
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 2; j++) {
                this.ctx.fillStyle = (i + j) % 2 === 0 ? '#1A1A1A' : '#FFFFFF';
                this.ctx.fillRect(
                    startPoint.x - width/2 + i * width/8,
                    startPoint.y - height + j * height,
                    width/8,
                    height
                );
            }
        }
    }

    drawDirectionArrow(x, y, angle, scale) {
        const size = 12 * scale;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        
        this.ctx.beginPath();
        this.ctx.moveTo(-size/2, -size/4);
        this.ctx.lineTo(size/2, 0);
        this.ctx.lineTo(-size/2, size/4);
        
        this.ctx.fillStyle = 'rgba(26, 26, 26, 0.6)'; // Mais visível que 0.2
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawStartArrow(x, y, angleDegrees) {
        const angleRad = angleDegrees * Math.PI / 180;
        this.drawDirectionArrow(x, y, angleRad, this.getGameScale());
    }

    getGameScale() {
        // Use same scaling as geradorref.js for consistency
        return Math.min(this.ctx.canvas.width, this.ctx.canvas.height) / 400;
    }

    validateTrackDesign() {
        if (this.trackPoints.length < 3) {
            return {
                isValid: true,
                message: "",
                issues: []
            };
        }
        
        const scale = this.getGameScale();
        const gameWidth = this.GAME_BASE_WIDTH * scale;
        const gameHeight = this.GAME_BASE_HEIGHT * scale;
        const gameAreaX = this.canvas.width / 2 - gameWidth / 2;
        const gameAreaY = this.canvas.height / 2 - gameHeight / 2;
        
        // Check if track is closed
        const firstPoint = this.trackPoints[0];
        const lastPoint = this.trackPoints[this.trackPoints.length - 1];
        
        const startX = gameAreaX + firstPoint.x * gameWidth;
        const startY = gameAreaY + firstPoint.y * gameHeight;
        const endX = gameAreaX + lastPoint.x * gameWidth;
        const endY = gameAreaY + lastPoint.y * gameHeight;
        
        const distance = Math.hypot(startX - endX, startY - endY);
        if (distance > 30) {
            return {
                isValid: false,
                message: "Track must be a closed loop - connect the end point to the start",
                issues: [{
                    type: "open_track",
                    severity: "error",
                    message: "Track is not closed - end point must connect to start point"
                }]
            };
        }
        
        // Use validator for complex checks
        const validator = new TrackDesignValidator(this.getGameTrackWidth());
        const segments = this.createTrackSegments();
        return validator.validateTrackDesign(segments);
    }

    createTrackSegments() {
        const scale = this.getGameScale();
        const gameWidth = this.GAME_BASE_WIDTH * scale;
        const gameHeight = this.GAME_BASE_HEIGHT * scale;
        const gameAreaX = this.canvas.width / 2 - gameWidth / 2;
        const gameAreaY = this.canvas.height / 2 - gameHeight / 2;
        
        const segments = [];
        for (let i = 0; i < this.trackPoints.length - 1; i++) {
            const start = this.trackPoints[i];
            const end = this.trackPoints[i + 1];
            
            segments.push({
                startX: gameAreaX + start.x * gameWidth,
                startY: gameAreaY + start.y * gameHeight,
                endX: gameAreaX + end.x * gameWidth,
                endY: gameAreaY + end.y * gameHeight,
                index: i
            });
        }
        
        return segments;
    }

    highlightOverlappingSegments(canvasPoints, trackWidth) {
        if (canvasPoints.length < 3) return;
        
        const validationResult = this.validateTrackDesign();
        if (validationResult.isValid) return;
        
        const segments = [];
        for (let i = 0; i < canvasPoints.length - 1; i++) {
            segments.push({
                start: canvasPoints[i],
                end: canvasPoints[i + 1],
                index: i
            });
        }
        
        const problemSegments = new Set();
        validationResult.issues.forEach(issue => {
            if (issue.segments) {
                issue.segments.forEach(segmentIndex => {
                    problemSegments.add(segmentIndex);
                });
            }
        });
        
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 8;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.7;
        
        problemSegments.forEach(segmentIndex => {
            if (segmentIndex < segments.length) {
                const segment = segments[segmentIndex];
                this.ctx.beginPath();
                this.ctx.moveTo(segment.start.x, segment.start.y);
                this.ctx.lineTo(segment.end.x, segment.end.y);
                this.ctx.stroke();
            }
        });
        
        this.ctx.globalAlpha = 1;
    }

    updateCodeOutput() {
        const codeOutput = document.getElementById('codeOutput');
        if (!codeOutput) {
            console.warn('codeOutput element not found');
            return;
        }
        
        if (this.trackPoints.length === 0) {
            codeOutput.value = "";
            this.generatedCode = "";
            this.updateValidationDisplay();
            this.updateSubmitButton();
            return;
        }
        
        let code = `function generateCustomTrack(scale, centerX, centerY) {
    // Custom track generated with Track Generator
    // WYSIWYG: Coordinates match exactly what you see in the generator
    const width = 320 * scale;
    const height = 280 * scale;
    const x = centerX - width/2;
    const y = centerY - height/2;
    
    return [`;
        
        this.trackPoints.forEach((point, index) => {
            const comment = index === 0 ? " // Start/Finish" : 
                           index === this.trackPoints.length - 1 ? " // Back to Start" : 
                           ` // Checkpoint ${index + 1}`;
            
            if (point.angle !== undefined) {
                code += `\n        { x: x + ${point.x.toFixed(3)} * width, y: y + ${point.y.toFixed(3)} * height, angle: ${point.angle} },${comment}`;
            } else {
                code += `\n        { x: x + ${point.x.toFixed(3)} * width, y: y + ${point.y.toFixed(3)} * height },${comment}`;
            }
        });
        
        code += `\n    ];
}`;
        
        codeOutput.value = code;
        this.generatedCode = code;
        this.updateValidationDisplay();
        this.updateSubmitButton();
    }

    updateValidationDisplay() {
        const validationResult = this.validateTrackDesign();
        const copyBtn = document.getElementById('copyCodeBtn');
        const codeOutput = document.getElementById('codeOutput');
        
        let errorDisplay = document.getElementById('trackErrorDisplay');
        if (!errorDisplay) {
            errorDisplay = document.createElement('div');
            errorDisplay.id = 'trackErrorDisplay';
            errorDisplay.style.cssText = `
                margin-top: 10px;
                padding: 10px;
                border-radius: 4px;
                font-size: 0.9rem;
                font-weight: 500;
            `;
            if (copyBtn && codeOutput) {
                codeOutput.parentNode.insertBefore(errorDisplay, copyBtn);
            }
        }
        
        if (validationResult.isValid) {
            errorDisplay.style.display = 'none';
            if (copyBtn) {
                copyBtn.style.backgroundColor = '';
                copyBtn.style.borderColor = '';
                copyBtn.style.color = '';
                copyBtn.textContent = 'Copy to Clipboard';
            }
        } else {
            errorDisplay.style.display = 'block';
            errorDisplay.style.backgroundColor = '#ffe6e6';
            errorDisplay.style.border = '1px solid #ff9999';
            errorDisplay.style.color = '#cc0000';
            
            let message = '<strong>⚠️ Track Design Issues:</strong><br>';
            message += validationResult.message;
            
            if (validationResult.issues && validationResult.issues.length > 1) {
                message += '<br><br><strong>All Issues:</strong><ul style="margin: 5px 0; padding-left: 20px;">';
                validationResult.issues.forEach((issue, index) => {
                    if (issue.severity === 'error') {
                        message += `<li style="margin: 2px 0;">${issue.message}</li>`;
                    }
                });
                message += '</ul>';
            }
            
            message += `<br><br><strong>Design Tips:</strong><ul style="margin: 5px 0; padding-left: 20px">
                <li>✅ Complete your loop by connecting the end to the start</li>
                <li>✅ Tracks can get close - only actual crossovers are blocked</li>
                <li>✅ Sharp corners are allowed</li>
                <li>❌ Only segments that cross through each other are flagged</li>
            </ul>`;
            
            message += '<br><small style="color: #888;">💡 Problem segments are highlighted in red on the track.</small>';
            
            errorDisplay.innerHTML = message;
            
            if (copyBtn) {
                copyBtn.style.backgroundColor = '#dc3545';
                copyBtn.style.borderColor = '#dc3545';
                copyBtn.style.color = '#ffffff';
                copyBtn.textContent = 'Fix errors before copying';
                copyBtn.disabled = false;
            }
        }
        
        this.updateSubmitButton();
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('submitTrackBtn');
        const statusMsg = document.getElementById('statusMsg');
        const testTrackBtn = document.getElementById('testTrackBtn');
        
        if (!statusMsg) return;
        
        // Submit button is always visible, just disabled when no valid track
        if (submitBtn) {
            // Always show submit button
            submitBtn.style.display = 'inline-block';
            
            if (this.trackPoints.length === 0) {
                submitBtn.disabled = true;
            } else {
                const isValid = this.validateTrackDesign().isValid;
                submitBtn.disabled = !isValid;
            }
        }
        
        // Test button logic
        if (this.trackPoints.length === 0) {
            if (testTrackBtn) testTrackBtn.disabled = true;
            statusMsg.textContent = '';
            statusMsg.className = '';
            return;
        }
        
        const isValid = this.validateTrackDesign().isValid;
        
        if (isValid) {
            if (testTrackBtn) {
                testTrackBtn.disabled = false;
                testTrackBtn.style.backgroundColor = '#28a745';
                testTrackBtn.style.color = 'white';
            }
            statusMsg.textContent = '🏁 Track is ready to test!';
            statusMsg.className = 'status-ready';
            statusMsg.style.display = 'block';
        } else {
            if (testTrackBtn) {
                testTrackBtn.disabled = true;
                testTrackBtn.style.backgroundColor = '';
                testTrackBtn.style.color = '';
            }
            statusMsg.textContent = '';
            statusMsg.className = '';
        }
    }

    // UI Methods
    undoLastPoint() {
        if (this.trackPoints.length > 0) {
            this.trackPoints.pop();
            this.updatePointList();
            this.updateCodeOutput();
            this.renderTrack();
        }
    }

    clearAllPoints() {
        this.trackPoints = [];
        this.generatedCode = "";
        this.updatePointList();
        this.updateCodeOutput();
        this.renderGridWithOffset();
        
        const statusMsg = document.getElementById('statusMsg');
        if (statusMsg) {
            statusMsg.textContent = "";
            statusMsg.className = "";
        }
    }

    loadExample() {
        this.trackPoints = [
            { x: 0.1, y: 0.85, angle: 0 },
            { x: 0.7, y: 0.85 },
            { x: 0.7, y: 0.65 },
            { x: 0.55, y: 0.55 },
            { x: 0.85, y: 0.35 },
            { x: 0.6, y: 0.2 },
            { x: 0.3, y: 0.2 },
            { x: 0.15, y: 0.4 },
            { x: 0.1, y: 0.65 },
            { x: 0.1, y: 0.85, angle: 0 }
        ];
        
        this.updatePointList();
        this.updateCodeOutput();
        this.renderTrack();
        this.updateSubmitButton(); // Garantir que o botão seja atualizado
    }

    updatePointList() {
        const pointList = document.getElementById('pointList');
        if (!pointList) {
            console.warn('pointList element not found');
            return;
        }
        
        if (this.trackPoints.length === 0) {
            pointList.innerHTML = '<div style="text-align: center; color: #999; font-style: italic;">No points added yet</div>';
            return;
        }
        
        pointList.innerHTML = '';
        
        this.trackPoints.forEach((point, index) => {
            const pointItem = document.createElement('div');
            pointItem.className = 'point-item';
            
            const coords = document.createElement('span');
            coords.className = 'point-coords';
            coords.textContent = `${index + 1}. (${point.x.toFixed(3)}, ${point.y.toFixed(3)})${point.angle ? `, ${point.angle}°` : ''}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-point';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = () => this.deletePoint(index);
            
            pointItem.appendChild(coords);
            pointItem.appendChild(deleteBtn);
            pointList.appendChild(pointItem);
        });
    }

    deletePoint(index) {
        this.trackPoints.splice(index, 1);
        this.updatePointList();
        this.updateCodeOutput();
        this.renderTrack();
    }

    copyCode() {
        const codeOutput = document.getElementById('codeOutput');
        
        if (codeOutput.value.trim() === '') {
            alert('No code to copy. Add some track points first!');
            return;
        }
        
        const validationResult = this.validateTrackDesign();
        if (validationResult.isValid) {
            codeOutput.select();
            codeOutput.setSelectionRange(0, 99999);
            
            try {
                document.execCommand('copy');
                alert('Code copied to clipboard!');
            } catch (err) {
                navigator.clipboard.writeText(codeOutput.value).then(() => {
                    alert('Code copied to clipboard!');
                }).catch(() => {
                    alert('Failed to copy code. Please select and copy manually.');
                });
            }
        } else {
            alert('Track Design Error: ' + validationResult.message);
        }
    }

    testTrackInGame() {
        const validationResult = this.validateTrackDesign();
        if (!validationResult.isValid) {
            alert('Track Design Error: ' + validationResult.message);
            return;
        }

        // Switch to game mode
        this.switchToGameMode();
    }

    switchToGameMode() {
        // Hide track generator UI elements
        this.hideTrackGeneratorUI();
        
        // Change button to "Back to Editor"
        const testTrackBtn = document.getElementById('testTrackBtn');
        if (testTrackBtn) {
            testTrackBtn.textContent = '← Voltar ao Editor';
            testTrackBtn.style.backgroundColor = '#6c757d';
            testTrackBtn.onclick = () => this.switchBackToEditor();
        }
        
        // Initialize game engine
        this.initializeGameEngine();
    }
    
    switchBackToEditor() {
        // Show track generator UI elements
        this.showTrackGeneratorUI();
        
        // Change button back to "Test Track"
        const testTrackBtn = document.getElementById('testTrackBtn');
        if (testTrackBtn) {
            testTrackBtn.textContent = '🎮 Testar Pista';
            testTrackBtn.style.backgroundColor = '#28a745';
            testTrackBtn.onclick = () => this.testTrackInGame();
        }
        
        // Stop game engine
        this.stopGameEngine();
        
        // Restore original instructions
        this.restoreOriginalInstructions();
        
        // Return to track generator view
        this.renderTrack();
    }
    
    restoreOriginalInstructions() {
        const instructionsArea = document.querySelector('.times-column');
        if (instructionsArea && this.originalInstructions) {
            instructionsArea.innerHTML = this.originalInstructions;
        }
    }
    
    hideTrackGeneratorUI() {
        // Hide drawing instructions and track generator specific elements
        const elements = [
            'undoBtn', 'clearBtn', 'loadExampleBtn', 'submitTrackBtn'
        ];
        
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        // Hide status message
        const statusMsg = document.getElementById('statusMsg');
        if (statusMsg) statusMsg.style.display = 'none';
    }
    
    showTrackGeneratorUI() {
        // Show drawing instructions and track generator specific elements
        const elements = [
            'undoBtn', 'clearBtn', 'loadExampleBtn', 'submitTrackBtn'
        ];
        
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'inline-block';
        });
        
        // Show status message
        const statusMsg = document.getElementById('statusMsg');
        if (statusMsg) statusMsg.style.display = 'block';
    }
    
    initializeGameEngine() {
        // Prepare track data for game engine
        const customTrackData = {
            trackPoints: this.trackPoints,
            generatedCode: this.generatedCode,
            canvasSize: {
                width: this.GAME_BASE_WIDTH,
                height: this.GAME_BASE_HEIGHT
            }
        };
        
        // TODO: Initialize game engine with this track data
        // This will be the actual game implementation
        this.startGameSimulation(customTrackData);
    }
    
    stopGameEngine() {
        // TODO: Stop game engine, clear timers, etc.
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
    }
    
    startGameSimulation(trackData) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set up game background
        this.ctx.fillStyle = '#87CEEB'; // Sky blue like main game
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw track for game
        this.renderGameTrack(trackData.trackPoints);
        
        // Simple game timer display
        this.gameStartTime = Date.now();
        this.gameLoop = setInterval(() => {
            this.updateGameDisplay();
        }, 100);
        
        // Show game instructions in left panel
        this.showGameInstructions();
    }
    
    renderGameTrack(trackPoints) {
        const scale = this.getGameScale();
        const gameWidth = this.GAME_BASE_WIDTH * scale;
        const gameHeight = this.GAME_BASE_HEIGHT * scale;
        
        const canvasCenterX = this.canvas.width / 2;
        const canvasCenterY = this.canvas.height / 2;
        
        const gameAreaX = canvasCenterX - gameWidth / 2;
        const gameAreaY = canvasCenterY - gameHeight / 2;
        
        // Convert track points to canvas coordinates
        const canvasPoints = trackPoints.map(point => ({
            x: gameAreaX + point.x * gameWidth,
            y: gameAreaY + point.y * gameHeight,
            angle: point.angle
        }));
        
        // Draw track background (wide line)
        this.ctx.strokeStyle = '#E5E5E5';
        this.ctx.lineWidth = this.getGameTrackWidth();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        
        for (let i = 1; i < canvasPoints.length; i++) {
            this.ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        
        this.ctx.stroke();
        
        // Draw center line
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        
        for (let i = 1; i < canvasPoints.length; i++) {
            this.ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        
        this.ctx.stroke();
        
        // Draw game elements
        this.drawGameElements(canvasPoints, scale);
        
        // Draw a simple car at start position
        this.drawSimpleCar(canvasPoints[0]);
    }
    
    drawSimpleCar(startPoint) {
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.arc(startPoint.x, startPoint.y, 6, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Car border
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    updateGameDisplay() {
        const elapsed = (Date.now() - this.gameStartTime) / 1000;
        
        // Update timer in status area or create a simple overlay
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 120, 30);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '14px IBM Plex Mono';
        this.ctx.fillText(`Time: ${elapsed.toFixed(1)}s`, 15, 30);
        this.ctx.restore();
    }
    
    showGameInstructions() {
        // Update the left panel with game-specific instructions
        const instructionsArea = document.querySelector('.times-column');
        if (instructionsArea) {
            const originalContent = instructionsArea.innerHTML;
            this.originalInstructions = originalContent;
            
            instructionsArea.innerHTML = `
                <div style="background: #e7f3ff; border: 1px solid #b8daff; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                    <h4 style="color: #004085; margin-bottom: 8px; font-size: 0.8rem;">🎮 Modo de Teste</h4>
                    <p style="color: #004085; font-size: 0.75rem; line-height: 1.3; margin-bottom: 8px;">
                        Esta é uma prévia da sua pista em modo de jogo.
                    </p>
                    <ul style="margin-left: 15px;">
                        <li style="margin-bottom: 4px; color: #004085; font-size: 0.75rem; line-height: 1.3;">Timer rodando</li>
                        <li style="margin-bottom: 4px; color: #004085; font-size: 0.75rem; line-height: 1.3;">Pista renderizada como no jogo</li>
                        <li style="margin-bottom: 4px; color: #004085; font-size: 0.75rem; line-height: 1.3;">Carro posicionado na largada</li>
                        <li style="margin-bottom: 4px; color: #004085; font-size: 0.75rem; line-height: 1.3;">Clique "Voltar ao Editor" para continuar editando</li>
                    </ul>
                </div>
                
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                    <h4 style="color: #155724; margin-bottom: 8px; font-size: 0.8rem;">✅ Pista Válida</h4>
                    <p style="color: #155724; font-size: 0.75rem; line-height: 1.3;">
                        Sua pista está pronta para ser enviada ao admin!
                    </p>
                </div>
            `;
        }
    }

    // Modal methods
    openSubmitModal() {
        if (this.modal) {
            this.modal.classList.add('show');
            if (this.trackNameInput) this.trackNameInput.focus();
            if (this.modalStatusMsg) {
                this.modalStatusMsg.textContent = '';
                this.modalStatusMsg.className = 'status-message';
            }
            if (this.modalSubmitBtn) {
                this.modalSubmitBtn.disabled = false;
                this.modalSubmitBtn.textContent = '📤 Submit to Admin';
            }
        }
    }

    closeSubmitModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    async submitTrack() {
        const trackName = this.trackNameInput ? this.trackNameInput.value.trim() : '';
        const pilotName = this.nameInput ? this.nameInput.value.trim() : '';
        
        if (!trackName) {
            this.modalStatusMsg.textContent = '⚠️ Please enter a track name.';
            this.modalStatusMsg.className = 'status-message status-error';
            return;
        }
        
        if (!pilotName) {
            this.modalStatusMsg.textContent = '⚠️ Please enter your name.';
            this.modalStatusMsg.className = 'status-message status-error';
            return;
        }
        
        if (this.trackPoints.length === 0) {
            this.modalStatusMsg.textContent = '⚠️ No track to submit. Please draw a track first.';
            this.modalStatusMsg.className = 'status-message status-error';
            return;
        }
        
        const submitBtn = this.modalSubmitBtn;
        const statusMsg = this.modalStatusMsg;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        statusMsg.textContent = '⏳ Submitting track to admin...';
        statusMsg.className = 'status-message status-loading';
        
        try {
            // Get existing submissions from localStorage
            const existingSubmissions = JSON.parse(localStorage.getItem('userTrackSubmissions') || '[]');
            
            // Create new submission with JSON data instead of JavaScript code
            const submission = {
                id: Date.now(),
                trackName: trackName,
                pilotName: pilotName,
                trackCode: JSON.stringify({
                    trackPoints: this.trackPoints,
                    canvasSize: {
                        width: this.GAME_BASE_WIDTH,
                        height: this.GAME_BASE_HEIGHT
                    }
                }),
                submittedAt: new Date().toISOString(),
                status: 'pending' // pending, approved, rejected
            };
            
            // Add to submissions array
            existingSubmissions.push(submission);
            
            // Save back to localStorage
            localStorage.setItem('userTrackSubmissions', JSON.stringify(existingSubmissions));
            
            statusMsg.textContent = '🎉 Track submitted successfully! Admin will review it soon.';
            statusMsg.className = 'status-message status-success';
            
            setTimeout(() => {
                this.closeSubmitModal();
                // Optionally clear the track
                // this.clearAllPoints();
                
                // Clear form fields
                if (this.trackNameInput) this.trackNameInput.value = '';
                if (this.nameInput) this.nameInput.value = '';
            }, 2000);
            
        } catch (error) {
            console.error('Submission error:', error);
            statusMsg.textContent = '⚠️ Error submitting track. Please try again.';
            statusMsg.className = 'status-message status-error';
            submitBtn.textContent = '📤 Retry Submission';
            submitBtn.disabled = false;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrackGenerator();
});
