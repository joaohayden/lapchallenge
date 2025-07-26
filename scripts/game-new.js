// Novo Game.js baseado na estrutura do jogoref.js para compatibilidade total

class Game {
    constructor() {
        console.info("[Game] Game initialized");
        this.perfMetrics = {
            fps: [],
            updateTimes: [],
            renderTimes: []
        };
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        
        // Variáveis de controle do jogo como no game.js original
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = false; // Para aguardar input após cheat/crash
        this.isShowingContinuousStats = false; // Para estatísticas do modo contínuo
        this.gameJustStarted = Date.now();
        
        this.init();
        this.bindEvents();
        this.startGameLoop();
        
        this.gamePaused = false;
        this.lapTimes = [];
        this.allAttempts = [];
        this.bestLapTime = null;
        this.hasCompletedLap = false;
        this.gameName = "speedlaps.run";
        
        // Variáveis para validação anti-cheat (como no car.js original)
        this.lapCount = 0;
        this.establishedCrossingPattern = null;
        this.lastCarPosition = null;
        
        // Histórico aprimorado para validação de direção
        this.carPositionHistory = [];
        this.directionHistory = [];
        this.lastValidDirectionCheck = null;
        this.suspiciousDirectionChanges = 0;
        
        this.initializeShareButton();
        this.initializeShareModal();
        this.initializeConstructorNames();
        this.nextTrackUpdateInterval = null;
    }

    init() {
        console.info("[Game] Initializing game components");
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        
        // Inicializar UI
        this.ui = new UI();
        
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Manter aspect ratio 4:3 como no jogoref.js
        if (containerWidth / containerHeight > 4 / 3) {
            this.canvas.height = containerHeight;
            this.canvas.width = containerHeight * (4 / 3);
        } else {
            this.canvas.width = containerWidth;
            this.canvas.height = containerWidth * (3 / 4);
        }
        
        this.canvasCenterX = this.canvas.width / 2;
        this.canvasCenterY = this.canvas.height / 2;
        
        // Escala baseada no tamanho do canvas (igual ao track generator)
        const scale = Math.min(this.canvas.width, this.canvas.height) / 400;
        
        // Inicializar controle do carro
        this.carController = new CarController(scale);
        
        // Game area offset (12% do canvas reservado para UI)
        const gameAreaOffset = 0.12 * this.canvas.height;
        
        // Verificar se há pista personalizada para carregar
        this.loadCustomTrackIfAvailable();
        
        // Se não há pista personalizada, gerar pista padrão
        if (!this.hasCustomTrack) {
            this.generateDefaultTrack();
        }
    }

    loadCustomTrackIfAvailable() {
        const stored = localStorage.getItem('customTrack');
        if (stored) {
            try {
                const customTrackData = JSON.parse(stored);
                console.log('🏁 Carregando pista personalizada...');
                this.generateCustomTrack(customTrackData);
                this.hasCustomTrack = true;
            } catch (e) {
                console.warn('❌ Erro ao carregar pista personalizada:', e);
                this.hasCustomTrack = false;
            }
        } else {
            this.hasCustomTrack = false;
        }
    }

    generateCustomTrack(customTrackData) {
        const points = customTrackData.trackPoints;
        
        if (!points || points.length < 3) {
            console.error('❌ Dados de pista inválidos');
            this.generateDefaultTrack();
            return;
        }

        console.log('🔄 Gerando pista personalizada com', points.length, 'pontos');
        
        // Calcular escala baseada no canvas (igual ao track generator)
        const scale = Math.min(this.canvas.width, this.canvas.height) / 400;
        const gameWidth = 320 * scale;
        const gameHeight = 280 * scale;
        
        // Calcular posição central (igual ao track generator)
        const gameAreaX = this.canvas.width / 2 - gameWidth / 2;
        const gameAreaY = this.canvas.height / 2 - gameHeight / 2;
        
        // Converter pontos normalizados para coordenadas do jogo
        this.trackPoints = points.map((point, index) => ({
            x: gameAreaX + point.x * gameWidth,
            y: gameAreaY + point.y * gameHeight,
            angle: point.angle || 0
        }));

        // Configurar largura da pista (igual ao track generator)
        this.trackWidth = 50 * scale;
        
        // Configurar linha de largada
        this.startLine = {
            x: this.trackPoints[0].x,
            y: this.trackPoints[0].y,
            // Converter ângulo de graus para radianos
            angle: this.trackPoints[0].angle ? (this.trackPoints[0].angle * Math.PI / 180) : Math.atan2(
                this.trackPoints[1].y - this.trackPoints[0].y,
                this.trackPoints[1].x - this.trackPoints[0].x
            )
        };
        
        // Gerar bordas da pista
        this.generateTrackBounds();
        
        // Posicionar carro na linha de largada
        this.carController.setPosition(this.startLine.x, this.startLine.y, this.startLine.angle);
        
        // Reset dos recordes ao carregar nova pista
        this.resetTrackRecords();
        
        console.log('✅ Pista personalizada gerada com sucesso!');
    }

    generateDefaultTrack() {
        const scale = Math.min(this.canvas.width, this.canvas.height) / 400;
        const gameWidth = 320 * scale;
        const gameHeight = 280 * scale;
        const gameAreaX = this.canvas.width / 2 - gameWidth / 2;
        const gameAreaY = this.canvas.height / 2 - gameHeight / 2;
        
        // Pista padrão simples
        this.trackPoints = [
            { x: gameAreaX + 0.1 * gameWidth, y: gameAreaY + 0.85 * gameHeight, angle: 0 },
            { x: gameAreaX + 0.7 * gameWidth, y: gameAreaY + 0.85 * gameHeight },
            { x: gameAreaX + 0.7 * gameWidth, y: gameAreaY + 0.65 * gameHeight },
            { x: gameAreaX + 0.55 * gameWidth, y: gameAreaY + 0.55 * gameHeight },
            { x: gameAreaX + 0.85 * gameWidth, y: gameAreaY + 0.35 * gameHeight },
            { x: gameAreaX + 0.6 * gameWidth, y: gameAreaY + 0.2 * gameHeight },
            { x: gameAreaX + 0.3 * gameWidth, y: gameAreaY + 0.2 * gameHeight },
            { x: gameAreaX + 0.15 * gameWidth, y: gameAreaY + 0.4 * gameHeight },
            { x: gameAreaX + 0.1 * gameWidth, y: gameAreaY + 0.65 * gameHeight },
            { x: gameAreaX + 0.1 * gameWidth, y: gameAreaY + 0.85 * gameHeight }
        ];
        
        this.trackWidth = 50 * scale;
        
        this.startLine = {
            x: this.trackPoints[0].x,
            y: this.trackPoints[0].y,
            angle: Math.atan2(
                this.trackPoints[1].y - this.trackPoints[0].y,
                this.trackPoints[1].x - this.trackPoints[0].x
            )
        };
        
        this.generateTrackBounds();
        this.carController.setPosition(this.startLine.x, this.startLine.y, this.startLine.angle);
        
        // Reset dos recordes ao gerar nova pista padrão
        this.resetTrackRecords();
    }

