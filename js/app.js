/**
 * PONG GAME - Main Application
 * Classic Arcade Game with AI & 2P Multiplayer
 */

// ====================================
// GAME CONFIGURATION
// ====================================

const GAME_CONFIG = {
    // Canvas
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    CANVAS_MARGIN: 20,

    // Ball
    BALL_SIZE: 8,
    BALL_SPEED_INIT: 4,
    BALL_SPEED_MAX: 8,
    BALL_ACCELERATION: 1.02,

    // Paddle
    PADDLE_WIDTH: 12,
    PADDLE_HEIGHT: 80,
    PADDLE_SPEED: 6,

    // Game
    WIN_SCORE: 11,
    PARTICLE_COUNT: 10
};

// ====================================
// GAME STATE
// ====================================

const gameState = {
    screen: 'menu',
    isGameRunning: false,
    isPaused: false,
    gameMode: '1p', // '1p' or '2p'
    difficulty: 'normal', // 'easy', 'normal', 'hard'
    soundEnabled: true,
    vibrationEnabled: true,
    paddleSize: 80,

    // Game stats
    score: { p1: 0, p2: 0 },
    gameTime: 0,
    gameStartTime: 0,
    ballHits: 0,

    // AI
    aiLevel: 'normal',

    // Player stats
    stats: {
        bestStreak: 0,
        currentStreak: 0,
        totalGames: 0,
        totalWins: 0
    }
};

// ====================================
// CANVAS & GRAPHICS
// ====================================

let canvas;
let ctx;

function initCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Responsive canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = Math.min(window.innerWidth - 40, GAME_CONFIG.CANVAS_WIDTH);
    const maxHeight = Math.min(window.innerHeight - 280, GAME_CONFIG.CANVAS_HEIGHT);

    const scale = Math.min(maxWidth / GAME_CONFIG.CANVAS_WIDTH, maxHeight / GAME_CONFIG.CANVAS_HEIGHT, 1);

    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    canvas.style.width = (GAME_CONFIG.CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (GAME_CONFIG.CANVAS_HEIGHT * scale) + 'px';
}

// ====================================
// GAME OBJECTS
// ====================================

class Ball {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = GAME_CONFIG.CANVAS_WIDTH / 2;
        this.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
        this.vx = (Math.random() > 0.5 ? 1 : -1) * GAME_CONFIG.BALL_SPEED_INIT;
        this.vy = (Math.random() - 0.5) * GAME_CONFIG.BALL_SPEED_INIT;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wall bounce (top & bottom)
        if (this.y - GAME_CONFIG.BALL_SIZE / 2 < 0 || this.y + GAME_CONFIG.BALL_SIZE / 2 > GAME_CONFIG.CANVAS_HEIGHT) {
            this.vy = -this.vy;
            this.y = Math.max(GAME_CONFIG.BALL_SIZE / 2, Math.min(this.y, GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.BALL_SIZE / 2));
            playSound('wallBounce');
        }
    }

    draw() {
        // Glowing ball
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, GAME_CONFIG.BALL_SIZE / 2);
        gradient.addColorStop(0, 'rgba(230, 126, 34, 1)');
        gradient.addColorStop(1, 'rgba(230, 126, 34, 0.3)');

        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.x - GAME_CONFIG.BALL_SIZE / 2,
            this.y - GAME_CONFIG.BALL_SIZE / 2,
            GAME_CONFIG.BALL_SIZE,
            GAME_CONFIG.BALL_SIZE
        );

        // Glow effect
        ctx.strokeStyle = 'rgba(230, 126, 34, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.x - GAME_CONFIG.BALL_SIZE / 2,
            this.y - GAME_CONFIG.BALL_SIZE / 2,
            GAME_CONFIG.BALL_SIZE,
            GAME_CONFIG.BALL_SIZE
        );
    }
}

