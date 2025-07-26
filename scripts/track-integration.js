// Track Integration Module - Conecta o gerador de pistas com o jogo principal (Nova versão)

class TrackIntegration {
    constructor() {
        this.customTrackData = null;
        this.originalGenerateTrack = null;
    }

    // Inicializar integração
    init() {
        // Verificar se há dados de pista no localStorage
        this.loadCustomTrackFromStorage();
        
        // Adicionar botões de integração no gerador de pistas (se existir)
        this.addIntegrationButtons();
        
        // Adicionar botões no jogo principal
        this.addGameButtons();
        
        // Auto-aplicar pista personalizada se estivermos no jogo e houver uma pista salva
        this.autoApplyCustomTrack();
    }

    // Carregar pista do localStorage (compatível com nova estrutura)
    loadCustomTrackFromStorage() {
        // Tentar carregar primeiro o novo formato do track generator
        let stored = localStorage.getItem('customTrack');
        if (stored) {
            try {
                const newTrackData = JSON.parse(stored);
                // Converter para o formato esperado
                this.customTrackData = {
                    points: newTrackData.trackPoints,
                    canvasSize: newTrackData.canvasSize,
                    timestamp: newTrackData.timestamp,
                    isComplete: true
                };
                console.log('📁 Pista personalizada carregada do novo track generator');
                return;
            } catch (e) {
                console.warn('❌ Erro ao carregar pista do novo formato:', e);
                localStorage.removeItem('customTrack');
            }
        }
        
        // Fallback para o formato antigo
        stored = localStorage.getItem('customTrackData');
        if (stored) {
            try {
                this.customTrackData = JSON.parse(stored);
                console.log('📁 Pista personalizada carregada do localStorage (formato antigo)');
            } catch (e) {
                console.warn('❌ Erro ao carregar pista personalizada:', e);
                localStorage.removeItem('customTrackData');
            }
        }
    }

    // Aplicar pista personalizada ao jogo
    applyCustomTrackToGame(track) {
        if (!this.customTrackData || !this.customTrackData.points) {
            console.warn('❌ Nenhuma pista personalizada disponível');
            return false;
        }

        // Salvar método original se não foi salvo ainda
        if (!this.originalGenerateTrack) {
            this.originalGenerateTrack = track.generateTrack.bind(track);
        }

        // Substituir método generateTrack temporariamente
        track.generateTrack = () => {
            this.generateCustomTrack(track);
        };

        // Regenerar a pista
        track.generateTrack();
        console.log('🎮 Pista personalizada aplicada ao jogo!');
        return true;
    }

    // Gerar pista personalizada no formato do jogo (nova estrutura)
    generateCustomTrack(track) {
        const data = this.customTrackData;
        
        if (!data || !data.points || data.points.length < 3) {
            console.error('❌ Dados de pista inválidos, gerando pista de referência');
            // Se não tem dados válidos, gerar uma pista padrão
            this.generateReferenceStyleTrack(track, track.width / 320, track.width / 2, track.height / 2);
            return;
        }

        console.log('🔄 Usando nova estrutura do track generator');
        
        // Os pontos já vêm normalizados (0-1) do novo track generator
        const normalizedPoints = data.points;
        
        // Calcular escala baseada no canvas do jogo (igual ao track generator)
        const scale = Math.min(track.width, track.height) / 400;
        const gameWidth = 320 * scale;
        const gameHeight = 280 * scale;
        
        // Calcular posição central
        const gameAreaX = track.width / 2 - gameWidth / 2;
        const gameAreaY = track.height / 2 - gameHeight / 2;
        
        // Converter pontos normalizados para coordenadas do jogo
        let scaledPoints = normalizedPoints.map((point, index) => ({
            x: gameAreaX + point.x * gameWidth,
            y: gameAreaY + point.y * gameHeight
        }));

        console.log('🎯 Converted points:', scaledPoints.length, 'pontos transformados');

        // Definir pontos centrais da pista
        track.centerPoints = scaledPoints;
        
        // IMPORTANTE: Escalar a largura da pista proporcionalmente
        track.trackWidth = 50 * scale;

        // Configurar linha de largada no primeiro ponto
        track.startLine = {
            x: track.centerPoints[0].x,
            y: track.centerPoints[0].y,
            angle: 0
        };
        
        // Calcular ângulo da linha de largada usando o ângulo do primeiro ponto se disponível
        if (normalizedPoints[0].angle !== undefined) {
            track.startLine.angle = normalizedPoints[0].angle * Math.PI / 180; // Converter de graus para radianos
        } else if (track.centerPoints.length > 1) {
            track.startLine.angle = Math.atan2(
                track.centerPoints[1].y - track.centerPoints[0].y,
                track.centerPoints[1].x - track.centerPoints[0].x
            );
        }

        // Gerar bordas da pista
        this.generateTrackBounds(track);
        
        console.log(`🏁 Pista personalizada gerada: ${data.points.length} pontos, escala ${scale.toFixed(3)}, trackWidth ${track.trackWidth.toFixed(1)}px`);
    }

