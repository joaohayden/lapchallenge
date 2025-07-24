// Physics and math utilities
class Physics {
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    static normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
    
    static angleDifference(a1, a2) {
        let diff = a2 - a1;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }
    
    // Vector operations
    static vectorLength(x, y) {
        return Math.sqrt(x * x + y * y);
    }
    
    static vectorNormalize(x, y) {
        const length = this.vectorLength(x, y);
        if (length === 0) return { x: 0, y: 0 };
        return { x: x / length, y: y / length };
    }
    
    static vectorDot(x1, y1, x2, y2) {
        return x1 * x2 + y1 * y2;
    }
    
    // Collision detection
    static pointInCircle(px, py, cx, cy, radius) {
        return this.distance(px, py, cx, cy) <= radius;
    }
    
    static circleIntersection(x1, y1, r1, x2, y2, r2) {
        return this.distance(x1, y1, x2, y2) <= (r1 + r2);
    }
    
    // Line intersection
    static lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1),
                t: t,
                u: u
            };
        }
        
        return null;
    }
    
    // Smooth interpolation functions
    static smoothStep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }
    
    static smootherStep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    // Easing functions
    static easeInQuad(t) {
        return t * t;
    }
    
    static easeOutQuad(t) {
        return t * (2 - t);
    }
    
    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    static easeInCubic(t) {
        return t * t * t;
    }
    
    static easeOutCubic(t) {
        return (--t) * t * t + 1;
    }
    
    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
}

// Time utilities
class TimeUtils {
    static formatTime(milliseconds) {
        const totalSeconds = milliseconds / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const ms = Math.floor((milliseconds % 1000) / 10); // Two decimal places
        
        if (minutes > 0) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        } else {
            return `${seconds}.${ms.toString().padStart(2, '0')}s`;
        }
    }
    
    static formatTimeShort(milliseconds) {
        const totalSeconds = milliseconds / 1000;
        const seconds = Math.floor(totalSeconds);
        const ms = Math.floor(milliseconds % 1000);
        
        return `${seconds}.${ms.toString().padStart(3, '0')}s`;
    }
    
    static parseTime(timeString) {
        // Parse time string back to milliseconds
        const parts = timeString.split(':');
        let totalMs = 0;
        
        if (parts.length === 2) {
            // Format: "M:SS.MS"
            const minutes = parseInt(parts[0]);
            const secondsParts = parts[1].split('.');
            const seconds = parseInt(secondsParts[0]);
            const ms = parseInt(secondsParts[1]) * 10;
            
            totalMs = minutes * 60 * 1000 + seconds * 1000 + ms;
        } else {
            // Format: "SS.MSs"
            const cleanString = timeString.replace('s', '');
            const secondsParts = cleanString.split('.');
            const seconds = parseInt(secondsParts[0]);
            const ms = parseInt(secondsParts[1]) * 10;
            
            totalMs = seconds * 1000 + ms;
        }
        
        return totalMs;
    }
}

// Random utilities
class Random {
    static between(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    static betweenInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static choice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    static gaussian(mean = 0, stdDev = 1) {
        // Box-Muller transform
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return z * stdDev + mean;
    }
}

