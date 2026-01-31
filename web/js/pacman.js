// pacman.js
import { app } from "/scripts/app.js";

class PacManGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Canvas size with score panel
        this.canvas.width = 800;
        this.canvas.height = 1000;
        
        // Game area dimensions
        this.gameAreaHeight = 800;
        this.scorePanelHeight = 200;
        this.scorePanelY = this.gameAreaHeight;
        
        // Game state
        this.gameActive = false;
        this.gameState = 'menu'; // 'menu', 'playing', 'gameover', 'levelcomplete'
        this.score = 0;
        this.highScore = 0;
        this.level = 1;
        this.highLevel = 1;
        this.lives = 3;
        this.dots = [];
        this.powerPellets = [];
        this.fruit = null;
        
        // Characters
        this.pacman = {
            x: 0,
            y: 0,
            radius: 15,
            speed: 3,
            direction: 'right',
            nextDirection: 'right',
            mouthAngle: 0,
            mouthOpening: 0.2,
            color: '#FFD700',
            isPowered: false,
            poweredTimer: 0
        };
        
        this.ghosts = [
            { // Blinky - Red
                x: 0, y: 0,
                radius: 14,
                speed: 2.5,
                direction: 'left',
                color: '#FF0000',
                scared: false,
                eyeColor: '#FFFFFF',
                pupilColor: '#0000FF',
                mode: 'chase',
                targetX: 0,
                targetY: 0,
                name: 'Blinky'
            },
            { // Pinky - Pink
                x: 0, y: 0,
                radius: 14,
                speed: 2.3,
                direction: 'up',
                color: '#FFB8FF',
                scared: false,
                eyeColor: '#FFFFFF',
                pupilColor: '#0000FF',
                mode: 'scatter',
                targetX: 0,
                targetY: 0,
                name: 'Pinky'
            },
            { // Inky - Cyan
                x: 0, y: 0,
                radius: 14,
                speed: 2.4,
                direction: 'right',
                color: '#00FFFF',
                scared: false,
                eyeColor: '#FFFFFF',
                pupilColor: '#0000FF',
                mode: 'chase',
                targetX: 0,
                targetY: 0,
                name: 'Inky'
            },
            { // Clyde - Orange
                x: 0, y: 0,
                radius: 14,
                speed: 2.2,
                direction: 'down',
                color: '#FFB852',
                scared: false,
                eyeColor: '#FFFFFF',
                pupilColor: '#0000FF',
                mode: 'scatter',
                targetX: 0,
                targetY: 0,
                name: 'Clyde'
            }
        ];
        
        // Maze layout (1 = wall, 0 = path, 2 = dot, 3 = power pellet, 4 = ghost house)
        this.maze = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,2,1],
            [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,3,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,2,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1],
            [1,2,2,2,2,1,2,2,2,1,1,2,2,2,1,2,2,2,2,1],
            [1,1,1,1,2,1,1,1,0,1,1,0,1,1,1,2,1,1,1,1],
            [0,0,0,1,2,1,0,0,0,4,4,0,0,0,1,2,1,0,0,0],
            [1,1,1,1,2,1,0,1,1,1,1,1,1,0,1,2,1,1,1,1],
            [0,0,0,0,2,0,0,1,0,0,0,0,1,0,0,2,0,0,0,0],
            [1,1,1,1,2,1,0,1,1,1,1,1,1,0,1,2,1,1,1,1],
            [0,0,0,1,2,1,0,0,0,0,0,0,0,0,1,2,1,0,0,0],
            [1,1,1,1,2,1,0,1,1,1,1,1,1,0,1,2,1,1,1,1],
            [1,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
            [1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1],
            [1,3,2,1,2,2,2,2,2,2,2,2,2,2,2,2,1,2,3,1],
            [1,1,2,1,2,1,2,1,1,1,1,1,1,2,1,2,1,2,1,1],
            [1,2,2,2,2,1,2,2,2,1,1,2,2,2,1,2,2,2,2,1],
            [1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1],
            [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        
        // Cell dimensions
        this.cellSize = 36;
        this.mazeWidth = this.maze[0].length;
        this.mazeHeight = this.maze.length;
        
        // Ghost modes timing
        this.modeTimer = 0;
        this.modeSequence = [
            { mode: 'scatter', duration: 7000 },
            { mode: 'chase', duration: 20000 },
            { mode: 'scatter', duration: 7000 },
            { mode: 'chase', duration: 20000 },
            { mode: 'scatter', duration: 5000 },
            { mode: 'chase', duration: 20000 },
            { mode: 'scatter', duration: 5000 },
            { mode: 'chase', duration: 999999 } // Infinite chase
        ];
        this.currentModeIndex = 0;
        
        // Game settings
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.remainingDots = 0;
        this.fruitTimer = 0;
        this.fruitScore = 0;
        this.fruitTypes = [
            { name: 'Cherry', score: 100, color: '#FF0000' },
            { name: 'Strawberry', score: 300, color: '#FF1493' },
            { name: 'Orange', score: 500, color: '#FFA500' },
            { name: 'Apple', score: 700, color: '#32CD32' },
            { name: 'Melon', score: 1000, color: '#00FF00' }
        ];
        
        // Game loop
        this.lastUpdate = 0;
        this.gameLoopId = null;
        
        // Input
        this.keys = {};
        
        // Sounds
        this.initSounds();
        
        // Load high score
        this.loadHighScore();
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        
        // Initialize game
        this.init();
        
        // Start the game loop for menu
        this.draw();
    }
    
    init() {
        // Reset game state
        this.dots = [];
        this.powerPellets = [];
        this.fruit = null;
        this.remainingDots = 0;
        this.fruitTimer = 0;
        this.fruitScore = 0;
        this.modeTimer = 0;
        this.currentModeIndex = 0;
        
        // Initialize dots and power pellets from maze
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                const cell = this.maze[y][x];
                const screenX = x * this.cellSize + this.cellSize / 2;
                const screenY = y * this.cellSize + this.cellSize / 2;
                
                if (cell === 2) {
                    this.dots.push({
                        x: screenX,
                        y: screenY,
                        radius: 4,
                        color: '#FFD700',
                        collected: false
                    });
                    this.remainingDots++;
                } else if (cell === 3) {
                    this.powerPellets.push({
                        x: screenX,
                        y: screenY,
                        radius: 8,
                        color: '#FFD700',
                        collected: false,
                        pulse: 0
                    });
                }
            }
        }
        
        // Set initial positions
        this.resetPositions();
        
        // Set difficulty
        this.setDifficulty(this.difficulty);
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        switch(difficulty) {
            case 'easy':
                this.pacman.speed = 3.5;
                this.ghosts.forEach(ghost => ghost.speed = 2.0);
                this.lives = 5;
                break;
            case 'medium':
                this.pacman.speed = 3.0;
                this.ghosts.forEach(ghost => ghost.speed = 2.5);
                this.lives = 3;
                break;
            case 'hard':
                this.pacman.speed = 2.5;
                this.ghosts.forEach(ghost => ghost.speed = 3.0);
                this.lives = 2;
                break;
        }
    }
    
    initSounds() {
        this.sounds = {
            eatDot: this.createBeep(440, 0.1, 0.1),
            eatPowerPellet: this.createBeep(880, 0.2, 0.2),
            eatGhost: this.createBeep(1760, 0.3, 0.3),
            eatFruit: this.createBeep(660, 0.3, 0.2),
            death: this.createBeep(110, 0.8, 0.5),
            levelComplete: this.createBeep(1320, 0.4, 0.3),
            gameStart: this.createBeep(660, 0.5, 0.3)
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
            const response = await fetch('/pacman/highscore');
            if (response.ok) {
                const data = await response.json();
                this.highScore = data.score || 0;
                this.highLevel = data.level || 1;
            }
        } catch (e) {
            console.log('No pacman high score found');
        }
    }
    
    async saveHighScore() {
        if (this.score > this.highScore || (this.score === this.highScore && this.level > this.highLevel)) {
            this.highScore = this.score;
            this.highLevel = this.level;
            try {
                await fetch('/pacman/highscore', {
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
                console.log('Could not save pacman high score', e);
            }
        }
    }
    
    resetPositions() {
        // Reset Pac-Man position
        this.pacman.x = 9 * this.cellSize + this.cellSize / 2;
        this.pacman.y = 15 * this.cellSize + this.cellSize / 2;
        this.pacman.direction = 'right';
        this.pacman.nextDirection = 'right';
        this.pacman.isPowered = false;
        this.pacman.poweredTimer = 0;
        
        // Reset ghosts
        const ghostPositions = [
            { x: 9, y: 9 }, // Blinky - top left of ghost house
            { x: 8, y: 9 }, // Pinky
            { x: 9, y: 10 }, // Inky
            { x: 10, y: 9 }  // Clyde
        ];
        
        this.ghosts.forEach((ghost, index) => {
            ghost.x = ghostPositions[index].x * this.cellSize + this.cellSize / 2;
            ghost.y = ghostPositions[index].y * this.cellSize + this.cellSize / 2;
            ghost.scared = false;
            ghost.mode = index < 2 ? 'chase' : 'scatter';
        });
        
        // Reset fruit
        this.fruit = null;
        this.fruitTimer = 0;
        this.fruitScore = 0;
    }
    
    getCell(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        
        if (cellX < 0 || cellX >= this.mazeWidth || cellY < 0 || cellY >= this.mazeHeight) {
            return 1; // Treat out of bounds as wall
        }
        
        return this.maze[cellY][cellX];
    }
    
    canMove(x, y, direction) {
        let newX = x;
        let newY = y;
        
        switch(direction) {
            case 'left':
                newX -= this.cellSize / 2;
                break;
            case 'right':
                newX += this.cellSize / 2;
                break;
            case 'up':
                newY -= this.cellSize / 2;
                break;
            case 'down':
                newY += this.cellSize / 2;
                break;
        }
        
        const cell = this.getCell(newX, newY);
        
        // Tunnel warp
        if (newX < 0) newX = this.canvas.width;
        if (newX > this.canvas.width) newX = 0;
        
        return cell !== 1 && cell !== undefined;
    }
    
    update() {
        if (!this.gameActive) return;
        
        // Update Pac-Man
        this.updatePacman();
        
        // Update ghosts
        this.updateGhosts();
        
        // Update ghost modes
        this.updateGhostModes();
        
        // Update power pellet effect
        this.updatePowerEffect();
        
        // Update fruit
        this.updateFruit();
        
        // Check collisions
        this.checkCollisions();
        
        // Check level completion
        if (this.remainingDots === 0) {
            this.levelComplete();
        }
    }
    
    updatePacman() {
        // Update mouth animation
        this.pacman.mouthAngle += this.pacman.mouthOpening;
        if (this.pacman.mouthAngle > 0.6 || this.pacman.mouthAngle < 0) {
            this.pacman.mouthOpening = -this.pacman.mouthOpening;
        }
        
        // Try to change direction if next direction is valid
        if (this.pacman.nextDirection !== this.pacman.direction) {
            if (this.canMove(this.pacman.x, this.pacman.y, this.pacman.nextDirection)) {
                this.pacman.direction = this.pacman.nextDirection;
            }
        }
        
        // Move Pac-Man if direction is valid
        if (this.canMove(this.pacman.x, this.pacman.y, this.pacman.direction)) {
            switch(this.pacman.direction) {
                case 'left':
                    this.pacman.x -= this.pacman.speed;
                    break;
                case 'right':
                    this.pacman.x += this.pacman.speed;
                    break;
                case 'up':
                    this.pacman.y -= this.pacman.speed;
                    break;
                case 'down':
                    this.pacman.y += this.pacman.speed;
                    break;
            }
        }
        
        // Tunnel warp
        if (this.pacman.x < -this.pacman.radius) {
            this.pacman.x = this.canvas.width + this.pacman.radius;
        } else if (this.pacman.x > this.canvas.width + this.pacman.radius) {
            this.pacman.x = -this.pacman.radius;
        }
        
        // Collect dots
        for (const dot of this.dots) {
            if (!dot.collected) {
                const dx = this.pacman.x - dot.x;
                const dy = this.pacman.y - dot.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.pacman.radius + dot.radius) {
                    dot.collected = true;
                    this.remainingDots--;
                    this.score += 10;
                    this.sounds.eatDot();
                    
                    // Chance to spawn fruit
                    if (this.remainingDots === 170 || this.remainingDots === 70) {
                        this.spawnFruit();
                    }
                }
            }
        }
        
        // Collect power pellets
        for (const pellet of this.powerPellets) {
            if (!pellet.collected) {
                const dx = this.pacman.x - pellet.x;
                const dy = this.pacman.y - pellet.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.pacman.radius + pellet.radius) {
                    pellet.collected = true;
                    this.score += 50;
                    this.pacman.isPowered = true;
                    this.pacman.poweredTimer = Date.now();
                    this.ghosts.forEach(ghost => ghost.scared = true);
                    this.sounds.eatPowerPellet();
                }
            }
        }
        
        // Collect fruit
        if (this.fruit) {
            const dx = this.pacman.x - this.fruit.x;
            const dy = this.pacman.y - this.fruit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.pacman.radius + this.fruit.radius) {
                this.score += this.fruit.score;
                this.fruitScore = this.fruit.score;
                this.fruit = null;
                this.sounds.eatFruit();
            }
        }
    }
    
    updateGhosts() {
        this.ghosts.forEach(ghost => {
            // Update scared state
            if (ghost.scared && Date.now() - this.pacman.poweredTimer > 10000) {
                ghost.scared = false;
            }
            
            // Set target based on mode
            switch(ghost.mode) {
                case 'chase':
                    switch(ghost.name) {
                        case 'Blinky': // Directly chase Pac-Man
                            ghost.targetX = this.pacman.x;
                            ghost.targetY = this.pacman.y;
                            break;
                        case 'Pinky': // Target 4 cells ahead of Pac-Man
                            let aheadX = this.pacman.x;
                            let aheadY = this.pacman.y;
                            for (let i = 0; i < 4; i++) {
                                switch(this.pacman.direction) {
                                    case 'left': aheadX -= this.cellSize; break;
                                    case 'right': aheadX += this.cellSize; break;
                                    case 'up': aheadY -= this.cellSize; break;
                                    case 'down': aheadY += this.cellSize; break;
                                }
                            }
                            ghost.targetX = aheadX;
                            ghost.targetY = aheadY;
                            break;
                        case 'Inky': // Complex targeting
                            const blinky = this.ghosts[0];
                            const pacmanAheadX = this.pacman.x;
                            const pacmanAheadY = this.pacman.y;
                            switch(this.pacman.direction) {
                                case 'left': break;
                                case 'right': break;
                                case 'up': break;
                                case 'down': break;
                            }
                            const vectorX = pacmanAheadX - blinky.x;
                            const vectorY = pacmanAheadY - blinky.y;
                            ghost.targetX = pacmanAheadX + vectorX;
                            ghost.targetY = pacmanAheadY + vectorY;
                            break;
                        case 'Clyde': // Chase unless close to Pac-Man
                            const dx = ghost.x - this.pacman.x;
                            const dy = ghost.y - this.pacman.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance > 8 * this.cellSize) {
                                ghost.targetX = this.pacman.x;
                                ghost.targetY = this.pacman.y;
                            } else {
                                // Go to scatter corner
                                ghost.targetX = 0;
                                ghost.targetY = this.canvas.height;
                            }
                            break;
                    }
                    break;
                    
                case 'scatter':
                    // Go to their respective corners
                    switch(ghost.name) {
                        case 'Blinky':
                            ghost.targetX = this.canvas.width;
                            ghost.targetY = 0;
                            break;
                        case 'Pinky':
                            ghost.targetX = 0;
                            ghost.targetY = 0;
                            break;
                        case 'Inky':
                            ghost.targetX = this.canvas.width;
                            ghost.targetY = this.canvas.height;
                            break;
                        case 'Clyde':
                            ghost.targetX = 0;
                            ghost.targetY = this.canvas.height;
                            break;
                    }
                    break;
                    
                case 'frightened':
                    // Random movement
                    ghost.targetX = Math.random() * this.canvas.width;
                    ghost.targetY = Math.random() * this.canvas.height;
                    break;
            }
            
            // Choose direction
            const possibleDirections = [];
            const distances = [];
            
            ['left', 'right', 'up', 'down'].forEach(dir => {
                if (dir !== this.getOppositeDirection(ghost.direction) && 
                    this.canMove(ghost.x, ghost. y, dir)) {
                    possibleDirections.push(dir);
                    
                    let testX = ghost.x;
                    let testY = ghost.y;
                    
                    switch(dir) {
                        case 'left': testX -= this.cellSize; break;
                        case 'right': testX += this.cellSize; break;
                        case 'up': testY -= this.cellSize; break;
                        case 'down': testY += this.cellSize; break;
                    }
                    
                    const dx = testX - ghost.targetX;
                    const dy = testY - ghost.targetY;
                    distances.push(Math.sqrt(dx * dx + dy * dy));
                }
            });
            
            if (possibleDirections.length > 0) {
                if (ghost.scared) {
                    // In scared mode, choose random direction
                    const randomIndex = Math.floor(Math.random() * possibleDirections.length);
                    ghost.direction = possibleDirections[randomIndex];
                } else {
                    // Choose direction that minimizes distance to target
                    let minDistance = Infinity;
                    let bestDirection = ghost.direction;
                    
                    for (let i = 0; i < possibleDirections.length; i++) {
                        if (distances[i] < minDistance) {
                            minDistance = distances[i];
                            bestDirection = possibleDirections[i];
                        }
                    }
                    
                    ghost.direction = bestDirection;
                }
            }
            
            // Move ghost
            switch(ghost.direction) {
                case 'left':
                    ghost.x -= ghost.speed;
                    break;
                case 'right':
                    ghost.x += ghost.speed;
                    break;
                case 'up':
                    ghost.y -= ghost.speed;
                    break;
                case 'down':
                    ghost.y += ghost.speed;
                    break;
            }
            
            // Tunnel warp for ghosts
            if (ghost.x < -ghost.radius) {
                ghost.x = this.canvas.width + ghost.radius;
            } else if (ghost.x > this.canvas.width + ghost.radius) {
                ghost.x = -ghost.radius;
            }
        });
    }
    
    updateGhostModes() {
        this.modeTimer += 16; // Approximate 16ms per frame
        
        if (this.currentModeIndex < this.modeSequence.length) {
            const currentMode = this.modeSequence[this.currentModeIndex];
            
            if (this.modeTimer >= currentMode.duration) {
                this.modeTimer = 0;
                this.currentModeIndex++;
                
                if (this.currentModeIndex < this.modeSequence.length) {
                    const newMode = this.modeSequence[this.currentModeIndex].mode;
                    this.ghosts.forEach(ghost => {
                        if (!ghost.scared) {
                            ghost.mode = newMode;
                        }
                    });
                }
            }
        }
    }
    
    updatePowerEffect() {
        if (this.pacman.isPowered) {
            const powerTime = Date.now() - this.pacman.poweredTimer;
            if (powerTime > 10000) {
                this.pacman.isPowered = false;
                this.ghosts.forEach(ghost => ghost.scared = false);
            } else if (powerTime > 7000) {
                // Flash warning in last 3 seconds
                const flash = Math.floor(powerTime / 250) % 2;
                if (flash === 0) {
                    this.ghosts.forEach(ghost => ghost.scared = false);
                } else {
                    this.ghosts.forEach(ghost => ghost.scared = true);
                }
            }
        }
        
        // Update power pellet pulse
        this.powerPellets.forEach(pellet => {
            if (!pellet.collected) {
                pellet.pulse = (pellet.pulse + 0.1) % (Math.PI * 2);
            }
        });
    }
    
    updateFruit() {
        if (this.fruit) {
            this.fruitTimer += 16;
            if (this.fruitTimer > 10000) { // Fruit disappears after 10 seconds
                this.fruit = null;
                this.fruitTimer = 0;
            }
        }
    }
    
    spawnFruit() {
        const fruitType = this.fruitTypes[Math.min(this.level - 1, this.fruitTypes.length - 1)];
        this.fruit = {
            x: 9 * this.cellSize + this.cellSize / 2,
            y: 12 * this.cellSize + this.cellSize / 2,
            radius: 12,
            type: fruitType.name,
            score: fruitType.score,
            color: fruitType.color,
            pulse: 0
        };
        this.fruitTimer = 0;
    }
    
    checkCollisions() {
        this.ghosts.forEach(ghost => {
            const dx = this.pacman.x - ghost.x;
            const dy = this.pacman.y - ghost.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.pacman.radius + ghost.radius) {
                if (ghost.scared) {
                    // Eat ghost
                    ghost.x = 9 * this.cellSize + this.cellSize / 2;
                    ghost.y = 9 * this.cellSize + this.cellSize / 2;
                    ghost.scared = false;
                    ghost.mode = 'chase';
                    
                    // Score increases with each ghost eaten during power mode
                    this.score += 200 * Math.pow(2, this.ghosts.filter(g => g.scared).length);
                    this.sounds.eatGhost();
                } else {
                    // Pac-Man dies
                    this.lives--;
                    if (this.lives <= 0) {
                        this.gameOver();
                    } else {
                        this.resetPositions();
                        this.sounds.death();
                        
                        // Brief pause
                        this.gameActive = false;
                        setTimeout(() => {
                            this.gameActive = true;
                        }, 2000);
                    }
                }
            }
        });
    }
    
    getOppositeDirection(direction) {
        switch(direction) {
            case 'left': return 'right';
            case 'right': return 'left';
            case 'up': return 'down';
            case 'down': return 'up';
        }
        return direction;
    }
    
    levelComplete() {
        this.gameActive = false;
        this.gameState = 'levelcomplete';
        this.sounds.levelComplete();
        
        // Bonus points for remaining lives and time
        this.score += this.lives * 1000;
        this.score += this.level * 500;
        
        setTimeout(() => {
            this.nextLevel();
        }, 3000);
    }
    
    nextLevel() {
        this.level++;
        this.init(); // Reinitialize with same positions but reset dots
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
        this.sounds.death();
        this.saveHighScore();
        this.draw();
    }
    
    startGame() {
        console.log('Starting Pac-Man game...');
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.setDifficulty(this.difficulty);
        this.init();
        this.gameActive = true;
        this.gameState = 'playing';
        this.sounds.gameStart();
        
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
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.gameAreaHeight);
        
        // Draw maze
        this.drawMaze();
        
        // Draw dots
        this.drawDots();
        
        // Draw power pellets
        this.drawPowerPellets();
        
        // Draw fruit
        if (this.fruit) {
            this.drawFruit();
        }
        
        // Draw ghosts
        this.drawGhosts();
        
        // Draw Pac-Man
        this.drawPacman();
        
        // Draw level complete screen
        if (this.gameState === 'levelcomplete') {
            this.drawLevelComplete();
        }
        
        // Draw game over screen
        if (this.gameState === 'gameover') {
            this.drawGameOver();
        }
        
        // Draw game area border
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.gameAreaHeight);
    }
    
    drawMaze() {
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                const cell = this.maze[y][x];
                const screenX = x * this.cellSize;
                const screenY = y * this.cellSize;
                
                if (cell === 1) {
                    // Draw wall
                    this.ctx.fillStyle = '#0000FF';
                    this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
                    
                    // Draw wall border
                    this.ctx.strokeStyle = '#4169E1';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(screenX, screenY, this.cellSize, this.cellSize);
                    
                    // Draw inner wall detail
                    this.ctx.fillStyle = '#1E90FF';
                    this.ctx.fillRect(screenX + 2, screenY + 2, this.cellSize - 4, this.cellSize - 4);
                } else if (cell === 4) {
                    // Draw ghost house
                    this.ctx.fillStyle = '#8B4513';
                    this.ctx.fillRect(screenX, screenY, this.cellSize, this.cellSize);
                    
                    // Draw house roof
                    this.ctx.fillStyle = '#A0522D';
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenX, screenY);
                    this.ctx.lineTo(screenX + this.cellSize, screenY);
                    this.ctx.lineTo(screenX + this.cellSize / 2, screenY + this.cellSize / 2);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
        }
    }
    
    drawDots() {
        for (const dot of this.dots) {
            if (!dot.collected) {
                this.ctx.fillStyle = dot.color;
                this.ctx.beginPath();
                this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw glow effect
                this.ctx.shadowColor = '#FFD700';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
    }
    
    drawPowerPellets() {
        for (const pellet of this.powerPellets) {
            if (!pellet.collected) {
                const pulseSize = 2 * Math.sin(pellet.pulse);
                
                this.ctx.fillStyle = pellet.color;
                this.ctx.beginPath();
                this.ctx.arc(pellet.x, pellet.y, pellet.radius + pulseSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw glow effect
                this.ctx.shadowColor = '#FFD700';
                this.ctx.shadowBlur = 15;
                this.ctx.beginPath();
                this.ctx.arc(pellet.x, pellet.y, pellet.radius + pulseSize, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                
                // Draw inner glow
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.beginPath();
                this.ctx.arc(pellet.x, pellet.y, pellet.radius / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawFruit() {
        if (!this.fruit) return;
        
        const pulse = Math.sin(Date.now() / 200) * 2;
        
        // Draw fruit shadow
        this.ctx.shadowColor = this.fruit.color;
        this.ctx.shadowBlur = 20;
        
        // Draw fruit body
        this.ctx.fillStyle = this.fruit.color;
        this.ctx.beginPath();
        this.ctx.arc(this.fruit.x, this.fruit.y, this.fruit.radius + pulse, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw fruit highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.fruit.x - this.fruit.radius * 0.3, 
                    this.fruit.y - this.fruit.radius * 0.3, 
                    this.fruit.radius * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw fruit stem
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(this.fruit.x - 2, this.fruit.y - this.fruit.radius - 4, 4, 6);
        
        this.ctx.shadowBlur = 0;
        
        // Draw fruit value
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.fruit.score.toString(), this.fruit.x, this.fruit.y);
    }
    
    drawGhosts() {
        this.ghosts.forEach(ghost => {
            // Draw ghost body
            this.ctx.fillStyle = ghost.scared ? 
                (Date.now() % 500 < 250 ? '#0000FF' : '#FFFFFF') : 
                ghost.color;
            
            // Draw ghost with wavy bottom
            this.ctx.beginPath();
            this.ctx.arc(ghost.x, ghost.y, ghost.radius, Math.PI, 0, false);
            
            // Create wavy bottom
            const waveHeight = 5;
            const waveCount = 4;
            for (let i = 0; i <= waveCount; i++) {
                const angle = Math.PI * (i / waveCount);
                const x = ghost.x + ghost.radius * Math.cos(angle);
                const y = ghost.y + waveHeight * Math.sin(Date.now() / 100 + i) + 5;
                
                if (i === 0) {
                    this.ctx.lineTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw ghost eyes
            const eyeOffsetX = ghost.radius * 0.4;
            const eyeOffsetY = ghost.radius * 0.3;
            const eyeRadius = ghost.radius * 0.3;
            const pupilRadius = ghost.radius * 0.15;
            
            // Left eye
            this.ctx.fillStyle = ghost.eyeColor;
            this.ctx.beginPath();
            this.ctx.arc(ghost.x - eyeOffsetX, ghost.y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Right eye
            this.ctx.beginPath();
            this.ctx.arc(ghost.x + eyeOffsetX, ghost.y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Pupils - look in movement direction
            let pupilXOffset = 0;
            let pupilYOffset = 0;
            
            switch(ghost.direction) {
                case 'left':
                    pupilXOffset = -pupilRadius * 0.5;
                    break;
                case 'right':
                    pupilXOffset = pupilRadius * 0.5;
                    break;
                case 'up':
                    pupilYOffset = -pupilRadius * 0.5;
                    break;
                case 'down':
                    pupilYOffset = pupilRadius * 0.5;
                    break;
            }
            
            this.ctx.fillStyle = ghost.pupilColor;
            
            // Left pupil
            this.ctx.beginPath();
            this.ctx.arc(ghost.x - eyeOffsetX + pupilXOffset, 
                        ghost.y - eyeOffsetY + pupilYOffset, 
                        pupilRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Right pupil
            this.ctx.beginPath();
            this.ctx.arc(ghost.x + eyeOffsetX + pupilXOffset, 
                        ghost.y - eyeOffsetY + pupilYOffset, 
                        pupilRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw ghost name
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ghost.name, ghost.x, ghost.y + ghost.radius + 12);
        });
    }
    
    drawPacman() {
        // Calculate mouth angles
        const startAngle = this.pacman.directionAngle + this.pacman.mouthAngle;
        const endAngle = this.pacman.directionAngle - this.pacman.mouthAngle;
        
        // Get direction angle
        let directionAngle = 0;
        switch(this.pacman.direction) {
            case 'right': directionAngle = 0; break;
            case 'down': directionAngle = Math.PI / 2; break;
            case 'left': directionAngle = Math.PI; break;
            case 'up': directionAngle = -Math.PI / 2; break;
        }
        
        this.pacman.directionAngle = directionAngle;
        
        // Draw Pac-Man with glow effect
        this.ctx.shadowColor = this.pacman.color;
        this.ctx.shadowBlur = 20;
        
        this.ctx.fillStyle = this.pacman.color;
        this.ctx.beginPath();
        this.ctx.arc(this.pacman.x, this.pacman.y, this.pacman.radius, 
                    directionAngle + this.pacman.mouthAngle, 
                    directionAngle - this.pacman.mouthAngle);
        this.ctx.lineTo(this.pacman.x, this.pacman.y);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
        
        // Draw eye
        const eyeX = this.pacman.x + Math.cos(directionAngle) * this.pacman.radius * 0.4;
        const eyeY = this.pacman.y + Math.sin(directionAngle) * this.pacman.radius * 0.4;
        
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(eyeX, eyeY, this.pacman.radius * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw power mode indicator
        if (this.pacman.isPowered) {
            const powerTime = Date.now() - this.pacman.poweredTimer;
            const remainingTime = Math.max(0, 10000 - powerTime) / 1000;
            
            // Draw timer above Pac-Man
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${remainingTime.toFixed(1)}s`, this.pacman.x, this.pacman.y - 25);
            
            // Draw power aura
            if (powerTime < 7000) {
                const pulse = Math.sin(Date.now() / 100) * 3;
                this.ctx.strokeStyle = '#00FF00';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(this.pacman.x, this.pacman.y, this.pacman.radius + 5 + pulse, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
    }
    
    drawLevelComplete() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.gameAreaHeight);
        
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LEVEL COMPLETE!', this.canvas.width / 2, this.gameAreaHeight / 2 - 50);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '30px Arial';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.gameAreaHeight / 2);
        
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillText(`Next Level: ${this.level + 1}`, this.canvas.width / 2, this.gameAreaHeight / 2 + 50);
        
        // Draw Pac-Man animation
        const animX = this.canvas.width / 2;
        const animY = this.gameAreaHeight / 2 + 120;
        const animRadius = 30;
        const animAngle = (Date.now() / 100) % (Math.PI * 2);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(animX, animY, animRadius, animAngle, animAngle + Math.PI * 1.8);
        this.ctx.lineTo(animX, animY);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawGameOver() {
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
        this.ctx.fillText('Press SPACE for New Game', this.canvas.width / 2, this.gameAreaHeight / 2 + 100);
        this.ctx.fillText('Press M for Menu', this.canvas.width / 2, this.gameAreaHeight / 2 + 130);
    }
    
    drawInfoPanel() {
        const panelY = this.scorePanelY;
        const panelHeight = this.scorePanelHeight;
        
        // Draw panel background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        this.ctx.fillRect(0, panelY, this.canvas.width, panelHeight);
        
        // Draw panel border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, panelY, this.canvas.width, panelHeight);
        
        // Draw separator line
        this.ctx.strokeStyle = '#2196F3';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, panelY);
        this.ctx.lineTo(this.canvas.width, panelY);
        this.ctx.stroke();
        
        // Draw scores
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        
        // Score
        this.ctx.fillText(`SCORE: ${this.score}`, this.canvas.width / 4, panelY + 40);
        
        // High score
        this.ctx.fillText(`HIGH SCORE: ${this.highScore}`, this.canvas.width * 3 / 4, panelY + 40);
        
        // Level
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText(`LEVEL ${this.level}`, this.canvas.width / 2, panelY + 40);
        
        // Lives
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = '#FF5252';
        
        // Draw Pac-Man lives
        const livesStartX = this.canvas.width / 4;
        for (let i = 0; i < this.lives; i++) {
            const lifeX = livesStartX + i * 35;
            const lifeY = panelY + 80;
            const lifeRadius = 12;
            
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(lifeX, lifeY, lifeRadius, Math.PI / 6, Math.PI * 11 / 6);
            this.ctx.lineTo(lifeX, lifeY);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.fillText(`Lives: ${this.lives}`, this.canvas.width / 4, panelY + 110);
        
        // Remaining dots
        this.ctx.fillStyle = '#00BCD4';
        this.ctx.fillText(`Dots: ${this.remainingDots}`, this.canvas.width * 3 / 4, panelY + 80);
        
        // Difficulty
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '18px Arial';
        this.ctx.fillText(`Difficulty: ${this.difficulty.toUpperCase()}`, this.canvas.width / 2, panelY + 80);
        
        // Draw fruit score if recently collected
        if (this.fruitScore > 0 && Date.now() - this.fruitTimer < 2000) {
            this.ctx.fillStyle = this.fruitTypes.find(f => f.score === this.fruitScore)?.color || '#FF0000';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText(`+${this.fruitScore}`, this.canvas.width / 2, panelY + 110);
        }
        
        // Draw controls
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#7f8c8d';
        
        // Row 1: Movement controls
        this.ctx.fillText('Move: Arrow Keys / WASD', this.canvas.width / 2, panelY + 135);
        
        // Row 2: Game controls
        this.ctx.fillText('P: Pause | M: Menu | SPACE: New Game', this.canvas.width / 2, panelY + 155);
        
        // Draw power mode indicator
        if (this.pacman.isPowered) {
            const powerTime = Math.max(0, 10000 - (Date.now() - this.pacman.poweredTimer)) / 1000;
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`⚡ POWER: ${powerTime.toFixed(1)}s`, 20, panelY + 30);
            
            // Draw scared ghosts count
            const scaredCount = this.ghosts.filter(g => g.scared).length;
            if (scaredCount > 0) {
                this.ctx.fillStyle = '#0000FF';
                this.ctx.fillText(`👻 x${scaredCount}`, 20, panelY + 55);
            }
        }
        
        // Draw current fruit
        if (this.level <= this.fruitTypes.length) {
            const fruitType = this.fruitTypes[this.level - 1];
            this.ctx.fillStyle = fruitType.color;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${fruitType.name}: ${fruitType.score}pts`, this.canvas.width - 20, panelY + 30);
        }
    }
    
    drawMenu() {
        // Draw background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars background
        this.drawMenuStars();
        
        // Draw title with glow
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 30;
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 80px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAC-MAN', this.canvas.width / 2, 120);
        this.ctx.shadowBlur = 0;
        
        // Draw subtitle
        this.ctx.fillStyle = '#2196F3';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Classic Arcade Maze Game', this.canvas.width / 2, 170);
        
        // Draw animated Pac-Man
        const pacmanX = this.canvas.width / 2;
        const pacmanY = 220;
        const pacmanRadius = 40;
        const mouthAngle = Math.sin(Date.now() / 200) * 0.5 + 0.2;
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(pacmanX, pacmanY, pacmanRadius, mouthAngle, Math.PI * 2 - mouthAngle);
        this.ctx.lineTo(pacmanX, pacmanY);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw eye
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(pacmanX + pacmanRadius * 0.3, pacmanY - pacmanRadius * 0.3, pacmanRadius * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw difficulty options
        const difficultyStartY = 320;
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('Select Difficulty', this.canvas.width / 2, difficultyStartY - 30);
        
        const difficulties = [
            { key: '1', name: 'Easy', desc: 'Faster Pac-Man, slower ghosts, 5 lives' },
            { key: '2', name: 'Medium', desc: 'Normal speed, 3 lives, classic gameplay' },
            { key: '3', name: 'Hard', desc: 'Slower Pac-Man, faster ghosts, 2 lives' }
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
            this.ctx.strokeStyle = isSelected ? '#FFD700' : '#34495e';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, optionWidth, optionHeight);
            
            // Draw difficulty name
            this.ctx.fillStyle = isSelected ? '#FFD700' : '#ecf0f1';
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
                '#2196F3';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Press ${diff.key}`, x + optionWidth/2, y + 90);
        });
        
        // Draw ghost gallery
        const ghostY = difficultyStartY + optionHeight + 60;
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText('Meet the Ghosts!', this.canvas.width / 2, ghostY - 30);
        
        const ghostSpacing = 100;
        const ghostStartX = this.canvas.width / 2 - (ghostSpacing * 1.5);
        
        this.ghosts.forEach((ghost, index) => {
            const ghostX = ghostStartX + index * ghostSpacing;
            
            // Draw ghost
            this.ctx.fillStyle = ghost.color;
            this.ctx.beginPath();
            this.ctx.arc(ghostX, ghostY, 20, Math.PI, 0, false);
            
            // Create wavy bottom
            for (let i = 0; i <= 4; i++) {
                const angle = Math.PI * (i / 4);
                const x = ghostX + 20 * Math.cos(angle);
                const y = ghostY + 3 * Math.sin(Date.now() / 100 + i) + 3;
                this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw ghost name
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(ghost.name, ghostX, ghostY + 35);
            
            // Draw ghost behavior
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.font = '10px Arial';
            const behaviors = ['Chaser', 'Ambusher', 'Fickle', 'Coward'];
            this.ctx.fillText(behaviors[index], ghostX, ghostY + 50);
        });
        
        // Draw start button
        const startButtonY = ghostY + 90;
        
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
        this.ctx.strokeStyle = '#FFD700';
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
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Click here or press SPACE/ENTER', this.canvas.width / 2, startButtonY + 60);
        
        // Draw game instructions
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Collect all dots to advance to the next level', this.canvas.width / 2, 750);
        this.ctx.fillText('Eat power pellets to turn ghosts blue and edible', this.canvas.width / 2, 770);
        this.ctx.fillText('Avoid ghosts or eat them when they are blue', this.canvas.width / 2, 790);
        this.ctx.fillText('Collect fruit for bonus points', this.canvas.width / 2, 810);
        
        // Draw controls instructions
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press SPACE or ENTER to Start', this.canvas.width / 2, this.canvas.height - 60);
        this.ctx.fillText('Or click on menu items', this.canvas.width / 2, this.canvas.height - 30);
    }
    
    drawMenuStars() {
        if (!this.menuStars) {
            this.menuStars = [];
            for (let i = 0; i < 150; i++) {
                this.menuStars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.gameAreaHeight,
                    size: Math.random() * 3 + 1,
                    brightness: Math.random() * 0.5 + 0.5,
                    speed: Math.random() * 0.5 + 0.1,
                    twinkle: Math.random() * Math.PI * 2
                });
            }
        }
        
        // Update and draw stars
        for (const star of this.menuStars) {
            // Update position
            star.y += star.speed;
            if (star.y > this.gameAreaHeight) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
            
            // Twinkle effect
            star.twinkle += 0.05;
            const twinkleBrightness = Math.sin(star.twinkle) * 0.3 + 0.7;
            
            // Draw star
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkleBrightness * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw star glow
            this.ctx.shadowColor = '#FFFFFF';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
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
            const difficultyStartY = 320;
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
            const startButtonY = difficultyStartY + optionHeight + 150;
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
            // Set next direction for Pac-Man based on key press
            switch(key) {
                case 'arrowleft':
                case 'a':
                    this.pacman.nextDirection = 'left';
                    break;
                case 'arrowright':
                case 'd':
                    this.pacman.nextDirection = 'right';
                    break;
                case 'arrowup':
                case 'w':
                    this.pacman.nextDirection = 'up';
                    break;
                case 'arrowdown':
                case 's':
                    this.pacman.nextDirection = 'down';
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
                case ' ':
                    // Space bar can be used for quick restart
                    break;
            }
        } else if (this.gameState === 'gameover' || this.gameState === 'levelcomplete') {
            switch(key) {
                case ' ':
                case 'enter':
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
}

app.registerExtension({
    name: "Comfy.PacManNode",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PacManNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                const canvas = document.createElement('canvas');
                canvas.id = 'pacmanCanvas';
                canvas.style.border = '2px solid #555';
                canvas.style.borderRadius = '8px';
                canvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                canvas.style.cursor = 'pointer';
                
                const game = new PacManGame(canvas);
                
                // Add event listeners
                canvas.addEventListener('click', game.handleCanvasClick);
                
                const keyDownHandler = game.handleKeyDown;
                const keyUpHandler = game.handleKeyUp;
                document.addEventListener('keydown', keyDownHandler);
                document.addEventListener('keyup', keyUpHandler);
                
                // Initial draw
                game.draw();
                
                const widget = this.addDOMWidget("pacman_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                this.onRemoved = function() {
                    document.removeEventListener('keydown', keyDownHandler);
                    document.removeEventListener('keyup', keyUpHandler);
                    canvas.removeEventListener('click', game.handleCanvasClick);
                    
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