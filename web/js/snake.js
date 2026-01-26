// snake.js
import { app } from "/scripts/app.js";

class SnakeGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Canvas size - increased to accommodate info panel below
        this.canvas.width = 800;
        this.canvas.height = 900; // Increased from 800 to 900
        
        // Game grid settings - will be modified by size mode
        this.gridSize = 20;
        this.cellSize = this.canvas.width / this.gridSize;
        
        // Size mode - 'original' or 'small'
        this.sizeMode = 'original';
        
        // Game state
        this.snake = [];
        this.food = { x: 0, y: 0 };
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.highScore = 0;
        this.gameSpeed = 150; // ms
        this.gameActive = false;
        this.gameState = 'menu'; // 'menu', 'playing', 'gameover'
        this.gameMode = 'classic'; // 'classic', 'walls', 'obstacles'
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.aiPlaying = false; // For watching AI play
        
        // Obstacles for walls mode
        this.obstacles = [];
        
        // Power-ups
        this.powerUps = {
            active: false,
            type: null,
            position: null,
            timer: 0,
            duration: 5000 // 5 seconds
        };
        
        // Game loop
        this.lastUpdate = 0;
        this.gameLoopId = null;
        
        // Sounds
        this.initSounds();
        
        // Load high score
        this.loadHighScore();
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    setSizeMode(mode) {
        this.sizeMode = mode;
        if (mode === 'small') {
            // Half the snake size, 4x more cubes
            this.gridSize = 40; // Double the grid size for 4x cubes (20x20 = 400, 40x40 = 1600)
            this.cellSize = this.canvas.width / this.gridSize; // Each cube is 1/4 the original size
        } else {
            this.gridSize = 20;
            this.cellSize = this.canvas.width / this.gridSize;
        }
        this.generateObstacles();
        if (this.gameActive) {
            this.generateFood();
        }
    }
    
    initSounds() {
        this.sounds = {
            eat: this.createBeep(300, 0.1, 0.2),
            powerup: this.createBeep(600, 0.2, 0.3),
            crash: this.createBeep(100, 0.3, 0.4),
            turn: this.createBeep(200, 0.05, 0.1),
            gameover: this.createBeep(150, 0.5, 0.5)
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
            const response = await fetch('/snake/highscore');
            if (response.ok) {
                const data = await response.json();
                this.highScore = data.score || 0;
            }
        } catch (e) {
            console.log('No snake high score found');
        }
    }
    
    async saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try {
                await fetch('/snake/highscore', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ score: this.highScore })
                });
            } catch (e) {
                console.log('Could not save snake high score', e);
            }
        }
    }
    
    resetGame() {
        // Reset snake (start in middle, length 3)
        this.snake = [
            { x: Math.floor(this.gridSize / 2), y: Math.floor(this.gridSize / 2) },
            { x: Math.floor(this.gridSize / 2) - 1, y: Math.floor(this.gridSize / 2) },
            { x: Math.floor(this.gridSize / 2) - 2, y: Math.floor(this.gridSize / 2) }
        ];
        
        // Reset direction
        this.direction = 'right';
        this.nextDirection = 'right';
        
        // Reset score
        this.score = 0;
        
        // Reset game state
        this.gameActive = true;
        
        // Reset power-ups
        this.powerUps.active = false;
        this.powerUps.type = null;
        this.powerUps.position = null;
        this.powerUps.timer = 0;
        
        // Generate first food
        this.generateFood();
        
        // Generate obstacles for walls mode
        this.generateObstacles();
        
        // Set game speed based on difficulty
        switch(this.difficulty) {
            case 'easy': this.gameSpeed = 200; break;
            case 'medium': this.gameSpeed = 150; break;
            case 'hard': this.gameSpeed = 100; break;
        }
        
        // Start game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        this.lastUpdate = performance.now();
        this.gameLoopId = requestAnimationFrame(this.gameLoop);
    }
    
    generateFood() {
        let newFood;
        let validPosition = false;
        
        while (!validPosition) {
            newFood = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
            
            // Check if position is not on snake
            validPosition = !this.snake.some(segment => 
                segment.x === newFood.x && segment.y === newFood.y
            );
            
            // Check if position is not on obstacle (for walls mode)
            if (this.gameMode !== 'classic' && validPosition) {
                validPosition = !this.obstacles.some(obstacle =>
                    obstacle.x === newFood.x && obstacle.y === newFood.y
                );
            }
        }
        
        this.food = newFood;
        
        // Randomly generate power-up (10% chance)
        if (!this.powerUps.active && Math.random() < 0.1) {
            this.generatePowerUp();
        }
    }
    
    generatePowerUp() {
        let newPowerUp;
        let validPosition = false;
        
        while (!validPosition) {
            newPowerUp = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
            
            // Check if position is not on snake, food, or obstacles
            validPosition = !this.snake.some(segment => 
                segment.x === newPowerUp.x && segment.y === newPowerUp.y
            ) && !(this.food.x === newPowerUp.x && this.food.y === newPowerUp.y);
            
            if (this.gameMode !== 'classic' && validPosition) {
                validPosition = !this.obstacles.some(obstacle =>
                    obstacle.x === newPowerUp.x && obstacle.y === newPowerUp.y
                );
            }
        }
        
        // Random power-up type
        const powerUpTypes = ['speed', 'slow', 'ghost', 'double'];
        this.powerUps.type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        this.powerUps.position = newPowerUp;
        this.powerUps.active = true;
        this.powerUps.timer = Date.now();
    }
    
    generateObstacles() {
        this.obstacles = [];
        
        if (this.gameMode === 'walls') {
            // Scale the number of obstacles based on grid size
            const borderSize = Math.floor(this.gridSize * 0.1); // 10% of grid
            
            for (let i = 0; i < this.gridSize; i++) {
                // Top and bottom walls
                for (let j = 0; j < borderSize; j++) {
                    this.obstacles.push({ x: i, y: j });
                    this.obstacles.push({ x: i, y: this.gridSize - 1 - j });
                }
                
                // Left and right walls
                if (i >= borderSize && i < this.gridSize - borderSize) {
                    for (let j = 0; j < borderSize; j++) {
                        this.obstacles.push({ x: j, y: i });
                        this.obstacles.push({ x: this.gridSize - 1 - j, y: i });
                    }
                }
            }
            
            // Add some internal walls (scale with grid size)
            const numInternalWalls = Math.floor(this.gridSize / 6);
            for (let i = 0; i < numInternalWalls; i++) {
                const wallX = Math.floor(Math.random() * (this.gridSize - 8)) + 4;
                const wallY = Math.floor(Math.random() * (this.gridSize - 8)) + 4;
                const length = Math.floor(Math.random() * Math.floor(this.gridSize / 8)) + 2;
                const horizontal = Math.random() > 0.5;
                
                for (let j = 0; j < length; j++) {
                    if (horizontal) {
                        this.obstacles.push({ x: wallX + j, y: wallY });
                    } else {
                        this.obstacles.push({ x: wallX, y: wallY + j });
                    }
                }
            }
        } else if (this.gameMode === 'obstacles') {
            // Generate random obstacles (scale with grid size)
            const numObstacles = Math.floor(this.gridSize * this.gridSize * 0.1);
            
            for (let i = 0; i < numObstacles; i++) {
                let obstacle;
                let validPosition = false;
                
                while (!validPosition) {
                    obstacle = {
                        x: Math.floor(Math.random() * this.gridSize),
                        y: Math.floor(Math.random() * this.gridSize)
                    };
                    
                    // Check if not on snake starting position (plus some buffer)
                    const startX = Math.floor(this.gridSize / 2);
                    const startY = Math.floor(this.gridSize / 2);
                    const buffer = Math.floor(this.gridSize * 0.1);
                    
                    validPosition = Math.abs(obstacle.x - startX) > buffer || 
                                    Math.abs(obstacle.y - startY) > buffer;
                }
                
                this.obstacles.push(obstacle);
            }
        }
    }
    
    update() {
        if (!this.gameActive) return;
        
        // Update direction
        this.direction = this.nextDirection;
        
        // Calculate new head position
        const head = { ...this.snake[0] };
        
        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }
        
        // Check wall collision (for classic mode)
        if (this.gameMode === 'classic') {
            if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
                this.gameOver();
                return;
            }
        } else {
            // For walls/obstacles mode, wrap around
            if (head.x < 0) head.x = this.gridSize - 1;
            if (head.x >= this.gridSize) head.x = 0;
            if (head.y < 0) head.y = this.gridSize - 1;
            if (head.y >= this.gridSize) head.y = 0;
        }
        
        // Check obstacle collision (for walls/obstacles mode)
        if (this.gameMode !== 'classic') {
            const obstacleCollision = this.obstacles.some(obstacle => 
                obstacle.x === head.x && obstacle.y === head.y
            );
            
            if (obstacleCollision && !this.powerUps.active) {
                this.gameOver();
                return;
            }
        }
        
        // Check self collision (unless ghost power-up is active)
        const selfCollision = this.snake.some((segment, index) => {
            if (index === 0) return false;
            return segment.x === head.x && segment.y === head.y;
        });
        
        if (selfCollision && (!this.powerUps.active || this.powerUps.type !== 'ghost')) {
            this.gameOver();
            return;
        }
        
        // Add new head
        this.snake.unshift(head);
        
        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += (this.powerUps.active && this.powerUps.type === 'double') ? 2 : 1;
            this.sounds.eat();
            this.generateFood();
        } else {
            // Remove tail if no food eaten
            this.snake.pop();
        }
        
        // Check power-up collision
        if (this.powerUps.active && this.powerUps.position &&
            head.x === this.powerUps.position.x && head.y === this.powerUps.position.y) {
            this.activatePowerUp();
        }
        
        // Update power-up timer
        if (this.powerUps.active && Date.now() - this.powerUps.timer > this.powerUps.duration) {
            this.deactivatePowerUp();
        }
        
        // AI movement (if watching AI play)
        if (this.aiPlaying) {
            this.makeAIMove();
        }
    }
    
    activatePowerUp() {
        this.sounds.powerup();
        
        switch(this.powerUps.type) {
            case 'speed':
                this.gameSpeed = Math.max(50, this.gameSpeed - 50);
                break;
            case 'slow':
                this.gameSpeed += 50;
                break;
            case 'ghost':
                // Ghost mode already handled in collision detection
                break;
            case 'double':
                // Double points already handled in food collision
                break;
        }
        
        this.powerUps.position = null;
    }
    
    deactivatePowerUp() {
        // Reset any power-up effects
        switch(this.powerUps.type) {
            case 'speed':
            case 'slow':
                // Reset to original game speed
                switch(this.difficulty) {
                    case 'easy': this.gameSpeed = 200; break;
                    case 'medium': this.gameSpeed = 150; break;
                    case 'hard': this.gameSpeed = 100; break;
                }
                break;
        }
        
        this.powerUps.active = false;
        this.powerUps.type = null;
        this.powerUps.position = null;
    }
    
    makeAIMove() {
        // Simple AI: move toward food, avoid walls and self
        const head = this.snake[0];
        const directions = ['up', 'down', 'left', 'right'];
        let bestDirection = this.direction;
        let bestScore = -Infinity;
        
        for (const dir of directions) {
            // Don't reverse direction
            if ((dir === 'up' && this.direction === 'down') ||
                (dir === 'down' && this.direction === 'up') ||
                (dir === 'left' && this.direction === 'right') ||
                (dir === 'right' && this.direction === 'left')) {
                continue;
            }
            
            // Calculate new position
            let newX = head.x;
            let newY = head.y;
            
            switch(dir) {
                case 'up': newY--; break;
                case 'down': newY++; break;
                case 'left': newX--; break;
                case 'right': newX++; break;
            }
            
            // Wrap around for walls mode
            if (this.gameMode !== 'classic') {
                if (newX < 0) newX = this.gridSize - 1;
                if (newX >= this.gridSize) newX = 0;
                if (newY < 0) newY = this.gridSize - 1;
                if (newY >= this.gridSize) newY = 0;
            }
            
            // Check if position is valid
            let score = 0;
            
            // Distance to food (closer is better)
            const foodDist = Math.abs(newX - this.food.x) + Math.abs(newY - this.food.y);
            score -= foodDist * 2;
            
            // Avoid walls (for classic mode)
            if (this.gameMode === 'classic') {
                if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
                    score -= 1000;
                }
            }
            
            // Avoid obstacles
            const obstacleCollision = this.obstacles.some(obstacle => 
                obstacle.x === newX && obstacle.y === newY
            );
            if (obstacleCollision) {
                score -= 1000;
            }
            
            // Avoid self (with some lookahead)
            for (let i = 0; i < Math.min(this.snake.length, 5); i++) {
                const segment = this.snake[i];
                if (segment.x === newX && segment.y === newY) {
                    score -= 500;
                    break;
                }
            }
            
            // Prefer moving into open spaces
            let openSpace = 0;
            const checkDirections = [
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
                { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
            ];
            
            for (const check of checkDirections) {
                const checkX = newX + check.dx;
                const checkY = newY + check.dy;
                let valid = true;
                
                // Check bounds
                if (this.gameMode === 'classic') {
                    if (checkX < 0 || checkX >= this.gridSize || checkY < 0 || checkY >= this.gridSize) {
                        valid = false;
                    }
                }
                
                // Check obstacles
                if (valid) {
                    valid = !this.obstacles.some(obstacle => 
                        obstacle.x === checkX && obstacle.y === checkY
                    );
                }
                
                // Check self
                if (valid) {
                    valid = !this.snake.some(segment => 
                        segment.x === checkX && segment.y === checkY
                    );
                }
                
                if (valid) openSpace++;
            }
            
            score += openSpace * 10;
            
            if (score > bestScore) {
                bestScore = score;
                bestDirection = dir;
            }
        }
        
        this.nextDirection = bestDirection;
    }
    
    gameOver() {
        this.gameActive = false;
        this.sounds.gameover();
        this.saveHighScore();
        
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    }
    
    gameLoop(timestamp) {
        const delta = timestamp - this.lastUpdate;
        
        if (delta > this.gameSpeed) {
            this.update();
            this.draw();
            this.lastUpdate = timestamp;
        }
        
        if (this.gameActive) {
            this.gameLoopId = requestAnimationFrame(this.gameLoop);
        }
    }
    
    draw() {
        this.clearCanvas();
        
        if (this.gameState === 'menu') {
            this.drawMenu();
        } else if (this.gameState === 'playing') {
            this.drawGame();
            this.drawInfoPanel();
        }
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGame() {
        const gameAreaHeight = 800; // Fixed game area height
        
        // Draw game background
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, gameAreaHeight);
        
        // Only draw grid in original mode
        if (this.sizeMode === 'original') {
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 0.5;
            
            for (let i = 0; i <= this.gridSize; i++) {
                // Vertical lines
                this.ctx.beginPath();
                this.ctx.moveTo(i * this.cellSize, 0);
                this.ctx.lineTo(i * this.cellSize, gameAreaHeight);
                this.ctx.stroke();
                
                // Horizontal lines
                this.ctx.beginPath();
                this.ctx.moveTo(0, i * this.cellSize);
                this.ctx.lineTo(this.canvas.width, i * this.cellSize);
                this.ctx.stroke();
            }
        }
        
        // Draw obstacles (for walls/obstacles mode)
        if (this.gameMode !== 'classic') {
            this.ctx.fillStyle = '#7f8c8d';
            for (const obstacle of this.obstacles) {
                const x = obstacle.x * this.cellSize;
                const y = obstacle.y * this.cellSize;
                this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
                
                // Add texture to obstacles (only in original mode)
                if (this.sizeMode === 'original') {
                    this.ctx.fillStyle = '#95a5a6';
                    this.ctx.fillRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6);
                    this.ctx.fillStyle = '#7f8c8d';
                }
            }
        }
        
        // Draw snake
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.cellSize;
            const y = segment.y * this.cellSize;
            
            // Head is brighter
            if (index === 0) {
                this.ctx.fillStyle = this.powerUps.active && this.powerUps.type === 'ghost' ? 
                    'rgba(46, 204, 113, 0.7)' : '#2ecc71';
                
                this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
                
                // Draw eyes (only in original mode)
                if (this.sizeMode === 'original') {
                    this.ctx.fillStyle = '#000';
                    const eyeSize = this.cellSize / 5;
                    
                    if (this.direction === 'right') {
                        this.ctx.fillRect(x + this.cellSize - eyeSize - 4, y + 6, eyeSize, eyeSize);
                        this.ctx.fillRect(x + this.cellSize - eyeSize - 4, y + this.cellSize - eyeSize - 6, eyeSize, eyeSize);
                    } else if (this.direction === 'left') {
                        this.ctx.fillRect(x + 4, y + 6, eyeSize, eyeSize);
                        this.ctx.fillRect(x + 4, y + this.cellSize - eyeSize - 6, eyeSize, eyeSize);
                    } else if (this.direction === 'up') {
                        this.ctx.fillRect(x + 6, y + 4, eyeSize, eyeSize);
                        this.ctx.fillRect(x + this.cellSize - eyeSize - 6, y + 4, eyeSize, eyeSize);
                    } else if (this.direction === 'down') {
                        this.ctx.fillRect(x + 6, y + this.cellSize - eyeSize - 4, eyeSize, eyeSize);
                        this.ctx.fillRect(x + this.cellSize - eyeSize - 6, y + this.cellSize - eyeSize - 4, eyeSize, eyeSize);
                    }
                }
            } else {
                // Body segments get slightly darker
                const darkness = Math.min(200, 150 + index * 5);
                this.ctx.fillStyle = this.powerUps.active && this.powerUps.type === 'ghost' ?
                    `rgba(39, 174, 96, ${0.5 + index * 0.02})` : 
                    `rgb(39, ${darkness}, 96)`;
                
                this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
            }
        });
        
        // Draw food
        const foodX = this.food.x * this.cellSize;
        const foodY = this.food.y * this.cellSize;
        
        // Draw food - simpler in small mode
        if (this.sizeMode === 'original') {
            // Draw apple-like food
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.ellipse(
                foodX + this.cellSize / 2,
                foodY + this.cellSize / 2,
                this.cellSize / 2 - 4,
                this.cellSize / 2 - 4,
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
            
            // Draw stem
            this.ctx.fillStyle = '#27ae60';
            this.ctx.fillRect(foodX + this.cellSize / 2 - 1, foodY + 2, 2, 6);
        } else {
            // Simple square food for small mode
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.fillRect(foodX + 2, foodY + 2, this.cellSize - 4, this.cellSize - 4);
        }
        
        // Draw power-up
        if (this.powerUps.active && this.powerUps.position) {
            const powerX = this.powerUps.position.x * this.cellSize;
            const powerY = this.powerUps.position.y * this.cellSize;
            
            // Different colors for different power-ups
            switch(this.powerUps.type) {
                case 'speed':
                    this.ctx.fillStyle = '#f1c40f';
                    break;
                case 'slow':
                    this.ctx.fillStyle = '#3498db';
                    break;
                case 'ghost':
                    this.ctx.fillStyle = '#9b59b6';
                    break;
                case 'double':
                    this.ctx.fillStyle = '#e67e22';
                    break;
            }
            
            // Draw pulsing effect
            const pulse = Math.sin(Date.now() / 200) * 2 + 4;
            if (this.sizeMode === 'original') {
                this.ctx.beginPath();
                this.ctx.arc(
                    powerX + this.cellSize / 2,
                    powerY + this.cellSize / 2,
                    this.cellSize / 2 - pulse,
                    0, Math.PI * 2
                );
                this.ctx.fill();
            } else {
                // Simple square for small mode
                this.ctx.fillRect(powerX + 2, powerY + 2, this.cellSize - 4, this.cellSize - 4);
            }
        }
        
        // Draw pause indicator if game is paused
        if (!this.gameActive && this.gameState === 'playing') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, gameAreaHeight);
            
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, gameAreaHeight / 2 - 20);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Press P to resume', this.canvas.width / 2, gameAreaHeight / 2 + 20);
        }
        
        // Draw game over
        if (!this.gameActive && this.gameState === 'gameover') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, gameAreaHeight);
            
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, gameAreaHeight / 2 - 30);
            
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, gameAreaHeight / 2);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Press N for new game', this.canvas.width / 2, gameAreaHeight / 2 + 40);
            this.ctx.fillText('Press M for menu', this.canvas.width / 2, gameAreaHeight / 2 + 70);
        }
    }
    
    drawInfoPanel() {
        const panelY = 800; // Start panel at bottom of game area
        const panelHeight = 100;
        
        // Draw panel background
        this.ctx.fillStyle = 'rgba(44, 62, 80, 0.95)';
        this.ctx.fillRect(0, panelY, this.canvas.width, panelHeight);
        
        // Draw panel border
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, panelY, this.canvas.width, panelHeight);
        
        // Draw scores
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        
        // Current score
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 4, panelY + 35);
        
        // High score
        this.ctx.fillText(`High: ${this.highScore}`, this.canvas.width * 3 / 4, panelY + 35);
        
        // Size mode indicator
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = this.sizeMode === 'small' ? '#f1c40f' : '#bdc3c7';
        this.ctx.fillText(`Mode: ${this.sizeMode === 'small' ? 'Small (4x Cubes)' : 'Original'}`, this.canvas.width / 2, panelY + 35);
        
        // Game info
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#bdc3c7';
        
        let modeText = '';
        switch(this.gameMode) {
            case 'classic': modeText = 'Classic'; break;
            case 'walls': modeText = 'Walls'; break;
            case 'obstacles': modeText = 'Obstacles'; break;
        }
        
        this.ctx.fillText(`Game: ${modeText}`, this.canvas.width / 4, panelY + 65);
        this.ctx.fillText(`Difficulty: ${this.difficulty}`, this.canvas.width * 3 / 4, panelY + 65);
        
        // Draw controls hint
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.fillText('Arrow Keys/WASD to move | P: Pause | M: Menu', this.canvas.width / 2, panelY + 85);
        this.ctx.fillText('S: Small Mode | O: Original Mode | N: New Game', this.canvas.width / 2, panelY + 95);
        
        // Draw active power-up
        if (this.powerUps.active) {
            const timeLeft = Math.ceil((this.powerUps.duration - (Date.now() - this.powerUps.timer)) / 1000);
            
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'left';
            
            let powerUpText = '';
            switch(this.powerUps.type) {
                case 'speed': powerUpText = 'Speed Boost'; break;
                case 'slow': powerUpText = 'Slow Down'; break;
                case 'ghost': powerUpText = 'Ghost Mode'; break;
                case 'double': powerUpText = 'Double Points'; break;
            }
            
            this.ctx.fillText(`${powerUpText}: ${timeLeft}s`, 20, panelY + 25);
        }
    }
    
    drawMenu() {
        // Draw background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title with snake effect
        this.ctx.shadowColor = '#2ecc71';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('S N A K E', this.canvas.width / 2, 100);
        this.ctx.shadowBlur = 0;
        
        // Draw subtitle
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Select Game Mode', this.canvas.width / 2, 160);
        
        // Draw game mode options
        const modes = [
            { key: '1', name: 'Classic', desc: 'No walls, game ends on boundary' },
            { key: '2', name: 'Walls', desc: 'Bounce off walls, avoid obstacles' },
            { key: '3', name: 'Obstacles', desc: 'Open field with random obstacles' }
        ];
        
        const modeStartY = 200;
        const optionWidth = 200;
        const optionHeight = 100;
        const modeSpacing = 50;
        
        modes.forEach((mode, index) => {
            const x = (this.canvas.width / 2) - (optionWidth * 1.5) - modeSpacing + (index * (optionWidth + modeSpacing));
            const y = modeStartY;
            const isSelected = this.gameMode === mode.name.toLowerCase();
            
            // Draw mode card
            this.ctx.fillStyle = isSelected ? '#3498db' : '#2c3e50';
            this.ctx.fillRect(x, y, optionWidth, optionHeight);
            
            // Draw border
            this.ctx.strokeStyle = isSelected ? '#f1c40f' : '#34495e';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, optionWidth, optionHeight);
            
            // Draw mode name
            this.ctx.fillStyle = isSelected ? '#f1c40f' : '#ecf0f1';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`${mode.key}. ${mode.name}`, x + optionWidth/2, y + 30);
            
            // Draw description
            this.ctx.fillStyle = isSelected ? '#bdc3c7' : '#95a5a6';
            this.ctx.font = '12px Arial';
            
            // Wrap description
            const words = mode.desc.split(' ');
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
            this.ctx.fillStyle = '#3498db';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Press ${mode.key}`, x + optionWidth/2, y + 90);
        });
        
        // Draw difficulty options
        const difficultyStartY = modeStartY + optionHeight + 80;
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('Select Difficulty', this.canvas.width / 2, difficultyStartY - 30);
        
        const difficulties = [
            { key: '4', name: 'Easy', desc: 'Slow speed, more time to react' },
            { key: '5', name: 'Medium', desc: 'Balanced speed and challenge' },
            { key: '6', name: 'Hard', desc: 'Fast speed, quick reflexes needed' }
        ];
        
        difficulties.forEach((diff, index) => {
            const x = (this.canvas.width / 2) - (optionWidth * 1.5) - modeSpacing + (index * (optionWidth + modeSpacing));
            const y = difficultyStartY;
            const isSelected = this.difficulty === diff.name.toLowerCase();
            
            // Draw difficulty card
            this.ctx.fillStyle = isSelected ? '#e74c3c' : '#2c3e50';
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
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Press ${diff.key}`, x + optionWidth/2, y + 90);
        });
        
        // Draw size mode options
        const sizeModeY = difficultyStartY + optionHeight + 80;
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('Select Snake Size', this.canvas.width / 2, sizeModeY - 30);
        
        const sizeModes = [
            { key: 'o', name: 'Original', desc: 'Standard snake size (20x20 grid)' },
            { key: 's', name: 'Small', desc: 'Half size snake, 4x more cubes (40x40 grid)' }
        ];
        
        sizeModes.forEach((size, index) => {
            const x = (this.canvas.width / 2) - optionWidth - 25 + (index * (optionWidth + 50));
            const y = sizeModeY;
            const isSelected = (size.key === 'o' && this.sizeMode === 'original') || 
                              (size.key === 's' && this.sizeMode === 'small');
            
            // Draw size mode card
            this.ctx.fillStyle = isSelected ? '#9b59b6' : '#2c3e50';
            this.ctx.fillRect(x, y, optionWidth, optionHeight);
            
            // Draw border
            this.ctx.strokeStyle = isSelected ? '#f1c40f' : '#34495e';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, optionWidth, optionHeight);
            
            // Draw size mode name
            this.ctx.fillStyle = isSelected ? '#f1c40f' : '#ecf0f1';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`${size.key.toUpperCase()}. ${size.name}`, x + optionWidth/2, y + 30);
            
            // Draw description
            this.ctx.fillStyle = isSelected ? '#bdc3c7' : '#95a5a6';
            this.ctx.font = '12px Arial';
            
            // Wrap description
            const words = size.desc.split(' ');
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
            this.ctx.fillStyle = '#9b59b6';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Press ${size.key.toUpperCase()}`, x + optionWidth/2, y + 90);
        });
        
        // Draw AI toggle
        const aiY = sizeModeY + optionHeight + 60;
        this.ctx.fillStyle = this.aiPlaying ? '#2ecc71' : '#2c3e50';
        this.ctx.fillRect(this.canvas.width / 2 - 100, aiY, 200, 50);
        
        this.ctx.strokeStyle = this.aiPlaying ? '#f1c40f' : '#34495e';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.canvas.width / 2 - 100, aiY, 200, 50);
        
        this.ctx.fillStyle = this.aiPlaying ? '#f1c40f' : '#ecf0f1';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('7. Watch AI Play', this.canvas.width / 2, aiY + 30);
        
        // Draw start button
        const startButtonY = aiY + 80;
        
        // Draw button background
        const buttonGradient = this.ctx.createLinearGradient(
            this.canvas.width / 2 - 120, startButtonY - 25,
            this.canvas.width / 2 + 120, startButtonY + 25
        );
        buttonGradient.addColorStop(0, '#27ae60');
        buttonGradient.addColorStop(1, '#2ecc71');
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
        this.ctx.fillText('START GAME', this.canvas.width / 2, startButtonY + 5);
        this.ctx.shadowBlur = 0;
        
        // Draw instructions
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press ENTER or SPACE to Start', this.canvas.width / 2, this.canvas.height - 60);
        this.ctx.fillText('Or click on menu items', this.canvas.width / 2, this.canvas.height - 30);
        
        // Draw game instructions
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Use Arrow Keys or WASD to control the snake', this.canvas.width / 2, 700);
        this.ctx.fillText('Eat food (red) to grow and score points', this.canvas.width / 2, 720);
        this.ctx.fillText('Collect power-ups (glowing) for special abilities', this.canvas.width / 2, 740);
        this.ctx.fillText('Press S for Small mode (4x more cubes) | O for Original', this.canvas.width / 2, 760);
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        if (this.gameState === 'menu') {
            // Calculate menu item positions
            const modeStartY = 200;
            const optionWidth = 200;
            const optionHeight = 100;
            const modeSpacing = 50;
            
            // Check game mode clicks
            const modes = [
                { key: '1', name: 'Classic', value: 'classic' },
                { key: '2', name: 'Walls', value: 'walls' },
                { key: '3', name: 'Obstacles', value: 'obstacles' }
            ];
            
            for (let i = 0; i < modes.length; i++) {
                const optionX = (this.canvas.width / 2) - (optionWidth * 1.5) - modeSpacing + (i * (optionWidth + modeSpacing));
                const optionY = modeStartY;
                
                if (x >= optionX && x <= optionX + optionWidth && 
                    y >= optionY && y <= optionY + optionHeight) {
                    this.gameMode = modes[i].value;
                    this.draw();
                    return;
                }
            }
            
            // Check difficulty clicks
            const difficultyStartY = modeStartY + optionHeight + 80;
            const difficulties = [
                { key: '4', name: 'Easy', value: 'easy' },
                { key: '5', name: 'Medium', value: 'medium' },
                { key: '6', name: 'Hard', value: 'hard' }
            ];
            
            for (let i = 0; i < difficulties.length; i++) {
                const optionX = (this.canvas.width / 2) - (optionWidth * 1.5) - modeSpacing + (i * (optionWidth + modeSpacing));
                const optionY = difficultyStartY;
                
                if (x >= optionX && x <= optionX + optionWidth && 
                    y >= optionY && y <= optionY + optionHeight) {
                    this.difficulty = difficulties[i].value;
                    this.draw();
                    return;
                }
            }
            
            // Check size mode clicks
            const sizeModeY = difficultyStartY + optionHeight + 80;
            const sizeModes = [
                { key: 'o', name: 'Original', value: 'original' },
                { key: 's', name: 'Small', value: 'small' }
            ];
            
            for (let i = 0; i < sizeModes.length; i++) {
                const optionX = (this.canvas.width / 2) - optionWidth - 25 + (i * (optionWidth + 50));
                const optionY = sizeModeY;
                
                if (x >= optionX && x <= optionX + optionWidth && 
                    y >= optionY && y <= optionY + optionHeight) {
                    this.setSizeMode(sizeModes[i].value);
                    this.draw();
                    return;
                }
            }
            
            // Check AI toggle
            const aiY = sizeModeY + optionHeight + 60;
            if (x >= this.canvas.width / 2 - 100 && x <= this.canvas.width / 2 + 100 &&
                y >= aiY && y <= aiY + 50) {
                this.aiPlaying = !this.aiPlaying;
                this.draw();
                return;
            }
            
            // Check start button
            const startButtonY = aiY + 80;
            if (x >= this.canvas.width / 2 - 120 && x <= this.canvas.width / 2 + 120 &&
                y >= startButtonY - 25 && y <= startButtonY + 25) {
                this.startGame();
            }
        } else if (this.gameState === 'playing') {
            // Check for clicks in the info panel (for game over screen)
            if (y > 800) {
                // Game over screen is drawn in drawGame, not in info panel
                return;
            }
            
            // If game is not active (paused or game over), check for clicks
            if (!this.gameActive) {
                const gameAreaHeight = 800;
                
                // Check if click is in game area
                if (y < gameAreaHeight) {
                    // Center coordinates for buttons in game over screen
                    const centerX = this.canvas.width / 2;
                    
                    // Check new game button (N) - coordinates from drawGame
                    if (y > gameAreaHeight / 2 + 20 && y < gameAreaHeight / 2 + 60) {
                        this.startGame();
                    }
                    // Check menu button (M)
                    else if (y > gameAreaHeight / 2 + 50 && y < gameAreaHeight / 2 + 90) {
                        this.gameState = 'menu';
                        this.draw();
                    }
                }
            }
        }
    }
    
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        
        if (this.gameState === 'menu') {
            switch(key) {
                case '1':
                    this.gameMode = 'classic';
                    this.draw();
                    break;
                case '2':
                    this.gameMode = 'walls';
                    this.draw();
                    break;
                case '3':
                    this.gameMode = 'obstacles';
                    this.draw();
                    break;
                case '4':
                    this.difficulty = 'easy';
                    this.draw();
                    break;
                case '5':
                    this.difficulty = 'medium';
                    this.draw();
                    break;
                case '6':
                    this.difficulty = 'hard';
                    this.draw();
                    break;
                case 's':
                    this.setSizeMode('small');
                    this.draw();
                    break;
                case 'o':
                    this.setSizeMode('original');
                    this.draw();
                    break;
                case '7':
                    this.aiPlaying = !this.aiPlaying;
                    this.draw();
                    break;
                case 'enter':
                case ' ':
                    this.startGame();
                    break;
            }
        } else if (this.gameState === 'playing') {
            switch(key) {
                case 'arrowup':
                case 'w':
                    if (this.direction !== 'down') this.nextDirection = 'up';
                    this.sounds.turn();
                    break;
                case 'arrowdown':
                case 's':
                    if (this.direction !== 'up') this.nextDirection = 'down';
                    this.sounds.turn();
                    break;
                case 'arrowleft':
                case 'a':
                    if (this.direction !== 'right') this.nextDirection = 'left';
                    this.sounds.turn();
                    break;
                case 'arrowright':
                case 'd':
                    if (this.direction !== 'left') this.nextDirection = 'right';
                    this.sounds.turn();
                    break;
                case 'p':
                    if (this.gameActive) {
                        this.gameActive = false;
                        this.draw(); // Redraw to show pause screen
                    } else {
                        this.gameActive = true;
                        this.lastUpdate = performance.now();
                        this.gameLoopId = requestAnimationFrame(this.gameLoop);
                        this.draw(); // Redraw to hide pause screen
                    }
                    break;
                case 'n':
                    this.startGame();
                    break;
                case 'm':
                    this.gameState = 'menu';
                    if (this.gameLoopId) {
                        cancelAnimationFrame(this.gameLoopId);
                        this.gameLoopId = null;
                    }
                    this.draw();
                    break;
                case 's':
                    this.setSizeMode('small');
                    this.draw();
                    break;
                case 'o':
                    this.setSizeMode('original');
                    this.draw();
                    break;
            }
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.resetGame();
        this.draw();
    }
}

app.registerExtension({
    name: "Comfy.SnakeNode",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "SnakeNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                const canvas = document.createElement('canvas');
                canvas.style.border = '2px solid #555';
                canvas.style.borderRadius = '8px';
                canvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                
                const game = new SnakeGame(canvas);
                
                // Add click listener
                canvas.addEventListener('click', game.handleCanvasClick);
                
                // Add keyboard listener
                const keyHandler = game.handleKeyDown;
                document.addEventListener('keydown', keyHandler);
                
                // Initial draw
                game.draw();
                
                const widget = this.addDOMWidget("snake_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                this.onRemoved = function() {
                    document.removeEventListener('keydown', keyHandler);
                    canvas.removeEventListener('click', game.handleCanvasClick);
                    
                    // Clean up game loop
                    if (game.gameLoopId) {
                        cancelAnimationFrame(game.gameLoopId);
                    }
                };
                
                this.setSize([game.canvas.width + 40, game.canvas.height + 40]);
                
                return result;
            };
        }
    }
});