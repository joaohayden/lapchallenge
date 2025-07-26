// Track generation and rendering module
class Track {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Track properties
        this.trackWidth = 40;
        this.centerPoints = [];
        this.trackPath = [];
        this.innerPath = [];
        this.outerPath = [];
        
        // Start/finish line
        this.startLine = { x: 0, y: 0, angle: 0 };
        
        this.generateTrack();
    }
    
    generateTrack() {
        // Generate a simple oval track with some curves
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radiusX = this.width * 0.35;
        const radiusY = this.height * 0.35;
        
        this.centerPoints = [];
        const numPoints = 32; // Number of points to define the track
        
        // Create an oval with some random variations
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            
            // Add some randomness to make it more interesting
            const variation = Math.sin(angle * 3) * 15 + Math.cos(angle * 5) * 10;
            
            const x = centerX + Math.cos(angle) * (radiusX + variation);
            const y = centerY + Math.sin(angle) * (radiusY + variation * 0.7);
            
            this.centerPoints.push({ x, y });
        }
        
        // Set start line at the first point
        this.startLine.x = this.centerPoints[0].x;
        this.startLine.y = this.centerPoints[0].y;
        this.startLine.angle = Math.atan2(
            this.centerPoints[1].y - this.centerPoints[0].y,
            this.centerPoints[1].x - this.centerPoints[0].x
        );
        
        this.generateTrackBounds();
    }
    
    generateTrackBounds() {
        this.innerPath = [];
        this.outerPath = [];
        
        for (let i = 0; i < this.centerPoints.length; i++) {
            const current = this.centerPoints[i];
            const next = this.centerPoints[(i + 1) % this.centerPoints.length];
            
            // Calculate perpendicular direction
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            const perpX = -dy / length;
            const perpY = dx / length;
            
            // Create inner and outer points
            const halfWidth = this.trackWidth / 2;
            
            this.innerPath.push({
                x: current.x + perpX * halfWidth,
                y: current.y + perpY * halfWidth
            });
            
            this.outerPath.push({
                x: current.x - perpX * halfWidth,
                y: current.y - perpY * halfWidth
            });
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#001100';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw track background (grass)
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw track using generator-style stroke rendering (like renderGameStyleTrack)
        this.renderTrackStroke();
        
        // Draw track center line
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerPoints[0].x, this.centerPoints[0].y);
        for (let i = 1; i < this.centerPoints.length; i++) {
            this.ctx.lineTo(this.centerPoints[i].x, this.centerPoints[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw direction arrows on track
        this.drawDirectionArrows();

        // Draw start/finish line
        this.drawStartLine();

        // Draw track boundaries
        this.drawBoundaries();
    }
    
    // Renderização usando stroke (como no gerador) em vez de fill('evenodd')
    renderTrackStroke() {
        // Track stroke principal - cor mais escura como no design original
        this.ctx.strokeStyle = "#333333"; // Cinza escuro como era antes
        this.ctx.lineWidth = this.trackWidth;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        
        // Criar gradiente mais escuro
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, "#333333"); // Cinza escuro
        gradient.addColorStop(1, "#404040"); // Cinza um pouco mais claro
        this.ctx.strokeStyle = gradient;
        
        // Desenhar pista seguindo a linha central
        this.ctx.beginPath();
        if (this.centerPoints.length > 0) {
            this.ctx.moveTo(this.centerPoints[0].x, this.centerPoints[0].y);
            for (let i = 1; i < this.centerPoints.length; i++) {
                this.ctx.lineTo(this.centerPoints[i].x, this.centerPoints[i].y);
            }
            this.ctx.closePath(); // Fechar o circuito
        }
        this.ctx.stroke();
        
        // Desenhar borda da pista mais escura também
        this.ctx.strokeStyle = "#222222"; // Borda bem escura
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Remover linha central tracejada para design mais limpo
        // this.ctx.strokeStyle = '#666666';
        // this.ctx.lineWidth = 2;
        // this.ctx.setLineDash([5, 5]);
        // this.ctx.beginPath();
        // this.ctx.moveTo(this.centerPoints[0].x, this.centerPoints[0].y);
        // for (let i = 1; i < this.centerPoints.length; i++) {
        //     this.ctx.lineTo(this.centerPoints[i].x, this.centerPoints[i].y);
        // }
        // this.ctx.closePath();
        // this.ctx.stroke();
        // this.ctx.setLineDash([]);

        // Remover setas de direção para design mais limpo
        // this.drawDirectionArrows();

        // Draw start/finish line
        this.drawStartLine();

        // Draw track boundaries (agora invisíveis)
        this.drawBoundaries();
    }
    
    drawStartLine() {
        const startPoint = this.centerPoints[0];
        const nextPoint = this.centerPoints[1];
        
        // Calculate perpendicular direction for start line
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        const perpX = -dy / length;
        const perpY = dx / length;
        
        const halfWidth = this.trackWidth / 2;
        
        // Draw start line
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(
            startPoint.x + perpX * halfWidth,
            startPoint.y + perpY * halfWidth
        );
        this.ctx.lineTo(
            startPoint.x - perpX * halfWidth,
            startPoint.y - perpY * halfWidth
        );
        this.ctx.stroke();
        
        // Draw checkered pattern
        this.ctx.fillStyle = '#FFFFFF';
        const checkSize = 4;
        const numChecks = Math.floor(this.trackWidth / checkSize);
        
        for (let i = 0; i < numChecks; i++) {
            if (i % 2 === 0) {
                const t = (i / numChecks - 0.5);
                const x = startPoint.x + perpX * halfWidth * t;
                const y = startPoint.y + perpY * halfWidth * t;
                
                this.ctx.fillRect(x - checkSize/2, y - checkSize/2, checkSize, checkSize);
            }
        }
    }
    
    drawBoundaries() {
        // Todas as bordas invisíveis - apenas pista limpa
        // this.drawVisualTrackBoundaries(); // Comentado
        
        // Linhas de tolerância também invisíveis
        // const gameMode = window.game && window.game.ui && window.game.ui.getGameMode ? window.game.ui.getGameMode() : 'classic';
        // if (gameMode === 'continuous') {
        //     this.drawToleranceBoundaries();
        // }
    }
    
    // Desenhar as bordas reais de colisão (limite visual da pista)
    drawVisualTrackBoundaries() {
        const halfWidth = this.trackWidth / 2; // 20px para trackWidth=40
        
        // Calcular bordas reais baseadas na linha central
        const innerBoundary = [];
        const outerBoundary = [];
        
        for (let i = 0; i < this.centerPoints.length; i++) {
            const current = this.centerPoints[i];
            const next = this.centerPoints[(i + 1) % this.centerPoints.length];
            
            // Calculate perpendicular direction
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length === 0) continue;
            
            const perpX = -dy / length;
            const perpY = dx / length;
            
            // Bordas no limite visual exato
            innerBoundary.push({
                x: current.x + perpX * halfWidth,
                y: current.y + perpY * halfWidth
            });
            
            outerBoundary.push({
                x: current.x - perpX * halfWidth,
                y: current.y - perpY * halfWidth
            });
        }
        
        // Desenhar bordas de colisão em verde claro para mostrar onde é o limite
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'; // Verde semi-transparente
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]); // Linha tracejada
        
        // Borda interna
        this.ctx.beginPath();
        this.ctx.moveTo(innerBoundary[0].x, innerBoundary[0].y);
        for (let i = 1; i < innerBoundary.length; i++) {
            this.ctx.lineTo(innerBoundary[i].x, innerBoundary[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Borda externa
        this.ctx.beginPath();
        this.ctx.moveTo(outerBoundary[0].x, outerBoundary[0].y);
        for (let i = 1; i < outerBoundary.length; i++) {
            this.ctx.lineTo(outerBoundary[i].x, outerBoundary[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.setLineDash([]); // Restaurar linha sólida
    }
    
    drawToleranceBoundaries() {
        const tolerance = 8; // 8 pixels além do limite visual da pista
        const halfWidth = this.trackWidth / 2;
        const toleranceRadius = halfWidth + tolerance; // Raio total incluindo tolerância
        
        // Calcular bordas de tolerância baseadas na linha central
        const innerToleranceBoundary = [];
        const outerToleranceBoundary = [];
        
        for (let i = 0; i < this.centerPoints.length; i++) {
            const current = this.centerPoints[i];
            const next = this.centerPoints[(i + 1) % this.centerPoints.length];
            
            // Calculate perpendicular direction
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length === 0) continue;
            
            const perpX = -dy / length;
            const perpY = dx / length;
            
            // Bordas de tolerância
            innerToleranceBoundary.push({
                x: current.x + perpX * toleranceRadius,
                y: current.y + perpY * toleranceRadius
            });
            
            outerToleranceBoundary.push({
                x: current.x - perpX * toleranceRadius,
                y: current.y - perpY * toleranceRadius
            });
        }
        
        // Desenhar bordas de tolerância em azul
        this.ctx.strokeStyle = '#0066FF';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        
        // Borda interna de tolerância
        this.ctx.beginPath();
        this.ctx.moveTo(innerToleranceBoundary[0].x, innerToleranceBoundary[0].y);
        for (let i = 1; i < innerToleranceBoundary.length; i++) {
            this.ctx.lineTo(innerToleranceBoundary[i].x, innerToleranceBoundary[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Borda externa de tolerância
        this.ctx.beginPath();
        this.ctx.moveTo(outerToleranceBoundary[0].x, outerToleranceBoundary[0].y);
        for (let i = 1; i < outerToleranceBoundary.length; i++) {
            this.ctx.lineTo(outerToleranceBoundary[i].x, outerToleranceBoundary[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    drawDirectionArrows() {
        // Draw minimalist chevron arrows at intervals along the track center line
        const arrowSpacing = 8; // Menos setas para ficar mais limpo
        const chevronSize = 6; // Menor e mais discreto
        
        this.ctx.strokeStyle = '#00FF00'; // Verde
        this.ctx.lineWidth = 2; // Linha mais fina e elegante
        this.ctx.lineCap = 'round'; // Pontas arredondadas para ficar mais suave
        
        for (let i = 0; i < this.centerPoints.length; i += arrowSpacing) {
            const current = this.centerPoints[i];
            const next = this.centerPoints[(i + 1) % this.centerPoints.length];
            
            // Calculate direction vector
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                // Normalize direction
                const dirX = dx / length;
                const dirY = dy / length;
                
                // Calculate perpendicular for chevron wings
                const perpX = -dirY;
                const perpY = dirX;
                
                // Chevron minimalista: duas linhas simples formando >
                const centerX = current.x;
                const centerY = current.y;
                
                // Ponto central para onde as linhas convergem
                const tipX = centerX + dirX * chevronSize;
                const tipY = centerY + dirY * chevronSize;
                
                // Draw simple minimalist chevron
                this.ctx.beginPath();
                // Linha superior
                this.ctx.moveTo(centerX - dirX * 2 + perpX * chevronSize, centerY - dirY * 2 + perpY * chevronSize);
                this.ctx.lineTo(tipX, tipY);
                // Linha inferior
                this.ctx.moveTo(tipX, tipY);
                this.ctx.lineTo(centerX - dirX * 2 - perpX * chevronSize, centerY - dirY * 2 - perpY * chevronSize);
                this.ctx.stroke();
            }
        }
    }
    
    drawTolerancePath(path, offset, color) {
        // Linha azul invisível - mantém a lógica mas não desenha nada
        // A zona de tolerância funciona como a "zebra" da Fórmula 1
        // Todo o código de detecção continua funcionando normalmente
        
        // Código comentado para manter invisível:
        /*
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 10; // Linha muito grossa
        this.ctx.setLineDash([12, 6]); // Tracejado bem grosso
        this.ctx.beginPath();
        
        for (let i = 0; i < path.length; i++) {
            const current = path[i];
            const next = path[(i + 1) % path.length];
            const prev = path[i === 0 ? path.length - 1 : i - 1];
            
            // Calculate perpendicular direction
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                const perpX = -dy / length;
                const perpY = dx / length;
                
                const offsetX = current.x + perpX * offset;
                const offsetY = current.y + perpY * offset;
                
                if (i === 0) {
                    this.ctx.moveTo(offsetX, offsetY);
                } else {
                    this.ctx.lineTo(offsetX, offsetY);
                }
            }
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset to solid line
        */
    }
    
    // Check if a point is on the track
    isOnTrack(x, y, tolerance = 0) {
        // Nova colisão baseada na distância da linha central (limite visual da pista)
        const distanceFromCenter = this.getDistanceFromCenterLine(x, y);
        const visualTrackRadius = this.trackWidth / 2; // Raio visual da pista (20px para trackWidth=40)
        
        if (tolerance > 0) {
            // Modo contínuo: permite zona de tolerância além do limite visual
            return distanceFromCenter <= (visualTrackRadius + tolerance);
        } else {
            // Modo clássico: colisão exata no limite visual da pista
            return distanceFromCenter <= visualTrackRadius;
        }
    }
    
    // Calcular distância mínima do ponto para a linha central da pista
    getDistanceFromCenterLine(x, y) {
        let minDistance = Infinity;
        
        for (let i = 0; i < this.centerPoints.length; i++) {
            const current = this.centerPoints[i];
            const next = this.centerPoints[(i + 1) % this.centerPoints.length];
            
            const dist = this.distanceToLineSegment(x, y, current.x, current.y, next.x, next.y);
            minDistance = Math.min(minDistance, dist);
        }
        
        return minDistance;
    }
    
    // Check if point is within the tolerance boundaries
    isWithinYellowBoundaries(x, y) {
        // Nova lógica: baseada na distância da linha central
        const tolerance = 8;
        const distanceFromCenter = this.getDistanceFromCenterLine(x, y);
        const visualTrackRadius = this.trackWidth / 2;
        
        // Permitir movimento dentro da pista + zona de tolerância
        return distanceFromCenter <= (visualTrackRadius + tolerance);
    }
    
    // Get minimum distance from point to a path
    getDistanceToPath(x, y, path) {
        let minDistance = Infinity;
        
        for (let i = 0; i < path.length; i++) {
            const current = path[i];
            const next = path[(i + 1) % path.length];
            
            const dist = this.distanceToLineSegment(x, y, current.x, current.y, next.x, next.y);
            minDistance = Math.min(minDistance, dist);
        }
        
        return minDistance;
    }
    
    // Calculate distance from point to line segment
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) {
            // Line segment is actually a point
            const dpx = px - x1;
            const dpy = py - y1;
            return Math.sqrt(dpx * dpx + dpy * dpy);
        }
        
        // Calculate the t parameter for the projection
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        
        // Find the projection point
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        // Calculate distance to projection
        const dpx = px - projX;
        const dpy = py - projY;
        return Math.sqrt(dpx * dpx + dpy * dpy);
    }
    
    pointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > y) !== (polygon[j].y > y)) &&
                (x < (polygon[j].x - polygon[i].x) * (y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    // Get the closest point on the center line
    getClosestCenterPoint(x, y) {
        let closestDistance = Infinity;
        let closestIndex = 0;
        
        for (let i = 0; i < this.centerPoints.length; i++) {
            const dx = this.centerPoints[i].x - x;
            const dy = this.centerPoints[i].y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        
        return { index: closestIndex, distance: closestDistance };
    }

    // Get the expected direction at a given position on track
    getExpectedDirection(x, y) {
        const closest = this.getClosestCenterPoint(x, y);
        const currentPoint = this.centerPoints[closest.index];
        const nextPoint = this.centerPoints[(closest.index + 1) % this.centerPoints.length];
        
        // Calculate expected direction vector
        const dx = nextPoint.x - currentPoint.x;
        const dy = nextPoint.y - currentPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 0) {
            return {
                x: dx / length,
                y: dy / length,
                angle: Math.atan2(dy, dx)
            };
        }
        
        return { x: 0, y: 0, angle: 0 };
    }

    // Check if car direction matches track direction
    isCarDirectionCorrect(carX, carY, carAngle, tolerance = Math.PI / 3) {
        const expectedDir = this.getExpectedDirection(carX, carY);
        
        // Calculate angle difference
        let angleDiff = Math.abs(carAngle - expectedDir.angle);
        
        // Normalize angle difference to [0, PI]
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        return angleDiff <= tolerance;
    }
    
    // Check if car crossed start/finish line with direction validation
    checkStartLineCrossing(prevX, prevY, currentX, currentY) {
        const startPoint = this.centerPoints[0];
        const nextPoint = this.centerPoints[1];
        
        // Calculate start line endpoints
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        const perpX = -dy / length;
        const perpY = dx / length;
        
        const halfWidth = this.trackWidth / 2;
        
        const lineStart = {
            x: startPoint.x + perpX * halfWidth,
            y: startPoint.y + perpY * halfWidth
        };
        
        const lineEnd = {
            x: startPoint.x - perpX * halfWidth,
            y: startPoint.y - perpY * halfWidth
        };
        
        // Check if line was crossed
        const crossed = this.lineIntersection(
            prevX, prevY, currentX, currentY,
            lineStart.x, lineStart.y, lineEnd.x, lineEnd.y
        );
        
        if (crossed) {
            // Calculate which side of the line each position is on
            const prevSide = this.getLineSide(prevX, prevY, lineStart, lineEnd);
            const currentSide = this.getLineSide(currentX, currentY, lineStart, lineEnd);
            
            console.log(`🔍 Track: Start line crossed!`);
            console.log(`  Previous pos: (${prevX.toFixed(1)}, ${prevY.toFixed(1)}) - Side: ${prevSide}`);
            console.log(`  Current pos: (${currentX.toFixed(1)}, ${currentY.toFixed(1)}) - Side: ${currentSide}`);
            console.log(`  Line start: (${lineStart.x.toFixed(1)}, ${lineStart.y.toFixed(1)})`);
            console.log(`  Line end: (${lineEnd.x.toFixed(1)}, ${lineEnd.y.toFixed(1)})`);
            console.log(`  🔍 VALIDATION CHECK:`);
            console.log(`    - prevSide: "${prevSide}"`);
            console.log(`    - currentSide: "${currentSide}"`);
            console.log(`    - Are they different? ${prevSide !== currentSide}`);
            console.log(`    - Valid direction result: ${prevSide !== currentSide}`);
            
            const validDirection = prevSide !== currentSide;
            
            return {
                crossed: true,
                fromSide: prevSide,
                toSide: currentSide,
                validDirection: validDirection // Only valid if crossing from one side to another
            };
        }
        
        return { crossed: false };
    }
    
    // Determine which side of the start line a point is on
    getLineSide(x, y, lineStart, lineEnd) {
        // Use cross product to determine side
        const crossProduct = (lineEnd.x - lineStart.x) * (y - lineStart.y) - 
                            (lineEnd.y - lineStart.y) * (x - lineStart.x);
        const side = crossProduct > 0 ? 'left' : 'right';
        
        console.log(`  getLineSide: Point (${x.toFixed(1)}, ${y.toFixed(1)}) - CrossProduct: ${crossProduct.toFixed(2)} - Side: ${side}`);
        
        return side;
    }
    
    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
}

