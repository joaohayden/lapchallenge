# 🏎️ HotLap Daily Clone

Um clone moderno e responsivo do famoso jogo HotLap Daily, desenvolvido com HTML5, CSS3 e JavaScript puro.

## 🎮 Características

### Modos de Jogo
- **🏁 Clássico**: Para após cada volta, pressione espaço para continuar
- **🔄 Contínuo**: Jogo roda sem parar, voltas consecutivas

### Funcionalidades
- ⏱️ Sistema de tempo no formato `x.xxxs`
- 🏆 Sparkline com lógica F1 (verde/roxo/amarelo)
- 📱 Controles touch otimizados para mobile
- 🎨 Cores autênticas das escuderias F1 2024
- 💾 Persistência de dados com localStorage
- 📊 Contador de voltas no modo contínuo
- 🎯 **Track Generator**: Crie suas próprias pistas customizadas

### Escuderias F1 com Cores Autênticas
- **Ferrari** - Drama Vermelho
- **Red Bull** - Rebeldes do Energético  
- **Mercedes** - Viúva do Hamilton
- **McLaren** - Papaya Racing
- **Aston Martin** - A Turma do Strollzinho
- **Alpine** - Clube do Renault Esportivo
- **Williams** - Glórias do Passado
- **RB** - Touro Genérico
- **Sauber** - Quase Audi GP
- **Haas** - Plano B Motorsport

## 🎯 Como Jogar

### Controles Desktop
- **← →** Setas do teclado para virar
- **Espaço** Para começar/continuar/parar

### Controles Mobile
- **Botões ← →** na tela para virar
- **Toque** no botão iniciar ou espaço para começar

### Modos de Jogo
1. **Clássico**: Complete uma volta → Veja seu tempo → Pressione espaço para próxima volta
2. **Contínuo**: Corra continuamente → Pressione espaço para parar e ver estatísticas

### 🎯 Track Generator
Crie suas próprias pistas customizadas com o gerador integrado:
- **Desenhar**: Clique e arraste no canvas para criar pistas
- **Auto-Fechamento**: A pista se fecha automaticamente quando você se aproxima do início
- **Validação**: Verificação em tempo real de cruzamentos e erros
- **Testar**: Execute suas pistas criadas diretamente no jogo
- **Controles**: Undo, Clear, e pistas de exemplo disponíveis

## 🏗️ Estrutura do Projeto

```
projeto/
├── index.html              # Página principal do jogo
├── track-generator.html    # Gerador de pistas customizadas
├── styles/
│   └── main.css           # Estilos responsivos
└── scripts/
    ├── car.js             # Física e renderização do carro
    ├── track.js           # Geração e lógica da pista
    ├── physics.js         # Sistema de física e utilitários
    ├── ui.js              # Interface e controles
    ├── game.js            # Loop principal do jogo
    ├── share.js           # Sistema de compartilhamento
    ├── track-generator.js # Sistema de criação de pistas
    └── track-integration.js # Integração entre gerador e jogo
```

## 🚀 Como Executar

1. Clone o repositório
2. Navegue até a pasta `projeto`
3. Abra `index.html` em um navegador moderno
4. Ou use um servidor local:
   ```bash
   cd projeto
   python -m http.server 8000
   # Acesse http://localhost:8000
   ```

## 📱 Responsividade

O jogo é totalmente responsivo e otimizado para:
- 📱 Mobile (360px+)
- 📱 Tablet (768px+) 
- 💻 Desktop (1024px+)

## 🎨 Features Técnicas

- **Canvas 2D** para renderização do jogo
- **CSS Grid/Flexbox** para layout responsivo
- **localStorage** para persistência de dados
- **Touch events** otimizados para mobile
- **Sparkline F1-style** com visualização de performance

## 🏁 Desenvolvido com

- HTML5 Canvas
- CSS3 (Grid, Flexbox, Media Queries)
- JavaScript ES6+
- Pixel art aesthetics
- Mobile-first design

---

*Inspirado no clássico HotLap Daily. Feito com ❤️ para entusiastas de corrida.*
