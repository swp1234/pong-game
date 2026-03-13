/**
 * PONG GAME - Main Application
 * Classic Arcade Game with AI & 2P Multiplayer
 */

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
}

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
    PARTICLE_COUNT: 10,

    // Power-ups
    POWERUP_SPAWN_INTERVAL: 8000, // ms between spawns
    POWERUP_SIZE: 20,
    POWERUP_DURATION: 5000, // effect duration ms
    POWERUP_TYPES: ['bigPaddle', 'shrinkOpponent', 'speedBall']
};

// ====================================
// ASSET PRELOADING
// ====================================

const assets = {
    bg: { img: new Image(), loaded: false },
    paddle: { img: new Image(), loaded: false },
    ball: { img: new Image(), loaded: false }
};

(function preloadAssets() {
    assets.bg.img.onload = () => { assets.bg.loaded = true; };
    assets.bg.img.onerror = () => { assets.bg.loaded = false; };
    assets.bg.img.src = 'assets/bg-opt.jpg';

    assets.paddle.img.onload = () => { assets.paddle.loaded = true; };
    assets.paddle.img.onerror = () => { assets.paddle.loaded = false; };
    assets.paddle.img.src = 'assets/paddle-opt.png';

    assets.ball.img.onload = () => { assets.ball.loaded = true; };
    assets.ball.img.onerror = () => { assets.ball.loaded = false; };
    assets.ball.img.src = 'assets/ball-opt.png';
})();

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
    },

    // Streak multiplier
    p1ReturnStreak: 0,
    p2ReturnStreak: 0,
    streakFlashTimer: 0
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
    const maxWidth = container.clientWidth || (window.innerWidth - 20);
    const maxHeight = container.clientHeight || (window.innerHeight - 200);

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
        this.trail = [];
        this.reset();
    }

    reset() {
        this.x = GAME_CONFIG.CANVAS_WIDTH / 2;
        this.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
        this.vx = (Math.random() > 0.5 ? 1 : -1) * GAME_CONFIG.BALL_SPEED_INIT;
        this.vy = (Math.random() - 0.5) * GAME_CONFIG.BALL_SPEED_INIT;
        this.trail = [];
    }

    getBallColor() {
        const hits = gameState.ballHits;
        if (hits >= 20) return '#e74c3c'; // red hot
        if (hits >= 15) return '#f39c12'; // orange
        if (hits >= 10) return '#f1c40f'; // yellow
        return '#e67e22'; // default orange
    }

    update() {
        // Trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > (gameState.ballHits >= 10 ? 12 : 6)) this.trail.shift();

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
        const size = GAME_CONFIG.BALL_SIZE;
        const ballColor = this.getBallColor();

        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const alpha = (i / this.trail.length) * 0.4;
            const trailSize = size * (0.3 + (i / this.trail.length) * 0.7);
            ctx.fillStyle = ballColor;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(t.x, t.y, trailSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (assets.ball.loaded) {
            const drawSize = size * 3;
            ctx.drawImage(
                assets.ball.img,
                this.x - drawSize / 2,
                this.y - drawSize / 2,
                drawSize,
                drawSize
            );
        } else {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size / 2);
            gradient.addColorStop(0, ballColor);
            gradient.addColorStop(1, ballColor.replace(')', ',0.3)').replace('rgb', 'rgba'));

            ctx.fillStyle = gradient;
            ctx.fillRect(
                this.x - size / 2,
                this.y - size / 2,
                size,
                size
            );

            ctx.strokeStyle = ballColor;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.strokeRect(
                this.x - size / 2,
                this.y - size / 2,
                size,
                size
            );
            ctx.globalAlpha = 1;
        }

        // Glow effect at high rallies
        if (gameState.ballHits >= 10) {
            ctx.shadowColor = ballColor;
            ctx.shadowBlur = 8 + gameState.ballHits * 0.5;
            ctx.fillStyle = ballColor;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
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
        if (assets.paddle.loaded) {
            // Draw paddle sprite (32x128 source, scaled to paddle dimensions)
            ctx.drawImage(
                assets.paddle.img,
                this.x, this.y,
                this.width, this.height
            );
        } else {
            // Fallback: original glowing paddle
            ctx.fillStyle = 'rgba(230, 126, 34, 0.8)';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.shadowColor = 'rgba(230, 126, 34, 0.8)';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = 'rgba(230, 126, 34, 1)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        }
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

// Power-up system
const powerUps = [];
let powerUpTimer = null;
const activeEffects = { p1: [], p2: [] };

const POWERUP_DEFS = {
    bigPaddle:      { emoji: '🔼', color: '#2ecc71', name: 'BIG PADDLE' },
    shrinkOpponent: { emoji: '🔽', color: '#e74c3c', name: 'SHRINK' },
    speedBall:      { emoji: '⚡', color: '#f39c12', name: 'SPEED BALL' }
};

function spawnPowerUp() {
    if (!gameState.isGameRunning || gameState.isPaused) return;
    const type = GAME_CONFIG.POWERUP_TYPES[Math.floor(Math.random() * GAME_CONFIG.POWERUP_TYPES.length)];
    const margin = 120;
    const x = margin + Math.random() * (GAME_CONFIG.CANVAS_WIDTH - margin * 2);
    const y = 40 + Math.random() * (GAME_CONFIG.CANVAS_HEIGHT - 80);
    powerUps.push({ type, x, y, radius: GAME_CONFIG.POWERUP_SIZE / 2, pulse: 0, life: 300 });
}

function applyPowerUp(type, collector) {
    const opponent = collector === 'p1' ? 'p2' : 'p1';
    const paddle = collector === 'p1' ? paddle1 : paddle2;
    const oppPaddle = collector === 'p1' ? paddle2 : paddle1;
    const def = POWERUP_DEFS[type];

    addFloatingText(def.emoji + ' ' + def.name, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 60, def.color, 26);
    playSound('paddleHit');
    triggerShake(3, 4);

    switch (type) {
        case 'bigPaddle': {
            const origHeight = paddle.height;
            paddle.height = Math.min(paddle.height * 1.6, 180);
            const effectId = setTimeout(() => { paddle.height = origHeight; }, GAME_CONFIG.POWERUP_DURATION);
            activeEffects[collector].push(effectId);
            break;
        }
        case 'shrinkOpponent': {
            const origHeight = oppPaddle.height;
            oppPaddle.height = Math.max(oppPaddle.height * 0.5, 30);
            const effectId = setTimeout(() => { oppPaddle.height = origHeight; }, GAME_CONFIG.POWERUP_DURATION);
            activeEffects[opponent].push(effectId);
            break;
        }
        case 'speedBall': {
            const origMax = GAME_CONFIG.BALL_SPEED_MAX;
            const boost = 1.5;
            ball.vx *= boost;
            ball.vy *= boost;
            GAME_CONFIG.BALL_SPEED_MAX *= boost;
            const effectId = setTimeout(() => {
                GAME_CONFIG.BALL_SPEED_MAX = origMax;
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                if (speed > origMax) {
                    const scale = origMax / speed;
                    ball.vx *= scale;
                    ball.vy *= scale;
                }
            }, GAME_CONFIG.POWERUP_DURATION);
            activeEffects[collector].push(effectId);
            break;
        }
    }
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.pulse = (pu.pulse + 0.05) % (Math.PI * 2);
        pu.life--;
        if (pu.life <= 0) { powerUps.splice(i, 1); continue; }

        // Check ball collision
        const dx = ball.x - pu.x;
        const dy = ball.y - pu.y;
        if (Math.sqrt(dx * dx + dy * dy) < pu.radius + GAME_CONFIG.BALL_SIZE) {
            // Determine which player last hit the ball
            const collector = ball.vx > 0 ? 'p1' : 'p2';
            applyPowerUp(pu.type, collector);
            powerUps.splice(i, 1);
        }
    }
}

function drawPowerUps() {
    powerUps.forEach(pu => {
        const def = POWERUP_DEFS[pu.type];
        const pulseScale = 1 + Math.sin(pu.pulse) * 0.15;
        const r = pu.radius * pulseScale;

        // Glow
        ctx.save();
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 12 + Math.sin(pu.pulse) * 6;
        ctx.globalAlpha = pu.life < 60 ? pu.life / 60 : 1;

        // Circle bg
        ctx.fillStyle = def.color + '33';
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, r + 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Emoji
        ctx.font = `${Math.floor(r * 1.6)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.emoji, pu.x, pu.y);

        ctx.restore();
    });
}

function clearPowerUps() {
    powerUps.length = 0;
    ['p1', 'p2'].forEach(p => {
        activeEffects[p].forEach(id => clearTimeout(id));
        activeEffects[p] = [];
    });
    if (powerUpTimer) { clearInterval(powerUpTimer); powerUpTimer = null; }
}

// Screen shake & floating text
let shakeAmount = 0;
let shakeFrames = 0;
const floatingTexts = [];

function triggerShake(intensity = 4, frames = 6) {
    shakeAmount = intensity;
    shakeFrames = frames;
}

function addFloatingText(text, x, y, color = '#e67e22', size = 24) {
    floatingTexts.push({ text, x, y, color, size, alpha: 1, vy: -2, life: 60 });
}

// Streak multiplier helpers
function getStreakMultiplier(streak) {
    if (streak >= 15) return 4;
    if (streak >= 10) return 3;
    if (streak >= 5) return 2;
    if (streak >= 3) return 1.5;
    return 1;
}

function updateStreakUI() {
    const badge = document.getElementById('streak-badge');
    if (!badge) return;

    // In 1P mode show p1 streak; in 2P show whichever is active
    const streak = gameState.gameMode === '2p'
        ? Math.max(gameState.p1ReturnStreak, gameState.p2ReturnStreak)
        : gameState.p1ReturnStreak;
    const multiplier = getStreakMultiplier(streak);

    if (streak >= 3) {
        const streakLabel = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('streak.label') : 'STREAK';
        badge.textContent = `\uD83D\uDD25 ${streak} ${streakLabel} (${multiplier}x)`;
        badge.classList.remove('hidden');
        // Milestone glow classes
        badge.classList.toggle('streak-mega', streak >= 10);
        badge.classList.toggle('streak-super', streak >= 5 && streak < 10);
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('streak-mega', 'streak-super');
    }
}

function triggerStreakFlash() {
    const flash = document.getElementById('streak-flash');
    if (!flash) return;
    flash.classList.remove('active');
    // Force reflow
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 400);
}

function startGame(mode) {
    gameState.gameMode = mode;
    gameState.score = { p1: 0, p2: 0 };
    gameState.gameTime = 0;
    gameState.gameStartTime = Date.now();
    gameState.ballHits = 0;
    gameState.isPaused = false;
    gameState.p1ReturnStreak = 0;
    gameState.p2ReturnStreak = 0;
    gameState.streakFlashTimer = 0;

    ball.reset();
    updateStreakUI();
    paddle1.y = GAME_CONFIG.CANVAS_HEIGHT / 2 - gameState.paddleSize / 2;
    paddle2.y = GAME_CONFIG.CANVAS_HEIGHT / 2 - gameState.paddleSize / 2;

    showScreen('game-screen');
    gameState.isGameRunning = true;

    // Show 2P control hint
    const hint = document.getElementById('control-hint');
    if (mode === '2p') {
        hint.classList.remove('hidden');
        setTimeout(() => hint.classList.add('hidden'), 5000);
    } else {
        hint.classList.add('hidden');
    }

    // Re-fit canvas after screen switch
    setTimeout(() => resizeCanvas(), 50);

    clearPowerUps();
    powerUpTimer = setInterval(spawnPowerUp, GAME_CONFIG.POWERUP_SPAWN_INTERVAL);

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

    // Power-ups
    updatePowerUps();

    // Collision - Paddles
    handlePaddleCollision();

    // Collision - Boundaries (score)
    if (ball.x < 0) {
        // P2 scores — apply P2 streak multiplier
        const p2Mult = getStreakMultiplier(gameState.p2ReturnStreak);
        const p2Points = Math.floor(1 * p2Mult);
        gameState.score.p2 += p2Points;
        gameState.ballHits = 0;
        playSound('score');
        if (typeof Haptic !== 'undefined') Haptic.medium();
        createParticles(ball.x, ball.y);
        triggerShake(6, 10);
        const p2Label = p2Mult > 1 ? `+${p2Points} (${p2Mult}x)` : '+1';
        addFloatingText(p2Label, GAME_CONFIG.CANVAS_WIDTH * 0.75, GAME_CONFIG.CANVAS_HEIGHT / 2, p2Mult > 1 ? '#fbbf24' : '#2ecc71', p2Mult > 1 ? 42 : 36);
        // Reset both streaks
        gameState.p1ReturnStreak = 0;
        gameState.p2ReturnStreak = 0;
        updateStreakUI();
        ball.reset();
    } else if (ball.x > GAME_CONFIG.CANVAS_WIDTH) {
        // P1 scores — apply P1 streak multiplier
        const p1Mult = getStreakMultiplier(gameState.p1ReturnStreak);
        const p1Points = Math.floor(1 * p1Mult);
        gameState.score.p1 += p1Points;
        gameState.ballHits = 0;
        playSound('score');
        if (typeof Haptic !== 'undefined') Haptic.medium();
        createParticles(ball.x, ball.y);
        triggerShake(6, 10);
        const p1Label = p1Mult > 1 ? `+${p1Points} (${p1Mult}x)` : '+1';
        addFloatingText(p1Label, GAME_CONFIG.CANVAS_WIDTH * 0.25, GAME_CONFIG.CANVAS_HEIGHT / 2, p1Mult > 1 ? '#fbbf24' : '#2ecc71', p1Mult > 1 ? 42 : 36);
        // Reset both streaks
        gameState.p1ReturnStreak = 0;
        gameState.p2ReturnStreak = 0;
        updateStreakUI();
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
            gameState.p1ReturnStreak++;
            playSound('paddleHit');
            if (typeof Haptic !== 'undefined') Haptic.light();
            createParticles(ball.x, ball.y);
            triggerShake(3, 4);
            updateStreakUI();
            if (gameState.ballHits > 0 && gameState.ballHits % 5 === 0) {
                const rallyMilestone = gameState.ballHits >= 30 ? '🔥🔥🔥' : gameState.ballHits >= 20 ? '🔥🔥' : gameState.ballHits >= 10 ? '🔥' : '⚡';
                const rallySize = gameState.ballHits >= 20 ? 36 : 28;
                const rallyColor = gameState.ballHits >= 20 ? '#ff6b6b' : '#f39c12';
                addFloatingText(`${rallyMilestone} ${gameState.ballHits} RALLY!`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 40, rallyColor, rallySize);
                if (gameState.ballHits >= 20) triggerShake(5, 8);
            }
            // Streak milestone flash
            if (gameState.p1ReturnStreak === 5 || gameState.p1ReturnStreak === 10 || gameState.p1ReturnStreak === 15) {
                triggerStreakFlash();
                const mult = getStreakMultiplier(gameState.p1ReturnStreak);
                addFloatingText(`${mult}x`, GAME_CONFIG.CANVAS_WIDTH / 4, GAME_CONFIG.CANVAS_HEIGHT / 2, '#fbbf24', 40);
            }
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
            gameState.p2ReturnStreak++;
            playSound('paddleHit');
            if (typeof Haptic !== 'undefined') Haptic.light();
            createParticles(ball.x, ball.y);
            triggerShake(3, 4);
            updateStreakUI();
            if (gameState.ballHits > 0 && gameState.ballHits % 5 === 0) {
                const rallyMilestone = gameState.ballHits >= 30 ? '🔥🔥🔥' : gameState.ballHits >= 20 ? '🔥🔥' : gameState.ballHits >= 10 ? '🔥' : '⚡';
                const rallySize = gameState.ballHits >= 20 ? 36 : 28;
                const rallyColor = gameState.ballHits >= 20 ? '#ff6b6b' : '#f39c12';
                addFloatingText(`${rallyMilestone} ${gameState.ballHits} RALLY!`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 40, rallyColor, rallySize);
                if (gameState.ballHits >= 20) triggerShake(5, 8);
            }
            // Streak milestone flash
            if (gameState.p2ReturnStreak === 5 || gameState.p2ReturnStreak === 10 || gameState.p2ReturnStreak === 15) {
                triggerStreakFlash();
                const mult = getStreakMultiplier(gameState.p2ReturnStreak);
                addFloatingText(`${mult}x`, GAME_CONFIG.CANVAS_WIDTH * 0.75, GAME_CONFIG.CANVAS_HEIGHT / 2, '#fbbf24', 40);
            }
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
    // Clear canvas with background image or gradient fallback
    if (assets.bg.loaded) {
        ctx.drawImage(assets.bg.img, 0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, 'rgba(15, 15, 35, 1)');
        gradient.addColorStop(1, 'rgba(10, 10, 21, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    }

    // Screen shake
    ctx.save();
    if (shakeFrames > 0) {
        const dx = (Math.random() - 0.5) * shakeAmount * 2;
        const dy = (Math.random() - 0.5) * shakeAmount * 2;
        ctx.translate(dx, dy);
        shakeFrames--;
        if (shakeFrames <= 0) shakeAmount = 0;
    }

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
    drawPowerUps();
    paddle1.draw();
    paddle2.draw();
    ball.draw();

    // Floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        ft.y += ft.vy;
        ft.alpha -= 1 / ft.life;
        ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    ctx.restore();
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
    clearPowerUps();
    // Reset paddle sizes
    paddle1.height = gameState.paddleSize;
    paddle2.height = gameState.paddleSize;

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

    // Save best score
    const playerScore = gameState.score.p1;
    const prevBest = parseInt(localStorage.getItem('pongBestScore') || '0', 10);
    if (playerScore > prevBest) {
        localStorage.setItem('pongBestScore', playerScore);
        showNewBest();
    }

    // Report to daily streak
    if (typeof DailyStreak !== 'undefined') DailyStreak.report(playerScore);

    if (typeof GameAchievements !== 'undefined') GameAchievements.report({
      bestScore: parseInt(localStorage.getItem('pongBestScore')) || 0,
      totalWins: gameState.stats.totalWins,
      totalGames: gameState.stats.totalGames,
      bestStreak: gameState.stats.bestStreak
    });

    // Show game over screen (with interstitial ad)
    if (typeof GameAds !== 'undefined') {
        GameAds.showInterstitial({ onComplete: () => { showGameOverScreen(); } });
    } else {
        showGameOverScreen();
    }
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
// CONFETTI
// ====================================

function spawnConfetti() {
    const colors = ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd'];
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}%;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'0'};z-index:99999;pointer-events:none;animation:confettiFall ${1.5+Math.random()*2}s linear forwards`;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
    if (!document.getElementById('confetti-style')) {
        const s = document.createElement('style');
        s.id = 'confetti-style';
        s.textContent = '@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}';
        document.head.appendChild(s);
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
            spawnConfetti();
        } else {
            titleEl.textContent = i18n.t('game.youLose');
            messageEl.textContent = `Final Score: ${gameState.score.p1} - ${gameState.score.p2}`;
        }
    } else {
        const winnerName = winner === 'p1' ? i18n.t('game.player1') : i18n.t('game.player2');
        titleEl.textContent = `${winnerName} ${i18n.t('game.youWin')}`;
        messageEl.textContent = `Final Score: ${gameState.score.p1} - ${gameState.score.p2}`;
        spawnConfetti();
    }

    const minutes = Math.floor(gameState.gameTime / 60);
    const seconds = gameState.gameTime % 60;
    document.getElementById('final-time').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('final-score').textContent = `${gameState.score.p1} - ${gameState.score.p2}`;

    playSound('gameOver');
    if (typeof Haptic !== 'undefined') Haptic.heavy();
    showScreen('gameover-screen');

    // Rewarded ad — watch ad for 2x score
    if (typeof GameAds !== 'undefined') {
        GameAds.injectRewardButton({
            container: '#gameover-screen',
            label: 'Watch Ad for 2x Score',
            onReward: () => {
                gameState.score.p1 *= 2;
                document.getElementById('final-score').textContent = `${gameState.score.p1} - ${gameState.score.p2}`;
                const prevBest = parseInt(localStorage.getItem('pongBestScore') || '0', 10);
                if (gameState.score.p1 > prevBest) {
                    localStorage.setItem('pongBestScore', gameState.score.p1);
                    showNewBest();
                }
            }
        });
    }
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

    if (!gameState.isGameRunning || gameState.isPaused) return;

    if (gameState.gameMode === '1p') {
        // 1P: W/S or ArrowUp/ArrowDown → paddle1
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            paddle1.move('up');
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            paddle1.move('down');
        }
    } else {
        // 2P: W/S → paddle1, ArrowUp/ArrowDown → paddle2
        if (e.key === 'w' || e.key === 'W') {
            paddle1.move('up');
        } else if (e.key === 's' || e.key === 'S') {
            paddle1.move('down');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            paddle2.move('up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            paddle2.move('down');
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;

    if (!gameState.isGameRunning || gameState.isPaused) return;

    if (gameState.gameMode === '1p') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' ||
            e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            paddle1.move(null);
        }
    } else {
        // 2P: W/S → paddle1, ArrowUp/ArrowDown → paddle2
        if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
            paddle1.move(null);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            paddle2.move(null);
        }
    }
});

// ====================================
// BUTTON HANDLERS
// ====================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
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

    // Daily streak retention
    if (typeof DailyStreak !== 'undefined') DailyStreak.init({ gameId: 'pong-game', bestScoreKey: 'pongBestScore', minTarget: 3 });
    if (typeof GameAds !== 'undefined') GameAds.init();

    if (typeof GameAchievements !== 'undefined') GameAchievements.init({
      gameId: 'pong-game',
      defs: [
        { id: 'score_5', stat: 'bestScore', target: 5, icon: '\uD83C\uDFD3', name: 'Rally Starter' },
        { id: 'score_10', stat: 'bestScore', target: 10, icon: '\uD83C\uDFD3', name: 'Rally King' },
        { id: 'wins_5', stat: 'totalWins', target: 5, icon: '\uD83C\uDFC6', name: 'Winner' },
        { id: 'wins_20', stat: 'totalWins', target: 20, icon: '\uD83C\uDFC6', name: 'Champion' },
        { id: 'games_10', stat: 'totalGames', target: 10, icon: '\uD83C\uDFAE', name: 'Regular' },
        { id: 'games_50', stat: 'totalGames', target: 50, icon: '\uD83C\uDFAE', name: 'Veteran' },
        { id: 'streak_3', stat: 'bestStreak', target: 3, icon: '\uD83D\uDD25', name: 'Streak Starter' },
        { id: 'streak_10', stat: 'bestStreak', target: 10, icon: '\uD83D\uDD25', name: 'Unstoppable' },
      ]
    });

    // Touch/Mouse handlers for paddles (must be after initCanvas)
    let touchStartY = 0;

    canvas.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, false);

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!gameState.isGameRunning) return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleY = GAME_CONFIG.CANVAS_HEIGHT / rect.height;
        const y = (touch.clientY - rect.top) * scaleY;

        if (gameState.gameMode === '2p') {
            const midX = rect.width / 2;
            const touchX = touch.clientX - rect.left;
            if (touchX < midX) {
                paddle1.y = y - paddle1.height / 2;
                paddle1.y = Math.max(0, Math.min(paddle1.y, GAME_CONFIG.CANVAS_HEIGHT - paddle1.height));
            } else {
                paddle2.y = y - paddle2.height / 2;
                paddle2.y = Math.max(0, Math.min(paddle2.y, GAME_CONFIG.CANVAS_HEIGHT - paddle2.height));
            }
        } else {
            paddle1.y = y - paddle1.height / 2;
            paddle1.y = Math.max(0, Math.min(paddle1.y, GAME_CONFIG.CANVAS_HEIGHT - paddle1.height));
        }
    }, false);

    canvas.addEventListener('mousemove', (e) => {
        if (!gameState.isGameRunning) return;
        const rect = canvas.getBoundingClientRect();
        const scaleY = GAME_CONFIG.CANVAS_HEIGHT / rect.height;
        const y = (e.clientY - rect.top) * scaleY;

        if (gameState.gameMode === '1p') {
            paddle1.y = y - paddle1.height / 2;
            paddle1.y = Math.max(0, Math.min(paddle1.y, GAME_CONFIG.CANVAS_HEIGHT - paddle1.height));
        }
        // 2P mouse: not supported (use keyboard W/S + ArrowUp/Down)
    }, false);

    // Menu buttons
    document.getElementById('btn-1p').addEventListener('click', () => startGame('1p'));
    document.getElementById('btn-2p').addEventListener('click', () => startGame('2p'));
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings-screen'));
    document.getElementById('btn-stats').addEventListener('click', () => {
        updateStatsUI();
        showScreen('stats-screen');
    });

    // Help button
    document.getElementById('btn-help').addEventListener('click', () => showScreen('help-screen'));
    document.getElementById('btn-help-back').addEventListener('click', () => showScreen('menu-screen'));

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
        if (typeof GameAds !== 'undefined') GameAds.removeRewardButton('#gameover-screen');
        const mode = gameState.gameMode;
        startGame(mode);
    });

    document.getElementById('btn-menu-final').addEventListener('click', () => {
        if (typeof GameAds !== 'undefined') GameAds.removeRewardButton('#gameover-screen');
        showScreen('menu-screen');
    });

    // Share score button
    document.getElementById('share-score-btn').addEventListener('click', () => {
        const score = gameState.score.p1;
        const text = `I scored ${score} in Pong! Can you beat me? \uD83C\uDFD3`;
        const url = 'https://dopabrain.com/pong-game/';
        if (navigator.share) {
            navigator.share({ title: 'Pong', text, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text + '\n' + url).then(() => {
                const btn = document.getElementById('share-score-btn');
                if (btn) { const orig = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = orig, 1500); }
            }).catch(() => {});
        }
        if (typeof gtag === 'function') gtag('event', 'share', { method: navigator.share ? 'native' : 'clipboard', app_name: 'pong-game' });
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
  } catch(e) {
    console.error('Init error:', e);
  } finally {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
    }
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

function showNewBest() {
    let el = document.getElementById('new-best-flash');
    if (!el) {
        el = document.createElement('div');
        el.id = 'new-best-flash';
        el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:32px;font-weight:800;color:#fbbf24;text-shadow:0 0 30px rgba(251,191,36,0.6);pointer-events:none;z-index:200;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s;opacity:0;white-space:nowrap;';
        document.body.appendChild(el);
    }
    el.textContent = '\uD83C\uDFD3 NEW BEST!';
    el.style.transform = 'translate(-50%,-50%) scale(1.2)';
    el.style.opacity = '1';
    setTimeout(() => {
        el.style.transform = 'translate(-50%,-50%) scale(0.8)';
        el.style.opacity = '0';
    }, 1200);
}