    generateTrackBounds() {
        this.leftBound = [];
        this.rightBound = [];
        
        const halfWidth = this.trackWidth / 2;
        
        for (let i = 0; i < this.trackPoints.length; i++) {
            const current = this.trackPoints[i];
            const next = this.trackPoints[(i + 1) % this.trackPoints.length];
            
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

    // Calcular curvatura em um ponto específico da pista
    calculateCurvatureAtPoint(pointIndex) {
        // Usar uma janela maior para calcular curvatura mais precisa
        const windowSize = 3; // Analisar 3 pontos para cada lado
        const indices = [];
        
        // Coletar índices dos pontos ao redor
        for (let i = -windowSize; i <= windowSize; i++) {
            const idx = (pointIndex + i + this.trackPoints.length) % this.trackPoints.length;
            indices.push(idx);
        }
        
        // Calcular mudanças angulares através da janela
        let totalAngleChange = 0;
        let validSegments = 0;
        
        for (let i = 0; i < indices.length - 2; i++) {
            const p1 = this.trackPoints[indices[i]];
            const p2 = this.trackPoints[indices[i + 1]];
            const p3 = this.trackPoints[indices[i + 2]];
            
            // Calcular ângulos dos segmentos
            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
            
            // Calcular mudança angular
            let angleDiff = angle2 - angle1;
            
            // Normalizar para [-π, π]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            // Somar apenas se a distância entre pontos for significativa
            const dist1 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
            const dist2 = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2);
            
            if (dist1 > 5 && dist2 > 5) { // Pontos devem estar pelo menos 5 pixels distantes
                totalAngleChange += angleDiff;
                validSegments++;
            }
        }
        
        // Retornar curvatura média
        return validSegments > 0 ? totalAngleChange / validSegments : 0;
    }

    // Detectar direção da curva de forma inteligente
    detectCurveDirection(pointIndex) {
        // Analisar uma janela maior para ter certeza da direção
        const windowSize = 4; // Reduzido de 5 para 4 para melhor precisão
        const centerIndex = pointIndex;
        
        // Pegar pontos antes e depois
        const beforePoints = [];
        const afterPoints = [];
        
        for (let i = 1; i <= windowSize; i++) {
            const beforeIdx = (centerIndex - i + this.trackPoints.length) % this.trackPoints.length;
            const afterIdx = (centerIndex + i) % this.trackPoints.length;
            beforePoints.push(this.trackPoints[beforeIdx]);
            afterPoints.push(this.trackPoints[afterIdx]);
        }
        
        // Calcular direção média antes (do último ponto antes para o ponto atual)
        const lastBefore = beforePoints[0]; // Ponto imediatamente anterior
        const currentPoint = this.trackPoints[centerIndex];
        const firstAfter = afterPoints[0]; // Ponto imediatamente posterior
        
        // Vetor de entrada (chegando ao ponto)
        const inVector = {
            x: currentPoint.x - lastBefore.x,
            y: currentPoint.y - lastBefore.y
        };
        
        // Vetor de saída (saindo do ponto)
        const outVector = {
            x: firstAfter.x - currentPoint.x,
            y: firstAfter.y - currentPoint.y
        };
        
        // Normalizar vetores
        const inLength = Math.sqrt(inVector.x ** 2 + inVector.y ** 2);
        const outLength = Math.sqrt(outVector.x ** 2 + outVector.y ** 2);
        
        if (inLength === 0 || outLength === 0) {
            return { isCurve: false, direction: 'straight', angle: 0, crossProduct: 0 };
        }
        
        inVector.x /= inLength;
        inVector.y /= inLength;
        outVector.x /= outLength;
        outVector.y /= outLength;
        
        // Calcular ângulo entre os vetores
        const dotProduct = inVector.x * outVector.x + inVector.y * outVector.y;
        const crossProduct = inVector.x * outVector.y - inVector.y * outVector.x;
        
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
        const angleDegrees = angle * 180 / Math.PI;
        
        // Determinar direção da curva baseada no produto cruzado
        let direction = 'straight';
        if (Math.abs(crossProduct) > 0.05) { // Threshold menor para maior sensibilidade
            direction = crossProduct > 0 ? 'left' : 'right';
        }
        
        console.log(`🔍 Análise detalhada ponto ${pointIndex}:`, {
            angleDegrees: angleDegrees.toFixed(1),
            crossProduct: crossProduct.toFixed(3),
            direction: direction,
            inVector: { x: inVector.x.toFixed(3), y: inVector.y.toFixed(3) },
            outVector: { x: outVector.x.toFixed(3), y: outVector.y.toFixed(3) }
        });
        
        return {
            isCurve: angleDegrees > 8, // Threshold menor para detectar curvas mais suaves
            direction: direction,
            angle: angleDegrees,
            crossProduct: crossProduct
        };
    }

    // Reset dos recordes quando a pista mudar
    resetTrackRecords() {
        console.log('🔄 Resetando recordes devido à mudança de pista...');
        
        // Reset dos recordes locais
        this.bestLapTime = null;
        this.lapTimes = [];
        this.allAttempts = [];
        
        // Reset dos recordes na UI
        if (this.ui) {
            // Reset dos melhores tempos internos da UI
            this.ui.bestTimeClassic = null;
            this.ui.bestTimeContinuous = null;
            
            // Limpar localStorage dos recordes
            localStorage.removeItem('hotlap_best_times');
            localStorage.removeItem('hotlap_lap_times');
            localStorage.removeItem('hotlap_best_time_classic');
            localStorage.removeItem('hotlap_best_time_continuous');
            
            console.log('🏆 Recordes limpos (Classic + Continuous) - nova pista, novos desafios!');
        }
    }

    update(deltaTime) {
        if (this.gamePaused || !this.isRunning) return;
        
        try {
            this.carController.update();
            this.updateCarHistory(); // Atualizar histórico de posições
            this.checkCollision();
            this.checkLapCompletion();
            this.updateTimer();
        } catch (error) {
            this.handleGameError(error);
        }
    }

    // Atualizar timer na UI
    updateTimer() {
        if (this.isRunning && this.lapStartTime && this.ui) {
            const currentTime = Date.now() - this.lapStartTime;
            this.ui.updateTimer(currentTime);
        }
    }

    // Atualizar histórico de posições para validação aprimorada
    updateCarHistory() {
        const carX = this.carController.position.x;
        const carY = this.carController.position.y;
        const carAngle = this.carController.position.angle;
        const timestamp = Date.now();
        
        // Adicionar posição atual ao histórico
        this.carPositionHistory.push({
            x: carX,
            y: carY,
            angle: carAngle,
            timestamp: timestamp,
            onTrack: this.isOnTrack(carX, carY, 0)
        });
        
        // Manter apenas os últimos 60 pontos (aprox. 1 segundo a 60fps)
        if (this.carPositionHistory.length > 60) {
            this.carPositionHistory.shift();
        }
        
        // Calcular direção de movimento baseada no histórico
        if (this.carPositionHistory.length >= 10) {
            const recent = this.carPositionHistory.slice(-10);
            const direction = this.calculateMovementDirection(recent);
            
            if (direction !== null) {
                this.directionHistory.push({
                    direction: direction,
                    timestamp: timestamp,
                    confidence: this.calculateDirectionConfidence(recent)
                });
                
                // Manter apenas as últimas 30 direções
                if (this.directionHistory.length > 30) {
                    this.directionHistory.shift();
                }
            }
        }
    }

    // Calcular direção de movimento baseada no histórico de posições
    calculateMovementDirection(recentPositions) {
        if (recentPositions.length < 5) return null;
        
        let totalMovement = { x: 0, y: 0 };
        let validSegments = 0;
        
        // Calcular vetor de movimento total
        for (let i = 1; i < recentPositions.length; i++) {
            const prev = recentPositions[i - 1];
            const curr = recentPositions[i];
            
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Apenas considerar movimentos significativos
            if (distance > 0.5) {
                totalMovement.x += dx;
                totalMovement.y += dy;
                validSegments++;
            }
        }
        
        if (validSegments === 0) return null;
        
        // Normalizar e retornar ângulo de movimento
        const avgMovement = {
            x: totalMovement.x / validSegments,
            y: totalMovement.y / validSegments
        };
        
        return Math.atan2(avgMovement.y, avgMovement.x);
    }

    // Calcular confiança na direção baseada na consistência
    calculateDirectionConfidence(recentPositions) {
        if (recentPositions.length < 5) return 0;
        
        const directions = [];
        for (let i = 1; i < recentPositions.length; i++) {
            const prev = recentPositions[i - 1];
            const curr = recentPositions[i];
            
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0.5) {
                directions.push(Math.atan2(dy, dx));
            }
        }
        
        if (directions.length < 3) return 0;
        
        // Calcular variação angular
        let totalVariation = 0;
        for (let i = 1; i < directions.length; i++) {
            let angleDiff = Math.abs(directions[i] - directions[i - 1]);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            totalVariation += angleDiff;
        }
        
        const avgVariation = totalVariation / (directions.length - 1);
        
        // Retornar confiança (menor variação = maior confiança)
        return Math.max(0, 1 - (avgVariation / Math.PI));
    }

