// Track Integration Module - Conecta o gerador de pistas com o jogo principal

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

    // Salvar pista personalizada criada no gerador
    saveCustomTrack(trackGenerator) {
        if (!trackGenerator.isComplete) {
            alert('Complete a pista antes de testá-la no jogo!');
            return false;
        }

        const trackData = {
            points: trackGenerator.points,
            canvasSize: {
                width: trackGenerator.canvas.width,
                height: trackGenerator.canvas.height
            },
            timestamp: new Date().toISOString(),
            isComplete: trackGenerator.isComplete
        };

        // Salvar no localStorage
        localStorage.setItem('customTrackData', JSON.stringify(trackData));
        this.customTrackData = trackData;
        
        console.log('✅ Pista personalizada salva:', trackData.points.length, 'pontos');
        return true;
    }

    // Carregar pista do localStorage
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

    // Gerar pista personalizada no formato do jogo (MÉTODO AJUSTADO PARA CENTRALIZAÇÃO)
    generateCustomTrack(track) {
        const data = this.customTrackData;
        
        if (!data || !data.points || data.points.length < 3) {
            console.error('❌ Dados de pista inválidos, gerando pista de referência');
            // Se não tem dados válidos, gerar uma pista padrão
            this.generateReferenceStyleTrack(track, track.width / 320, track.width / 2, track.height / 2);
            return;
        }

        console.log('🔄 New smart centering coordinate conversion');
        
        // Converter pontos normalizados para coordenadas absolutas primeiro
        let absolutePoints = data.points.map(point => ({
            x: point.x * data.canvasSize.width,
            y: point.y * data.canvasSize.height
        }));

        // Encontrar bounding box da pista desenhada
        let minX = Math.min(...absolutePoints.map(p => p.x));
        let maxX = Math.max(...absolutePoints.map(p => p.x));
        let minY = Math.min(...absolutePoints.map(p => p.y));
        let maxY = Math.max(...absolutePoints.map(p => p.y));
        
        // Adicionar margem para a largura da pista (trackWidth/2 em cada lado)
        const trackMargin = 25; // Margem extra para garantir que a pista não seja cortada
        minX -= trackMargin;
        maxX += trackMargin;
        minY -= trackMargin;
        maxY += trackMargin;
        
        const trackWidth = maxX - minX;
        const trackHeight = maxY - minY;
        
        console.log('📏 Track bounding box:', {minX, maxX, minY, maxY, trackWidth, trackHeight});
        
        // Calcular escala para caber no canvas do jogo com margem
        const gameMargin = 20; // Margem no canvas do jogo
        const availableWidth = track.width - (gameMargin * 2);
        const availableHeight = track.height - (gameMargin * 2);
        
        const scaleX = availableWidth / trackWidth;
        const scaleY = availableHeight / trackHeight;
        const scale = Math.min(scaleX, scaleY); // Usar menor escala para manter proporção
        
        console.log('� Scaling calculation:', {availableWidth, availableHeight, scaleX, scaleY, finalScale: scale});
        
        // Calcular nova dimensão da pista após escala
        const scaledWidth = trackWidth * scale;
        const scaledHeight = trackHeight * scale;
        
        // Calcular offset para centralizar no canvas
        const offsetX = (track.width - scaledWidth) / 2 - (minX * scale);
        const offsetY = (track.height - scaledHeight) / 2 - (minY * scale);
        
        console.log('🎯 Centering calculation:', {scaledWidth, scaledHeight, offsetX, offsetY});

        // Aplicar transformação nos pontos
        let scaledPoints = absolutePoints.map((point, index) => {
            const transformedPoint = {
                x: point.x * scale + offsetX,
                y: point.y * scale + offsetY
            };
            
            // Log para primeiros pontos
            if (index < 3) {
                console.log(`🔄 Point ${index + 1} transformation:`);
                console.log(`  Original absolute: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`);
                console.log(`  After scale (${scale.toFixed(3)}): (${(point.x * scale).toFixed(1)}, ${(point.y * scale).toFixed(1)})`);
                console.log(`  Final with offset: (${transformedPoint.x.toFixed(1)}, ${transformedPoint.y.toFixed(1)})`);
            }
            
            return transformedPoint;
        });

        console.log('📊 Final scaled points (first 3):', scaledPoints.slice(0, 3));

        // Verificar se todos os pontos estão dentro do canvas
        const finalMinX = Math.min(...scaledPoints.map(p => p.x));
        const finalMaxX = Math.max(...scaledPoints.map(p => p.x));
        const finalMinY = Math.min(...scaledPoints.map(p => p.y));
        const finalMaxY = Math.max(...scaledPoints.map(p => p.y));
        
        console.log('✅ Final bounds check:', {
            minX: finalMinX.toFixed(1), 
            maxX: finalMaxX.toFixed(1), 
            minY: finalMinY.toFixed(1), 
            maxY: finalMaxY.toFixed(1),
            canvasSize: `${track.width}x${track.height}`
        });

        // Os pontos já estão otimizados pelo Douglas-Peucker no gerador - usar direto
        track.centerPoints = scaledPoints;

        // IMPORTANTE: Escalar a largura da pista proporcionalmente
        track.trackWidth = Math.max(20, Math.min(60, 40 * scale)); // Entre 20px e 60px

        // Configurar linha de largada no primeiro ponto
        track.startLine.x = track.centerPoints[0].x;
        track.startLine.y = track.centerPoints[0].y;
        
        // Calcular ângulo da linha de largada
        if (track.centerPoints.length > 1) {
            track.startLine.angle = Math.atan2(
                track.centerPoints[1].y - track.centerPoints[0].y,
                track.centerPoints[1].x - track.centerPoints[0].x
            );
        } else {
            track.startLine.angle = 0;
        }

        // Gerar bordas da pista (método simples como no projeto original)
        this.generateTrackBounds(track);
        
        console.log(`🏁 Pista personalizada gerada: ${data.points.length} pontos, escala ${scale.toFixed(3)}, trackWidth ${track.trackWidth.toFixed(1)}px`);
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

        // Aplicar Douglas-Peucker EXATAMENTE como na referência
        let processedPoints = this.douglasPeucker(points, 0.02 * Math.min(width, height));

        // Garantir mínimo de pontos
        if (processedPoints.length < 3) {
            while (processedPoints.length < 3 && processedPoints.length < points.length) {
                const addIndex = Math.floor(points.length / (4 - processedPoints.length));
                if (addIndex < points.length) {
                    processedPoints.splice(1, 0, points[addIndex]);
                }
            }
        }

        // Converter para o formato do jogo
        track.centerPoints = processedPoints.map(point => ({
            x: point.x,
            y: point.y
        }));

        // Configurar linha de largada
        track.startLine.x = track.centerPoints[0].x;
        track.startLine.y = track.centerPoints[0].y;
        
        if (track.centerPoints.length > 1) {
            track.startLine.angle = Math.atan2(
                track.centerPoints[1].y - track.centerPoints[0].y,
                track.centerPoints[1].x - track.centerPoints[0].x
            );
        } else {
            track.startLine.angle = 0;
        }

        // Gerar bordas usando método original simples
        this.generateTrackBoundsOriginal(track);
        
        console.log(`🏁 Pista gerada no estilo referência: ${track.centerPoints.length} pontos`);
    }

    // Método ORIGINAL de geração de bordas (sem suavização)
    generateTrackBoundsOriginal(track) {
        track.innerPath = [];
        track.outerPath = [];
        
        for (let i = 0; i < track.centerPoints.length; i++) {
            const current = track.centerPoints[i];
            const next = track.centerPoints[(i + 1) % track.centerPoints.length];
            
            // Calculate perpendicular direction
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length === 0) continue; // Skip zero-length segments
            
            const perpX = -dy / length;
            const perpY = dx / length;
            
            // Create inner and outer points
            const halfWidth = track.trackWidth / 2;
            
            track.innerPath.push({
                x: current.x + perpX * halfWidth,
                y: current.y + perpY * halfWidth
            });
            
            track.outerPath.push({
                x: current.x - perpX * halfWidth,
                y: current.y - perpY * halfWidth
            });
        }
        
        // SEM suavização - usar pontos exatos como o jogo original
    }

    // Gerar bordas da pista (método idêntico ao projeto original)
    generateTrackBounds(track) {
        track.innerPath = [];
        track.outerPath = [];
        
        for (let i = 0; i < track.centerPoints.length; i++) {
            const current = track.centerPoints[i];
            const next = track.centerPoints[(i + 1) % track.centerPoints.length];
            
            // Calculate perpendicular direction
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length === 0) continue; // Skip zero-length segments
            
            const perpX = -dy / length;
            const perpY = dx / length;
            
            // Create inner and outer points
            const halfWidth = track.trackWidth / 2;
            
            track.innerPath.push({
                x: current.x + perpX * halfWidth,
                y: current.y + perpY * halfWidth
            });
            
            track.outerPath.push({
                x: current.x - perpX * halfWidth,
                y: current.y - perpY * halfWidth
            });
        }

        // REMOVIDA a suavização - usar pontos exatos como o jogo original
        // track.innerPath = this.smoothBorder(track.innerPath, 2);
        // track.outerPath = this.smoothBorder(track.outerPath, 2);
    }

    // Reduzir número de pontos mantendo a forma geral
    reducePoints(points, targetCount) {
        if (points.length <= targetCount) {
            return points;
        }

        const reduced = [];
        const step = points.length / targetCount;
        
        for (let i = 0; i < targetCount; i++) {
            const index = Math.floor(i * step);
            reduced.push(points[index]);
        }
        
        return reduced;
    }

    // Algoritmo Douglas-Peucker (IDÊNTICO À REFERÊNCIA)
    douglasPeucker(points, tolerance) {
        if (points.length <= 2) {
            return points;
        }

        let maxDistance = 0;
        let maxIndex = 0;
        const start = points[0];
        const end = points[points.length - 1];

        // Encontrar o ponto mais distante da linha start-end
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(points[i], start, end);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        // Se a distância máxima é maior que a tolerância, subdividir
        if (maxDistance > tolerance) {
            const leftSegment = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const rightSegment = this.douglasPeucker(points.slice(maxIndex), tolerance);
            
            // Combinar os segmentos (remover o ponto duplicado)
            return leftSegment.slice(0, -1).concat(rightSegment);
        } else {
            // Se todos os pontos estão dentro da tolerância, retornar apenas start e end
            return [start, end];
        }
    }

    // Calcular distância perpendicular de um ponto para uma linha (IDÊNTICO À REFERÊNCIA)
    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        if (dx === 0 && dy === 0) {
            return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
        }
        
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        const closestX = lineStart.x + clampedT * dx;
        const closestY = lineStart.y + clampedT * dy;
        
        return Math.hypot(point.x - closestX, point.y - closestY);
    }

    // Densificar pontos para criar mais pontos uniformemente distribuídos
    densifyPoints(points, targetCount) {
        if (points.length >= targetCount) {
            return points;
        }

        const result = [];
        const totalLength = this.calculatePathLength(points);
        const segmentLength = totalLength / targetCount;
        
        let currentLength = 0;
        let currentIndex = 0;
        
        // Adicionar primeiro ponto
        result.push(points[0]);
        
        for (let i = 1; i < targetCount; i++) {
            const targetLength = i * segmentLength;
            
            // Encontrar segmento onde o ponto deve estar
            while (currentIndex < points.length - 1) {
                const nextPoint = points[currentIndex + 1];
                const segLength = Math.hypot(
                    nextPoint.x - points[currentIndex].x,
                    nextPoint.y - points[currentIndex].y
                );
                
                if (currentLength + segLength >= targetLength) {
                    // Interpolar dentro deste segmento
                    const t = (targetLength - currentLength) / segLength;
                    const interpolated = {
                        x: points[currentIndex].x + t * (nextPoint.x - points[currentIndex].x),
                        y: points[currentIndex].y + t * (nextPoint.y - points[currentIndex].y)
                    };
                    result.push(interpolated);
                    break;
                }
                
                currentLength += segLength;
                currentIndex++;
            }
        }
        
        return result;
    }

    // Calcular comprimento total do caminho
    calculatePathLength(points) {
        let length = 0;
        for (let i = 0; i < points.length - 1; i++) {
            length += Math.hypot(
                points[i + 1].x - points[i].x,
                points[i + 1].y - points[i].y
            );
        }
        return length;
    }

    // Suavizar caminho usando corte de cantos (Chaikin) para bordas internas/externas
    smoothBorder(points, iterations) {
        let smoothPts = points;
        for (let it = 0; it < iterations; it++) {
            const newPts = [];
            for (let i = 0; i < smoothPts.length; i++) {
                const p0 = smoothPts[i];
                const p1 = smoothPts[(i + 1) % smoothPts.length];
                newPts.push({
                    x: 0.75 * p0.x + 0.25 * p1.x,
                    y: 0.75 * p0.y + 0.25 * p1.y
                });
                newPts.push({
                    x: 0.25 * p0.x + 0.75 * p1.x,
                    y: 0.25 * p0.y + 0.75 * p1.y
                });
            }
            smoothPts = newPts;
        }
        return smoothPts;
    }
    // Restaurar pista original do jogo
    restoreOriginalTrack(track) {
        if (this.originalGenerateTrack) {
            track.generateTrack = this.originalGenerateTrack;
            track.generateTrack();
            console.log('🔄 Pista original restaurada');
            return true;
        }
        return false;
    }

    // Adicionar botões no gerador de pistas
    addIntegrationButtons() {
        // Verificar se estamos na página do gerador
        const trackCanvas = document.getElementById('trackCanvas');
        if (!trackCanvas) return;

        // Não adicionar botão extra - vamos modificar o comportamento do botão existente
        // A função updateTestButton vai cuidar da troca de funcionalidade
        this.updateTestButton();
    }

    // Adicionar botões no jogo principal
    addGameButtons() {
        // Verificar se estamos na página do jogo
        const gameCanvas = document.getElementById('gameCanvas');
        if (!gameCanvas) return;

        // Criar container para botões de pista personalizada
        const trackControls = document.createElement('div');
        trackControls.id = 'trackControls';
        trackControls.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        `;

        // Botão para usar pista personalizada
        /*
        const useCustomBtn = document.createElement('button');
        useCustomBtn.id = 'useCustomTrackBtn';
        useCustomBtn.innerHTML = '🛠️ Pista Personalizada';
        useCustomBtn.style.cssText = `
            padding: 8px 12px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        useCustomBtn.addEventListener('click', () => {
            this.toggleCustomTrack();
        });

        // Botão para voltar ao gerador
        const editBtn = document.createElement('button');
        editBtn.id = 'editTrackBtn';
        editBtn.innerHTML = '✏️ Editar Pista';
        editBtn.style.cssText = `
            padding: 8px 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        editBtn.addEventListener('click', () => {
            this.openTrackGenerator();
        });

        trackControls.appendChild(useCustomBtn);
        trackControls.appendChild(editBtn);

        // Adicionar ao corpo da página
        document.body.appendChild(trackControls);
        */

        // Atualizar status dos botões
        // this.updateButtonStates();
    }

    // Testar pista no jogo (do gerador)
    testTrackInGame() {
        // Verificar se trackGen existe (estamos no gerador)
        if (typeof trackGen === 'undefined') {
            alert('Erro: Gerador de pistas não encontrado!');
            return;
        }

        // Salvar pista atual
        if (!this.saveCustomTrack(trackGen)) {
            return;
        }

        // Mostrar feedback visual
        const submitBtn = document.getElementById('submitTrackBtn');
        if (submitBtn) {
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '📤 Salvando...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                submitBtn.innerHTML = '🎮 Abrindo Jogo...';
                
                setTimeout(() => {
                    // Abrir jogo em nova aba/janela com parâmetro para forçar pista personalizada
                    const gameUrl = window.location.href.replace('track-generator.html', 'index.html') + '?customTrack=true';
                    window.open(gameUrl, '_blank');
                    
                    // Restaurar botão
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 500);
            }, 500);
        } else {
            // Fallback se não encontrar o botão
            const gameUrl = window.location.href.replace('track-generator.html', 'index.html') + '?customTrack=true';
            window.open(gameUrl, '_blank');
        }
    }

    // Alternar entre pista personalizada e original (no jogo)
    toggleCustomTrack() {
        // Verificar se game existe (estamos no jogo)
        if (typeof game === 'undefined') {
            alert('Erro: Jogo não encontrado!');
            return;
        }

        if (this.customTrackData && game.track) {
            if (this.isUsingCustomTrack()) {
                // Voltar para pista original
                this.restoreOriginalTrack(game.track);
                
                // Reinicializar carro na nova pista
                if (game.car) {
                    game.car.reset();
                }
                
                this.showNotification('🔄 Pista original restaurada');
            } else {
                // Aplicar pista personalizada
                if (this.applyCustomTrackToGame(game.track)) {
                    // Reinicializar carro na nova pista
                    if (game.car) {
                        game.car.reset();
                    }
                    
                    this.showNotification('🛠️ Pista personalizada ativada');
                } else {
                    this.showNotification('❌ Erro ao aplicar pista personalizada');
                }
            }
            
            this.updateButtonStates();
        } else {
            this.showNotification('❌ Nenhuma pista personalizada encontrada');
        }
    }

    // Verificar se está usando pista personalizada
    isUsingCustomTrack() {
        if (typeof game === 'undefined' || !game.track) return false;
        return game.track.generateTrack !== this.originalGenerateTrack;
    }

    // Abrir gerador de pistas
    openTrackGenerator() {
        const generatorUrl = window.location.href.replace('index.html', 'track-generator.html');
        window.open(generatorUrl, '_blank');
    }

    // Atualizar visibilidade do botão de teste
    updateTestButton() {
        const submitBtn = document.getElementById('submitTrackBtn');
        if (!submitBtn) return;

        // Verificar se trackGen existe e se a pista está completa
        if (typeof trackGen !== 'undefined' && trackGen.isComplete) {
            // Pista completa - transformar em botão de teste
            submitBtn.innerHTML = '🎮 Testar no Jogo';
            submitBtn.className = 'generator-btn primary';
            submitBtn.disabled = false;
            
            // Remover event listeners antigos e adicionar novo
            submitBtn.onclick = (e) => {
                e.preventDefault();
                this.testTrackInGame();
            };
        } else {
            // Pista incompleta - manter como botão de envio
            submitBtn.innerHTML = '🚀 Enviar Pista';
            submitBtn.className = 'generator-btn success';
            submitBtn.disabled = true;
            
            // Restaurar funcionalidade original de envio
            submitBtn.onclick = (e) => {
                e.preventDefault();
                if (typeof trackGen !== 'undefined') {
                    trackGen.openSubmitModal();
                }
            };
        }
    }

    // Atualizar estados dos botões
    updateButtonStates() {
        const useCustomBtn = document.getElementById('useCustomTrackBtn');
        if (useCustomBtn) {
            if (this.customTrackData) {
                useCustomBtn.disabled = false;
                if (this.isUsingCustomTrack()) {
                    useCustomBtn.innerHTML = '🔄 Pista Original';
                    useCustomBtn.style.background = '#dc3545';
                } else {
                    useCustomBtn.innerHTML = '🛠️ Pista Personalizada';
                    useCustomBtn.style.background = '#28a745';
                }
            } else {
                useCustomBtn.disabled = true;
                useCustomBtn.innerHTML = '❌ Sem Pista Personalizada';
                useCustomBtn.style.background = '#6c757d';
            }
        }

        // Atualizar botão de teste também
        this.updateTestButton();
    }

    // Mostrar notificação
    showNotification(message) {
        // Remover notificação anterior se existir
        const existing = document.getElementById('trackNotification');
        if (existing) {
            existing.remove();
        }

        // Criar nova notificação
        const notification = document.createElement('div');
        notification.id = 'trackNotification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;

        // Adicionar CSS da animação
        if (!document.getElementById('notificationStyle')) {
            const style = document.createElement('style');
            style.id = 'notificationStyle';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remover após 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Limpar dados de pista personalizada
    clearCustomTrack() {
        localStorage.removeItem('customTrackData');
        this.customTrackData = null;
        this.updateButtonStates();
        this.showNotification('🗑️ Pista personalizada removida');
    }

    // Auto-aplicar pista personalizada quando o jogo carregar
    autoApplyCustomTrack() {
        // Só funciona se estivermos no jogo (não no gerador)
        const gameCanvas = document.getElementById('gameCanvas');
        if (!gameCanvas || !this.customTrackData) return;

        // Verificar se veio do gerador (parâmetro na URL)
        const urlParams = new URLSearchParams(window.location.search);
        const fromGenerator = urlParams.has('customTrack');

        // Aguardar o jogo ser totalmente inicializado
        const checkGameReady = () => {
            if (typeof game !== 'undefined' && game.track) {
                console.log('🎮 Jogo detectado, aplicando pista personalizada automaticamente...');
                
                // Aplicar pista personalizada
                if (this.applyCustomTrackToGame(game.track)) {
                    // Reinicializar carro na nova pista
                    if (game.car) {
                        game.car.reset();
                    }
                    
                    if (fromGenerator) {
                        this.showNotification('🎮 Sua pista personalizada foi carregada! Vamos jogar!');
                        // Limpar parâmetro da URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        // this.showNotification('🛠️ Pista personalizada carregada automaticamente!');
                    }
                    
                    this.updateButtonStates();
                } else {
                    console.warn('❌ Falha ao aplicar pista personalizada automaticamente');
                }
            } else {
                // Tentar novamente em 100ms
                setTimeout(checkGameReady, 100);
            }
        };

        // Iniciar verificação
        setTimeout(checkGameReady, 500); // Dar tempo para scripts carregarem
    }

    // Método para calcular escala do jogo (idêntico ao track-ref.js)
    getGameScale(track) {
        const GAME_BASE_WIDTH = 320;
        const GAME_BASE_HEIGHT = 280;
        const canvasAspectRatio = track.width / track.height;
        const gameAspectRatio = GAME_BASE_WIDTH / GAME_BASE_HEIGHT;
        
        if (canvasAspectRatio > gameAspectRatio) {
            // Canvas é mais largo que o jogo - ajustar pela altura
            return track.height / GAME_BASE_HEIGHT;
        } else {
            // Canvas é mais alto que o jogo - ajustar pela largura  
            return track.width / GAME_BASE_WIDTH;
        }
    }
}

// Instância global
let trackIntegration;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    trackIntegration = new TrackIntegration();
    trackIntegration.init();
});
