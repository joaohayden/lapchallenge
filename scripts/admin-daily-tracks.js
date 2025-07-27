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
}

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

// Inicializar quando a página carregar
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new DailyTracksAdmin();
});