    // Gerar bordas da pista (método simplificado)
    generateTrackBounds(track) {
        track.leftBound = [];
        track.rightBound = [];
        
        const trackWidth = track.trackWidth;
        const halfWidth = trackWidth / 2;
        
        for (let i = 0; i < track.centerPoints.length; i++) {
            const current = track.centerPoints[i];
            const next = track.centerPoints[(i + 1) % track.centerPoints.length];
            
            // Calculate perpendicular direction
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                const perpX = -dy / length;
                const perpY = dx / length;
                
                track.leftBound.push({
                    x: current.x + perpX * halfWidth,
                    y: current.y + perpY * halfWidth
                });
                
                track.rightBound.push({
                    x: current.x - perpX * halfWidth,
                    y: current.y - perpY * halfWidth
                });
            } else {
                track.leftBound.push({ x: current.x, y: current.y });
                track.rightBound.push({ x: current.x, y: current.y });
            }
        }
    }

    // Gerar pista no estilo exato da referência
    generateReferenceStyleTrack(track, scale, centerX, centerY) {
        const width = 320 * scale;
        const height = 280 * scale;
        const x = centerX - width/2;
        const y = centerY - height/2;
        
        // Pista simples mas suave como as do jogo original
        const points = [
            { x: x + 0.1 * width, y: y + 0.85 * height },
            { x: x + 0.3 * width, y: y + 0.9 * height },
            { x: x + 0.6 * width, y: y + 0.85 * height },
            { x: x + 0.85 * width, y: y + 0.7 * height },
            { x: x + 0.9 * width, y: y + 0.5 * height },
            { x: x + 0.85 * width, y: y + 0.3 * height },
            { x: x + 0.7 * width, y: y + 0.15 * height },
            { x: x + 0.5 * width, y: y + 0.1 * height },
            { x: x + 0.3 * width, y: y + 0.15 * height },
            { x: x + 0.15 * width, y: y + 0.3 * height },
            { x: x + 0.1 * width, y: y + 0.5 * height },
            { x: x + 0.1 * width, y: y + 0.7 * height }
        ];

        track.centerPoints = points;
        track.trackWidth = 50 * scale;
        
        // Configurar linha de largada
        track.startLine = {
            x: points[0].x,
            y: points[0].y,
            angle: Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x)
        };
        
        this.generateTrackBounds(track);
    }

    // Auto-aplicar pista se parâmetro customTrack=true na URL
    autoApplyCustomTrack() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('customTrack') === 'true' && this.customTrackData) {
            console.log('🔄 URL indica para usar pista personalizada, aplicando automaticamente...');
            
            // Aguardar o jogo carregar e então aplicar a pista
            setTimeout(() => {
                if (window.game && window.game.track) {
                    this.applyCustomTrackToGame(window.game.track);
                } else {
                    console.warn('❌ Game ou track não encontrado para aplicar pista personalizada');
                }
            }, 1000);
        }
    }

    // Restaurar pista original
    restoreOriginalTrack(track) {
        if (this.originalGenerateTrack) {
            track.generateTrack = this.originalGenerateTrack;
            track.generateTrack();
            console.log('🔄 Pista original restaurada');
            return true;
        }
        return false;
    }

    // Adicionar botões no jogo principal
    addGameButtons() {
        // Botão de pista personalizada temporariamente desabilitado para evitar interferência
        return;
        
        const gameContainer = document.querySelector('.game-container');
        if (!gameContainer) return;

        // Criar botão para usar pista personalizada
        const useCustomBtn = document.createElement('button');
        useCustomBtn.textContent = '🏁 Usar Pista Personalizada';
        useCustomBtn.className = 'pixel-button';
        useCustomBtn.id = 'useCustomTrackBtn';
        useCustomBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: #007ACC;
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        
        useCustomBtn.addEventListener('click', () => {
            this.toggleCustomTrack();
        });
        
        // Só mostrar se houver pista personalizada E se não estivermos em modo de teste
        if (this.customTrackData && !window.location.search.includes('debug')) {
            // Adicionar delay para evitar interferência com inicialização do jogo
            setTimeout(() => {
                gameContainer.appendChild(useCustomBtn);
            }, 1000);
        }
    }

    // Alternar entre pista personalizada e original
    toggleCustomTrack() {
        if (!window.game || !window.game.track) {
            alert('❌ Jogo não carregado ainda');
            return;
        }
        
        const track = window.game.track;
        const btn = document.getElementById('useCustomTrackBtn');
        
        if (track.generateTrack === this.originalGenerateTrack) {
            // Atualmente usando pista original, mudar para personalizada
            if (this.applyCustomTrackToGame(track)) {
                btn.textContent = '🔄 Usar Pista Original';
                btn.style.background = '#dc3545';
            }
        } else {
            // Atualmente usando pista personalizada, voltar para original
            if (this.restoreOriginalTrack(track)) {
                btn.textContent = '🏁 Usar Pista Personalizada';
                btn.style.background = '#007ACC';
            }
        }
    }

    // Adicionar botões de integração no gerador (se existir)
    addIntegrationButtons() {
        // Esta função será chamada quando estivermos no track generator
        if (document.getElementById('trackCanvas')) {
            console.log('📝 Track generator detectado, botões já devem estar presentes');
        }
    }
}

// Inicializar automaticamente quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    window.trackIntegration = new TrackIntegration();
    window.trackIntegration.init();
});

// Exportar para uso global
window.TrackIntegration = TrackIntegration;