class Paddle {
    constructor(x) {
        this.x = x;
        this.y = GAME_CONFIG.CANVAS_HEIGHT / 2 - gameState.paddleSize / 2;
        this.width = GAME_CONFIG.PADDLE_WIDTH;
        this.height = gameState.paddleSize;
        this.vy = 0;
    }

    move(direction) {
        if (direction === 'up') {
            this.vy = -GAME_CONFIG.PADDLE_SPEED;
        } else if (direction === 'down') {
            this.vy = GAME_CONFIG.PADDLE_SPEED;
        } else {
            this.vy = 0;
        }
    }

    update() {
        this.y += this.vy;

        // Boundary check
        this.y = Math.max(0, Math.min(this.y, GAME_CONFIG.CANVAS_HEIGHT - this.height));
    }

    draw() {
        // Glowing paddle
        ctx.fillStyle = 'rgba(230, 126, 34, 0.8)';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Glow effect
        ctx.shadowColor = 'rgba(230, 126, 34, 0.8)';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(230, 126, 34, 1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }

    collidesWith(ball) {
        return ball.x - GAME_CONFIG.BALL_SIZE / 2 < this.x + this.width &&
               ball.x + GAME_CONFIG.BALL_SIZE / 2 > this.x &&
               ball.y - GAME_CONFIG.BALL_SIZE / 2 < this.y + this.height &&
               ball.y + GAME_CONFIG.BALL_SIZE / 2 > this.y;
    }
}

// ====================================
// GAME LOGIC
// ====================================

let ball = new Ball();
let paddle1 = new Paddle(GAME_CONFIG.CANVAS_MARGIN);
let paddle2 = new Paddle(GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.CANVAS_MARGIN - GAME_CONFIG.PADDLE_WIDTH);

let gameLoopId = null;
let gameTimerId = null;

function startGame(mode) {
    gameState.gameMode = mode;
    gameState.score = { p1: 0, p2: 0 };
    gameState.gameTime = 0;
    gameState.gameStartTime = Date.now();
    gameState.ballHits = 0;
    gameState.isPaused = false;

    ball.reset();
    paddle1.y = GAME_CONFIG.CANVAS_HEIGHT / 2 - gameState.paddleSize / 2;
    paddle2.y = GAME_CONFIG.CANVAS_HEIGHT / 2 - gameState.paddleSize / 2;

    showScreen('game-screen');
    gameState.isGameRunning = true;

    gameLoopId = requestAnimationFrame(gameLoop);
    gameTimerId = setInterval(updateGameTime, 1000);
}

function gameLoop() {
    if (gameState.isPaused) {
        gameLoopId = requestAnimationFrame(gameLoop);
        return;
    }

    // Update
    ball.update();
    paddle1.update();
    paddle2.update();

    // Handle AI (1P mode)
    if (gameState.gameMode === '1p') {
        updateAI();
    }

    // Collision - Paddles
    handlePaddleCollision();

    // Collision - Boundaries (score)
    if (ball.x < 0) {
        gameState.score.p2++;
        gameState.ballHits = 0;
        playSound('score');
        createParticles(ball.x, ball.y);
        ball.reset();
    } else if (ball.x > GAME_CONFIG.CANVAS_WIDTH) {
        gameState.score.p1++;
        gameState.ballHits = 0;
        playSound('score');
        createParticles(ball.x, ball.y);
        ball.reset();
    }

    // Check win condition
    if (gameState.score.p1 >= GAME_CONFIG.WIN_SCORE || gameState.score.p2 >= GAME_CONFIG.WIN_SCORE) {
        endGame();
        return;
    }

    // Update UI
    updateGameUI();

    // Draw
    draw();

    gameLoopId = requestAnimationFrame(gameLoop);
}

function handlePaddleCollision() {
    // Player 1 (left)
    if (paddle1.collidesWith(ball)) {
        if (ball.vx < 0) {
            ball.x = paddle1.x + GAME_CONFIG.PADDLE_WIDTH + GAME_CONFIG.BALL_SIZE / 2;
            ball.vx = -ball.vx;

            // Add angle based on paddle hit position
            const hitPos = (ball.y - paddle1.y) / paddle1.height;
            ball.vy += (hitPos - 0.5) * GAME_CONFIG.BALL_SPEED_INIT;

            // Speed up
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed < GAME_CONFIG.BALL_SPEED_MAX) {
                ball.vx *= GAME_CONFIG.BALL_ACCELERATION;
                ball.vy *= GAME_CONFIG.BALL_ACCELERATION;
            }

            gameState.ballHits++;
            playSound('paddleHit');
            createParticles(ball.x, ball.y);
        }
    }

