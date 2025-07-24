// Share functionality module (Lap Drop)
class ShareManager {
    constructor(game) {
        this.game = game;
        this.canvas = null;
        this.ctx = null;
        
        this.setupShareElements();
    }
    
    setupShareElements() {
        // Create share button if it doesn't exist
        let shareButton = document.getElementById('shareButton');
        if (!shareButton) {
            shareButton = document.createElement('button');
            shareButton.id = 'shareButton';
            shareButton.className = 'pixel-button';
            shareButton.innerHTML = '<span class="share-icon">⚡</span> LAP DROP';
            
            const controlsPanel = document.querySelector('.controls-panel');
            if (controlsPanel) {
                controlsPanel.appendChild(shareButton);
            }
        }
        
        shareButton.addEventListener('click', () => {
            this.generateShareImage();
        });
        
        // Create share modal
        this.createShareModal();
    }
    
    createShareModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('shareModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'shareModal';
        modal.className = 'share-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        `;
        
        const card = document.createElement('div');
        card.className = 'share-card';
        card.style.cssText = `
            background: #222;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 20px;
            max-width: 90%;
            max-height: 90%;
            text-align: center;
            position: relative;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
        `;
        closeButton.addEventListener('click', () => this.closeShareModal());
        
        const canvas = document.createElement('canvas');
        canvas.id = 'shareCanvas';
        canvas.width = 600;
        canvas.height = 600;
        canvas.style.cssText = `
            border: 2px solid #333;
            border-radius: 5px;
            max-width: 100%;
            height: auto;
            margin-bottom: 20px;
        `;
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        `;
        
        const downloadButton = document.createElement('button');
        downloadButton.className = 'pixel-button';
        downloadButton.innerHTML = '<span class="share-icon">💾</span> DOWNLOAD';
        downloadButton.addEventListener('click', () => this.downloadShareImage());
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'pixel-button';
        cancelButton.textContent = 'CANCELAR';
        cancelButton.addEventListener('click', () => this.closeShareModal());
        
        buttonsContainer.appendChild(downloadButton);
        buttonsContainer.appendChild(cancelButton);
        
        card.appendChild(closeButton);
        card.appendChild(canvas);
        card.appendChild(buttonsContainer);
        modal.appendChild(card);
        document.body.appendChild(modal);
        
        this.shareModal = modal;
        this.shareCanvas = canvas;
        this.shareCtx = canvas.getContext('2d');
    }
    
    generateShareImage() {
        const stats = this.game.getStats();
        
        if (!stats.bestTime) {
            this.game.ui.showMessage('Complete pelo menos uma volta para compartilhar!', 'info');
            return;
        }
        
        this.drawShareImage(stats);
        this.showShareModal();
    }
    
    drawShareImage(stats) {
        const canvas = this.shareCanvas;
        const ctx = this.shareCtx;
        
        // Clear canvas
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0d0d0d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw title
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 48px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('HOTLAP DAILY', canvas.width / 2, 80);
        
        // Draw subtitle
        ctx.fillStyle = '#CCC';
        ctx.font = '20px "IBM Plex Mono", monospace';
        ctx.fillText('vá com tudo para definir o tempo de hoje', canvas.width / 2, 110);
        
        // Draw track preview (simplified)
        this.drawTrackPreview(ctx, canvas.width / 2, 250, 200);
        
        // Draw best time
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "IBM Plex Mono", monospace';
        ctx.fillText('MELHOR TEMPO', canvas.width / 2, 420);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px "IBM Plex Mono", monospace';
        ctx.fillText(TimeUtils.formatTime(stats.bestTime), canvas.width / 2, 470);
        
        // Draw player info
        ctx.fillStyle = '#89CFF0';
        ctx.font = '24px "IBM Plex Mono", monospace';
        ctx.fillText(stats.playerInfo.name, canvas.width / 2, 520);
        
        ctx.fillStyle = '#CCC';
        ctx.font = '18px "IBM Plex Mono", monospace';
        ctx.fillText(stats.playerInfo.teamName, canvas.width / 2, 545);
        
        // Draw sparkline if available
        if (stats.lapTimes.length > 0) {
            this.drawSparkline(ctx, canvas.width / 2, 580, stats.lapTimes);
        }
        
        // Draw footer
        ctx.fillStyle = '#666';
        ctx.font = '14px "IBM Plex Mono", monospace';
        ctx.fillText('hotlapdaily.com', canvas.width / 2, canvas.height - 20);
    }
    
    drawTrackPreview(ctx, centerX, centerY, size) {
        // Draw simplified track based on the game track
        const track = this.game.track;
        const scale = size / Math.max(track.canvas.width, track.canvas.height);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-track.canvas.width / 2, -track.canvas.height / 2);
        
        // Draw track surface
        ctx.fillStyle = '#333';
        ctx.beginPath();
        
        // Outer boundary
        ctx.moveTo(track.outerPath[0].x, track.outerPath[0].y);
        for (let i = 1; i < track.outerPath.length; i++) {
            ctx.lineTo(track.outerPath[i].x, track.outerPath[i].y);
        }
        ctx.closePath();
        
        // Inner boundary (hole)
        ctx.moveTo(track.innerPath[0].x, track.innerPath[0].y);
        for (let i = track.innerPath.length - 1; i >= 0; i--) {
            ctx.lineTo(track.innerPath[i].x, track.innerPath[i].y);
        }
        ctx.closePath();
        
        ctx.fill('evenodd');
        
        // Draw start line
        const startPoint = track.centerPoints[0];
        const nextPoint = track.centerPoints[1];
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / length;
        const perpY = dx / length;
        const halfWidth = track.trackWidth / 2;
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(
            startPoint.x + perpX * halfWidth,
            startPoint.y + perpY * halfWidth
        );
        ctx.lineTo(
            startPoint.x - perpX * halfWidth,
            startPoint.y - perpY * halfWidth
        );
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawSparkline(ctx, centerX, y, lapTimes) {
        if (lapTimes.length === 0) return;
        
        const recentTimes = lapTimes.slice(-9);
        const minTime = Math.min(...recentTimes);
        const maxTime = Math.max(...recentTimes);
        const range = maxTime - minTime;
        
        const barWidth = 8;
        const barSpacing = 12;
        const maxHeight = 30;
        const totalWidth = recentTimes.length * barSpacing;
        
        let startX = centerX - totalWidth / 2;
        
        ctx.fillStyle = '#666';
        ctx.font = '12px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PROGRESSO DAS VOLTAS', centerX, y - 40);
        
        recentTimes.forEach((time, index) => {
            const x = startX + index * barSpacing;
            
            let height, color;
            if (range === 0) {
                height = maxHeight / 2;
                color = '#A9A9A9';
            } else {
                const normalizedSpeed = (maxTime - time) / range;
                height = Math.max(4, normalizedSpeed * maxHeight);
                
                if (time === minTime) {
                    color = 'purple';
                } else if (normalizedSpeed > 0.7) {
                    color = '#00FF00';
                } else if (normalizedSpeed > 0.4) {
                    color = '#FFFF00';
                } else {
                    color = '#A9A9A9';
                }
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(x - barWidth / 2, y - height, barWidth, height);
        });
    }
    
    showShareModal() {
        this.shareModal.style.display = 'flex';
    }
    
    closeShareModal() {
        this.shareModal.style.display = 'none';
    }
    
    downloadShareImage() {
        const link = document.createElement('a');
        link.download = `hotlap-${Date.now()}.png`;
        link.href = this.shareCanvas.toDataURL();
        link.click();
        
        this.game.ui.showMessage('Imagem baixada com sucesso!', 'success');
        this.closeShareModal();
    }
}

// Add share button styles
const shareStyles = document.createElement('style');
shareStyles.textContent = `
    .share-modal {
        font-family: 'IBM Plex Mono', monospace;
    }
    
    .share-icon {
        margin-right: 8px;
    }
    
    #shareButton {
        margin-top: 10px;
        background: var(--bg-primary);
        border: 2px solid var(--highlight-blue);
        color: var(--highlight-blue);
    }
    
    #shareButton:hover {
        background: var(--highlight-blue);
        color: var(--text-primary);
    }
`;
document.head.appendChild(shareStyles);

