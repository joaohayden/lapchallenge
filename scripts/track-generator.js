// Track Generator - 100% Based on Reference Implementation
class TrackDesignValidator {
    constructor(trackWidth) {
        this.trackWidth = trackWidth;
        this.MIN_BOUNDARY_DISTANCE = 0.1 * trackWidth;
    }

    validateTrackDesign(segments) {
        const issues = [];
        
        // Check for segment crossings
        for (let i = 0; i < segments.length; i++) {
            for (let j = i + 2; j < segments.length; j++) {
                if (this.areSegmentsAdjacent(i, j, segments.length)) continue;
                
                if (this.doSegmentsActuallyCross(segments[i], segments[j])) {
                    issues.push({
                        type: "segment_crossing",
                        severity: "error", 
                        message: `Track segments ${i+1} and ${j+1} cross each other`,
                        segments: [i, j]
                    });
                }
            }
        }

        const isValid = issues.filter(issue => issue.severity === "error").length === 0;
        let message = "";
        
        if (!isValid) {
            const errors = issues.filter(issue => issue.severity === "error");
            message = errors[0].message;
            if (errors.length > 1) {
                message += ` (and ${errors.length - 1} more issue${errors.length > 2 ? "s" : ""})`;
            }
        }

        return {
            isValid,
            message,
            issues
        };
    }

    areSegmentsAdjacent(i, j, totalSegments) {
        return Math.abs(i - j) <= 2 || 
               (i === 0 && j >= totalSegments - 3) ||
               (j === 0 && i >= totalSegments - 3) ||
               (i === 1 && j >= totalSegments - 2) ||
               (j === 1 && i >= totalSegments - 2);
    }

    doSegmentsActuallyCross(seg1, seg2) {
        const p1 = { x: seg1.startX, y: seg1.startY };
        const q1 = { x: seg1.endX, y: seg1.endY };
        const p2 = { x: seg2.startX, y: seg2.startY };
        const q2 = { x: seg2.endX, y: seg2.endY };

        const d1 = this.crossProduct(p2, q2, p1);
        const d2 = this.crossProduct(p2, q2, q1);
        const d3 = this.crossProduct(p1, q1, p2);
        const d4 = this.crossProduct(p1, q1, q2);

        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }

        // Check for collinear cases
        if (d1 === 0 && this.onSegment(p2, p1, q2)) return true;
        if (d2 === 0 && this.onSegment(p2, q1, q2)) return true;
        if (d3 === 0 && this.onSegment(p1, p2, q1)) return true;
        if (d4 === 0 && this.onSegment(p1, q2, q1)) return true;

        return false;
    }

    crossProduct(p1, p2, p3) {
        return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    }

    onSegment(p, q, r) {
        return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
               q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    }
}

class TrackGenerator {
    constructor() {
        console.log('🏁 TrackGenerator: Initializing...');
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
        this.GAME_OFFSET_Y = 0.12; // 12% bottom offset

        try {
            this.initializeCanvas();
            
            if (!this.canvas) {
                console.error('🚨 CRITICAL ERROR: Canvas element "trackCanvas" not found!');
                console.error('🚨 Make sure the HTML file has a <canvas id="trackCanvas"></canvas> element');
                
                // Aviso visual para o usuário na página
                const body = document.body;
                if (body) {
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = 'background: #ff3860; color: white; padding: 20px; margin: 20px; border-radius: 5px; font-family: sans-serif; font-weight: bold; text-align: center;';
                    errorDiv.innerHTML = '<h2>😱 Canvas Element Not Found!</h2><p>This page requires a canvas element with id="trackCanvas" to work.</p>';
                    body.prepend(errorDiv);
                }
                
                return;
            }
            
            this.bindEvents();
            this.bindDrawingEvents();
            this.renderGridWithOffset();
            console.log('✅ TrackGenerator: Initialized successfully');
        } catch (error) {
            console.error('❌ TrackGenerator: Initialization failed:', error);
        }
    }