    // Player 2 (right)
    if (paddle2.collidesWith(ball)) {
        if (ball.vx > 0) {
            ball.x = paddle2.x - GAME_CONFIG.BALL_SIZE / 2;
            ball.vx = -ball.vx;

            // Add angle based on paddle hit position
            const hitPos = (ball.y - paddle2.y) / paddle2.height;
            ball.vy += (hitPos - 0.5) * GAME_CONFIG.BALL_SPEED_INIT;

            // Speed up
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed < GAME_CONFIG.BALL_SPEED_MAX) {
                ball.vx *= GAME_CONFIG.BALL_ACCELERATION;
                ball.vy *= GAME_CONFIG.BALL_ACCELERATION;
            }

            gameState.ballHits++;
            playSound('paddleHit');
            createParticles(ball.x, ball.y);
        }
    }
}

function updateAI() {
    const targetY = ball.y - paddle2.height / 2;
    const paddleCenter = paddle2.y;
    const distance = Math.abs(targetY - paddleCenter);

    let difficulty = {
        easy: GAME_CONFIG.PADDLE_SPEED * 0.5,
        normal: GAME_CONFIG.PADDLE_SPEED * 0.7,
        hard: GAME_CONFIG.PADDLE_SPEED * 1.2
    };

    const maxDistance = difficulty[gameState.difficulty] * 2;

    if (distance > 10) {
        if (targetY > paddleCenter + 10) {
            paddle2.move('down');
        } else if (targetY < paddleCenter - 10) {
            paddle2.move('up');
        }
    } else {
        paddle2.move(null);
    }

    // AI can make mistakes on easier levels
    if (gameState.difficulty === 'easy' && Math.random() > 0.7) {
        const random = Math.random();
        if (random > 0.5) {
            paddle2.move('down');
        } else {
            paddle2.move('up');
        }
    }
}

function draw() {
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    gradient.addColorStop(0, 'rgba(15, 15, 35, 1)');
    gradient.addColorStop(1, 'rgba(10, 10, 21, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // Center dashed line
    ctx.strokeStyle = 'rgba(230, 126, 34, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(GAME_CONFIG.CANVAS_WIDTH / 2, 0);
    ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Borders
    ctx.strokeStyle = 'rgba(230, 126, 34, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // Draw objects
    paddle1.draw();
    paddle2.draw();
    ball.draw();
}

function updateGameTime() {
    if (gameState.isGameRunning && !gameState.isPaused) {
        gameState.gameTime = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
        updateGameUI();
    }
}

function updateGameUI() {
    document.getElementById('score-p1').textContent = gameState.score.p1;
    document.getElementById('score-p2').textContent = gameState.score.p2;

    const minutes = Math.floor(gameState.gameTime / 60);
    const seconds = gameState.gameTime % 60;
    document.getElementById('game-time').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update player labels
    if (gameState.gameMode === '1p') {
        document.querySelector('[data-i18n="game.player2"]').textContent = i18n.t('game.ai');
    } else {
        document.querySelector('[data-i18n="game.player2"]').textContent = i18n.t('game.player2');
    }
}

function endGame() {
    gameState.isGameRunning = false;
    cancelAnimationFrame(gameLoopId);
    clearInterval(gameTimerId);

    // Update stats
    gameState.stats.totalGames++;
    if (gameState.score.p1 > gameState.score.p2) {
        gameState.stats.totalWins++;
        gameState.stats.currentStreak++;
        gameState.stats.bestStreak = Math.max(gameState.stats.bestStreak, gameState.stats.currentStreak);
    } else {
        gameState.stats.currentStreak = 0;
    }
    saveStats();

    // Show game over screen
    showGameOverScreen();
}

function pauseGame() {
    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        showScreen('pause-screen');
    } else {
        showScreen('game-screen');
    }
}

