/**
 * SpeedLaps Daily Tracks - Admin Panel
 * Sistema de gerenciamento de pistas diárias
 */

class DailyTracksAdmin {
    constructor() {
        this.currentTrackData = null;
        this.isLoggedIn = false;
        this.countdownInterval = null;
        
        this.init();
    }
    
    init() {
        console.log('🔧 Initializing Daily Tracks Admin');
        
        // Verificar se já está logado
        this.checkLoginStatus();
        
        // Carregar informações da pista atual
        this.loadCurrentTrackInfo();
        
        // Iniciar countdown
        this.startCountdown();
        
        // Carregar submissões de usuários se estiver logado
        if (this.isLoggedIn) {
            this.loadUserSubmissions();
        }
        
        // Bind keyboard events
        this.bindKeyboardEvents();
    }
    
    checkLoginStatus() {
        const loggedIn = sessionStorage.getItem('admin_logged_in');
        if (loggedIn === 'true') {
            this.isLoggedIn = true;
            this.showAdminPanel();
        }
    }
    
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (!this.isLoggedIn && (document.activeElement.id === 'username' || document.activeElement.id === 'password')) {
                    this.login();
                }
            }
        });
    }
    
    login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Credenciais simples (em produção seria via backend)
        if (username === 'admin' && password === 'admin') {
            this.isLoggedIn = true;
            sessionStorage.setItem('admin_logged_in', 'true');
            this.showAdminPanel();
            this.showMessage('Login realizado com sucesso!', 'success');
        } else {
            document.getElementById('loginError').style.display = 'block';
            setTimeout(() => {
                document.getElementById('loginError').style.display = 'none';
            }, 3000);
        }
    }
    
    logout() {
        this.isLoggedIn = false;
        sessionStorage.removeItem('admin_logged_in');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        
        // Limpar campos
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
    
    showAdminPanel() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // Carregar dados iniciais
        this.loadCurrentTrackInfo();
        this.loadTrackHistory();
        this.loadUserSubmissions();
    }
    
    showMessage(message, type = 'success') {
        const messageEl = document.getElementById('statusMessage');
        messageEl.textContent = message;
        messageEl.className = `status-message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
    
    loadCurrentTrackInfo() {
        try {
            // Carregar pista atual do localStorage
            const dailyTrack = localStorage.getItem('daily_track_data');
            const dailyTrackDate = localStorage.getItem('daily_track_date');
            
            if (dailyTrack && dailyTrackDate) {
                const trackData = JSON.parse(dailyTrack);
                const trackDate = dailyTrackDate;
                
                document.getElementById('currentTrackName').textContent = trackData.name || 'Pista Sem Nome';
                document.getElementById('currentTrackDate').textContent = trackDate;
                document.getElementById('currentTrackType').textContent = trackData.type || 'Personalizada';
            } else {
                document.getElementById('currentTrackName').textContent = 'Pista Padrão';
                document.getElementById('currentTrackDate').textContent = this.getTodayString();
                document.getElementById('currentTrackType').textContent = 'Padrão';
            }
        } catch (error) {
            console.error('Erro ao carregar informações da pista atual:', error);
        }
    }
    
    startCountdown() {
        this.updateCountdown();
        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }
    
    updateCountdown() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const timeLeft = tomorrow.getTime() - now.getTime();
        
        if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            document.getElementById('countdownDisplay').textContent = 
                `Próxima pista em: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            document.getElementById('countdownDisplay').textContent = 'Nova pista disponível agora!';
            // Aqui poderia verificar se há uma pista programada para hoje
            this.checkScheduledTrack();
        }
    }
    
    checkScheduledTrack() {
        const scheduledTrack = localStorage.getItem('scheduled_track_data');
        const scheduledDate = localStorage.getItem('scheduled_track_date');
        
        if (scheduledTrack && scheduledDate === this.getTodayString()) {
            // Ativar pista programada
            const trackData = JSON.parse(scheduledTrack);
            this.activateTrack(trackData);
            
            // Remover da programação
            localStorage.removeItem('scheduled_track_data');
            localStorage.removeItem('scheduled_track_date');
            
            this.showMessage('Pista programada ativada automaticamente!', 'success');
        }
    }
    
    handleTrackTypeChange() {
        const trackType = document.getElementById('trackType').value;
        const customSection = document.getElementById('customTrackSection');
        
        if (trackType === 'custom') {
            customSection.style.display = 'block';
        } else {
            customSection.style.display = 'none';
            
            if (trackType === 'default') {
                document.getElementById('trackName').value = 'Pista Padrão SpeedLaps';
                document.getElementById('trackData').value = '';
            } else if (trackType === 'random') {
                document.getElementById('trackName').value = 'Pista Aleatória Diária';
                document.getElementById('trackData').value = '';
            }
        }
    }
    
    previewTrack() {
        const trackType = document.getElementById('trackType').value;
        const trackData = document.getElementById('trackData').value;
        
        try {
            if (trackType === 'custom' && trackData) {
                const parsed = JSON.parse(trackData);
                this.renderTrackPreview(parsed);
                this.showMessage('Pré-visualização gerada com sucesso!', 'success');
            } else if (trackType === 'default') {
                this.renderDefaultTrackPreview();
                this.showMessage('Pré-visualização da pista padrão gerada!', 'success');
            } else if (trackType === 'random') {
                this.renderRandomTrackPreview();
                this.showMessage('Pré-visualização da pista aleatória gerada!', 'success');
            } else {
                this.showMessage('Por favor, forneça dados válidos da pista', 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao processar dados da pista: ' + error.message, 'error');
        }
    }
    
    renderTrackPreview(trackData) {
        const canvas = document.getElementById('trackPreview');
        const ctx = canvas.getContext('2d');
        
        // Configurar canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Limpar canvas
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (trackData.trackPoints && trackData.trackPoints.length > 0) {
            const points = trackData.trackPoints;
            
            // Escalar pontos para o canvas
            const margin = 20;
            const drawWidth = canvas.width - (margin * 2);
            const drawHeight = canvas.height - (margin * 2);
            
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            
            for (let i = 0; i < points.length; i++) {
                const x = margin + points[i].x * drawWidth;
                const y = margin + points[i].y * drawHeight;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                    // Marcar ponto de largada
                    ctx.fillStyle = '#e74c3c';
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.strokeStyle = '#3498db';
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        } else {
            // Mostrar mensagem de erro
            ctx.fillStyle = '#e74c3c';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Dados de pista inválidos', canvas.width / 2, canvas.height / 2);
        }
    }
    
    renderDefaultTrackPreview() {
        // Simular pista padrão
        const defaultTrack = {
            trackPoints: [
                { x: 0.1, y: 0.85 },
                { x: 0.7, y: 0.85 },
                { x: 0.7, y: 0.65 },
                { x: 0.55, y: 0.55 },
                { x: 0.85, y: 0.35 },
                { x: 0.6, y: 0.2 },
                { x: 0.3, y: 0.2 },
                { x: 0.15, y: 0.4 },
                { x: 0.1, y: 0.65 },
                { x: 0.1, y: 0.85 }
            ]
        };
        
        this.renderTrackPreview(defaultTrack);
    }
    
    renderRandomTrackPreview() {
        // Gerar pista aleatória simples para pré-visualização
        const points = [];
        const numPoints = 8 + Math.floor(Math.random() * 4); // 8-12 pontos
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const radius = 0.3 + Math.random() * 0.2; // Raio variável
            const centerX = 0.5;
            const centerY = 0.5;
            
            points.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        }
        
        // Fechar o circuito
        points.push(points[0]);
        
        this.renderTrackPreview({ trackPoints: points });
    }
    
    setTodaysTrack() {
        const trackType = document.getElementById('trackType').value;
        const trackData = document.getElementById('trackData').value;
        const trackName = document.getElementById('trackName').value;
        
        try {
            const trackInfo = {
                type: trackType,
                name: trackName || 'Pista Diária',
                date: this.getTodayString(),
                timestamp: Date.now()
            };
            
            if (trackType === 'custom') {
                if (!trackData) {
                    this.showMessage('Por favor, forneça os dados da pista personalizada', 'error');
                    return;
                }
                trackInfo.data = JSON.parse(trackData);
            }
            
            // Salvar no localStorage
            localStorage.setItem('daily_track_data', JSON.stringify(trackInfo));
            localStorage.setItem('daily_track_date', this.getTodayString());
            
            // Adicionar ao histórico
            this.addToTrackHistory(trackInfo);
            
            // Atualizar display
            this.loadCurrentTrackInfo();
            this.loadTrackHistory();
            
            this.showMessage('Pista de hoje atualizada com sucesso! Os jogadores verão a nova pista.', 'success');
            
        } catch (error) {
            this.showMessage('Erro ao salvar pista: ' + error.message, 'error');
        }
    }
    
    scheduleTomorrowTrack() {
        const trackType = document.getElementById('tomorrowTrackType').value;
        const trackData = document.getElementById('tomorrowTrackData').value;
        const trackName = document.getElementById('tomorrowTrackName').value;
        
        try {
            const trackInfo = {
                type: trackType,
                name: trackName || 'Pista Programada',
                date: this.getTomorrowString(),
                scheduled: true,
                timestamp: Date.now()
            };
            
            if (trackType === 'custom' && trackData) {
                trackInfo.data = JSON.parse(trackData);
            }
            
            // Salvar programação
            localStorage.setItem('scheduled_track_data', JSON.stringify(trackInfo));
            localStorage.setItem('scheduled_track_date', this.getTomorrowString());
            
            this.showMessage('Pista de amanhã programada com sucesso! Será ativada automaticamente às 00:00.', 'success');
            
            // Limpar campos
            document.getElementById('tomorrowTrackData').value = '';
            document.getElementById('tomorrowTrackName').value = '';
            
        } catch (error) {
            this.showMessage('Erro ao programar pista: ' + error.message, 'error');
        }
    }
    
    importFromGame() {
        try {
            // Tentar importar pista personalizada do jogo principal
            const customTrack = localStorage.getItem('customTrack');
            
            if (customTrack) {
                const trackData = JSON.parse(customTrack);
                document.getElementById('trackData').value = JSON.stringify(trackData, null, 2);
                document.getElementById('trackName').value = 'Pista Importada do Jogo';
                document.getElementById('trackType').value = 'custom';
                this.handleTrackTypeChange();
                
                this.showMessage('Pista importada do jogo principal com sucesso!', 'success');
            } else {
                this.showMessage('Nenhuma pista personalizada encontrada no jogo principal', 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao importar pista: ' + error.message, 'error');
        }
    }
    
    activateTrack(trackInfo) {
        localStorage.setItem('daily_track_data', JSON.stringify(trackInfo));
        localStorage.setItem('daily_track_date', trackInfo.date);
        this.loadCurrentTrackInfo();
    }
    
    addToTrackHistory(trackInfo) {
        let history = [];
        try {
            const existing = localStorage.getItem('daily_track_history');
            if (existing) {
                history = JSON.parse(existing);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
        
        // Adicionar nova pista ao início
        history.unshift(trackInfo);
        
        // Manter apenas os últimos 30 registros
        history = history.slice(0, 30);
        
        localStorage.setItem('daily_track_history', JSON.stringify(history));
    }
    
    loadTrackHistory() {
        const historyContainer = document.getElementById('trackHistory');
        let history = [];
        
        try {
            const existing = localStorage.getItem('daily_track_history');
            if (existing) {
                history = JSON.parse(existing);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<div class="track-item">Nenhuma pista no histórico</div>';
            return;
        }
        
        historyContainer.innerHTML = history.map((track, index) => {
            const isActive = track.date === this.getTodayString();
            return `
                <div class="track-item ${isActive ? 'active' : ''}">
                    <div class="track-info">
                        <strong>${track.name}</strong><br>
                        <small>${track.date} - ${track.type}</small>
                        ${track.scheduled ? '<span style="color: #f39c12;"> (Programada)</span>' : ''}
                    </div>
                    <div class="track-actions">
                        <button class="btn" style="padding: 5px 10px; font-size: 12px;" onclick="admin.reactivateTrack(${index})">
                            Reativar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    reactivateTrack(index) {
        try {
            const history = JSON.parse(localStorage.getItem('daily_track_history') || '[]');
            const track = history[index];
            
            if (track) {
                // Atualizar data para hoje
                track.date = this.getTodayString();
                track.timestamp = Date.now();
                
                this.activateTrack(track);
                this.addToTrackHistory(track);
                this.loadTrackHistory();
                
                this.showMessage(`Pista "${track.name}" reativada com sucesso!`, 'success');
            }
        } catch (error) {
            this.showMessage('Erro ao reativar pista: ' + error.message, 'error');
        }
    }
    
    clearTrackHistory() {
        if (confirm('Tem certeza que deseja limpar todo o histórico de pistas?')) {
            localStorage.removeItem('daily_track_history');
            this.loadTrackHistory();
            this.showMessage('Histórico de pistas limpo com sucesso!', 'success');
        }
    }
    
    getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    getTomorrowString() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    // User submissions management
    loadUserSubmissions() {
        try {
            const submissions = JSON.parse(localStorage.getItem('userTrackSubmissions') || '[]');
            const container = document.getElementById('userSubmissions');
            
            if (!container) return;
            
            if (submissions.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; font-style: italic;">Nenhuma submissão de usuário encontrada</div>';
                return;
            }
            
            // Sort by submission date (newest first)
            submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
            
            container.innerHTML = submissions.map(submission => `
                <div class="submission-item ${submission.status}" data-submission-id="${submission.id}">
                    <div class="submission-info">
                        <div class="submission-title">🏁 ${submission.trackName}</div>
                        <div class="submission-meta">
                            Por: ${submission.pilotName} | 
                            ${new Date(submission.submittedAt).toLocaleString('pt-BR')} | 
                            Status: <strong>${this.getStatusText(submission.status)}</strong>
                        </div>
                    </div>
                    <div class="submission-actions">
                        <button class="btn btn-preview" onclick="previewSubmission(${submission.id})" title="Visualizar pista">👁️</button>
                        ${submission.status === 'pending' ? `
                            <button class="btn btn-approve" onclick="approveSubmission(${submission.id})" title="Aprovar">✅</button>
                            <button class="btn btn-reject" onclick="rejectSubmission(${submission.id})" title="Rejeitar">❌</button>
                        ` : ''}
                        ${submission.status === 'approved' ? `
                            <button class="btn btn-success" onclick="copySubmissionToDaily(${submission.id})" title="Copiar para pista diária">📋</button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
            
            this.showMessage(`Carregadas ${submissions.length} submissões de usuário`, 'success');
            
        } catch (error) {
            console.error('Error loading user submissions:', error);
            this.showMessage('Erro ao carregar submissões de usuários: ' + error.message, 'error');
        }
    }
    
    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'approved': 'Aprovada',
            'rejected': 'Rejeitada'
        };
        return statusMap[status] || status;
    }
    
    approveSubmission(submissionId) {
        try {
            const submissions = JSON.parse(localStorage.getItem('userTrackSubmissions') || '[]');
            const submission = submissions.find(s => s.id === submissionId);
            
            if (!submission) {
                this.showMessage('Submissão não encontrada!', 'error');
                return;
            }
            
            submission.status = 'approved';
            submission.approvedAt = new Date().toISOString();
            
            localStorage.setItem('userTrackSubmissions', JSON.stringify(submissions));
            this.loadUserSubmissions();
            this.showMessage(`Pista "${submission.trackName}" aprovada com sucesso!`, 'success');
            
        } catch (error) {
            console.error('Error approving submission:', error);
            this.showMessage('Erro ao aprovar submissão: ' + error.message, 'error');
        }
    }
    
    rejectSubmission(submissionId) {
        try {
            const submissions = JSON.parse(localStorage.getItem('userTrackSubmissions') || '[]');
            const submission = submissions.find(s => s.id === submissionId);
            
            if (!submission) {
                this.showMessage('Submissão não encontrada!', 'error');
                return;
            }
            
            if (confirm(`Tem certeza que deseja rejeitar a pista "${submission.trackName}" de ${submission.pilotName}?`)) {
                submission.status = 'rejected';
                submission.rejectedAt = new Date().toISOString();
                
                localStorage.setItem('userTrackSubmissions', JSON.stringify(submissions));
                this.loadUserSubmissions();
                this.showMessage(`Pista "${submission.trackName}" rejeitada`, 'success');
            }
            
        } catch (error) {
            console.error('Error rejecting submission:', error);
            this.showMessage('Erro ao rejeitar submissão: ' + error.message, 'error');
        }
    }
    
    previewSubmission(submissionId) {
        try {
            const submissions = JSON.parse(localStorage.getItem('userTrackSubmissions') || '[]');
            const submission = submissions.find(s => s.id === submissionId);
            
            if (!submission) {
                this.showMessage('Submissão não encontrada!', 'error');
                return;
            }
            
            // Parse track data from submission
            let trackData;
            try {
                if (typeof submission.trackCode === 'string' && submission.trackCode.includes('trackPoints')) {
                    // It's JSON format with trackPoints
                    trackData = JSON.parse(submission.trackCode);
                } else {
                    // It's the old JavaScript function format, extract data differently
                    trackData = this.extractTrackDataFromFunction(submission.trackCode);
                }
            } catch (e) {
                this.showMessage('Erro ao processar dados da pista: ' + e.message, 'error');
                return;
            }
            
            // Open the track visualizer modal
            this.openTrackVisualizer(trackData, submission.trackName, submission.pilotName);
            
        } catch (error) {
            console.error('Error previewing submission:', error);
            this.showMessage('Erro ao visualizar submissão: ' + error.message, 'error');
        }
    }
    
    extractTrackDataFromFunction(functionCode) {
        // Extract track points from old JavaScript function format
        // This is a fallback for old submissions
        const regex = /x:\s*x\s*\+\s*([\d.]+)\s*\*\s*width,\s*y:\s*y\s*\+\s*([\d.]+)\s*\*\s*height(?:,\s*angle:\s*(\d+))?/g;
        const trackPoints = [];
        let match;
        
        while ((match = regex.exec(functionCode)) !== null) {
            const point = {
                x: parseFloat(match[1]),
                y: parseFloat(match[2])
            };
            if (match[3]) {
                point.angle = parseInt(match[3]);
            }
            trackPoints.push(point);
        }
        
        return { trackPoints };
    }
    
    copySubmissionToDaily(submissionId) {
        try {
            const submissions = JSON.parse(localStorage.getItem('userTrackSubmissions') || '[]');
            const submission = submissions.find(s => s.id === submissionId);
            
            if (!submission) {
                this.showMessage('Submissão não encontrada!', 'error');
                return;
            }
            
            if (submission.status !== 'approved') {
                this.showMessage('Apenas pistas aprovadas podem ser copiadas para pistas diárias!', 'error');
                return;
            }
            
            let trackDataToUse;
            
            try {
                // Try to parse as JSON first (new format)
                const trackData = JSON.parse(submission.trackCode);
                if (trackData.trackPoints) {
                    // Format correctly for the daily tracks system
                    trackDataToUse = JSON.stringify({
                        trackPoints: trackData.trackPoints
                    }, null, 2);
                } else {
                    throw new Error('Invalid JSON format');
                }
            } catch (jsonError) {
                // If JSON parsing fails, use the JavaScript code directly (old format)
                if (submission.trackCode.includes('function generateCustomTrack')) {
                    trackDataToUse = submission.trackCode;
                } else {
                    throw new Error('Unknown track data format');
                }
            }
            
            // Copy to track data field
            const trackDataField = document.getElementById('trackData');
            const trackNameField = document.getElementById('trackName');
            const trackTypeField = document.getElementById('trackType');
            
            if (trackDataField && trackNameField && trackTypeField) {
                trackDataField.value = trackDataToUse;
                trackNameField.value = submission.trackName;
                trackTypeField.value = 'custom';
                this.handleTrackTypeChange();
                
                this.showMessage(`Pista "${submission.trackName}" copiada para o formulário. Agora você pode aplicá-la como pista diária.`, 'success');
            } else {
                this.showMessage('Erro: Campos do formulário não encontrados!', 'error');
            }
            
        } catch (error) {
            console.error('Error copying submission:', error);
            this.showMessage('Erro ao copiar submissão: ' + error.message, 'error');
        }
    }
    
    clearAllSubmissions() {
        if (confirm('Tem certeza que deseja limpar TODAS as submissões de usuários? Esta ação não pode ser desfeita.')) {
            localStorage.removeItem('userTrackSubmissions');
            this.loadUserSubmissions();
            this.showMessage('Todas as submissões foram removidas!', 'success');
        }
    }
    
    openTrackVisualizer(trackData, trackName, pilotName) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('trackVisualizerModal');
        if (!modal) {
            modal = this.createTrackVisualizerModal();
        }
        
        // Update modal title
        const title = modal.querySelector('.visualizer-title');
        if (title) {
            title.textContent = `🏁 ${trackName} - por ${pilotName}`;
        }
        
        // Initialize full game in modal
        const canvas = modal.querySelector('#visualizerCanvas');
        if (canvas && trackData.trackPoints) {
            // Create embedded game engine
            const gameEngine = new EmbeddedGameEngine(canvas, trackData.trackPoints);
            
            // Store reference for cleanup
            modal.gameEngine = gameEngine;
            
            // Initialize stats
            gameEngine.updateStats();
        }
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    createTrackVisualizerModal() {
        const modal = document.createElement('div');
        modal.id = 'trackVisualizerModal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(4px);
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = `
            <div class="visualizer-content" style="
                background: white;
                border-radius: 12px;
                padding: 20px;
                max-width: 95%;
                max-height: 95%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                align-items: center;
            ">
                <h2 class="visualizer-title" style="margin: 0 0 15px 0; color: #333; text-align: center;">🏁 Track Preview</h2>
                
                <div style="display: flex; gap: 20px; align-items: flex-start;">
                    <!-- Game Controls Panel -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; min-width: 200px;">
                        <h4 style="margin: 0 0 10px 0; color: #333;">🎮 Controles</h4>
                        <div style="font-size: 12px; color: #666; line-height: 1.4;">
                            <div><strong>ESPAÇO</strong> - Iniciar/Resetar</div>
                            <div><strong>A/D</strong> ou <strong>← →</strong> - Dirigir</div>
                            <div><em>Aceleração automática</em></div>
                        </div>
                        
                        <div id="gameStats" style="margin-top: 15px; font-size: 12px;">
                            <div><strong>Tempo:</strong> <span id="currentTime">0.000s</span></div>
                            <div><strong>Velocidade:</strong> <span id="currentSpeed">0 km/h</span></div>
                            <div><strong>Voltas:</strong> <span id="lapCount">0</span></div>
                            <div><strong>Melhor Volta:</strong> <span id="bestLap">--:--</span></div>
                        </div>
                    </div>
                    
                    <!-- Game Canvas -->
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        <canvas id="visualizerCanvas" width="533" height="400" style="
                            background: #87CEEB;
                            border-radius: 4px;
                            display: block;
                            border: 2px solid #dee2e6;
                        "></canvas>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-secondary" onclick="admin.closeTrackVisualizer()">Fechar</button>
                    <button class="btn btn-success" onclick="admin.fullscreenGame()">🔍 Tela Cheia</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeTrackVisualizer();
            }
        });
        
        return modal;
    }
    
    closeTrackVisualizer() {
        const modal = document.getElementById('trackVisualizerModal');
        if (modal) {
            // Stop the game
            if (modal.gameEngine) {
                modal.gameEngine.stop();
                modal.gameEngine = null;
            }
            modal.style.display = 'none';
        }
    }
    
    fullscreenGame() {
        const canvas = document.getElementById('visualizerCanvas');
        if (canvas) {
            if (canvas.requestFullscreen) {
                canvas.requestFullscreen();
            } else if (canvas.webkitRequestFullscreen) {
                canvas.webkitRequestFullscreen();
            } else if (canvas.msRequestFullscreen) {
                canvas.msRequestFullscreen();
            }
        }
    }
    
    renderTrackInVisualizer(canvas, trackPoints) {
        const ctx = canvas.getContext('2d');
        
        // Clear canvas with game background
        ctx.fillStyle = '#87CEEB'; // Sky blue like main game
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!trackPoints || trackPoints.length < 2) {
            ctx.fillStyle = '#666';
            ctx.font = '16px IBM Plex Mono';
            ctx.textAlign = 'center';
            ctx.fillText('Dados da pista inválidos', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // Game scaling (same as main game)
        const GAME_BASE_WIDTH = 320;
        const GAME_BASE_HEIGHT = 280;
        const scale = Math.min(canvas.width, canvas.height) / 400;
        const gameWidth = GAME_BASE_WIDTH * scale;
        const gameHeight = GAME_BASE_HEIGHT * scale;
        
        const canvasCenterX = canvas.width / 2;
        const canvasCenterY = canvas.height / 2;
        
        const gameAreaX = canvasCenterX - gameWidth / 2;
        const gameAreaY = canvasCenterY - gameHeight / 2;
        
        // Convert track points to canvas coordinates
        const canvasPoints = trackPoints.map(point => ({
            x: gameAreaX + point.x * gameWidth,
            y: gameAreaY + point.y * gameHeight,
            angle: point.angle
        }));
        
        // Draw track background (wide line)
        const trackWidth = 50 * scale;
        ctx.strokeStyle = '#E5E5E5';
        ctx.lineWidth = trackWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        
        for (let i = 1; i < canvasPoints.length; i++) {
            ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        
        ctx.stroke();
        
        // Draw center line
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        
        for (let i = 1; i < canvasPoints.length; i++) {
            ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        
        ctx.stroke();
        
        // Draw direction arrows
        this.drawDirectionArrows(ctx, canvasPoints, scale);
        
        // Draw checkpoints
        this.drawCheckpoints(ctx, canvasPoints);
        
        // Draw start/finish line
        this.drawStartFinishLine(ctx, canvasPoints[0], scale);
        
        // Draw car at start position
        this.drawCar(ctx, canvasPoints[0]);
        
        // Store current track for simulation
        this.currentVisualizerTrack = { canvasPoints, scale, canvas, ctx };
    }
    
    drawDirectionArrows(ctx, canvasPoints, scale) {
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
                this.drawDirectionArrow(ctx, arrowX, arrowY, angle, scale);
            }
        }
    }
    
    drawDirectionArrow(ctx, x, y, angle, scale) {
        const size = 12 * scale;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/4);
        ctx.lineTo(size/2, 0);
        ctx.lineTo(-size/2, size/4);
        
        ctx.fillStyle = 'rgba(26, 26, 26, 0.6)';
        ctx.fill();
        
        ctx.restore();
    }
    
    drawCheckpoints(ctx, canvasPoints) {
        canvasPoints.forEach((point, index) => {
            // Color based on type
            if (index === 0) {
                ctx.fillStyle = '#00ff00'; // Start point - green
            } else if (index === canvasPoints.length - 1) {
                ctx.fillStyle = '#ff0000'; // End point - red
            } else {
                ctx.fillStyle = '#0066ff'; // Regular checkpoint - blue
            }
            
            // Draw point circle
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            
            // White border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Point number
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px IBM Plex Mono';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText((index + 1).toString(), point.x + 10, point.y + 4);
            ctx.fillText((index + 1).toString(), point.x + 10, point.y + 4);
        });
    }
    
    drawStartFinishLine(ctx, startPoint, scale) {
        const width = 40 * scale;
        const height = 10 * scale;
        
        // Draw checkered pattern
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 2; j++) {
                ctx.fillStyle = (i + j) % 2 === 0 ? '#1A1A1A' : '#FFFFFF';
                ctx.fillRect(
                    startPoint.x - width/2 + i * width/8,
                    startPoint.y - height + j * height,
                    width/8,
                    height
                );
            }
        }
    }
    
    drawCar(ctx, startPoint) {
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Car border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    startTrackSimulation() {
        if (!this.currentVisualizerTrack) return;
        
        const { canvasPoints, scale, canvas, ctx } = this.currentVisualizerTrack;
        
        // Simple animation of car moving around track
        let currentPointIndex = 0;
        let animationProgress = 0;
        const animationSpeed = 0.02;
        
        const animate = () => {
            // Clear and redraw track
            this.renderTrackInVisualizer(canvas, this.currentVisualizerTrack.canvasPoints.map(p => ({
                x: (p.x - (canvas.width / 2 - 160 * scale)) / (320 * scale),
                y: (p.y - (canvas.height / 2 - 140 * scale)) / (280 * scale),
                angle: p.angle
            })));
            
            // Calculate car position
            const current = canvasPoints[currentPointIndex];
            const next = canvasPoints[(currentPointIndex + 1) % canvasPoints.length];
            
            const carX = current.x + (next.x - current.x) * animationProgress;
            const carY = current.y + (next.y - current.y) * animationProgress;
            
            // Draw moving car
            ctx.fillStyle = '#FF4444';
            ctx.beginPath();
            ctx.arc(carX, carY, 10, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Update animation
            animationProgress += animationSpeed;
            if (animationProgress >= 1) {
                animationProgress = 0;
                currentPointIndex = (currentPointIndex + 1) % canvasPoints.length;
            }
            
            // Continue animation
            requestAnimationFrame(animate);
        };
        
        animate();
        this.showMessage('Simulação iniciada! 🏁', 'success');
    }
}

// Embedded Game Engine for track previews - Based on game-new.js
class EmbeddedGameEngine {
    constructor(canvas, trackPoints) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.trackPoints = trackPoints;
        
        // Game state - Same as game-new.js
        this.isRunning = false;
        this.isPaused = false;
        this.isWaitingForContinue = false;
        this.gameJustStarted = Date.now();
        this.gameLoop = null;
        this.lastTime = performance.now();
        this.deltaTime = 16.67;
        
        // Use continuous mode for admin visualizer
        this.gameMode = 'continuous';
        
        // Initialize scale and game area
        this.scale = Math.min(this.canvas.width, this.canvas.height) / 400;
        this.gameWidth = 320 * this.scale;
        this.gameHeight = 280 * this.scale;
        this.canvasCenterX = this.canvas.width / 2;
        this.canvasCenterY = this.canvas.height / 2;
        this.gameAreaX = this.canvasCenterX - this.gameWidth / 2;
        this.gameAreaY = this.canvasCenterY - this.gameHeight / 2;
        
        // Car controller - Same as game-new.js
        this.carController = new EmbeddedCarController(this.scale);
        
        // Set global reference for car controller integration
        window.embeddedGameEngine = this;
        
        // Track and timing
        this.currentTime = 0;
        this.lapTimes = [];
        this.bestLap = null;
        this.lapCount = 0;
        
        // Car colors
        this.carColor = '#E30907'; // Ferrari red
        this.carSecondaryColor = '#FFD700'; // Ferrari yellow
        
        // Track bounds for collision detection
        this.leftBound = [];
        this.rightBound = [];
        
        // Initialize
        this.setupTrack();
        this.generateTrackBounds();
        this.bindInputs();
        this.resetCarPosition();
        
        // Initial render
        this.render();
    }
    
    setupTrack() {
        // Convert track points to canvas coordinates
        this.canvasTrackPoints = this.trackPoints.map(point => ({
            x: this.gameAreaX + point.x * this.gameWidth,
            y: this.gameAreaY + point.y * this.gameHeight
        }));
        
        // Set start line
        if (this.canvasTrackPoints.length > 1) {
            this.startLine = {
                x: this.canvasTrackPoints[0].x,
                y: this.canvasTrackPoints[0].y,
                angle: Math.atan2(
                    this.canvasTrackPoints[1].y - this.canvasTrackPoints[0].y,
                    this.canvasTrackPoints[1].x - this.canvasTrackPoints[0].x
                )
            };
        }
        
        this.trackWidth = 50 * this.scale;
    }
    
    generateTrackBounds() {
        this.leftBound = [];
        this.rightBound = [];
        
        const halfWidth = this.trackWidth / 2;
        
        for (let i = 0; i < this.canvasTrackPoints.length; i++) {
            const current = this.canvasTrackPoints[i];
            const next = this.canvasTrackPoints[(i + 1) % this.canvasTrackPoints.length];
            
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
    
    bindInputs() {
        // Focus canvas for input
        this.canvas.tabIndex = 1;
        this.canvas.focus();
        
        this.keyDownHandler = (e) => {
            if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            
            // Controls only work when game is running - Same as game-new.js
            if (this.isRunning) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.carController.setControls(true, false);
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.carController.setControls(false, true);
                }
            }
            
            // Space logic - Same as game-new.js
            if (e.code === 'Space') {
                if (this.isWaitingForContinue) {
                    this.isWaitingForContinue = false;
                    this.resetGame();
                } else if (!this.isRunning) {
                    // Start the game
                    this.startGame();
                } else {
                    // Reset during game
                    this.resetGame();
                }
            }
        };
        
        this.keyUpHandler = (e) => {
            if (this.isRunning) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.carController.setControls(false, this.carController.controls.right);
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.carController.setControls(this.carController.controls.left, false);
                }
            }
        };
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        
        // Click to focus
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
    }
    
    startGame() {
        if (this.isRunning) {
            console.log('🚫 Game already running, ignoring start request');
            return;
        }
        
        console.log('🎮 Starting embedded game...');
        
        // Reset car position BEFORE setting isRunning
        this.resetCarPosition();
        
        // IMPORTANT: ENSURE CONTROLS ARE CLEAN
        this.carController.setControls(false, false);
        
        // Set game state
        this.isRunning = true;
        this.isPaused = false;
        this.isWaitingForContinue = false;
        this.gameJustStarted = Date.now();
        
        // IMPORTANT: Ensure justReset is false when starting
        this.carController.justReset = false;
        this.carController.justResetClearedManually = true;
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame(() => this.update());
    }
    
    resetGame() {
        this.isRunning = false;
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        this.resetCarPosition();
        this.currentTime = 0;
        this.lapCount = 0;
        this.updateStats();
        this.render();
    }
    
    resetCarPosition() {
        if (this.startLine) {
            this.carController.setPosition(this.startLine.x, this.startLine.y, this.startLine.angle);
        }
        this.currentTime = 0;
    }
    
    start() {
        // Compatibility method
        this.startGame();
    }
    
    stop() {
        this.isRunning = false;
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        // Clean up global reference
        if (window.embeddedGameEngine === this) {
            window.embeddedGameEngine = null;
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused && this.isRunning) {
            this.lastTime = performance.now();
            this.gameLoop = requestAnimationFrame(() => this.update());
        }
    }
    
    reset() {
        this.resetGame();
    }
    
    update() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = Math.min(currentTime - this.lastTime, 50); // Cap at 50ms
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            // Update car physics - Same as game-new.js
            this.carController.update();
            
            // Check collision with track bounds
            this.checkCollision();
            
            // Check lap completion
            this.checkCheckpoints();
            
            // Update timer
            this.currentTime += deltaTime;
        }
        
        this.render();
        this.updateStats();
        
        if (this.isRunning) {
            this.gameLoop = requestAnimationFrame(() => this.update());
        }
    }
    
    checkCheckpoints() {
        if (!this.canvasTrackPoints || this.canvasTrackPoints.length === 0) return;
        
        // Simple lap detection - check if car is near start line
        const startPoint = this.canvasTrackPoints[0];
        const distance = Math.hypot(
            this.carController.position.x - startPoint.x, 
            this.carController.position.y - startPoint.y
        );
        
        // If close to start line and has been running for at least 5 seconds
        if (distance < 30 && this.currentTime > 5000) {
            // Completed a lap
            this.lapCount++;
            
            const lapTime = this.currentTime;
            this.lapTimes.push(lapTime);
            
            if (!this.bestLap || lapTime < this.bestLap) {
                this.bestLap = lapTime;
            }
            
            this.currentTime = 0; // Reset for next lap
        }
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
        
        // Admin visualizer uses continuous mode rules
        // Check if car is in tolerance zone (blue zone) for speed reduction
        const tolerance = 8; // Blue zone tolerance like in continuous mode
        const onOriginalTrack = this.isOnTrack(carX, carY, 0);
        const onTrackWithTolerance = this.isOnTrack(carX, carY, tolerance);
        const inToleranceZone = onTrackWithTolerance && !onOriginalTrack;
        
        if (inToleranceZone) {
            // Apply speed reduction in blue zone (like in car.js original)
            const toleranceFriction = 0.88; // Moderate reduction
            this.carController.speed *= toleranceFriction;
        }
        
        // Only block movement if completely outside tolerance zone (no crash)
        if (!onTrackWithTolerance) {
            // Block movement but don't crash - just prevent going further
            this.carController.velocity.x = 0;
            this.carController.velocity.y = 0;
        }
    }
    
    // Implementar a mesma lógica isOnTrack do game-new.js
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
        
        for (let i = 0; i < this.canvasTrackPoints.length; i++) {
            const current = this.canvasTrackPoints[i];
            const next = this.canvasTrackPoints[(i + 1) % this.canvasTrackPoints.length];
            
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
        
        const param = dot / lenSq;
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render track - Same as game-new.js
        this.renderTrack();
        
        // Render car - Same as game-new.js
        this.renderCar();
        
        // Render UI overlays
        this.renderUI();
    }
    
    renderTrack() {
        if (!this.canvasTrackPoints || this.canvasTrackPoints.length < 2) return;
        
        // Draw track background (wide gray line) - Same as game-new.js
        this.ctx.strokeStyle = '#E5E5E5';
        this.ctx.lineWidth = this.trackWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasTrackPoints[0].x, this.canvasTrackPoints[0].y);
        for (let i = 1; i < this.canvasTrackPoints.length; i++) {
            this.ctx.lineTo(this.canvasTrackPoints[i].x, this.canvasTrackPoints[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw center line (dashed) - Same as game-new.js
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasTrackPoints[0].x, this.canvasTrackPoints[0].y);
        for (let i = 1; i < this.canvasTrackPoints.length; i++) {
            this.ctx.lineTo(this.canvasTrackPoints[i].x, this.canvasTrackPoints[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw direction arrows - Same as game-new.js
        this.drawDirectionArrows();
        
        // Draw start line - Same as game-new.js
        this.drawStartLine();
    }
    
    drawDirectionArrows() {
        const arrowSpacing = 6; // More arrows for better visibility
        const chevronSize = 8; // Bigger arrows
        
        this.ctx.strokeStyle = '#00FF00'; // Bright green
        this.ctx.lineWidth = 3; // Thicker
        this.ctx.lineCap = 'round';
        
        for (let i = 0; i < this.canvasTrackPoints.length; i += arrowSpacing) {
            const current = this.canvasTrackPoints[i];
            const next = this.canvasTrackPoints[(i + 1) % this.canvasTrackPoints.length];
            
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                const dirX = dx / length;
                const dirY = dy / length;
                const perpX = -dirY;
                const perpY = dirX;
                
                // Arrow chevron pointing in direction
                const centerX = current.x + dirX * (chevronSize * 2);
                const centerY = current.y + dirY * (chevronSize * 2);
                
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - dirX * chevronSize + perpX * chevronSize/2, 
                               centerY - dirY * chevronSize + perpY * chevronSize/2);
                this.ctx.lineTo(centerX + dirX * chevronSize, centerY + dirY * chevronSize);
                this.ctx.lineTo(centerX - dirX * chevronSize - perpX * chevronSize/2, 
                               centerY - dirY * chevronSize - perpY * chevronSize/2);
                this.ctx.stroke();
            }
        }
    }
    
    drawStartLine() {
        if (this.canvasTrackPoints.length < 2) return;
        
        const start = this.canvasTrackPoints[0];
        const next = this.canvasTrackPoints[1];
        
        // Calculate direction for start line
        const dx = next.x - start.x;
        const dy = next.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 0) {
            const dirX = dx / length;
            const dirY = dy / length;
            const perpX = -dirY;
            const perpY = dirX;
            
            const lineWidth = this.trackWidth * 0.8;
            const squareSize = 8;
            const numSquares = Math.floor(lineWidth / squareSize);
            
            for (let i = 0; i < numSquares; i++) {
                for (let j = 0; j < 2; j++) {
                    const color = (i + j) % 2 === 0 ? '#FFFFFF' : '#000000';
                    this.ctx.fillStyle = color;
                    
                    const offsetFromCenter = (i - numSquares/2) * squareSize;
                    const x = start.x + perpX * offsetFromCenter;
                    const y = start.y + perpY * offsetFromCenter;
                    
                    this.ctx.fillRect(x - squareSize/2, y - squareSize/2 + j * squareSize - squareSize, 
                                    squareSize, squareSize);
                }
            }
        }
    }
    
    renderCar() {
        const car = this.carController.position;
        
        this.ctx.save();
        this.ctx.translate(car.x, car.y);
        this.ctx.rotate(car.angle - Math.PI/2); // Rotate -90 degrees so front is correct
        
        // Car scale (adjust size based on original SVG 213x313)
        const carScale = 0.08; // Small scale to be proportional to game
        const carWidth = 213 * carScale;
        const carHeight = 313 * carScale;
        
        // Center the car
        this.ctx.translate(-carWidth/2, -carHeight/2);
        this.ctx.scale(carScale, carScale);
        
        // Draw car SVG with dynamic color
        this.drawCarSVG(this.carColor, this.carSecondaryColor);
        
        this.ctx.restore();
    }
    
    drawCarSVG(primaryColor, secondaryColor) {
        // Black base of car (first path)
        this.ctx.fillStyle = '#020202';
        this.ctx.beginPath();
        this.ctx.moveTo(33, 0);
        this.ctx.lineTo(181, 0);
        this.ctx.lineTo(181, 33);
        this.ctx.lineTo(163, 33);
        this.ctx.lineTo(163, 50);
        this.ctx.lineTo(131, 50);
        this.ctx.lineTo(131, 66);
        this.ctx.lineTo(164, 66);
        this.ctx.lineTo(164, 50);
        this.ctx.lineTo(213, 50);
        this.ctx.lineTo(213, 116);
        this.ctx.lineTo(164, 116);
        this.ctx.lineTo(164, 131);
        this.ctx.lineTo(180, 131);
        this.ctx.lineTo(180, 199);
        this.ctx.lineTo(164, 199);
        this.ctx.lineTo(164, 214);
        this.ctx.lineTo(213, 214);
        this.ctx.lineTo(213, 280);
        this.ctx.lineTo(180, 280);
        this.ctx.lineTo(180, 313);
        this.ctx.lineTo(33, 313);
        this.ctx.lineTo(33, 280);
        this.ctx.lineTo(0, 280);
        this.ctx.lineTo(0, 214);
        this.ctx.lineTo(50, 214);
        this.ctx.lineTo(50, 199);
        this.ctx.lineTo(33, 199);
        this.ctx.lineTo(33, 131);
        this.ctx.lineTo(50, 131);
        this.ctx.lineTo(50, 116);
        this.ctx.lineTo(0, 116);
        this.ctx.lineTo(0, 50);
        this.ctx.lineTo(50, 50);
        this.ctx.lineTo(50, 34);
        this.ctx.lineTo(33, 34);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Main car body (PRIMARY COLOR - where red #E30907 was)
        this.ctx.fillStyle = primaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(99, 50);
        this.ctx.lineTo(115, 50);
        this.ctx.lineTo(115, 82);
        this.ctx.lineTo(131, 82);
        this.ctx.lineTo(131, 115);
        this.ctx.lineTo(148, 115);
        this.ctx.lineTo(148, 132);
        this.ctx.lineTo(163, 132);
        this.ctx.lineTo(163, 198);
        this.ctx.lineTo(147, 198);
        this.ctx.lineTo(147, 215);
        this.ctx.lineTo(131, 215);
        this.ctx.lineTo(131, 264);
        this.ctx.lineTo(122, 264);
        this.ctx.lineTo(122, 296);
        this.ctx.lineTo(92, 296);
        this.ctx.lineTo(92, 264);
        this.ctx.lineTo(83, 264);
        this.ctx.lineTo(83, 215);
        this.ctx.lineTo(66, 215);
        this.ctx.lineTo(66, 198);
        this.ctx.lineTo(50, 198);
        this.ctx.lineTo(50, 132);
        this.ctx.lineTo(66, 132);
        this.ctx.lineTo(66, 115);
        this.ctx.lineTo(83, 115);
        this.ctx.lineTo(83, 82);
        this.ctx.lineTo(99, 82);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Secondary color details (where yellow #FFD700 was)
        this.ctx.fillStyle = secondaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(83, 66);
        this.ctx.lineTo(131, 66);
        this.ctx.lineTo(131, 82);
        this.ctx.lineTo(83, 82);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    renderUI() {
        // No UI overlays - clean admin visualizer
    }
    
    updateStats() {
        const timeEl = document.getElementById('currentTime');
        const speedEl = document.getElementById('currentSpeed');
        const lapEl = document.getElementById('lapCount');
        const bestEl = document.getElementById('bestLap');
        
        if (timeEl) timeEl.textContent = (this.currentTime / 1000).toFixed(3) + 's';
        if (speedEl) speedEl.textContent = Math.round(Math.abs(this.carController.speed) * 50) + ' km/h';
        if (lapEl) lapEl.textContent = this.lapCount;
        if (bestEl) bestEl.textContent = this.bestLap ? (this.bestLap / 1000).toFixed(3) + 's' : '--:--';
    }
}

// Embedded Car Controller - Based on CarController from game-new.js
class EmbeddedCarController {
    constructor(scale) {
        this.controls = {
            left: false,
            right: false
        };
        this.position = {
            x: 0,
            y: 0,
            angle: 0
        };
        
        // Physics - Same as game-new.js
        this.speed = 0;
        this.maxSpeed = 2.2;
        this.acceleration = 0.10;
        this.deceleration = 0.045;
        this.turnSpeed = 0.05;
        this.friction = 0.95;
        
        // Protection against automatic movement
        this.justReset = false;
        this.justResetClearedManually = false;
        this.automaticCleanupScheduled = false;
        
        this.velocity = { x: 0, y: 0 };
        this.lastUpdateTime = performance.now();
    }
    
    setPosition(x, y, angle = 0) {
        this.position.x = x;
        this.position.y = y;
        this.position.angle = angle;
        
        // Reset velocity when repositioning
        this.speed = 0;
        this.velocity = { x: 0, y: 0 };
        this.justReset = true; // Prevent immediate acceleration
        this.justResetClearedManually = false;
        this.automaticCleanupScheduled = false;
        this.lastUpdateTime = performance.now();
    }
    
    setControls(left, right) {
        this.controls.left = left;
        this.controls.right = right;
    }
    
    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        const limitedDeltaTime = Math.min(deltaTime, 50); // Max 50ms
        const timeMultiplier = limitedDeltaTime / 16.67; // 16.67ms = 60fps
        
        // AUTOMATIC ACCELERATION - but only if not just reset
        if (!this.justReset) {
            if (this.speed < this.maxSpeed) {
                this.speed += this.acceleration * timeMultiplier;
                if (this.speed > this.maxSpeed) {
                    this.speed = this.maxSpeed;
                }
            }
        } else {
            // Clear automatically only if not cleared manually
            if (!this.justResetClearedManually && !this.automaticCleanupScheduled) {
                this.automaticCleanupScheduled = true;
                setTimeout(() => {
                    if (!this.justResetClearedManually) {
                        this.justReset = false;
                    }
                    this.automaticCleanupScheduled = false;
                }, 100);
            }
        }
        
        // Turning (only if moving)
        if (this.speed > 0.1) {
            if (this.controls.left) {
                this.position.angle -= this.turnSpeed * (this.speed / this.maxSpeed) * timeMultiplier;
            }
            if (this.controls.right) {
                this.position.angle += this.turnSpeed * (this.speed / this.maxSpeed) * timeMultiplier;
            }
        }
        
        // Convert angle to velocity
        this.velocity.x = Math.cos(this.position.angle) * this.speed * timeMultiplier;
        this.velocity.y = Math.sin(this.position.angle) * this.speed * timeMultiplier;
        
        // Update position with continuous mode rules
        const newX = this.position.x + this.velocity.x;
        const newY = this.position.y + this.velocity.y;
        
        // In continuous mode, check movement boundaries
        const tolerance = 8; // Same tolerance as continuous mode
        const canMove = this.isWithinToleranceZone(newX, newY, tolerance);
        
        if (canMove) {
            // Movement allowed - update position
            this.position.x = newX;
            this.position.y = newY;
        } else {
            // Movement blocked by tolerance boundaries - stop
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
    }
    
    // Helper function to check if position is within tolerance zone
    isWithinToleranceZone(x, y, tolerance) {
        // This will be called from the game engine that has the track data
        if (window.embeddedGameEngine) {
            return window.embeddedGameEngine.isOnTrack(x, y, tolerance);
        }
        return true; // Fallback - allow movement
    }
}

// Continue with DailyTracksManager methods
const dailyTracksManager = {
    extractTrackPointsFromCode(jsCode) {
        try {
            // Extract track points from JavaScript function code
            // Look for the array of track points
            const arrayMatch = jsCode.match(/return\s*\[([\s\S]*?)\];/);
            if (!arrayMatch) return null;
            
            const arrayContent = arrayMatch[1];
            
            // Parse the track points manually
            const pointMatches = arrayContent.match(/{\s*x:\s*[^,]+,\s*y:\s*[^,}]+(?:,\s*angle:\s*[^,}]+)?\s*}/g);
            if (!pointMatches) return null;
            
            const trackPoints = pointMatches.map(pointStr => {
                // Extract x, y, and optional angle
                const xMatch = pointStr.match(/x:\s*[^+]*\+\s*([0-9.]+)/);
                const yMatch = pointStr.match(/y:\s*[^+]*\+\s*([0-9.]+)/);
                const angleMatch = pointStr.match(/angle:\s*([0-9.]+)/);
                
                if (!xMatch || !yMatch) return null;
                
                const point = {
                    x: parseFloat(xMatch[1]),
                    y: parseFloat(yMatch[1])
                };
                
                if (angleMatch) {
                    point.angle = parseInt(angleMatch[1]);
                }
                
                return point;
            }).filter(p => p !== null);
            
            return {
                trackPoints: trackPoints,
                canvasSize: {
                    width: 320,
                    height: 280
                }
            };
        } catch (error) {
            console.error('Error extracting track points from code:', error);
            return null;
        }
    }
};

// Funções globais para compatibilidade com HTML
function login() {
    admin.login();
}

function logout() {
    admin.logout();
}

function handleTrackTypeChange() {
    admin.handleTrackTypeChange();
}

function previewTrack() {
    admin.previewTrack();
}

function setTodaysTrack() {
    admin.setTodaysTrack();
}

function scheduleTomorrowTrack() {
    admin.scheduleTomorrowTrack();
}

function importFromGame() {
    admin.importFromGame();
}

function loadTrackHistory() {
    admin.loadTrackHistory();
}

function clearTrackHistory() {
    admin.clearTrackHistory();
}

// User submissions functions
function loadUserSubmissions() {
    admin.loadUserSubmissions();
}

function clearAllSubmissions() {
    admin.clearAllSubmissions();
}

function approveSubmission(submissionId) {
    admin.approveSubmission(submissionId);
}

function rejectSubmission(submissionId) {
    admin.rejectSubmission(submissionId);
}

function previewSubmission(submissionId) {
    admin.previewSubmission(submissionId);
}

function copySubmissionToDaily(submissionId) {
    admin.copySubmissionToDaily(submissionId);
}

function clearAllSubmissions() {
    admin.clearAllSubmissions();
}

// Inicializar quando a página carregar
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new DailyTracksAdmin();
});