    bindEvents() {
        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            
            // Controles de movimento só funcionam quando o jogo está rodando
            if (this.isRunning) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.carController.setControls(true, false);
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.carController.setControls(false, true);
                }
            }
            
            // Lógica do espaço igual ao game.js original
            if (e.code === 'Space') {
                if (this.isWaitingForContinue) {
                    // Verificar se é um overlay de cheat
                    if (this.ui && this.ui.currentOverlayType === 'cheat') {
                        // Cheat detectado - fechar overlay e resetar sessão
                        console.log('🔒 Closing cheat overlay and resetting game');
                        this.ui.hideOverlay();
                        this.isWaitingForContinue = false;
                        this.resetGame(); // Reset completo para cheat
                    } else {
                        // Verificar se estamos voltando das estatísticas contínuas
                        if (this.isShowingContinuousStats) {
                            console.log('📊 Exiting continuous stats and resetting game');
                            this.isShowingContinuousStats = false;
                            this.ui.hideOverlay();
                            this.resetGame(); // Reset completo após estatísticas
                            return;
                        }
                        
                        // Outros overlays (crash, lap complete, etc.)
                        this.ui.hideOverlay();
                        this.isWaitingForContinue = false;
                        this.resetGame();
                    }
                } else if (!this.isRunning) {
                    // Iniciar o jogo
                    this.startGame();
                } else if (this.isRunning && this.ui.getGameMode && this.ui.getGameMode() === 'continuous') {
                    // Verificar se jogo acabou de começar (prevenir parada imediata)
                    const timeSinceStart = Date.now() - this.gameJustStarted;
                    
                    if (timeSinceStart >= 500) {
                        // Parar modo contínuo e mostrar estatísticas
                        this.stopContinuousMode();
                    }
                } else {
                    // Reset durante o jogo
                    this.resetGame();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.isRunning) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.carController.setControls(false, this.carController.controls.right);
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.carController.setControls(this.carController.controls.left, false);
                }
            }
        });
        
        // Eventos de mouse/touch para mobile
        const leftBtn = document.getElementById('leftControl');
        const rightBtn = document.getElementById('rightControl');
        
        if (leftBtn) {
            leftBtn.addEventListener('touchstart', () => this.carController.setControls(true, false));
            leftBtn.addEventListener('touchend', () => this.carController.setControls(false, this.carController.controls.right));
            leftBtn.addEventListener('mousedown', () => this.carController.setControls(true, false));
            leftBtn.addEventListener('mouseup', () => this.carController.setControls(false, this.carController.controls.right));
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('touchstart', () => this.carController.setControls(false, true));
            rightBtn.addEventListener('touchend', () => this.carController.setControls(this.carController.controls.left, false));
            rightBtn.addEventListener('mousedown', () => this.carController.setControls(false, true));
            rightBtn.addEventListener('mouseup', () => this.carController.setControls(this.carController.controls.left, false));
        }
    }

    resetGame() {
        console.log('🔄 Resetting game...');
        
        // Reset game state
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = false;
        this.isShowingContinuousStats = false; // Reset continuous stats flag
        
        // Reset car
        this.carController.setPosition(this.startLine.x, this.startLine.y, this.startLine.angle);
        this.startTime = null;
        this.lapStartTime = null;
        this.hasCompletedLap = false;
        this.gameJustStarted = Date.now(); // Adicionar timer para evitar crash imediato
        
        // Reset anti-cheat variables
        this.lapCount = 0;
        this.establishedCrossingPattern = null;
        this.lastCarPosition = null;
        
        // Reset histórico aprimorado para validação
        this.carPositionHistory = [];
        this.directionHistory = [];
        this.lastValidDirectionCheck = null;
        this.suspiciousDirectionChanges = 0;
        
        // Esconder toast se estiver visível
        if (this.ui && typeof this.ui.hideToast === 'function') {
            this.ui.hideToast();
        }
        
        // Limpar dados da sessão atual na UI
        if (this.ui && typeof this.ui.resetGame === 'function') {
            this.ui.resetGame();
        }
        
        // Debug: verificar posição inicial
        console.log('🏁 Car reset to:', this.startLine.x, this.startLine.y, 'angle:', this.startLine.angle);
        console.log('🔒 Anti-cheat variables reset');
    }

    // Reset apenas a posição do carro sem alterar estado do jogo
    resetCarPosition() {
        console.log('🔄 Resetting car position only...');
        
        // Reset car
        this.carController.setPosition(this.startLine.x, this.startLine.y, this.startLine.angle);
        this.startTime = null;
        this.lapStartTime = null;
        this.hasCompletedLap = false;
        
        // Reset anti-cheat variables
        this.lapCount = 0;
        this.establishedCrossingPattern = null;
        this.lastCarPosition = null;
        
        // Reset histórico aprimorado para validação
        this.carPositionHistory = [];
        this.directionHistory = [];
        this.lastValidDirectionCheck = null;
        this.suspiciousDirectionChanges = 0;
        
        // Esconder toast se estiver visível
        if (this.ui && typeof this.ui.hideToast === 'function') {
            this.ui.hideToast();
        }
        
        // Debug: verificar posição inicial
        console.log('🏁 Car reset to:', this.startLine.x, this.startLine.y, 'angle:', this.startLine.angle);
        console.log('🔒 Anti-cheat variables reset');
    }

    startGame() {
        if (this.isRunning) {
            console.log('🚫 Game already running, ignoring start request');
            return;
        }
        
        console.log('🎮 Starting game...');
        
        // Reset car position ANTES de definir isRunning
        this.resetCarPosition();
        
        // Agora configurar o estado do jogo
        this.isRunning = true;
        this.isPaused = false;
        this.isWaitingForContinue = false;
        this.gameJustStarted = Date.now();
        
        console.log('🚗 Car position after start:', {
            x: this.carController.position.x.toFixed(2),
            y: this.carController.position.y.toFixed(2),
            angle: this.carController.position.angle.toFixed(2),
            speed: this.carController.speed.toFixed(2)
        });
        
        // Notificar UI
        if (this.ui) {
            this.ui.gameState = 'playing';
        }
    }

    // Callback para compatibilidade com UI
    start() {
        this.startGame();
    }
    
    // Parar modo contínuo e mostrar estatísticas (como no game.js original)
    stopContinuousMode() {
        if (this.isRunning && this.ui.getGameMode && this.ui.getGameMode() === 'continuous') {
            console.log('⏹️ Stopping continuous mode and showing stats');
            this.isRunning = false;
            this.isPaused = false;
            
            // Marcar que estamos no estado de estatísticas contínuas
            this.isShowingContinuousStats = true;
            
            // Mostrar overlay com estatísticas do modo contínuo
            const stats = this.getStats();
            const lapCount = this.ui.lapCount || this.lapTimes.length;
            const bestLap = this.bestLapTime || 0;
            
            // Exibir overlay personalizado para modo contínuo
            if (this.ui && typeof this.ui.showContinuousStats === 'function') {
                this.ui.showContinuousStats(lapCount, bestLap, this.lapTimes);
            } else if (this.ui && typeof this.ui.showOverlay === 'function') {
                // Fallback para overlay padrão
                this.ui.showOverlay('continuous-complete', { lapCount, bestLap });
            }
            
            this.isWaitingForContinue = true;
        }
    }
    
    // Obter estatísticas do jogo
    getStats() {
        return {
            bestTime: this.bestLapTime,
            lapTimes: this.lapTimes,
            currentTime: this.lapStartTime ? Date.now() - this.lapStartTime : 0,
            lapCount: this.lapCount
        };
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
        
        // Verificar modo de jogo para aplicar regras diferentes
        const gameMode = this.ui?.getGameMode ? this.ui.getGameMode() : 'classic';
        
        if (gameMode === 'continuous') {
            // Modo contínuo: usar tolerância azul (8 pixels como no car.js original)
            const tolerance = 8;
            if (!this.isOnTrack(carX, carY, tolerance)) {
                console.log('💥 Collision detected! Car position:', carX.toFixed(2), carY.toFixed(2), '(continuous mode - outside blue zone)');
                this.handleCarCrash();
            }
        } else {
            // Modo clássico: sem tolerância
            if (!this.isOnTrack(carX, carY, 0)) {
                console.log('💥 Collision detected! Car position:', carX.toFixed(2), carY.toFixed(2), '(classic mode)');
                this.handleCarCrash();
            }
        }
    }
    
    // Implementar a mesma lógica isOnTrack do track.js original
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
        
        for (let i = 0; i < this.trackPoints.length; i++) {
            const current = this.trackPoints[i];
            const next = this.trackPoints[(i + 1) % this.trackPoints.length];
            
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
        
        const param = Math.max(0, Math.min(1, dot / lenSq));
        const xx = x1 + param * C;
        const yy = y1 + param * D;
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        const param = Math.max(0, Math.min(1, dot / lenSq));
        const xx = x1 + param * C;
        const yy = y1 + param * D;
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    handleCarCrash() {
        console.log('💥 Car crashed!');
        this.isRunning = false;
        this.isPaused = false;
        
        // Para todos os controles
        this.carController.setControls(false, false);
        
        // Verificar modo de jogo para mostrar toast apropriado
        const gameMode = this.ui?.getGameMode ? this.ui.getGameMode() : 'classic';
        
        if (gameMode === 'classic') {
            // No modo clássico, mostrar toast e aguardar input
            this.isWaitingForContinue = true;
            if (this.ui && typeof this.ui.showToast === 'function') {
                this.ui.showToast('💥 Você bateu no limite da pista! Pressione ESPAÇO para reiniciar a volta', 'error', -1);
            }
        } else {
            // No modo contínuo, reset imediato
            this.resetGame();
        }
    }

    checkLapCompletion() {
        const carX = this.carController.position.x;
        const carY = this.carController.position.y;
        
        // DETECÇÃO APRIMORADA DA LINHA DE LARGADA
        // Em vez de usar apenas a distância do centro, verificar proximidade com a linha inteira
        const startPoint = this.trackPoints[0];
        const nextPoint = this.trackPoints[1];
        
        // Calcular linha de largada (mesma lógica do desenho)
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        let perpX = -dy / length;
        let perpY = dx / length;
        
        // Aplicar ajuste de curvatura (mesma lógica do desenho)
        const curveInfo = this.detectCurveDirection(0);
        
        if (curveInfo.isCurve && Math.abs(curveInfo.angle) > 8) {
            let adjustmentAngle;
            
            if (curveInfo.direction === 'left') {
                adjustmentAngle = Math.abs(curveInfo.angle) * 0.4;
            } else {
                adjustmentAngle = -Math.abs(curveInfo.angle) * 0.4;
            }
            
            const cos_adj = Math.cos(adjustmentAngle);
            const sin_adj = Math.sin(adjustmentAngle);
            const newPerpX = perpX * cos_adj - perpY * sin_adj;
            const newPerpY = perpX * sin_adj + perpY * cos_adj;
            perpX = newPerpX;
            perpY = newPerpY;
        }
        
        const halfWidth = this.trackWidth / 2;
        const extension = 8;
        const extendedHalfWidth = halfWidth + extension;
        
        // Calcular distância do carro para a linha de largada
        const lineStart = {
            x: startPoint.x + perpX * extendedHalfWidth,
            y: startPoint.y + perpY * extendedHalfWidth
        };
        const lineEnd = {
            x: startPoint.x - perpX * extendedHalfWidth,
            y: startPoint.y - perpY * extendedHalfWidth
        };
        
        const distanceToStartLine = this.distanceToLineSegment(carX, carY, lineStart.x, lineStart.y, lineEnd.x, lineEnd.y);
        
        // Área de detecção mais ampla e sensível
        if (distanceToStartLine < 25 && this.lapStartTime && Date.now() - this.lapStartTime > 5000) {
            console.log(`🏁 Car near start line! Distance: ${distanceToStartLine.toFixed(1)}px`);
            
            // VALIDAÇÃO ANTI-CHEAT: Verificar direção do carro
            const isDirectionCorrect = this.isCarDirectionCorrect(carX, carY, this.carController.position.angle);
            
            if (!isDirectionCorrect) {
                console.log('🚨 CHEAT DETECTED: Car going wrong direction!');
                this.handleCheatDetection('wrong-direction');
                return;
            }
            
            // VALIDAÇÃO DE PADRÃO DE CRUZAMENTO (como no car.js original)
            const crossingInfo = this.checkStartLineCrossing(carX, carY);
            if (crossingInfo && this.lapCount > 0) {
                const currentPattern = `${crossingInfo.fromSide}->${crossingInfo.toSide}`;
                
                if (!this.establishedCrossingPattern) {
                    this.establishedCrossingPattern = currentPattern;
                    console.log(`📝 Established crossing pattern: ${this.establishedCrossingPattern}`);
                } else if (currentPattern !== this.establishedCrossingPattern) {
                    console.log('🚨 WRONG DIRECTION: Different crossing pattern detected!');
                    console.log(`Expected: ${this.establishedCrossingPattern}, Got: ${currentPattern}`);
                    this.handleCheatDetection('wrong-direction');
                    return;
                }
            }
            
            this.completeLap();
        } else if (!this.lapStartTime) {
            this.startLap();
        }
    }
    
    // Verificar se direção do carro está correta baseada no histórico de movimento
    isCarDirectionCorrect(carX, carY, carAngle, tolerance = Math.PI / 4) {
        // Se não há histórico suficiente, usar validação básica
        if (this.directionHistory.length < 5) {
            return this.isCarDirectionCorrectBasic(carX, carY, carAngle, tolerance);
        }
        
        // NOVA VALIDAÇÃO APRIMORADA BASEADA NO HISTÓRICO
        
        // 1. Verificar se há mudanças suspeitas de direção recentes
        const recentDirections = this.directionHistory.slice(-10);
        const suspiciousChanges = this.detectSuspiciousDirectionChanges(recentDirections);
        
        if (suspiciousChanges > 2) {
            console.log('🚨 Multiple suspicious direction changes detected:', suspiciousChanges);
            this.suspiciousDirectionChanges += suspiciousChanges;
            
            // Se acumular muitas mudanças suspeitas, é provável cheat
            if (this.suspiciousDirectionChanges > 5) {
                console.log('🚨 CHEAT DETECTED: Too many suspicious direction changes');
                return false;
            }
        }
        
        // 2. Validar direção baseada no progresso na pista
        const currentTrackProgress = this.calculateTrackProgress(carX, carY);
        const expectedDirection = this.getExpectedDirectionAtProgress(currentTrackProgress);
        
        // 3. Usar direção de movimento real (do histórico) em vez do ângulo do carro
        const actualMovementDirection = this.getRecentMovementDirection();
        
        if (actualMovementDirection === null) {
            // Sem movimento suficiente, usar validação básica
            return this.isCarDirectionCorrectBasic(carX, carY, carAngle, tolerance);
        }
        
        // 4. Calcular diferença entre direção real de movimento e direção esperada
        let directionDiff = Math.abs(actualMovementDirection - expectedDirection);
        
        // Normalizar para [0, PI]
        if (directionDiff > Math.PI) {
            directionDiff = 2 * Math.PI - directionDiff;
        }
        
        const isCorrect = directionDiff <= tolerance;
        
        if (!isCorrect) {
            console.log(`🧭 ENHANCED Direction check FAILED:`);
            console.log(`  - Actual movement: ${(actualMovementDirection * 180/Math.PI).toFixed(1)}°`);
            console.log(`  - Expected: ${(expectedDirection * 180/Math.PI).toFixed(1)}°`);
            console.log(`  - Difference: ${(directionDiff * 180/Math.PI).toFixed(1)}°`);
            console.log(`  - Track progress: ${currentTrackProgress.toFixed(3)}`);
            console.log(`  - Suspicious changes: ${this.suspiciousDirectionChanges}`);
            
            // Incrementar contador de mudanças suspeitas
            this.suspiciousDirectionChanges++;
        } else {
            // Reset parcial do contador se direção está correta
            this.suspiciousDirectionChanges = Math.max(0, this.suspiciousDirectionChanges - 0.5);
        }
        
        return isCorrect;
    }

    // Validação básica (fallback para quando não há histórico suficiente)
    isCarDirectionCorrectBasic(carX, carY, carAngle, tolerance = Math.PI / 3) {
        // Encontrar o ponto mais próximo da pista
        let closestPoint = null;
        let minDistance = Infinity;
        let closestIndex = 0;
        
        for (let i = 0; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];
            const dist = Math.sqrt((carX - point.x) ** 2 + (carY - point.y) ** 2);
            
            if (dist < minDistance) {
                minDistance = dist;
                closestPoint = point;
                closestIndex = i;
            }
        }
        
        if (!closestPoint) return true; // Se não encontrou ponto, assumir OK
        
        // Calcular direção esperada baseada no próximo ponto
        const nextIndex = (closestIndex + 1) % this.trackPoints.length;
        const nextPoint = this.trackPoints[nextIndex];
        
        const expectedAngle = Math.atan2(
            nextPoint.y - closestPoint.y,
            nextPoint.x - closestPoint.x
        );
        
        // Calcular diferença angular
        let angleDiff = Math.abs(carAngle - expectedAngle);
        
        // Normalizar para [0, PI]
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        const isCorrect = angleDiff <= tolerance;
        
        if (!isCorrect) {
            console.log(`🧭 BASIC Direction check: Car angle ${(carAngle * 180/Math.PI).toFixed(1)}°, Expected ${(expectedAngle * 180/Math.PI).toFixed(1)}°, Diff ${(angleDiff * 180/Math.PI).toFixed(1)}°`);
        }
        
        return isCorrect;
    }

    // Detectar mudanças suspeitas de direção
    detectSuspiciousDirectionChanges(recentDirections) {
        if (recentDirections.length < 3) return 0;
        
        let suspiciousChanges = 0;
        const threshold = Math.PI / 2; // 90 graus
        
        for (let i = 1; i < recentDirections.length; i++) {
            const prev = recentDirections[i - 1];
            const curr = recentDirections[i];
            
            // Verificar se há mudança brusca de direção
            let angleDiff = Math.abs(curr.direction - prev.direction);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            
            // Se mudança é maior que 90° e ambas direções têm alta confiança
            if (angleDiff > threshold && prev.confidence > 0.7 && curr.confidence > 0.7) {
                suspiciousChanges++;
                console.log(`⚠️ Suspicious direction change: ${(angleDiff * 180/Math.PI).toFixed(1)}°`);
            }
        }
        
        return suspiciousChanges;
    }

    // Calcular progresso atual na pista (0.0 a 1.0)
    calculateTrackProgress(carX, carY) {
        let closestDistance = Infinity;
        let closestSegmentProgress = 0;
        
        // Encontrar o segmento mais próximo
        for (let i = 0; i < this.trackPoints.length; i++) {
            const current = this.trackPoints[i];
            const next = this.trackPoints[(i + 1) % this.trackPoints.length];
            
            // Calcular distância para este segmento
            const segmentDistance = this.distanceToLineSegment(carX, carY, current.x, current.y, next.x, next.y);
            
            if (segmentDistance < closestDistance) {
                closestDistance = segmentDistance;
                
                // Calcular progresso dentro deste segmento
                const segmentProgress = this.getProgressOnSegment(carX, carY, current, next);
                closestSegmentProgress = (i + segmentProgress) / this.trackPoints.length;
            }
        }
        
        return closestSegmentProgress;
    }

    // Calcular progresso em um segmento específico (0.0 a 1.0)
    getProgressOnSegment(px, py, p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) return 0;
        
        const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / lengthSq));
        return t;
    }

    // Obter direção esperada em um determinado progresso da pista
    getExpectedDirectionAtProgress(progress) {
        // Normalizar progresso
        progress = Math.max(0, Math.min(1, progress));
        
        // Calcular índice do ponto
        const exactIndex = progress * this.trackPoints.length;
        const currentIndex = Math.floor(exactIndex) % this.trackPoints.length;
        const nextIndex = (currentIndex + 1) % this.trackPoints.length;
        
        const current = this.trackPoints[currentIndex];
        const next = this.trackPoints[nextIndex];
        
        return Math.atan2(next.y - current.y, next.x - current.x);
    }

    // Obter direção de movimento recente baseada no histórico
    getRecentMovementDirection() {
        if (this.directionHistory.length === 0) return null;
        
        // Usar direções recentes com alta confiança
        const recentHighConfidence = this.directionHistory
            .slice(-5)
            .filter(d => d.confidence > 0.6);
        
        if (recentHighConfidence.length === 0) {
            // Se não há direções confiáveis, usar a mais recente
            return this.directionHistory[this.directionHistory.length - 1].direction;
        }
        
        // Calcular média ponderada das direções confiáveis
        let totalWeight = 0;
        let weightedX = 0;
        let weightedY = 0;
        
        recentHighConfidence.forEach(d => {
            const weight = d.confidence;
            weightedX += Math.cos(d.direction) * weight;
            weightedY += Math.sin(d.direction) * weight;
            totalWeight += weight;
        });
        
        if (totalWeight === 0) return null;
        
        return Math.atan2(weightedY / totalWeight, weightedX / totalWeight);
    }
    
    // Verificar cruzamento da linha de largada com detecção de lado
    checkStartLineCrossing(carX, carY) {
        if (!this.lastCarPosition) {
            this.lastCarPosition = { x: carX, y: carY };
            return null;
        }
        
        const startPoint = this.trackPoints[0];
        const nextPoint = this.trackPoints[1];
        
        // Calcular linha de largada
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        let perpX = -dy / length;
        let perpY = dx / length;
        
        // Aplicar o mesmo ajuste de curvatura usado no desenho
        const curveInfo = this.detectCurveDirection(0);
        
        if (curveInfo.isCurve && Math.abs(curveInfo.angle) > 8) {
            // Usar mesma lógica do desenho
            let adjustmentAngle;
            
            if (curveInfo.direction === 'left') {
                adjustmentAngle = Math.abs(curveInfo.angle) * 0.4;
            } else {
                adjustmentAngle = -Math.abs(curveInfo.angle) * 0.4;
            }
            
            const cos_adj = Math.cos(adjustmentAngle);
            const sin_adj = Math.sin(adjustmentAngle);
            const newPerpX = perpX * cos_adj - perpY * sin_adj;
            const newPerpY = perpX * sin_adj + perpY * cos_adj;
            perpX = newPerpX;
            perpY = newPerpY;
        }
        
        const halfWidth = this.trackWidth / 2;
        
        // Usar linha ESTENDIDA para detecção (mesma extensão do desenho)
        const extension = 8; // Mesma extensão do desenho
        const extendedHalfWidth = halfWidth + extension;
        
        const lineStart = {
            x: startPoint.x + perpX * extendedHalfWidth,
            y: startPoint.y + perpY * extendedHalfWidth
        };
        const lineEnd = {
            x: startPoint.x - perpX * extendedHalfWidth,
            y: startPoint.y - perpY * extendedHalfWidth
        };
        
        // DETECÇÃO APRIMORADA: Verificar múltiplos pontos ao redor da posição do carro
        let crossed = false;
        const carRadius = 10; // Raio do carro para detecção mais sensível
        
        // Verificar cruzamento em múltiplos pontos ao redor do carro
        const testPoints = [
            { x: carX, y: carY }, // Centro do carro
            { x: carX - carRadius, y: carY }, // Esquerda
            { x: carX + carRadius, y: carY }, // Direita
            { x: carX, y: carY - carRadius }, // Cima
            { x: carX, y: carY + carRadius }, // Baixo
        ];
        
        for (const testPoint of testPoints) {
            if (this.lineIntersection(
                this.lastCarPosition.x, this.lastCarPosition.y,
                testPoint.x, testPoint.y,
                lineStart.x, lineStart.y,
                lineEnd.x, lineEnd.y
            )) {
                crossed = true;
                break;
            }
        }
        
        // Também verificar distância do carro à linha (método alternativo mais sensível)
        if (!crossed) {
            const distanceToLine = this.distanceToLineSegment(carX, carY, lineStart.x, lineStart.y, lineEnd.x, lineEnd.y);
            const wasOnLine = this.distanceToLineSegment(this.lastCarPosition.x, this.lastCarPosition.y, lineStart.x, lineStart.y, lineEnd.x, lineEnd.y);
            
            // Se carro está próximo da linha e estava longe antes, considerar cruzamento
            if (distanceToLine < 15 && wasOnLine > 15) {
                console.log('🎯 Line crossing detected by proximity method');
                crossed = true;
            }
        }
        
        this.lastCarPosition = { x: carX, y: carY };
        
        if (crossed) {
            // Determinar de que lado para que lado cruzou
            const fromSide = this.getLineSide(this.lastCarPosition.x, this.lastCarPosition.y, lineStart, lineEnd);
            const toSide = this.getLineSide(carX, carY, lineStart, lineEnd);
            
            return {
                crossed: true,
                fromSide: fromSide,
                toSide: toSide
            };
        }
        
        return null;
    }
    
    // Função auxiliar para detectar de que lado da linha um ponto está
    getLineSide(px, py, lineStart, lineEnd) {
        const cross = (lineEnd.x - lineStart.x) * (py - lineStart.y) - (lineEnd.y - lineStart.y) * (px - lineStart.x);
        return cross > 0 ? 'left' : 'right';
    }
    
    // Função auxiliar para detectar interseção de linhas
    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
    
    // Lidar com detecção de cheat
    handleCheatDetection(reason) {
        console.log('🚨 CHEAT DETECTED:', reason);
        this.isRunning = false;
        this.isPaused = false;
        
        // Parar carro
        this.carController.setControls(false, false);
        this.carController.speed = 0;
        
        // Configurar para aguardar input do usuário (como no game.js original)
        this.isWaitingForContinue = true;
        
        // Mostrar overlay de cheat se UI suportar
        if (this.ui && typeof this.ui.showOverlay === 'function') {
            this.ui.showOverlay('cheat', { reason });
        }
        
        console.log('🔒 Waiting for user input to restart after cheat detection');
    }

    startLap() {
        this.lapStartTime = Date.now();
        console.log('🏁 Lap started!');
    }

    completeLap() {
        const lapTime = Date.now() - this.lapStartTime;
        this.lapTimes.push(lapTime);
        this.lapCount++; // Incrementar contador de voltas para anti-cheat
        
        console.log('✅ Lap completed in:', this.formatTime(lapTime), `(Lap #${this.lapCount})`);
        
        // Verificar se é um novo recorde
        const isNewRecord = !this.bestLapTime || lapTime < this.bestLapTime;
        
        if (isNewRecord) {
            this.bestLapTime = lapTime;
            console.log('🏆 NEW RECORD!', this.formatTime(lapTime));
            
            // Mostrar toast de novo recorde
            if (this.ui && typeof this.ui.showToast === 'function') {
                this.ui.showToast(`🏆 NOVO RECORDE! ${this.formatTime(lapTime)}`, 'success', 4000);
            }
        }
        
        // Atualizar UI com o novo tempo de volta
        if (this.ui) {
            this.ui.onLapCompleted(lapTime);
            
            // Se é novo recorde, atualizar a melhor volta na UI também
            if (isNewRecord && typeof this.ui.updateBestTime === 'function') {
                this.ui.updateBestTime(this.bestLapTime);
            }
        }
        
        this.updateLeaderboard();
        
        // Verificar modo de jogo para próxima volta
        const gameMode = this.ui?.getGameMode ? this.ui.getGameMode() : 'classic';
        
        if (gameMode === 'classic') {
            // Modo clássico: retornar carro à posição inicial e pausar
            console.log('🏁 Classic mode - returning car to start and pausing for user input');
            this.carController.setPosition(this.startLine.x, this.startLine.y, this.startLine.angle);
            this.pauseForLapComplete();
        } else {
            // Modo contínuo: continuar automaticamente
            console.log('🔄 Continuous mode - starting next lap automatically');
            this.lapStartTime = Date.now(); // Start next lap
        }
        
        this.hasCompletedLap = true;
    }
    
    // Pausar jogo após completar volta (modo clássico)
    pauseForLapComplete() {
        console.log('Game: pauseForLapComplete() - Pausando o jogo para aguardar espaço');
        this.isWaitingForContinue = true;
        this.isPaused = true;
        this.isRunning = false; // Garantir que o jogo pare completamente
        
        // Mostrar toast para continuar (como no jogo original)
        if (this.ui && typeof this.ui.showToast === 'function') {
            this.ui.showToast('Pressione ESPAÇO para tentar um menor tempo', 'warning', -1); // -1 = permanent
        }
    }

    updateLeaderboard() {
        console.log('📊 Updating leaderboard...', {
            lapTimes: this.lapTimes.length,
            bestTime: this.bestLapTime,
            lastLap: this.lapTimes.length > 0 ? this.lapTimes[this.lapTimes.length - 1] : null
        });
        
        const currentTimeEl = document.getElementById('current-time');
        const bestTimeEl = document.getElementById('best-time');
        const lapCountEl = document.getElementById('lap-count');
        
        if (currentTimeEl && this.lapTimes.length > 0) {
            const lastLapTime = this.formatTime(this.lapTimes[this.lapTimes.length - 1]);
            currentTimeEl.textContent = lastLapTime;
            console.log('📊 Updated current-time:', lastLapTime);
        }
        
        if (bestTimeEl && this.bestLapTime) {
            const bestTimeFormatted = this.formatTime(this.bestLapTime);
            bestTimeEl.textContent = bestTimeFormatted;
            console.log('📊 Updated best-time:', bestTimeFormatted);
        }
        
        if (lapCountEl) {
            const lapCount = this.lapTimes.length.toString();
            lapCountEl.textContent = lapCount;
            console.log('📊 Updated lap-count:', lapCount);
        }
        
        // Forçar atualização da UI se disponível
        if (this.ui && typeof this.ui.updateStats === 'function') {
            this.ui.updateStats({
                currentTime: this.lapTimes.length > 0 ? this.lapTimes[this.lapTimes.length - 1] : null,
                bestTime: this.bestLapTime,
                lapCount: this.lapTimes.length
            });
        }
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor((ms % 1000) / 10);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    draw() {
        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Desenhar pista
        this.drawTrack();
        
        // Desenhar carro
        this.drawCar();
    }

    drawTrack() {
        // Desenhar fundo da pista (área cinza) - igual ao track generator
        this.ctx.strokeStyle = '#E5E5E5';
        this.ctx.lineWidth = this.trackWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.trackPoints[0].x, this.trackPoints[0].y);
        for (let i = 1; i < this.trackPoints.length; i++) {
            this.ctx.lineTo(this.trackPoints[i].x, this.trackPoints[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Desenhar linha central da pista (pontilhada)
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.trackPoints[0].x, this.trackPoints[0].y);
        for (let i = 1; i < this.trackPoints.length; i++) {
            this.ctx.lineTo(this.trackPoints[i].x, this.trackPoints[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Desenhar setas de direção (igual ao track generator)
        this.drawDirectionArrows();
        
        // Desenhar linha de largada (igual ao track generator)
        this.drawStartLine();
    }

    drawDirectionArrows() {
        const arrowSpacing = 6; // Mais setas para ficar mais visível
        const chevronSize = 8; // Setas maiores
        
        this.ctx.strokeStyle = '#00FF00'; // Verde brilhante
        this.ctx.lineWidth = 3; // Mais grossas
        this.ctx.lineCap = 'round';
        
        for (let i = 0; i < this.trackPoints.length; i += arrowSpacing) {
            const current = this.trackPoints[i];
            const next = this.trackPoints[(i + 1) % this.trackPoints.length];
            
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                const dirX = dx / length;
                const dirY = dy / length;
                const perpX = -dirY;
                const perpY = dirX;
                
                const centerX = current.x;
                const centerY = current.y;
                const tipX = centerX + dirX * chevronSize;
                const tipY = centerY + dirY * chevronSize;
                
                // Desenhar seta mais visível (igual ao track generator)
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - dirX * 3 + perpX * chevronSize, centerY - dirY * 3 + perpY * chevronSize);
                this.ctx.lineTo(tipX, tipY);
                this.ctx.moveTo(tipX, tipY);
                this.ctx.lineTo(centerX - dirX * 3 - perpX * chevronSize, centerY - dirY * 3 - perpY * chevronSize);
                this.ctx.stroke();
            }
        }
    }

    drawStartLine() {
        // Usar o primeiro ponto da pista (ponto 0)
        const startPoint = this.trackPoints[0];
        const nextPoint = this.trackPoints[1];
        
        // Calcular direção da pista neste ponto
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Calcular perpendicular para desenhar linha que cruza toda a pista
        let perpX = -dy / length;
        let perpY = dx / length;
        
        // DETECÇÃO INTELIGENTE DE CURVA E DIREÇÃO
        const curveInfo = this.detectCurveDirection(0);
        console.log(`🔍 Análise da curva no ponto 0:`, curveInfo);
        
        if (curveInfo.isCurve && Math.abs(curveInfo.angle) > 8) { // Reduzido de 15° para 8°
            // Ajustar linha baseado na direção real da curva
            let adjustmentAngle;
            
            if (curveInfo.direction === 'left') {
                // Curva para esquerda - ajustar linha no sentido horário
                adjustmentAngle = Math.abs(curveInfo.angle) * 0.4; // Aumentado de 0.3 para 0.4
            } else {
                // Curva para direita - ajustar linha no sentido anti-horário  
                adjustmentAngle = -Math.abs(curveInfo.angle) * 0.4; // Aumentado de 0.3 para 0.4
            }
            
            const cos_adj = Math.cos(adjustmentAngle);
            const sin_adj = Math.sin(adjustmentAngle);
            const newPerpX = perpX * cos_adj - perpY * sin_adj;
            const newPerpY = perpX * sin_adj + perpY * cos_adj;
            perpX = newPerpX;
            perpY = newPerpY;
            
            console.log(`📐 Linha ajustada: ${curveInfo.direction} ${(Math.abs(adjustmentAngle) * 180/Math.PI).toFixed(1)}°`);
        } else {
            console.log(`📏 Linha mantida perpendicular (reta ou curva suave)`);
        }
        
        const halfWidth = this.trackWidth / 2;
        
        // Estender a linha um pouco além das bordas para garantir cobertura total
        const extension = 8; // Aumentado de 5 para 8 pixels extras
        const extendedHalfWidth = halfWidth + extension;
        
        // Linha branca da largada (estendida)
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(
            startPoint.x + perpX * extendedHalfWidth,
            startPoint.y + perpY * extendedHalfWidth
        );
        this.ctx.lineTo(
            startPoint.x - perpX * extendedHalfWidth,
            startPoint.y - perpY * extendedHalfWidth
        );
        this.ctx.stroke();
        
        // Padrão xadrez da linha de largada (usando a largura estendida)
        const checkSize = 8;
        const totalWidth = extendedHalfWidth * 2;
        const numChecks = Math.floor(totalWidth / checkSize);
        
        this.ctx.fillStyle = '#000000';
        for (let i = 0; i < numChecks; i++) {
            if (i % 2 === 0) { // Alternar xadrez
                const t = (i / numChecks - 0.5) * 2; // Normalizar de -1 a 1
                const checkX = startPoint.x + perpX * extendedHalfWidth * t;
                const checkY = startPoint.y + perpY * extendedHalfWidth * t;
                
                // Criar quadrados xadrez alinhados com a linha
                this.ctx.save();
                this.ctx.translate(checkX, checkY);
                this.ctx.rotate(Math.atan2(dy, dx));
                this.ctx.fillRect(-checkSize/2, -checkSize/2, checkSize, checkSize);
                this.ctx.restore();
            }
        }
    }

    drawCar() {
        const car = this.carController.position;
        
        this.ctx.save();
        this.ctx.translate(car.x, car.y);
        this.ctx.rotate(car.angle);
        
        // Desenhar carro F1 style (inspirado no jogoref.js) - MAIOR
        const carLength = 20; // Aumentado de 16 para 20
        const carWidth = 10;  // Aumentado de 8 para 10
        
        // Corpo principal do carro
        this.ctx.fillStyle = '#FF6B00'; // Laranja McLaren
        this.ctx.fillRect(-carLength/2, -carWidth/2, carLength, carWidth);
        
        // Frente do carro (mais escura)
        this.ctx.fillStyle = '#E55A00';
        this.ctx.fillRect(carLength/2 - 5, -carWidth/2, 5, carWidth);
        
        // Cockpit (mais escuro)
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(-3, -4, 10, 8);
        
        // Asas dianteiras
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(carLength/2 - 3, -carWidth/2 - 1, 5, 1);
        this.ctx.fillRect(carLength/2 - 3, carWidth/2, 5, 1);
        
        this.ctx.restore();
    }

    startGameLoop() {
        this.gameLoop();
    }

    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    handleGameError(error) {
        console.error('[Game] Error:', error);
    }

    // Métodos placeholder para compatibilidade
    initializeShareButton() {
        // TODO: Implementar se necessário
    }

    initializeShareModal() {
        // TODO: Implementar se necessário
    }

    initializeConstructorNames() {
        // TODO: Implementar se necessário
    }
}

// CarController baseado no car.js original
class CarController {
    constructor(scale) {
        console.info("[CarController] Initializing with scale:", scale);
        this.controls = {
            left: false,
            right: false
        };
        this.position = {
            x: 0,
            y: 0,
            angle: 0
        };
        
        // Física igual ao car.js original
        this.speed = 0;
        this.maxSpeed = 2.4;
        this.acceleration = 0.11;
        this.deceleration = 0.05;
        this.turnSpeed = 0.06;
        this.friction = 0.95;
        
        this.velocity = { x: 0, y: 0 };
        this.lastUpdateTime = performance.now();
    }

    setPosition(x, y, angle = 0) {
        console.debug(`🚗 [CarController] setPosition: x=${x}, y=${y}, angle=${angle}`);
        this.position.x = x;
        this.position.y = y;
        this.position.angle = angle;
        // Reset velocidade quando reposicionar
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
        this.lastUpdateTime = performance.now(); // Reset timer também
        console.debug(`🚗 [CarController] Position set, speed reset to ${this.speed}`);
    }

    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        // Prevenir deltaTime muito grandes que causam "teleporte"
        const limitedDeltaTime = Math.min(deltaTime, 50); // Máximo 50ms
        const timeMultiplier = limitedDeltaTime / 16.67; // 16.67ms = 60fps

        // Log para debug da física
        const oldPosition = { x: this.position.x, y: this.position.y };

        // CORRIGIDO: Não forçar velocidade máxima, deixar acelerar gradualmente
        // O car.js original usa auto-aceleração até velocidade máxima
        if (this.speed < this.maxSpeed) {
            this.speed += this.acceleration * timeMultiplier;
            if (this.speed > this.maxSpeed) {
                this.speed = this.maxSpeed;
            }
        }

        // Turning (só se estiver se movendo)
        if (this.speed > 0.1) {
            if (this.controls.left) {
                this.position.angle -= this.turnSpeed * (this.speed / this.maxSpeed) * timeMultiplier;
            }
            if (this.controls.right) {
                this.position.angle += this.turnSpeed * (this.speed / this.maxSpeed) * timeMultiplier;
            }
        }

        // Verificar modo de jogo para aplicar física do modo contínuo
        const gameMode = window.game?.ui?.getGameMode ? window.game.ui.getGameMode() : 'classic';
        const tolerance = gameMode === 'continuous' ? 8 : 0;

        // Convert angle to velocity
        this.velocity.x = Math.cos(this.position.angle) * this.speed * timeMultiplier;
        this.velocity.y = Math.sin(this.position.angle) * this.speed * timeMultiplier;

        // Calcular nova posição
        const newX = this.position.x + this.velocity.x;
        const newY = this.position.y + this.velocity.y;

        // No modo contínuo, verificar se pode mover para nova posição
        if (gameMode === 'continuous') {
            const canMove = window.game?.isOnTrack(newX, newY, tolerance);
            if (canMove) {
                // Movimento permitido - atualizar posição
                this.position.x = newX;
                this.position.y = newY;
                
                // Verificar se está na zona de tolerância (azul) para aplicar redução de velocidade
                const onOriginalTrack = window.game?.isOnTrack(this.position.x, this.position.y, 0);
                const onTrackWithTolerance = window.game?.isOnTrack(this.position.x, this.position.y, tolerance);
                const inToleranceZone = onTrackWithTolerance && !onOriginalTrack;
                
                if (inToleranceZone) {
                    // Aplicar redução de velocidade na zona azul (como no car.js original)
                    const toleranceFriction = 0.88; // Redução moderada
                    this.speed *= toleranceFriction;
                    console.log('🔵 Car in blue tolerance zone - speed reduced to:', this.speed.toFixed(2));
                }
            } else {
                // Movimento bloqueado pelas bordas azuis - não atualizar posição
                this.velocity.x = 0;
                this.velocity.y = 0;
                console.log('🚫 Movement blocked by blue boundaries');
            }
        } else {
            // Modo clássico - movimento normal
            this.position.x = newX;
            this.position.y = newY;
        }

        // Log movimentos grandes (possível teleporte)
        const distance = Math.sqrt(
            (this.position.x - oldPosition.x) ** 2 + 
            (this.position.y - oldPosition.y) ** 2
        );
        
        if (distance > 10) {
            console.warn(`🚗 [CarController] Large movement detected:`, {
                distance: distance.toFixed(2),
                deltaTime: deltaTime.toFixed(2),
                timeMultiplier: timeMultiplier.toFixed(2),
                speed: this.speed.toFixed(2),
                velocity: { x: this.velocity.x.toFixed(2), y: this.velocity.y.toFixed(2) },
                from: { x: oldPosition.x.toFixed(2), y: oldPosition.y.toFixed(2) },
                to: { x: this.position.x.toFixed(2), y: this.position.y.toFixed(2) }
            });
        }

        // Apply friction
        this.speed *= this.friction;
    }

    setControls(left, right) {
        this.controls.left = left;
        this.controls.right = right;
    }
}

// Inicializar quando o DOM carregar
window.addEventListener("load", () => {
    window.game = new Game();
    console.log('Game initialized and made globally accessible');
});