// ====================================
// SOUND & PARTICLES
// ====================================

class AudioContext {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(frequency, duration, type = 'sine') {
        if (!gameState.soundEnabled || !this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.frequency.value = frequency;
            osc.type = type;

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.log('Audio playback failed:', e);
        }
    }
}

const audioContext = new AudioContext();

function playSound(type) {
    audioContext.init();

    switch (type) {
        case 'paddleHit':
            audioContext.playTone(800, 0.1);
            if (gameState.vibrationEnabled && navigator.vibrate) {
                navigator.vibrate(50);
            }
            break;
        case 'wallBounce':
            audioContext.playTone(600, 0.05);
            break;
        case 'score':
            audioContext.playTone(1000, 0.2);
            if (gameState.vibrationEnabled && navigator.vibrate) {
                navigator.vibrate(100);
            }
            break;
        case 'gameOver':
            audioContext.playTone(400, 0.3);
            break;
    }
}

function createParticles(x, y) {
    const container = document.getElementById('particles-container');

    for (let i = 0; i < GAME_CONFIG.PARTICLE_COUNT; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.textContent = '✨';

        const angle = (Math.PI * 2 * i) / GAME_CONFIG.PARTICLE_COUNT;
        const velocity = 2 + Math.random() * 2;
        const tx = Math.cos(angle) * velocity * 30;
        const ty = Math.sin(angle) * velocity * 30;

        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');

        container.appendChild(particle);

        setTimeout(() => particle.remove(), 600);
    }
}

// ====================================
// UI HANDLERS
// ====================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showGameOverScreen() {
    const gameoverScreen = document.getElementById('gameover-screen');
    const winner = gameState.score.p1 > gameState.score.p2 ? 'p1' : 'p2';
    const titleEl = document.getElementById('gameover-title');
    const messageEl = document.getElementById('gameover-message');

    if (gameState.gameMode === '1p') {
        if (winner === 'p1') {
            titleEl.textContent = i18n.t('game.youWin');
            messageEl.textContent = `Final Score: ${gameState.score.p1} - ${gameState.score.p2}`;
        } else {
            titleEl.textContent = i18n.t('game.youLose');
            messageEl.textContent = `Final Score: ${gameState.score.p1} - ${gameState.score.p2}`;
        }
    } else {
        const winnerName = winner === 'p1' ? i18n.t('game.player1') : i18n.t('game.player2');
        titleEl.textContent = `${winnerName} ${i18n.t('game.youWin')}`;
        messageEl.textContent = `Final Score: ${gameState.score.p1} - ${gameState.score.p2}`;
    }

    const minutes = Math.floor(gameState.gameTime / 60);
    const seconds = gameState.gameTime % 60;
    document.getElementById('final-time').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('final-score').textContent = `${gameState.score.p1} - ${gameState.score.p2}`;

    playSound('gameOver');
    showScreen('gameover-screen');
}

function loadStats() {
    const saved = localStorage.getItem('pongStats');
    if (saved) {
        try {
            gameState.stats = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load stats:', e);
        }
    }
}

function saveStats() {
    localStorage.setItem('pongStats', JSON.stringify(gameState.stats));
    updateStatsUI();
}

