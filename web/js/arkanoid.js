// arkanoid.js
import { app } from "/scripts/app.js";

class ArkanoidGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Increased canvas size to accommodate score panel below
        this.canvas.width = 800;
        this.canvas.height = 1000; // Increased from 900 to 1000
        
        // Game area dimensions (top part of canvas)
        this.gameAreaHeight = 800;
        
        // Score panel dimensions (bottom part of canvas)
        this.scorePanelHeight = 200;
        this.scorePanelY = this.gameAreaHeight; // Start of score panel
        
        // Game state
        this.gameActive = false;
        this.gameState = 'menu'; // 'menu', 'playing', 'gameover', 'levelcomplete'
        this.score = 0;
        this.highScore = 0;
        this.level = 1;
        this.highLevel = 1;
        this.lives = 3;
        this.balls = [];
        this.paddle = {};
        this.bricks = [];
        this.powerUps = [];
        this.lasers = []; // Array to store active lasers
        this.gameSpeed = 1.0;
        
        // Game settings
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.ballSpeed = 5;
        this.paddleSpeed = 8;
        this.ballCount = 1; // Starting with 1 ball
        
        // Laser settings
        this.laserCooldown = 300; // ms between laser shots
        this.lastLaserShot = 0;
        this.autoFire = false; // Whether lasers auto-fire
        
        // Level layout
        this.brickRows = 8;
        this.brickCols = 14;
        this.brickWidth = 50;
        this.brickHeight = 20;
        this.brickPadding = 5;
        this.brickOffsetTop = 80;
        this.brickOffsetLeft = 30;
        
        // Power-up types
        this.powerUpTypes = [
            { type: 'extra_ball', color: '#ff5252', chance: 0.1 },
            { type: 'slow_ball', color: '#2196F3', chance: 0.1 },
            { type: 'fast_ball', color: '#FF9800', chance: 0.1 },
            { type: 'expand_paddle', color: '#4CAF50', chance: 0.1 },
            { type: 'shrink_paddle', color: '#9C27B0', chance: 0.05 },
            { type: 'laser', color: '#00BCD4', chance: 0.05 },
            { type: 'extra_life', color: '#FFEB3B', chance: 0.05 },
            { type: 'auto_fire', color: '#E91E63', chance: 0.03 }
        ];
        
        // Game loop
        this.lastUpdate = 0;
        this.gameLoopId = null;
        
        // Input
        this.keys = {};
        this.mouseX = 0;
        
        // Sounds
        this.initSounds();
        
        // Load high score
        this.loadHighScore();
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        
        // Initialize game objects
        this.init();
        
        // Start the game loop for menu
        this.draw();
    }
    
    init() {
        // Initialize paddle - position it in the game area
        this.paddle = {
            x: this.canvas.width / 2 - 60,
            y: this.gameAreaHeight - 40, // Position in game area
            width: 120,
            height: 15,
            color: '#4CAF50',
            laserActive: false,
            laserTimer: 0,
            autoFireActive: false,
            autoFireTimer: 0
        };
        
        // Clear lasers
        this.lasers = [];
        
        // Initialize ball
        this.resetBall();
        
        // Initialize bricks for current level
        this.generateBricks();
        
        // Set game speed based on difficulty
        this.setDifficulty(this.difficulty);
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        switch(difficulty) {
            case 'easy':
                this.ballSpeed = 5;
                this.paddleSpeed = 7;
                this.lives = 5;
                this.laserCooldown = 400;
                break;
            case 'medium':
                this.ballSpeed = 6;
                this.paddleSpeed = 8;
                this.lives = 3;
                this.laserCooldown = 300;
                break;
            case 'hard':
                this.ballSpeed = 7;
                this.paddleSpeed = 9;
                this.lives = 2;
                this.laserCooldown = 200;
                break;
        }
    }
    
    initSounds() {
        this.sounds = {
            brick: this.createBeep(400, 0.1, 0.2),
            paddle: this.createBeep(200, 0.1, 0.2),
            wall: this.createBeep(300, 0.1, 0.2),
            powerup: this.createBeep(600, 0.2, 0.3),
            extraLife: this.createBeep(800, 0.3, 0.4),
            laser: this.createBeep(100, 0.1, 0.3),
            laserHit: this.createBeep(500, 0.1, 0.2),
            gameover: this.createBeep(150, 0.5, 0.5),
            levelComplete: this.createBeep(700, 0.4, 0.3)
        };
    }
    
    createBeep(frequency, duration, volume = 0.1) {
        return () => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            } catch (e) {
                // Silently fail if audio context not available
            }
        };
    }
    
    async loadHighScore() {
        try {
            const response = await fetch('/arkanoid/highscore');
            if (response.ok) {
                const data = await response.json();
                this.highScore = data.score || 0;
                this.highLevel = data.level || 1;
            }
        } catch (e) {
            console.log('No arkanoid high score found');
        }
    }
    
    async saveHighScore() {
        if (this.score > this.highScore || (this.score === this.highScore && this.level > this.highLevel)) {
            this.highScore = this.score;
            this.highLevel = this.level;
            try {
                await fetch('/arkanoid/highscore', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        score: this.highScore,
                        level: this.highLevel
                    })
                });
            } catch (e) {
                console.log('Could not save arkanoid high score', e);
            }
        }
    }
    
    resetBall() {
        this.balls = [{
            x: this.canvas.width / 2,
            y: this.gameAreaHeight - 60, // Position in game area
            dx: (Math.random() > 0.5 ? 1 : -1) * this.ballSpeed,
            dy: -this.ballSpeed,
            radius: 10,
            color: '#FF9800',
            trail: []
        }];
    }
    
    generateBricks() {
        this.bricks = [];
        const colors = [
            '#FF5252', '#FF9800', '#FFEB3B', '#4CAF50',
            '#2196F3', '#9C27B0', '#E91E63', '#00BCD4'
        ];
        
        // Adjust brick layout based on level
        const rows = this.brickRows + Math.floor(this.level / 3);
        const cols = this.brickCols;
        
        // Calculate brick width to fit canvas
        const totalWidth = cols * (this.brickWidth + this.brickPadding) - this.brickPadding;
        const offsetLeft = (this.canvas.width - totalWidth) / 2;
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Calculate brick position
                const brickX = c * (this.brickWidth + this.brickPadding) + offsetLeft;
                const brickY = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                
                // Determine brick type and hit points
                let hitPoints = 1;
                let color = colors[r % colors.length];
                
                // Add stronger bricks in higher levels
                if (this.level > 3 && r < 2) {
                    hitPoints = 2;
                    color = this.darkenColor(color, 30);
                } else if (this.level > 6 && r < 1) {
                    hitPoints = 3;
                    color = this.darkenColor(color, 50);
                }
                
                // Add some indestructible bricks in very high levels
                if (this.level > 9 && Math.random() < 0.1) {
                    hitPoints = -1; // Indestructible
                    color = '#666';
                }
                
                this.bricks.push({
                    x: brickX,
                    y: brickY,
                    width: this.brickWidth,
                    height: this.brickHeight,
                    color: color,
                    hitPoints: hitPoints,
                    visible: true
                });
            }
        }
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return `#${(
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1)}`;
    }
    
    spawnPowerUp(x, y) {
        // Random chance to spawn power-up
        if (Math.random() > 0.3) return;
        
        // Select random power-up based on weighted chances
        let rand = Math.random();
        let cumulative = 0;
        let selectedType = null;
        
        for (const powerUp of this.powerUpTypes) {
            cumulative += powerUp.chance;
            if (rand <= cumulative) {
                selectedType = powerUp;
                break;
            }
        }
        
        if (!selectedType) return;
        
        this.powerUps.push({
            x: x,
            y: y,
            width: 20,
            height: 20,
            type: selectedType.type,
            color: selectedType.color,
            speed: 3,
            active: true
        });
    }
    
    update() {
        if (!this.gameActive) return;
        
        // Update paddle position based on input
        this.updatePaddle();
        
        // Update balls
        this.updateBalls();
        
        // Update power-ups
        this.updatePowerUps();
        
        // Update lasers
        this.updateLasers();
        
        // Auto-fire lasers if active
        if (this.paddle.autoFireActive && this.paddle.laserActive) {
            this.autoFireLasers();
        }
        
        // Update laser timer
        if (this.paddle.laserActive && Date.now() - this.paddle.laserTimer > 10000) {
            this.deactivateLaser();
        }
        
        // Update auto-fire timer
        if (this.paddle.autoFireActive && Date.now() - this.paddle.autoFireTimer > 15000) {
            this.paddle.autoFireActive = false;
        }
        
        // Check for level completion
        const visibleBricks = this.bricks.filter(brick => brick.visible && brick.hitPoints !== -1);
        if (visibleBricks.length === 0) {
            this.levelComplete();
        }
    }
    
    updatePaddle() {
        // Keyboard controls
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.paddle.x -= this.paddleSpeed * this.gameSpeed;
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.paddle.x += this.paddleSpeed * this.gameSpeed;
        }
        
        // Mouse controls
        if (this.mouseX > 0) {
            this.paddle.x = this.mouseX - this.paddle.width / 2;
        }
        
        // Keep paddle within canvas bounds
        if (this.paddle.x < 0) {
            this.paddle.x = 0;
        }
        if (this.paddle.x + this.paddle.width > this.canvas.width) {
            this.paddle.x = this.canvas.width - this.paddle.width;
        }
    }
    
    updateBalls() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            
            // Add to trail (for visual effect)
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 5) {
                ball.trail.shift();
            }
            
            // Move ball
            ball.x += ball.dx * this.gameSpeed;
            ball.y += ball.dy * this.gameSpeed;
            
            // Wall collision (left/right)
            if (ball.x + ball.radius > this.canvas.width || ball.x - ball.radius < 0) {
                ball.dx = -ball.dx;
                ball.x = ball.x < ball.radius ? ball.radius : this.canvas.width - ball.radius;
                this.sounds.wall();
            }
            
            // Wall collision (top)
            if (ball.y - ball.radius < 0) {
                ball.dy = -ball.dy;
                ball.y = ball.radius;
                this.sounds.wall();
            }
            
            // Bottom of game area - ball lost
            if (ball.y + ball.radius > this.gameAreaHeight) {
                this.balls.splice(i, 1);
                continue;
            }
            
            // Paddle collision
            if (ball.y + ball.radius > this.paddle.y &&
                ball.y - ball.radius < this.paddle.y + this.paddle.height &&
                ball.x + ball.radius > this.paddle.x &&
                ball.x - ball.radius < this.paddle.x + this.paddle.width) {
                
                // Calculate bounce angle based on where ball hits paddle
                const paddleCenter = this.paddle.x + this.paddle.width / 2;
                const ballOffset = ball.x - paddleCenter;
                const maxAngle = Math.PI / 3; // 60 degrees max
                const angle = (ballOffset / (this.paddle.width / 2)) * maxAngle;
                
                // Update ball direction
                const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                ball.dx = Math.sin(angle) * speed;
                ball.dy = -Math.abs(Math.cos(angle) * speed);
                
                // Ensure minimum vertical speed
                if (Math.abs(ball.dy) < 3) {
                    ball.dy = ball.dy > 0 ? 3 : -3;
                }
                
                // Position ball above paddle
                ball.y = this.paddle.y - ball.radius - 1;
                
                this.sounds.paddle();
            }
            
            // Brick collision
            for (const brick of this.bricks) {
                if (!brick.visible || brick.hitPoints === -1) continue;
                
                if (ball.x + ball.radius > brick.x &&
                    ball.x - ball.radius < brick.x + brick.width &&
                    ball.y + ball.radius > brick.y &&
                    ball.y - ball.radius < brick.y + brick.height) {
                    
                    // Determine collision side
                    const ballLeft = ball.x - ball.radius;
                    const ballRight = ball.x + ball.radius;
                    const ballTop = ball.y - ball.radius;
                    const ballBottom = ball.y + ball.radius;
                    
                    const brickLeft = brick.x;
                    const brickRight = brick.x + brick.width;
                    const brickTop = brick.y;
                    const brickBottom = brick.y + brick.height;
                    
                    // Calculate overlap on each side
                    const overlapLeft = ballRight - brickLeft;
                    const overlapRight = brickRight - ballLeft;
                    const overlapTop = ballBottom - brickTop;
                    const overlapBottom = brickBottom - ballTop;
                    
                    // Find minimum overlap
                    const minOverlap = Math.min(
                        overlapLeft, overlapRight,
                        overlapTop, overlapBottom
                    );
                    
                    // Resolve collision based on minimum overlap
                    if (minOverlap === overlapLeft) {
                        ball.dx = -Math.abs(ball.dx);
                        ball.x = brickLeft - ball.radius - 1;
                    } else if (minOverlap === overlapRight) {
                        ball.dx = Math.abs(ball.dx);
                        ball.x = brickRight + ball.radius + 1;
                    } else if (minOverlap === overlapTop) {
                        ball.dy = -Math.abs(ball.dy);
                        ball.y = brickTop - ball.radius - 1;
                    } else if (minOverlap === overlapBottom) {
                        ball.dy = Math.abs(ball.dy);
                        ball.y = brickBottom + ball.radius + 1;
                    }
                    
                    // Damage brick
                    brick.hitPoints--;
                    if (brick.hitPoints <= 0) {
                        brick.visible = false;
                        this.score += 10 * this.level;
                        
                        // Chance to spawn power-up
                        this.spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                    }
                    
                    this.sounds.brick();
                    break; // Only handle one brick collision per frame
                }
            }
        }
        
        // Check if all balls are lost
        if (this.balls.length === 0) {
            this.lives--;
            if (this.lives <= 0) {
                this.gameOver();
            } else {
                this.resetBall();
                // Brief pause before next ball
                this.gameActive = false;
                setTimeout(() => {
                    this.gameActive = true;
                }, 1000);
            }
        }
    }
    
    updatePowerUps() {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            // Move power-up down
            powerUp.y += powerUp.speed * this.gameSpeed;
            
            // Check if power-up is collected by paddle
            if (powerUp.y + powerUp.height > this.paddle.y &&
                powerUp.y < this.paddle.y + this.paddle.height &&
                powerUp.x + powerUp.width > this.paddle.x &&
                powerUp.x < this.paddle.x + this.paddle.width) {
                
                this.activatePowerUp(powerUp);
                this.powerUps.splice(i, 1);
                continue;
            }
            
            // Remove power-up if it goes off screen (game area)
            if (powerUp.y > this.gameAreaHeight) {
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    updateLasers() {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            
            // Move laser up
            laser.y -= laser.speed * this.gameSpeed;
            
            // Remove lasers that go off screen
            if (laser.y + laser.height < 0) {
                this.lasers.splice(i, 1);
                continue;
            }
            
            // Check laser collision with bricks
            for (const brick of this.bricks) {
                if (!brick.visible || brick.hitPoints === -1) continue;
                
                if (laser.x < brick.x + brick.width &&
                    laser.x + laser.width > brick.x &&
                    laser.y < brick.y + brick.height &&
                    laser.y + laser.height > brick.y) {
                    
                    // Damage brick
                    brick.hitPoints--;
                    if (brick.hitPoints <= 0) {
                        brick.visible = false;
                        this.score += 10 * this.level;
                        
                        // Chance to spawn power-up
                        this.spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                    }
                    
                    // Remove laser
                    this.lasers.splice(i, 1);
                    this.sounds.laserHit();
                    break;
                }
            }
        }
    }
    
    activatePowerUp(powerUp) {
        this.sounds.powerup();
        
        switch(powerUp.type) {
            case 'extra_ball':
                this.addExtraBall();
                break;
                
            case 'slow_ball':
                this.gameSpeed = Math.max(0.5, this.gameSpeed * 0.8);
                setTimeout(() => {
                    this.gameSpeed = 1.0;
                }, 5000);
                break;
                
            case 'fast_ball':
                this.gameSpeed = Math.min(2.0, this.gameSpeed * 1.3);
                setTimeout(() => {
                    this.gameSpeed = 1.0;
                }, 5000);
                break;
                
            case 'expand_paddle':
                this.paddle.width = Math.min(200, this.paddle.width * 1.5);
                setTimeout(() => {
                    this.paddle.width = 120;
                }, 10000);
                break;
                
            case 'shrink_paddle':
                this.paddle.width = Math.max(60, this.paddle.width * 0.7);
                setTimeout(() => {
                    this.paddle.width = 120;
                }, 10000);
                break;
                
            case 'laser':
                this.activateLaser();
                break;
                
            case 'extra_life':
                this.lives++;
                this.sounds.extraLife();
                break;
                
            case 'auto_fire':
                this.activateAutoFire();
                break;
        }
    }
    
    activateLaser() {
        this.paddle.laserActive = true;
        this.paddle.laserTimer = Date.now();
    }
    
    deactivateLaser() {
        this.paddle.laserActive = false;
        this.paddle.autoFireActive = false;
    }
    
    activateAutoFire() {
        this.paddle.autoFireActive = true;
        this.paddle.autoFireTimer = Date.now();
    }
    
    fireLaser() {
        if (!this.paddle.laserActive) return;
        
        const now = Date.now();
        if (now - this.lastLaserShot < this.laserCooldown) return;
        
        this.lastLaserShot = now;
        this.sounds.laser();
        
        // Create laser projectiles from both cannons
        const leftCannonX = this.paddle.x + 10 + 7.5; // Center of left cannon
        const rightCannonX = this.paddle.x + this.paddle.width - 25 + 7.5; // Center of right cannon
        
        // Left cannon laser
        this.lasers.push({
            x: leftCannonX - 1.5,
            y: this.paddle.y - 10,
            width: 3,
            height: 20,
            speed: 12,
            color: '#00BCD4',
            trail: []
        });
        
        // Right cannon laser
        this.lasers.push({
            x: rightCannonX - 1.5,
            y: this.paddle.y - 10,
            width: 3,
            height: 20,
            speed: 12,
            color: '#00BCD4',
            trail: []
        });
    }
    
    autoFireLasers() {
        const now = Date.now();
        if (now - this.lastLaserShot >= this.laserCooldown) {
            this.fireLaser();
        }
    }
    
    addExtraBall() {
        if (this.balls.length > 0) {
            const originalBall = this.balls[0];
            this.balls.push({
                x: originalBall.x,
                y: originalBall.y,
                dx: -originalBall.dx,
                dy: originalBall.dy,
                radius: originalBall.radius,
                color: '#00BCD4',
                trail: []
            });
        }
    }
    
    levelComplete() {
        this.gameActive = false;
        this.gameState = 'levelcomplete';
        this.sounds.levelComplete();
        
        // Bonus points for remaining lives and balls
        this.score += this.lives * 100;
        this.score += this.balls.length * 50;
        this.score += this.level * 50; // Level completion bonus
        
        setTimeout(() => {
            this.nextLevel();
        }, 2000);
    }
    
    nextLevel() {
        this.level++;
        this.resetBall();
        this.powerUps = [];
        this.lasers = [];
        this.paddle.width = 120; // Reset paddle size
        this.paddle.laserActive = false;
        this.paddle.autoFireActive = false;
        this.gameSpeed = 1.0;
        this.generateBricks();
        this.gameActive = true;
        this.gameState = 'playing';
        
        // Restart game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        this.lastUpdate = performance.now();
        this.gameLoopId = requestAnimationFrame(this.gameLoop);
    }
    
    gameOver() {
        this.gameActive = false;
        this.gameState = 'gameover';
        this.sounds.gameover();
        this.saveHighScore();
        this.draw();
    }
    
    startGame() {
        console.log('Starting game...');
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.setDifficulty(this.difficulty);
        this.init();
        this.gameActive = true;
        this.gameState = 'playing';
        
        // Start the game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        this.lastUpdate = performance.now();
        this.gameLoopId = requestAnimationFrame(this.gameLoop);
        
        this.draw();
    }
    
    gameLoop(timestamp) {
        if (!this.gameLoopId) return;
        
        const delta = timestamp - this.lastUpdate;
        
        if (delta > 16) { // ~60 FPS
            this.update();
            this.draw();
            this.lastUpdate = timestamp;
        }
        
        if (this.gameActive || this.gameState === 'levelcomplete') {
            this.gameLoopId = requestAnimationFrame(this.gameLoop);
        }
    }
    
    draw() {
        this.clearCanvas();
        
        if (this.gameState === 'menu') {
            this.drawMenu();
        } else {
            this.drawGame();
            this.drawInfoPanel();
        }
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGame() {
        // Draw game area background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.gameAreaHeight);
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.gameAreaHeight);
        
        // Draw stars in background
        this.drawStars();
        
        // Draw bricks
        for (const brick of this.bricks) {
            if (!brick.visible) continue;
            
            // Draw brick with shadow
            this.ctx.fillStyle = brick.hitPoints === -1 ? '#666' : brick.color;
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 5;
            this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            
            // Draw brick border
            this.ctx.strokeStyle = brick.hitPoints === -1 ? '#888' : '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            
            // Draw hit points for stronger bricks
            if (brick.hitPoints > 1) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    brick.hitPoints.toString(),
                    brick.x + brick.width / 2,
                    brick.y + brick.height / 2
                );
            }
            
            this.ctx.shadowBlur = 0;
        }
        
        // Draw paddle
        this.ctx.fillStyle = this.paddle.color;
        this.ctx.shadowColor = '#4CAF50';
        this.ctx.shadowBlur = 10;
        
        // Draw paddle with rounded corners
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.paddle.x,
            this.paddle.y,
            this.paddle.width,
            this.paddle.height,
            8
        );
        this.ctx.fill();
        
        // Draw laser cannons if active
        if (this.paddle.laserActive) {
            this.ctx.fillStyle = '#00BCD4';
            this.ctx.shadowColor = '#00BCD4';
            this.ctx.shadowBlur = 15;
            
            // Left cannon
            this.ctx.fillRect(this.paddle.x + 10, this.paddle.y - 10, 15, 10);
            
            // Right cannon
            this.ctx.fillRect(this.paddle.x + this.paddle.width - 25, this.paddle.y - 10, 15, 10);
            
            this.ctx.shadowBlur = 0;
            
            // Draw cannon glow effect
            if (Date.now() % 300 < 150) { // Pulsing effect
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.fillRect(this.paddle.x + 12, this.paddle.y - 8, 11, 6);
                this.ctx.fillRect(this.paddle.x + this.paddle.width - 23, this.paddle.y - 8, 11, 6);
            }
        }
        
        this.ctx.shadowBlur = 0;
        
        // Draw balls with trail
        for (const ball of this.balls) {
            // Draw trail
            for (let i = 0; i < ball.trail.length; i++) {
                const point = ball.trail[i];
                const alpha = (i + 1) / ball.trail.length * 0.3;
                this.ctx.fillStyle = `rgba(255, 152, 0, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, ball.radius * 0.7, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Draw ball
            this.ctx.fillStyle = ball.color;
            this.ctx.shadowColor = '#FF9800';
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw ball highlight
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0;
        }
        
        // Draw lasers with trail effect
        for (const laser of this.lasers) {
            // Draw laser trail
            laser.trail.push({ x: laser.x + laser.width / 2, y: laser.y + laser.height });
            if (laser.trail.length > 3) {
                laser.trail.shift();
            }
            
            for (let i = 0; i < laser.trail.length; i++) {
                const point = laser.trail[i];
                const alpha = (i + 1) / laser.trail.length * 0.5;
                this.ctx.fillStyle = `rgba(0, 188, 212, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Draw laser beam
            this.ctx.fillStyle = laser.color;
            this.ctx.shadowColor = '#00BCD4';
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
            
            // Draw laser core (brighter center)
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(laser.x + 0.5, laser.y, 2, laser.height);
            
            this.ctx.shadowBlur = 0;
        }
        
        // Draw power-ups
        for (const powerUp of this.powerUps) {
            this.ctx.fillStyle = powerUp.color;
            this.ctx.shadowColor = powerUp.color;
            this.ctx.shadowBlur = 10;
            
            // Draw power-up with pulsing effect
            const pulse = Math.sin(Date.now() / 200) * 2 + 1;
            this.ctx.beginPath();
            this.ctx.arc(
                powerUp.x + powerUp.width / 2,
                powerUp.y + powerUp.height / 2,
                powerUp.width / 2 + pulse,
                0, Math.PI * 2
            );
            this.ctx.fill();
            
            // Draw power-up symbol
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            let symbol = '';
            switch(powerUp.type) {
                case 'extra_ball': symbol = '●'; break;
                case 'slow_ball': symbol = '🐌'; break;
                case 'fast_ball': symbol = '⚡'; break;
                case 'expand_paddle': symbol = '⬌'; break;
                case 'shrink_paddle': symbol = '⬎'; break;
                case 'laser': symbol = '⚡'; break;
                case 'extra_life': symbol = '❤'; break;
                case 'auto_fire': symbol = '🔥'; break;
            }
            
            this.ctx.fillText(
                symbol,
                powerUp.x + powerUp.width / 2,
                powerUp.y + powerUp.height / 2
            );
            
            this.ctx.shadowBlur = 0;
        }
        
        // Draw level complete screen
        if (this.gameState === 'levelcomplete') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.gameAreaHeight);
            
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.font = 'bold 50px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('LEVEL COMPLETE!', this.canvas.width / 2, this.gameAreaHeight / 2 - 50);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '30px Arial';
            this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.gameAreaHeight / 2);
            this.ctx.fillText(`Next Level: ${this.level + 1}`, this.canvas.width / 2, this.gameAreaHeight / 2 + 50);
        }
        
        // Draw game over screen
        if (this.gameState === 'gameover') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.gameAreaHeight);
            
            this.ctx.fillStyle = '#FF5252';
            this.ctx.font = 'bold 50px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.gameAreaHeight / 2 - 50);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '30px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.gameAreaHeight / 2);
            this.ctx.fillText(`Level Reached: ${this.level}`, this.canvas.width / 2, this.gameAreaHeight / 2 + 50);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Press N for New Game', this.canvas.width / 2, this.gameAreaHeight / 2 + 100);
            this.ctx.fillText('Press M for Menu', this.canvas.width / 2, this.gameAreaHeight / 2 + 130);
        }
        
        // Draw game area border
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.gameAreaHeight);
    }
    
    drawStars() {
        // Create static star field
        if (!this.stars) {
            this.stars = [];
            for (let i = 0; i < 100; i++) {
                this.stars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.gameAreaHeight,
                    size: Math.random() * 2 + 1,
                    brightness: Math.random() * 0.5 + 0.5
                });
            }
        }
        
        // Draw stars
        for (const star of this.stars) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawInfoPanel() {
        const panelY = this.scorePanelY;
        const panelHeight = this.scorePanelHeight;
        
        // Draw panel background
        this.ctx.fillStyle = 'rgba(44, 62, 80, 0.95)';
        this.ctx.fillRect(0, panelY, this.canvas.width, panelHeight);
        
        // Draw panel border
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, panelY, this.canvas.width, panelHeight);
        
        // Draw separator line
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, panelY);
        this.ctx.lineTo(this.canvas.width, panelY);
        this.ctx.stroke();
        
        // Draw scores - larger font for better visibility
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        
        // Score
        this.ctx.fillText(`SCORE: ${this.score}`, this.canvas.width / 4, panelY + 40);
        
        // High score
        this.ctx.fillText(`HIGH SCORE: ${this.highScore}`, this.canvas.width * 3 / 4, panelY + 40);
        
        // Level - emphasized
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillText(`LEVEL ${this.level}`, this.canvas.width / 2, panelY + 40);
        
        // Lives and balls with icons
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = '#bdc3c7';
        
        // Lives with heart icon
        this.ctx.fillText(`❤ ${this.lives}`, this.canvas.width / 4, panelY + 80);
        
        // Balls with ball icon
        this.ctx.fillText(`● ${this.balls.length}`, this.canvas.width * 3 / 4, panelY + 80);
        
        // Game info
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.fillText(`Difficulty: ${this.difficulty.toUpperCase()}`, this.canvas.width / 2, panelY + 80);
        
        // Draw controls hint - better organized
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#7f8c8d';
        
        // Row 1: Movement controls
        this.ctx.fillText('Move: Arrow Keys / A,D / Mouse', this.canvas.width / 2, panelY + 115);
        
        // Row 2: Game controls
        this.ctx.fillText('SPACE: Fire Lasers | P: Pause | M: Menu | N: New Game', this.canvas.width / 2, panelY + 135);
        
        // Row 3: Start controls
        this.ctx.fillText('Start Game: SPACE or ENTER', this.canvas.width / 2, panelY + 155);
        
        // Draw active power-ups
        if (this.paddle.laserActive) {
            const timeLeft = Math.ceil((10000 - (Date.now() - this.paddle.laserTimer)) / 1000);
            this.ctx.fillStyle = '#00BCD4';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`⚡ Laser: ${timeLeft}s`, 20, panelY + 30);
            
            // Draw fire mode indicator
            if (this.paddle.autoFireActive) {
                this.ctx.fillStyle = '#E91E63';
                this.ctx.fillText(`🔥 Auto-Fire`, 20, panelY + 55);
            }
        }
        
        if (this.paddle.width !== 120) {
            const effect = this.paddle.width > 120 ? 'Expanded' : 'Shrunk';
            const color = this.paddle.width > 120 ? '#4CAF50' : '#9C27B0';
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`⬌ ${effect} Paddle`, this.canvas.width - 20, panelY + 30);
        }
        
        // Draw game speed indicator if modified
        if (this.gameSpeed !== 1.0) {
            const speedText = this.gameSpeed > 1.0 ? `Fast: ${this.gameSpeed.toFixed(1)}x` : `Slow: ${this.gameSpeed.toFixed(1)}x`;
            const speedColor = this.gameSpeed > 1.0 ? '#FF9800' : '#2196F3';
            this.ctx.fillStyle = speedColor;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(speedText, this.canvas.width / 2, panelY + 30);
        }
    }
    
    drawMenu() {
        // Draw background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.shadowColor = '#2196F3';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#2196F3';
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('A R K A N O I D', this.canvas.width / 2, 120);
        this.ctx.shadowBlur = 0;
        
        // Draw subtitle
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Breakout Game with Laser Cannons!', this.canvas.width / 2, 170);
        
        // Draw difficulty options
        const difficultyStartY = 220;
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('Select Difficulty', this.canvas.width / 2, difficultyStartY - 30);
        
        const difficulties = [
            { key: '1', name: 'Easy', desc: 'Slower ball, 5 lives, easier levels' },
            { key: '2', name: 'Medium', desc: 'Normal speed, 3 lives, standard levels' },
            { key: '3', name: 'Hard', desc: 'Faster ball, 2 lives, challenging levels' }
        ];
        
        const optionWidth = 200;
        const optionHeight = 100;
        const difficultySpacing = 50;
        
        difficulties.forEach((diff, index) => {
            const x = (this.canvas.width / 2) - (optionWidth * 1.5) - difficultySpacing + (index * (optionWidth + difficultySpacing));
            const y = difficultyStartY;
            const isSelected = this.difficulty === diff.name.toLowerCase();
            
            // Draw difficulty card
            this.ctx.fillStyle = isSelected ? 
                (diff.name === 'Easy' ? '#4CAF50' : diff.name === 'Medium' ? '#FF9800' : '#FF5252') : 
                '#2c3e50';
            this.ctx.fillRect(x, y, optionWidth, optionHeight);
            
            // Draw border
            this.ctx.strokeStyle = isSelected ? '#f1c40f' : '#34495e';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, optionWidth, optionHeight);
            
            // Draw difficulty name
            this.ctx.fillStyle = isSelected ? '#f1c40f' : '#ecf0f1';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`${diff.key}. ${diff.name}`, x + optionWidth/2, y + 30);
            
            // Draw description
            this.ctx.fillStyle = isSelected ? '#bdc3c7' : '#95a5a6';
            this.ctx.font = '12px Arial';
            
            // Wrap description
            const words = diff.desc.split(' ');
            let line = '';
            let lineHeight = 15;
            let lines = [];
            
            for (let word of words) {
                const testLine = line + word + ' ';
                const metrics = this.ctx.measureText(testLine);
                if (metrics.width > optionWidth - 20) {
                    lines.push(line);
                    line = word + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            
            lines.forEach((text, i) => {
                this.ctx.fillText(text, x + optionWidth/2, y + 55 + (i * lineHeight));
            });
            
            // Draw key hint
            this.ctx.fillStyle = isSelected ? 
                (diff.name === 'Easy' ? '#4CAF50' : diff.name === 'Medium' ? '#FF9800' : '#FF5252') : 
                '#3498db';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Press ${diff.key}`, x + optionWidth/2, y + 90);
        });
        
        // Draw power-up info
        const powerUpY = difficultyStartY + optionHeight + 80;
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText('New Feature: Laser Cannons!', this.canvas.width / 2, powerUpY - 30);
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#00BCD4';
        this.ctx.fillText('Collect ⚡ Laser power-up to enable SPACE bar firing', this.canvas.width / 2, powerUpY);
        this.ctx.fillStyle = '#E91E63';
        this.ctx.fillText('Collect 🔥 Auto-Fire for automatic laser shooting', this.canvas.width / 2, powerUpY + 25);
        
        // Draw start button
        const startButtonY = powerUpY + 70;
        
        // Draw button background
        const buttonGradient = this.ctx.createLinearGradient(
            this.canvas.width / 2 - 120, startButtonY - 25,
            this.canvas.width / 2 + 120, startButtonY + 25
        );
        buttonGradient.addColorStop(0, '#2196F3');
        buttonGradient.addColorStop(1, '#1976D2');
        this.ctx.fillStyle = buttonGradient;
        this.ctx.fillRect(this.canvas.width / 2 - 120, startButtonY - 25, 240, 50);
        
        // Draw button border
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.canvas.width / 2 - 120, startButtonY - 25, 240, 50);
        
        // Draw button text
        this.ctx.shadowColor = '#000';
        this.ctx.shadowBlur = 5;
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 26px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('START GAME', this.canvas.width / 2, startButtonY + 5);
        this.ctx.shadowBlur = 0;
        
        // Draw button click hint
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Click here or press SPACE/ENTER', this.canvas.width / 2, startButtonY + 60);
        
        // Draw instructions
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press SPACE or ENTER to Start', this.canvas.width / 2, this.canvas.height - 60);
        this.ctx.fillText('Or click on menu items', this.canvas.width / 2, this.canvas.height - 30);
        
        // Draw game instructions
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Use Arrow Keys, A/D, or Mouse to move the paddle', this.canvas.width / 2, 750);
        this.ctx.fillText('Break all bricks to advance to the next level', this.canvas.width / 2, 770);
        this.ctx.fillText('Collect ⚡ Laser power-up, then press SPACE to fire!', this.canvas.width / 2, 790);
        this.ctx.fillText('Collect 🔥 Auto-Fire for automatic laser shooting', this.canvas.width / 2, 810);
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        console.log('Canvas click at:', x, y, 'Game state:', this.gameState);
        
        if (this.gameState === 'menu') {
            // Calculate menu item positions
            const difficultyStartY = 220;
            const optionWidth = 200;
            const optionHeight = 100;
            const difficultySpacing = 50;
            
            // Check difficulty clicks
            const difficulties = [
                { key: '1', name: 'Easy', value: 'easy' },
                { key: '2', name: 'Medium', value: 'medium' },
                { key: '3', name: 'Hard', value: 'hard' }
            ];
            
            for (let i = 0; i < difficulties.length; i++) {
                const optionX = (this.canvas.width / 2) - (optionWidth * 1.5) - difficultySpacing + (i * (optionWidth + difficultySpacing));
                const optionY = difficultyStartY;
                
                if (x >= optionX && x <= optionX + optionWidth && 
                    y >= optionY && y <= optionY + optionHeight) {
                    console.log('Difficulty selected:', difficulties[i].value);
                    this.setDifficulty(difficulties[i].value);
                    this.draw();
                    return;
                }
            }
            
            // Check start button
            const startButtonY = difficultyStartY + optionHeight + 150; // Adjusted position
            if (x >= this.canvas.width / 2 - 120 && x <= this.canvas.width / 2 + 120 &&
                y >= startButtonY - 25 && y <= startButtonY + 25) {
                console.log('Start button clicked');
                this.startGame();
                return;
            }
            
            // Also check the click hint area
            if (x >= this.canvas.width / 2 - 120 && x <= this.canvas.width / 2 + 120 &&
                y >= startButtonY + 30 && y <= startButtonY + 90) {
                console.log('Start hint area clicked');
                this.startGame();
                return;
            }
        } else if (this.gameState === 'gameover' || this.gameState === 'levelcomplete') {
            // Check if click is in game area
            if (y < this.gameAreaHeight) {
                // Check for clicks on game over/level complete screens
                if (y > this.gameAreaHeight / 2 + 80 && y < this.gameAreaHeight / 2 + 120) {
                    this.startGame();
                } else if (y > this.gameAreaHeight / 2 + 110 && y < this.gameAreaHeight / 2 + 150) {
                    this.gameState = 'menu';
                    this.draw();
                }
            }
        }
    }
    
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        this.keys[key] = true;
        
        console.log('Key pressed:', key, 'Game state:', this.gameState);
        
        if (this.gameState === 'menu') {
            switch(key) {
                case '1':
                    this.setDifficulty('easy');
                    this.draw();
                    break;
                case '2':
                    this.setDifficulty('medium');
                    this.draw();
                    break;
                case '3':
                    this.setDifficulty('hard');
                    this.draw();
                    break;
                case ' ':
                case 'enter':
                    console.log('Starting game from menu with key:', key);
                    this.startGame();
                    e.preventDefault(); // Prevent default behavior
                    break;
            }
        } else if (this.gameState === 'playing') {
            switch(key) {
                case ' ':
                    // Space bar fires lasers when active
                    if (this.paddle.laserActive) {
                        this.fireLaser();
                    }
                    break;
                case 'p':
                    this.gameActive = !this.gameActive;
                    if (this.gameActive) {
                        this.lastUpdate = performance.now();
                        this.gameLoopId = requestAnimationFrame(this.gameLoop);
                    }
                    break;
                case 'm':
                    this.gameState = 'menu';
                    if (this.gameLoopId) {
                        cancelAnimationFrame(this.gameLoopId);
                        this.gameLoopId = null;
                    }
                    this.draw();
                    break;
                case 'n':
                    this.startGame();
                    break;
            }
        } else if (this.gameState === 'gameover' || this.gameState === 'levelcomplete') {
            switch(key) {
                case 'n':
                case ' ':
                    this.startGame();
                    break;
                case 'm':
                    this.gameState = 'menu';
                    this.draw();
                    break;
            }
        }
    }
    
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        delete this.keys[key];
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    }
}

app.registerExtension({
    name: "Comfy.ArkanoidNode",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ArkanoidNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                const canvas = document.createElement('canvas');
                canvas.id = 'arkanoidCanvas';
                canvas.style.border = '2px solid #555';
                canvas.style.borderRadius = '8px';
                canvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                canvas.style.cursor = 'pointer';
                
                const game = new ArkanoidGame(canvas);
                
                // Add event listeners
                canvas.addEventListener('click', game.handleCanvasClick);
                canvas.addEventListener('mousemove', game.handleMouseMove);
                
                const keyDownHandler = game.handleKeyDown;
                const keyUpHandler = game.handleKeyUp;
                document.addEventListener('keydown', keyDownHandler);
                document.addEventListener('keyup', keyUpHandler);
                
                // Initial draw
                game.draw();
                
                const widget = this.addDOMWidget("arkanoid_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                this.onRemoved = function() {
                    document.removeEventListener('keydown', keyDownHandler);
                    document.removeEventListener('keyup', keyUpHandler);
                    canvas.removeEventListener('click', game.handleCanvasClick);
                    canvas.removeEventListener('mousemove', game.handleMouseMove);
                    
                    // Clean up game loop
                    if (game.gameLoopId) {
                        cancelAnimationFrame(game.gameLoopId);
                        game.gameLoopId = null;
                    }
                };
                
                // Update node size to accommodate larger canvas
                this.setSize([game.canvas.width + 40, game.canvas.height + 40]);
                
                return result;
            };
        }
    }
});