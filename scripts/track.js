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
        this.ctx.fillStyle = '#004400';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw track surface
        this.ctx.fillStyle = '#333333';
        this.ctx.beginPath();
        
        // Draw outer boundary
        this.ctx.moveTo(this.outerPath[0].x, this.outerPath[0].y);
        for (let i = 1; i < this.outerPath.length; i++) {
            this.ctx.lineTo(this.outerPath[i].x, this.outerPath[i].y);
        }
        this.ctx.closePath();
        
        // Draw inner boundary (hole)
        this.ctx.moveTo(this.innerPath[0].x, this.innerPath[0].y);
        for (let i = this.innerPath.length - 1; i >= 0; i--) {
            this.ctx.lineTo(this.innerPath[i].x, this.innerPath[i].y);
        }
        this.ctx.closePath();
        
        this.ctx.fill('evenodd');
        
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
        
        // Draw start/finish line
        this.drawStartLine();
        
        // Draw track boundaries
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
        // Draw inner boundary
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.innerPath[0].x, this.innerPath[0].y);
        for (let i = 1; i < this.innerPath.length; i++) {
            this.ctx.lineTo(this.innerPath[i].x, this.innerPath[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw outer boundary
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.moveTo(this.outerPath[0].x, this.outerPath[0].y);
        for (let i = 1; i < this.outerPath.length; i++) {
            this.ctx.lineTo(this.outerPath[i].x, this.outerPath[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }
    
    // Check if a point is on the track
    isOnTrack(x, y) {
        // Simple point-in-polygon test for track bounds
        return this.pointInPolygon(x, y, this.outerPath) && 
               !this.pointInPolygon(x, y, this.innerPath);
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
    
    // Check if car crossed start/finish line
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
        
        // Check line intersection
        return this.lineIntersection(
            prevX, prevY, currentX, currentY,
            lineStart.x, lineStart.y, lineEnd.x, lineEnd.y
        );
    }
    
    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
}