function updateStatsUI() {
    document.getElementById('stat-best-streak').textContent = gameState.stats.bestStreak;
    document.getElementById('stat-total-games').textContent = gameState.stats.totalGames;
    document.getElementById('stat-total-wins').textContent = gameState.stats.totalWins;

    const winRate = gameState.stats.totalGames > 0
        ? Math.round((gameState.stats.totalWins / gameState.stats.totalGames) * 100)
        : 0;
    document.getElementById('stat-win-rate').textContent = winRate + '%';
}

function resetStats() {
    if (confirm(i18n.t('stats.reset') + '?')) {
        gameState.stats = {
            bestStreak: 0,
            currentStreak: 0,
            totalGames: 0,
            totalWins: 0
        };
        saveStats();
    }
}

// ====================================
// INPUT HANDLERS
// ====================================

const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (gameState.isGameRunning && !gameState.isPaused) {
        if (e.key === 'ArrowUp' || e.key === 'w') {
            if (gameState.gameMode === '1p') {
                paddle1.move('up');
            }
        } else if (e.key === 'ArrowDown' || e.key === 's') {
            if (gameState.gameMode === '1p') {
                paddle1.move('down');
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;

    if (gameState.isGameRunning && !gameState.isPaused) {
        if ((e.key === 'ArrowUp' || e.key === 'w') && gameState.gameMode === '1p') {
            paddle1.move(null);
        } else if ((e.key === 'ArrowDown' || e.key === 's') && gameState.gameMode === '1p') {
            paddle1.move(null);
        }
    }
});

// Touch/Mouse handlers for paddles
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
}, false);

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const y = touch.clientY - rect.top;

    if (gameState.gameMode === '2p') {
        // 2P mode: left/right side
        const midX = rect.width / 2;
        const touchX = touch.clientX - rect.left;

        if (touchX < midX) {
            // Left paddle
            paddle1.y = y - paddle1.height / 2;
            paddle1.y = Math.max(0, Math.min(paddle1.y, GAME_CONFIG.CANVAS_HEIGHT - paddle1.height));
        } else {
            // Right paddle
            paddle2.y = y - paddle2.height / 2;
            paddle2.y = Math.max(0, Math.min(paddle2.y, GAME_CONFIG.CANVAS_HEIGHT - paddle2.height));
        }
    } else {
        // 1P mode: only left paddle
        paddle1.y = y - paddle1.height / 2;
        paddle1.y = Math.max(0, Math.min(paddle1.y, GAME_CONFIG.CANVAS_HEIGHT - paddle1.height));
    }
}, false);

canvas.addEventListener('mousemove', (e) => {
    if (gameState.gameMode === '1p' && gameState.isGameRunning) {
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        paddle1.y = y - paddle1.height / 2;
        paddle1.y = Math.max(0, Math.min(paddle1.y, GAME_CONFIG.CANVAS_HEIGHT - paddle1.height));
    }
}, false);