    initializeCanvas() {
        console.log('🎨 TrackGenerator: Initializing canvas...');
        this.canvas = document.getElementById("trackCanvas");
        if (!this.canvas) {
            console.error('❌ TrackGenerator: Canvas element "trackCanvas" not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext("2d");
        
        // Keep larger canvas for better drawing experience
        const aspectRatio = this.GAME_BASE_WIDTH / this.GAME_BASE_HEIGHT;
        this.canvas.width = 600;
        this.canvas.height = this.canvas.width / aspectRatio;
        this.visibleHeight = this.canvas.height * (1 - this.GAME_OFFSET_Y);
        this.canvas.style.cursor = "crosshair";
        
        console.log('✅ TrackGenerator: Canvas initialized', {
            width: this.canvas.width,
            height: this.canvas.height,
            visibleHeight: this.visibleHeight
        });
    }

    bindEvents() {
        document.getElementById("undoBtn").addEventListener("click", () => this.undoLastPoint());
        document.getElementById("clearBtn").addEventListener("click", () => this.clearAllPoints());
        document.getElementById("loadExampleBtn").addEventListener("click", () => this.loadExample());
        document.getElementById("copyCodeBtn").addEventListener("click", () => this.copyCode());
        
        // Test button - connect to game
        const testBtn = document.getElementById("testTrackBtn");
        if (testBtn) {
            testBtn.addEventListener("click", () => this.testTrackInGame());
        }
    }

    bindDrawingEvents() {
        if (!this.canvas) {
            console.error("❌ Cannot bind events - canvas element not found");
            return;
        }
        
        console.log("🔗 Binding drawing events to canvas");
        
        this.canvas.addEventListener("mousedown", e => {
            console.log("👇 Mouse down event triggered");
            this.handleDrawStart(e);
        });
        
        this.canvas.addEventListener("mousemove", e => {
            // Não logar todos os movimentos para não sobrecarregar o console
            this.handleDrawMove(e);
        });
        
        this.canvas.addEventListener("mouseup", () => {
            console.log("☝️ Mouse up event triggered");
            this.handleDrawEnd();
        });
        
        this.canvas.addEventListener("mouseleave", () => {
            console.log("👋 Mouse leave event triggered");
            this.handleDrawEnd();
        });
        
        // Touch events
        this.canvas.addEventListener("touchstart", e => {
            console.log("👆 Touch start event triggered");
            e.preventDefault();
            const touch = e.touches[0];
            this.handleDrawStart(this.createTouchEvent(touch));
        });
        
        this.canvas.addEventListener("touchmove", e => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleDrawMove(this.createTouchEvent(touch));
        });
        
        this.canvas.addEventListener("touchend", e => {
            console.log("✋ Touch end event triggered");
            e.preventDefault();
            this.handleDrawEnd();
        });
        
        console.log("✅ All drawing events successfully bound to canvas");
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
        
        const hiddenHeight = this.canvas.height * this.GAME_OFFSET_Y;
        const visibleHeight = this.canvas.height - hiddenHeight;
        
        return {
            x: Math.max(0, Math.min(this.canvas.width, x)),
            y: Math.max(0, Math.min(visibleHeight, y))
        };
    }

    handleDrawStart(event) {
        if (!this.drawingMode) return;
        
        this.isDrawing = true;
        this.drawingPoints = [];
        
        const coords = this.getCanvasCoordinates(event);
        this.drawingPoints.push(coords);
        this.lastDrawPoint = coords;
        
        // Clear previous track
        this.trackPoints = [];
        this.updatePointList();
        this.updateCodeOutput();
        this.renderGridWithOffset();
        
        // Draw start point
        const hiddenHeight = this.canvas.height * this.GAME_OFFSET_Y;
        const visibleHeight = this.canvas.height - hiddenHeight;
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.canvas.width, visibleHeight);
        this.ctx.clip();
        
        this.ctx.fillStyle = "#00ff00";
        this.ctx.beginPath();
        this.ctx.arc(coords.x, coords.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
        this.drawGameViewIndicator(visibleHeight);
    }

    handleDrawMove(event) {
        if (!this.drawingMode || !this.isDrawing) return;
        
        const coords = this.getCanvasCoordinates(event);
        
        if (this.lastDrawPoint) {
            const distance = Math.hypot(
                coords.x - this.lastDrawPoint.x,
                coords.y - this.lastDrawPoint.y
            );
            
            if (distance < this.minDrawDistance) return;
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
            return;
        }
        
        this.convertDrawingToTrack();
        this.drawingPoints = [];
        this.lastDrawPoint = null;
        this.updatePointList();
        this.updateCodeOutput();
        this.renderTrack();
    }

    convertDrawingToTrack() {
        if (this.drawingPoints.length < 2) return;
        
        console.log('🔄 Converting drawing to track...');
        console.log('📊 Generator canvas dimensions:', {width: this.canvas.width, height: this.canvas.height});
        console.log('📏 Target game canvas dimensions:', {width: 400, height: 300});
        console.log('📏 Game base dimensions:', {width: this.GAME_BASE_WIDTH, height: this.GAME_BASE_HEIGHT});
        
        // Use target game canvas dimensions for coordinate calculation
        const gameCanvasWidth = 400;
        const gameCanvasHeight = 300;
        const scale = this.getGameScale();
        const gameWidth = this.GAME_BASE_WIDTH * scale;
        const gameHeight = this.GAME_BASE_HEIGHT * scale;
        const centerX = gameCanvasWidth / 2;
        const centerY = gameCanvasHeight / 2;
        const offsetX = centerX - gameWidth / 2;
        const offsetY = centerY - gameHeight / 2;
        
        console.log('🔢 Scale calculation for target game:', {
            scale,
            gameWidth,
            gameHeight,
            centerX,
            centerY,
            offsetX,
            offsetY
        });
        
        // Convert from current canvas coordinates to target game canvas coordinates
        const scaleFactor = gameCanvasWidth / this.canvas.width;
        
        console.log('🔍 Scale conversion details:', {
            generatorCanvas: {width: this.canvas.width, height: this.canvas.height},
            targetGameCanvas: {width: gameCanvasWidth, height: gameCanvasHeight},
            scaleFactor: scaleFactor
        });
        
        const normalizedPoints = this.drawingPoints.map((point, index) => {
            // Scale down the coordinates to target game canvas size
            const targetX = point.x * scaleFactor;
            const targetY = point.y * scaleFactor;
            
            // Then normalize relative to the game area
            const normalizedX = Math.round((targetX - offsetX) / gameWidth * 1000) / 1000;
            const normalizedY = Math.round((targetY - offsetY) / gameHeight * 1000) / 1000;
            
            // Log conversion for first few points
            if (index < 3) {
                console.log(`🔍 Point ${index + 1} conversion:`);
                console.log(`  Generator canvas: (${point.x}, ${point.y})`);
                console.log(`  Scale factor: ${scaleFactor}`);
                console.log(`  Target game canvas: (${targetX}, ${targetY})`);
                console.log(`  Game area offset: (${offsetX}, ${offsetY})`);
                console.log(`  Game area size: ${gameWidth} x ${gameHeight}`);
                console.log(`  Final normalized: (${normalizedX}, ${normalizedY})`);
            }
            
            return { x: normalizedX, y: normalizedY };
        });
        
        console.log('🎨 First few drawing points (generator canvas):', this.drawingPoints.slice(0, 3));
        console.log('📐 First few normalized points (for game):', normalizedPoints.slice(0, 3));
        
        // Apply Douglas-Peucker simplification with exact same tolerance as reference
        const simplifiedPoints = this.douglasPeucker(normalizedPoints, 0.02);
        
        // Ensure minimum 3 points exactly like reference
        if (simplifiedPoints.length < 3) {
            while (simplifiedPoints.length < 3 && simplifiedPoints.length < normalizedPoints.length) {
                const addIndex = Math.floor(normalizedPoints.length / (4 - simplifiedPoints.length));
                if (addIndex < normalizedPoints.length) {
                    simplifiedPoints.splice(1, 0, normalizedPoints[addIndex]);
                }
            }
        }
        
        // Set angle for first point exactly like reference
        if (simplifiedPoints.length > 1) {
            const dx = simplifiedPoints[1].x - simplifiedPoints[0].x;
            const dy = simplifiedPoints[1].y - simplifiedPoints[0].y;
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            simplifiedPoints[0].angle = Math.round(angle);
        }
        
        // Não fechamos o loop explicitamente adicionando o ponto inicial no final
        // pois o arquivo de referência não faz isso. O fechamento é visual e acontece
        // apenas no renderizador se os pontos estão próximos o suficiente.
        
        this.trackPoints = simplifiedPoints;
        
        // Log FINAL points that will actually be saved (after Douglas-Peucker)
        console.log('🎯 FINAL points after Douglas-Peucker (these will be saved):');
        console.log('📊 Total points after simplification:', this.trackPoints.length);
        this.trackPoints.slice(0, 3).forEach((point, index) => {
            console.log(`  FINAL Point ${index + 1}: x=${point.x}, y=${point.y}${point.angle ? `, angle=${point.angle}` : ''}`);
        });
    }    douglasPeucker(points, tolerance) {
        if (points.length <= 2) return points;
        
        let maxDistance = 0;
        let maxIndex = 0;
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(points[i], firstPoint, lastPoint);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        if (maxDistance > tolerance) {
            const leftSegment = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const rightSegment = this.douglasPeucker(points.slice(maxIndex), tolerance);
            return leftSegment.slice(0, -1).concat(rightSegment);
        }
        
        return [firstPoint, lastPoint];
    }

    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) {
            const dpx = point.x - lineStart.x;
            const dpy = point.y - lineStart.y;
            return Math.sqrt(dpx * dpx + dpy * dpy);
        }
        
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length);
        const clampedT = Math.max(0, Math.min(1, t));
        
        const projX = lineStart.x + clampedT * dx;
        const projY = lineStart.y + clampedT * dy;
        
        const distX = point.x - projX;
        const distY = point.y - projY;
        
        return Math.sqrt(distX * distX + distY * distY);
    }

    renderGridWithOffset() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const hiddenHeight = this.canvas.height * this.GAME_OFFSET_Y;
        const visibleHeight = this.canvas.height - hiddenHeight;
        
        // Draw hidden area
        this.ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
        this.ctx.fillRect(0, visibleHeight, this.canvas.width, hiddenHeight);
        
        // Draw grid
        this.ctx.strokeStyle = "#e0e0e0";
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * this.canvas.width;
            this.ctx.globalAlpha = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, visibleHeight);
            this.ctx.stroke();
            
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.moveTo(x, visibleHeight);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = 0; i <= 10; i++) {
            const y = (i / 10) * this.canvas.height;
            this.ctx.globalAlpha = y > visibleHeight ? 0.3 : 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
        
        // Draw game view boundary
        this.ctx.strokeStyle = "#007ACC";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, visibleHeight);
        this.ctx.lineTo(this.canvas.width, visibleHeight);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw center point
        const centerY = this.canvas.height / 2;
        this.ctx.fillStyle = "#ff0000";
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, centerY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Labels
        this.ctx.fillStyle = "#666";
        this.ctx.font = "12px IBM Plex Mono";
        this.ctx.fillText("🎮 Game View", 5, 15);
        this.ctx.fillText("Hidden Area", 5, visibleHeight + 15);
        this.ctx.fillText("Center", this.canvas.width / 2 + 10, centerY - 10);
    }

    renderDrawingPath() {
        this.renderGridWithOffset();
        
        if (this.drawingPoints.length < 2) return;
        
        const hiddenHeight = this.canvas.height * this.GAME_OFFSET_Y;
        const visibleHeight = this.canvas.height - hiddenHeight;
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.canvas.width, visibleHeight);
        this.ctx.clip();
        
        // Draw path
        this.ctx.strokeStyle = "#007ACC";
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.drawingPoints[0].x, this.drawingPoints[0].y);
        for (let i = 1; i < this.drawingPoints.length; i++) {
            this.ctx.lineTo(this.drawingPoints[i].x, this.drawingPoints[i].y);
        }
        this.ctx.stroke();
        
        // Draw start point
        if (this.drawingPoints.length > 0) {
            this.ctx.fillStyle = "#00ff00";
            this.ctx.beginPath();
            this.ctx.arc(this.drawingPoints[0].x, this.drawingPoints[0].y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        this.ctx.restore();
        this.drawGameViewIndicator(visibleHeight);
    }

    drawGameViewIndicator(visibleHeight) {
        this.ctx.strokeStyle = "rgba(0, 122, 204, 0.8)";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, visibleHeight);
        this.ctx.lineTo(this.canvas.width, visibleHeight);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        this.ctx.font = "bold 14px IBM Plex Mono";
        this.ctx.fillText("🎮 GAME VIEW AREA", 10, visibleHeight - 10);
        
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        this.ctx.font = "12px IBM Plex Mono";
        this.ctx.fillText("Hidden in game (12% bottom cutoff)", 10, visibleHeight + 25);
    }

    getGameScale() {
        // Simulate the scale calculation as if we were using the main game canvas (400x300)
        // This ensures coordinates are normalized correctly for the main game
        const gameCanvasWidth = 400;
        const gameCanvasHeight = 300;
        const canvasAspectRatio = gameCanvasWidth / gameCanvasHeight;
        const gameAspectRatio = this.GAME_BASE_WIDTH / this.GAME_BASE_HEIGHT;
        
        if (canvasAspectRatio > gameAspectRatio) {
            // Canvas is wider than game - fit by height
            return gameCanvasHeight / this.GAME_BASE_HEIGHT;
        } else {
            // Canvas is taller than game - fit by width  
            return gameCanvasWidth / this.GAME_BASE_WIDTH;
        }
    }

    getGameTrackWidth() {
        return 50 * this.getGameScale();
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
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const hiddenHeight = this.canvas.height * this.GAME_OFFSET_Y;
        const visibleHeight = this.canvas.height - hiddenHeight;
        const offsetX = centerX - gameWidth / 2;
        const offsetY = centerY - gameHeight / 2;
        
        const gamePoints = this.trackPoints.map(point => ({
            x: offsetX + point.x * gameWidth,
            y: offsetY + point.y * gameHeight,
            angle: point.angle
        }));
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.canvas.width, visibleHeight);
        this.ctx.clip();
        
        const trackWidth = this.getGameTrackWidth();
        this.renderGameStyleTrack(gamePoints, trackWidth, scale);
        
        this.ctx.restore();
        this.drawGameViewIndicator(visibleHeight);
    }

    renderGameStyleTrack(points, trackWidth, scale) {
        const isInvalid = !this.validateTrackDesign().isValid;
        
        // Track stroke
        this.ctx.strokeStyle = isInvalid ? "#ffcccc" : "#E5E5E5";
        this.ctx.lineWidth = trackWidth;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        
        // Gradient
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        if (isInvalid) {
            gradient.addColorStop(0, "#ffcccc");
            gradient.addColorStop(1, "#ffe6e6");
        } else {
            gradient.addColorStop(0, "#E5E5E5");
            gradient.addColorStop(1, "#F0F0F0");
        }
        this.ctx.strokeStyle = gradient;
        
        // Draw track
        this.ctx.beginPath();
        if (points.length > 0) {
            this.ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                this.ctx.lineTo(points[i].x, points[i].y);
            }
            
            // Auto-close if endpoints are close
            const firstPoint = points[0];
            const lastPoint = points[points.length - 1];
            if (Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y) <= 30) {
                this.ctx.closePath();
            }
        }
        this.ctx.stroke();
        
        // Highlight overlapping segments if invalid
        if (isInvalid) {
            this.highlightOverlappingSegments(points, trackWidth);
        }
        
        // Border
        this.ctx.strokeStyle = isInvalid ? "#ff9999" : "#D1D1D1";
        this.ctx.lineWidth = 2 * scale;
        this.ctx.stroke();
        
        // Draw game elements
        this.drawGameElements(points, scale);
    }

    drawGameElements(points, scale) {
        this.drawGameStyleArrows(points, scale);
        this.drawGameStyleCheckpoints(points);
        this.drawGameStyleStartFinish(points[0], scale);
        this.drawGapIndicator(points);
        
        if (points.length > 0 && points[0].angle !== undefined) {
            this.drawStartArrow(points[0].x, points[0].y, points[0].angle);
        }
        
        this.drawTrackLegend(this.getGameTrackWidth());
        this.updateValidationDisplay();
    }

    drawGameStyleArrows(points, scale) {
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const angle = Math.atan2(next.y - current.y, next.x - current.x);
            const distance = Math.hypot(next.x - current.x, next.y - current.y);
            const spacing = 80 * scale;
            const numArrows = Math.max(1, Math.floor(distance / spacing));
            
            for (let j = 1; j <= numArrows; j++) {
                const t = j / (numArrows + 1);
                const x = current.x + (next.x - current.x) * t;
                const y = current.y + (next.y - current.y) * t;
                this.drawDirectionArrow(x, y, angle, scale);
            }
        }
    }

    drawGameStyleCheckpoints(points) {
        points.forEach((point, index) => {
            this.ctx.fillStyle = index === 0 ? "#00ff00" : 
                                index === points.length - 1 ? "#ff0000" : "#0066ff";
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Number label
            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = "bold 12px IBM Plex Mono";
            this.ctx.strokeStyle = "#000000";
            this.ctx.lineWidth = 3;
            this.ctx.strokeText((index + 1).toString(), point.x + 10, point.y + 4);
            this.ctx.fillText((index + 1).toString(), point.x + 10, point.y + 4);
        });
    }

    drawGameStyleStartFinish(point, scale) {
        if (!point) return;
        
        const flagWidth = 40 * scale;
        const flagHeight = 10 * scale;
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 2; j++) {
                this.ctx.fillStyle = (i + j) % 2 === 0 ? "#1A1A1A" : "#FFFFFF";
                this.ctx.fillRect(
                    point.x - flagWidth / 2 + i * flagWidth / 8,
                    point.y - flagHeight + j * flagHeight,
                    flagWidth / 8,
                    flagHeight
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
        this.ctx.moveTo(-size / 2, -size / 4);
        this.ctx.lineTo(size / 2, 0);
        this.ctx.lineTo(-size / 2, size / 4);
        
        this.ctx.fillStyle = "rgba(26, 26, 26, 0.2)";
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawGapIndicator(points) {
        if (points.length < 3) return;
        
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        
        if (Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y) > 30) {
            this.ctx.setLineDash([10, 10]);
            this.ctx.strokeStyle = "#ff6666";
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(lastPoint.x, lastPoint.y);
            this.ctx.lineTo(firstPoint.x, firstPoint.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            const midX = (firstPoint.x + lastPoint.x) / 2;
            const midY = (firstPoint.y + lastPoint.y) / 2;
            
            this.ctx.fillStyle = "#ff0000";
            this.ctx.font = "bold 14px IBM Plex Mono";
            this.ctx.textAlign = "center";
            this.ctx.fillText("CLOSE LOOP", midX, midY - 5);
            this.ctx.textAlign = "left";
        }
    }

    drawStartArrow(x, y, angle) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle * Math.PI / 180);
        
        this.ctx.beginPath();
        this.ctx.moveTo(-20, -10);
        this.ctx.lineTo(20, 0);
        this.ctx.lineTo(-20, 10);
        this.ctx.closePath();
        
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
        this.ctx.fill();
        
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawTrackLegend(trackWidth) {
        const x = this.canvas.width - 120;
        const y = this.canvas.height - 60;
        
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        this.ctx.fillRect(x, y, 115, 55);
        
        this.ctx.strokeStyle = "#ccc";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, 115, 55);
        
        this.ctx.fillStyle = "#333";
        this.ctx.font = "10px IBM Plex Mono";
        this.ctx.fillText("Track Width:", x + 5, y + 15);
        this.ctx.fillText(`${Math.round(trackWidth)}px`, x + 70, y + 15);
        this.ctx.fillText("Scale:", x + 5, y + 30);
        this.ctx.fillText(`${this.getGameScale().toFixed(2)}x`, x + 70, y + 30);
        this.ctx.fillText("WYSIWYG Mode", x + 5, y + 45);
    }

    // Utility methods
    updatePointList() {
        const pointList = document.getElementById("pointList");
        if (!pointList) return;
        
        if (this.trackPoints.length !== 0) {
            pointList.innerHTML = "";
            this.trackPoints.forEach((point, index) => {
                const div = document.createElement("div");
                div.className = "point-item";
                
                const span = document.createElement("span");
                span.className = "point-coords";
                span.textContent = `${index + 1}. (${point.x.toFixed(3)}, ${point.y.toFixed(3)})${point.angle ? `, ${point.angle}°` : ""}`;
                
                const button = document.createElement("button");
                button.className = "delete-point";
                button.textContent = "×";
                button.onclick = () => this.deletePoint(index);
                
                div.appendChild(span);
                div.appendChild(button);
                pointList.appendChild(div);
            });
        } else {
            pointList.innerHTML = '<div style="text-align: center; color: #999; font-style: italic;">No points added yet</div>';
        }
    }

    updateCodeOutput() {
        const codeOutput = document.getElementById("codeOutput");
        if (!codeOutput) return;
        
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
        
        code += "\n    ];\n}";
        
        codeOutput.value = code;
        this.generatedCode = code;
        this.updateValidationDisplay();
        this.updateSubmitButton();
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
        const offsetX = this.canvas.width / 2 - gameWidth / 2;
        const offsetY = this.canvas.height / 2 - gameHeight / 2;
        
        const firstPoint = this.trackPoints[0];
        const lastPoint = this.trackPoints[this.trackPoints.length - 1];
        const firstX = offsetX + firstPoint.x * gameWidth;
        const firstY = offsetY + firstPoint.y * gameHeight;
        const lastX = offsetX + lastPoint.x * gameWidth;
        const lastY = offsetY + lastPoint.y * gameHeight;
        
        if (Math.hypot(firstX - lastX, firstY - lastY) > 30) {
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
        
        const validator = new TrackDesignValidator(this.getGameTrackWidth());
        const segments = this.createTrackSegments();
        return validator.validateTrackDesign(segments);
    }

    createTrackSegments() {
        const scale = this.getGameScale();
        const gameWidth = this.GAME_BASE_WIDTH * scale;
        const gameHeight = this.GAME_BASE_HEIGHT * scale;
        const offsetX = this.canvas.width / 2 - gameWidth / 2;
        const offsetY = this.canvas.height / 2 - gameHeight / 2;
        
        const segments = [];
        for (let i = 0; i < this.trackPoints.length - 1; i++) {
            const current = this.trackPoints[i];
            const next = this.trackPoints[i + 1];
            
            segments.push({
                startX: offsetX + current.x * gameWidth,
                startY: offsetY + current.y * gameHeight,
                endX: offsetX + next.x * gameWidth,
                endY: offsetY + next.y * gameHeight,
                index: i
            });
        }
        
        return segments;
    }

    highlightOverlappingSegments(points, trackWidth) {
        if (points.length < 3) return;
        
        const validation = this.validateTrackDesign();
        if (validation.isValid) return;
        
        const segments = [];
        for (let i = 0; i < points.length - 1; i++) {
            segments.push({
                start: points[i],
                end: points[i + 1],
                index: i
            });
        }
        
        const problemSegments = new Set();
        validation.issues.forEach(issue => {
            if (issue.segments) {
                issue.segments.forEach(segmentIndex => {
                    problemSegments.add(segmentIndex);
                });
            }
        });
        
        this.ctx.strokeStyle = "#ff0000";
        this.ctx.lineWidth = 8;
        this.ctx.lineCap = "round";
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

    updateValidationDisplay() {
        const validation = this.validateTrackDesign();
        const copyBtn = document.getElementById("copyCodeBtn");
        const codeOutput = document.getElementById("codeOutput");
        
        // Agora esperamos que o elemento já exista no HTML
        let errorDisplay = document.getElementById("trackErrorDisplay");
        if (!errorDisplay) {
            console.error("❌ Could not find #trackErrorDisplay element in the DOM");
            return; // Se não encontrar, saímos da função sem tentar manipular
        }
        
        if (validation.isValid) {
            errorDisplay.style.display = "none";
            if (copyBtn) {
                copyBtn.style.backgroundColor = "";
                copyBtn.style.borderColor = "";
                copyBtn.style.color = "";
                copyBtn.textContent = "Copy to Clipboard";
            }
        } else {
            errorDisplay.style.display = "block";
            errorDisplay.style.backgroundColor = "#ffe6e6";
            errorDisplay.style.border = "1px solid #ff9999";
            errorDisplay.style.color = "#cc0000";
            
            let html = "<strong>⚠️ Track Design Issues:</strong><br>";
            html += validation.message;
            
            if (validation.issues && validation.issues.length > 1) {
                html += '<br><br><strong>All Issues:</strong><ul style="margin: 5px 0; padding-left: 20px;">';
                validation.issues.forEach(issue => {
                    if (issue.severity === "error") {
                        html += `<li style="margin: 2px 0;">${issue.message}</li>`;
                    }
                });
                html += "</ul>";
            }
            
            html += `<br><br><strong>Design Tips:</strong><ul style="margin: 5px 0; padding-left: 20px">
                <li>✅ Complete your loop by connecting the end to the start</li>
                <li>✅ Tracks can get close - only actual crossovers are blocked</li>
                <li>✅ Sharp corners are allowed</li>
                <li>❌ Only segments that cross through each other are flagged</li>
            </ul>`;
            
            html += '<br><small style="color: #888;">💡 Problem segments are highlighted in red on the track.</small>';
            
            errorDisplay.innerHTML = html;
            
            if (copyBtn) {
                copyBtn.style.backgroundColor = "#dc3545";
                copyBtn.style.borderColor = "#dc3545";
                copyBtn.style.color = "#ffffff";
                copyBtn.textContent = "Fix errors before copying";
                copyBtn.disabled = false;
            }
        }
        
        this.updateSubmitButton();
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById("testTrackBtn");
        const statusMsg = document.getElementById("statusMsg");
        
        if (!submitBtn) return;
        
        if (this.trackPoints.length === 0) {
            submitBtn.disabled = true;
            if (statusMsg) {
                statusMsg.textContent = "";
                statusMsg.className = "";
                statusMsg.style.display = "none";
            }
            return;
        }
        
        if (this.validateTrackDesign().isValid) {
            submitBtn.disabled = false;
            if (statusMsg) {
                statusMsg.textContent = "🏁 Track is ready to test in game";
                statusMsg.className = "status-message status-ready";
                statusMsg.style.display = "block";
            }
        } else {
            submitBtn.disabled = true;
            if (statusMsg) {
                statusMsg.textContent = "";
                statusMsg.className = "";
                statusMsg.style.display = "none";
            }
        }
    }

    // Action methods
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
        
        const statusMsg = document.getElementById("statusMsg");
        if (statusMsg) {
            statusMsg.textContent = "";
            statusMsg.className = "";
        }
    }

    deletePoint(index) {
        this.trackPoints.splice(index, 1);
        this.updatePointList();
        this.updateCodeOutput();
        this.renderTrack();
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
    }

    copyCode() {
        const codeOutput = document.getElementById("codeOutput");
        if (!codeOutput) return;
        
        if (codeOutput.value.trim() === "") {
            alert("No code to copy. Add some track points first!");
            return;
        }
        
        const validation = this.validateTrackDesign();
        if (validation.isValid) {
            codeOutput.select();
            codeOutput.setSelectionRange(0, 99999);
            
            try {
                document.execCommand("copy");
                alert("Code copied to clipboard!");
            } catch (err) {
                navigator.clipboard.writeText(codeOutput.value).then(() => {
                    alert("Code copied to clipboard!");
                }).catch(() => {
                    alert("Failed to copy code. Please select and copy manually.");
                });
            }
        } else {
            alert("Track Design Error: " + validation.message);
        }
    }

    testTrackInGame() {
        console.log("🧪 Testing track in game...");
        
        // Check validation
        const validation = this.validateTrackDesign();
        console.log("🔍 Track validation:", validation);
        
        if (!validation.isValid) {
            alert("Please fix track design errors before testing!");
            console.error("❌ Track validation failed:", validation.message);
            return;
        }
        
        if (this.trackPoints.length === 0) {
            alert("Please create a track first!");
            console.error("❌ No track points found");
            return;
        }
        
        // Save track data to localStorage
        const trackData = {
            points: this.trackPoints,
            canvasSize: {
                width: 400,  // Save target game canvas size, not generator canvas size
                height: 300
            },
            timestamp: new Date().toISOString(),
            isComplete: true
        };
        
        console.log("💾 Saving track data to localStorage:");
        console.log("📊 Track points being saved:", this.trackPoints);
        console.log("📐 Target game canvas size being saved:", trackData.canvasSize);
        console.log("⚙️ Generator scale being used:", this.getGameScale());
        console.log("🎨 Generator canvas size:", {width: this.canvas.width, height: this.canvas.height});
        
        // Log first few points with detail
        if (this.trackPoints.length > 0) {
            console.log("🔍 First 3 points details:");
            this.trackPoints.slice(0, 3).forEach((point, index) => {
                console.log(`  Point ${index + 1}: x=${point.x}, y=${point.y}${point.angle ? `, angle=${point.angle}` : ''}`);
            });
        }
        
        localStorage.setItem('customTrackData', JSON.stringify(trackData));
        
        console.log("🚀 Navigating to main game...");
        // Navigate to main game
        window.location.href = 'index.html';
    }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    console.log("📊 DOM Content Loaded - Elements check:", {
        canvasElement: document.getElementById("trackCanvas"),
        undoButton: document.getElementById("undoBtn"),
        clearButton: document.getElementById("clearBtn"),
        loadExampleButton: document.getElementById("loadExampleBtn"),
        copyCodeButton: document.getElementById("copyCodeBtn"),
        testTrackButton: document.getElementById("testTrackBtn"),
        pointList: document.getElementById("pointList"),
        codeOutput: document.getElementById("codeOutput"),
        statusMsg: document.getElementById("statusMsg")
    });
    new TrackGenerator();
});
