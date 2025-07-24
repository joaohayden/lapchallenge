// Controle dos modais de navegação

document.addEventListener('DOMContentLoaded', function() {
    // Elementos dos modais
    const howToPlayModal = document.getElementById('howToPlayModal');
    const feedbackModal = document.getElementById('feedbackModal');
    
    // Botões do menu
    const howToPlayBtn = document.getElementById('howToPlayBtn');
    const feedbackBtn = document.getElementById('feedbackBtn');
    
    // Botões de fechar
    const closeHowToPlay = document.getElementById('closeHowToPlay');
    const closeFeedback = document.getElementById('closeFeedback');
    
    // Abrir modal "Como Jogar"
    howToPlayBtn.addEventListener('click', function() {
        howToPlayModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Impede scroll do body
    });
    
    // Abrir modal "Feedback"
    feedbackBtn.addEventListener('click', function() {
        feedbackModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Impede scroll do body
    });
    
    // Fechar modal "Como Jogar"
    closeHowToPlay.addEventListener('click', function() {
        howToPlayModal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restaura scroll do body
    });
    
    // Fechar modal "Feedback"
    closeFeedback.addEventListener('click', function() {
        feedbackModal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restaura scroll do body
    });
    
    // Fechar modais clicando fora deles
    window.addEventListener('click', function(event) {
        if (event.target === howToPlayModal) {
            howToPlayModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (event.target === feedbackModal) {
            feedbackModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Fechar modais com tecla ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (howToPlayModal.style.display === 'block') {
                howToPlayModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            if (feedbackModal.style.display === 'block') {
                feedbackModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });
});