// ====================================
// BUTTON HANDLERS
// ====================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18n first, but don't let it block the game
    try {
        if (typeof i18n !== 'undefined' && i18n.init) {
            await i18n.init();
        }
    } catch (e) {
        console.warn('i18n initialization failed, continuing with defaults:', e);
    }

    initCanvas();
    loadStats();
    updateStatsUI();

    // Menu buttons
    document.getElementById('btn-1p').addEventListener('click', () => startGame('1p'));
    document.getElementById('btn-2p').addEventListener('click', () => startGame('2p'));
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings-screen'));
    document.getElementById('btn-stats').addEventListener('click', () => {
        updateStatsUI();
        showScreen('stats-screen');
    });

    // Settings buttons
    document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('menu-screen'));

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            gameState.difficulty = this.dataset.difficulty;
            localStorage.setItem('pongDifficulty', gameState.difficulty);
        });
    });

    document.getElementById('sound-toggle').addEventListener('change', function () {
        gameState.soundEnabled = this.checked;
        localStorage.setItem('pongSound', gameState.soundEnabled);
    });

    document.getElementById('vib-toggle').addEventListener('change', function () {
        gameState.vibrationEnabled = this.checked;
        localStorage.setItem('pongVibration', gameState.vibrationEnabled);
    });

    document.getElementById('paddle-size').addEventListener('input', function () {
        gameState.paddleSize = parseInt(this.value);
        document.getElementById('paddle-size-display').textContent = gameState.paddleSize + 'px';
        paddle1.height = gameState.paddleSize;
        paddle2.height = gameState.paddleSize;
        localStorage.setItem('pongPaddleSize', gameState.paddleSize);
    });

    // Stats buttons
    document.getElementById('btn-stats-reset').addEventListener('click', resetStats);
    document.getElementById('btn-stats-back').addEventListener('click', () => showScreen('menu-screen'));

    // Game buttons
    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    document.getElementById('btn-menu').addEventListener('click', () => {
        gameState.isGameRunning = false;
        cancelAnimationFrame(gameLoopId);
        clearInterval(gameTimerId);
        showScreen('menu-screen');
    });

    // Pause screen buttons
    document.getElementById('btn-resume').addEventListener('click', () => {
        pauseGame();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        const mode = gameState.gameMode;
        startGame(mode);
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        gameState.isGameRunning = false;
        cancelAnimationFrame(gameLoopId);
        clearInterval(gameTimerId);
        showScreen('menu-screen');
    });

    // Game over buttons
    document.getElementById('btn-replay').addEventListener('click', () => {
        const mode = gameState.gameMode;
        startGame(mode);
    });

    document.getElementById('btn-menu-final').addEventListener('click', () => {
        showScreen('menu-screen');
    });

    // Language selector
    document.getElementById('lang-toggle').addEventListener('click', function () {
        const menu = document.getElementById('lang-menu');
        menu.classList.toggle('hidden');
    });

    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', async function () {
            const lang = this.dataset.lang;
            await i18n.setLanguage(lang);
            document.getElementById('lang-menu').classList.add('hidden');
        });
    });

    // Load saved settings
    const savedDifficulty = localStorage.getItem('pongDifficulty') || 'normal';
    gameState.difficulty = savedDifficulty;
    document.querySelector(`.difficulty-btn[data-difficulty="${savedDifficulty}"]`).classList.add('active');

    const savedSound = localStorage.getItem('pongSound');
    if (savedSound !== null) {
        gameState.soundEnabled = JSON.parse(savedSound);
        document.getElementById('sound-toggle').checked = gameState.soundEnabled;
    }

    const savedVibration = localStorage.getItem('pongVibration');
    if (savedVibration !== null) {
        gameState.vibrationEnabled = JSON.parse(savedVibration);
        document.getElementById('vib-toggle').checked = gameState.vibrationEnabled;
    }

    const savedPaddleSize = localStorage.getItem('pongPaddleSize');
    if (savedPaddleSize) {
        gameState.paddleSize = parseInt(savedPaddleSize);
        document.getElementById('paddle-size').value = gameState.paddleSize;
        document.getElementById('paddle-size-display').textContent = gameState.paddleSize + 'px';
    }

    // GA4 tracking
    if (window.gtag) {
        gtag('event', 'page_view', {
            'page_title': 'Pong Game',
            'page_location': window.location.href
        });
    }
});

// Track game events
function trackGameEvent(eventName, params = {}) {
    if (window.gtag) {
        gtag('event', eventName, params);
    }
}

// Override game start to track
const originalStartGame = startGame;
window.startGame = function (mode) {
    trackGameEvent('game_start', { mode: mode });
    originalStartGame(mode);
};

// Override end game to track
const originalEndGame = endGame;
window.endGame = function () {
    trackGameEvent('game_end', {
        mode: gameState.gameMode,
        score_p1: gameState.score.p1,
        score_p2: gameState.score.p2,
        duration: gameState.gameTime
    });
    originalEndGame();
};
