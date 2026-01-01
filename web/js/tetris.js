import { app } from "/scripts/app.js";

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const PREVIEW_SIZE = 15;

const SHAPES = {
    I: [[1,1,1,1]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1]],
    S: [[0,1,1],[1,1,0]],
    Z: [[1,1,0],[0,1,1]],
    J: [[1,0,0],[1,1,1]],
    L: [[0,0,1],[1,1,1]]
};

const COLORS = {
    I: '#00FFFF',
    O: '#FFFF00',
    T: '#800080',
    S: '#00FF00',
    Z: '#FF0000',
    J: '#0000FF',
    L: '#FFA500'
};

class TetrisGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.highScores = [];
        this.scrollOffset = 0;
        this.gameState = 'menu'; // 'menu', 'playing', 'gameover', 'nameinput'
        this.playerName = '';
        
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        
        this.currentPiece = null;
        this.currentPos = { x: 0, y: 0 };
        this.currentType = null;
        
        this.nextPieces = [];
        
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.baseDropInterval = 1000;
        this.lastTime = 0;
        this.level = 1;
        
        this.initSounds();
        this.loadHighScores();
    }
    
    getDefaultHighScores() {
        return [
            { name: 'PLAYER1', score: 5000, date: new Date().toISOString() },
            { name: 'PLAYER2', score: 4000, date: new Date().toISOString() },
            { name: 'PLAYER3', score: 3000, date: new Date().toISOString() },
            { name: 'PLAYER4', score: 2000, date: new Date().toISOString() },
            { name: 'PLAYER5', score: 1000, date: new Date().toISOString() }
        ];
    }
    
    async loadHighScores() {
        try {
            const response = await fetch('/tetris/highscores');
            if (response.ok) {
                this.highScores = await response.json();
            } else {
                this.highScores = this.getDefaultHighScores();
            }
        } catch (e) {
            console.log('No high scores found, using defaults');
            this.highScores = this.getDefaultHighScores();
        }
        
        // Sort by score descending
        this.highScores.sort((a, b) => b.score - a.score);
    }
    
    async saveHighScores() {
        try {
            const response = await fetch('/tetris/highscores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.highScores)
            });
            
            if (response.ok) {
                console.log('High scores saved successfully');
            } else {
                console.log('Failed to save high scores');
            }
        } catch (e) {
            console.log('Could not save high scores', e);
        }
    }
    
    isHighScore(score) {
        if (this.highScores.length < 10) return true;
        return score > this.highScores[this.highScores.length - 1].score;
    }
    
    addHighScore(name, score) {
        this.highScores.push({ name: name.toUpperCase(), score, date: new Date().toISOString() });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10); // Keep top 10
        this.saveHighScores();
    }
    
    initSounds() {
        this.sounds = {
            move: this.createBeep(200, 0.05, 0.1),
            rotate: this.createBeep(300, 0.05, 0.1),
            drop: this.createBeep(150, 0.1, 0.15),
            clear: this.createBeep(400, 0.2, 0.3),
            gameover: this.createBeep(100, 0.5, 0.5)
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
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            } catch (e) {
                // Silently fail if audio context not available
            }
        };
    }
    
    generateNextPieces() {
        while (this.nextPieces.length < 2) {
            const types = Object.keys(SHAPES);
            this.nextPieces.push(types[Math.floor(Math.random() * types.length)]);
        }
    }
    
    spawnPiece() {
        this.generateNextPieces();
        this.currentType = this.nextPieces.shift();
        this.currentPiece = SHAPES[this.currentType].map(row => [...row]);
        this.currentPos = {
            x: Math.floor(COLS / 2) - Math.floor(this.currentPiece[0].length / 2),
            y: 0
        };
        
        if (this.checkCollision()) {
            this.sounds.gameover();
            if (this.isHighScore(this.score)) {
                this.gameState = 'nameinput';
                this.playerName = '';
            } else {
                this.gameState = 'gameover';
            }
        }
    }
    
    checkCollision(offsetX = 0, offsetY = 0, piece = this.currentPiece) {
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    const newX = this.currentPos.x + x + offsetX;
                    const newY = this.currentPos.y + y + offsetY;
                    
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    merge() {
        for (let y = 0; y < this.currentPiece.length; y++) {
            for (let x = 0; x < this.currentPiece[y].length; x++) {
                if (this.currentPiece[y][x]) {
                    const boardY = this.currentPos.y + y;
                    const boardX = this.currentPos.x + x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentType;
                    }
                }
            }
        }
    }
    
    clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++;
            }
        }
        
        if (linesCleared > 0) {
            this.score += linesCleared * 100;
            this.sounds.clear();
            
            // Increase level every 500 points
            const newLevel = Math.floor(this.score / 500) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                // Reduce drop interval by 10% per level, minimum 100ms
                this.dropInterval = Math.max(100, this.baseDropInterval * Math.pow(0.9, this.level - 1));
            }
        }
    }
    
    rotate() {
        const rotated = this.currentPiece[0].map((_, i) =>
            this.currentPiece.map(row => row[i]).reverse()
        );
        
        if (!this.checkCollision(0, 0, rotated)) {
            this.currentPiece = rotated;
            this.sounds.rotate();
        }
    }
    
    move(dx) {
        if (!this.checkCollision(dx, 0)) {
            this.currentPos.x += dx;
            this.sounds.move();
        }
    }
    
    drop() {
        if (!this.checkCollision(0, 1)) {
            this.currentPos.y++;
            return false; // Not locked yet
        } else {
            this.merge();
            this.clearLines();
            this.sounds.drop();
            this.spawnPiece();
            return true; // Locked
        }
    }
    
    hardDrop() {
        while (!this.checkCollision(0, 1)) {
            this.currentPos.y++;
        }
        this.merge();
        this.clearLines();
        this.sounds.drop();
        this.spawnPiece();
    }
    
    startGame() {
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.dropCounter = 0;
        this.level = 1;
        this.dropInterval = this.baseDropInterval;
        this.nextPieces = [];
        this.generateNextPieces();
        this.gameState = 'playing';
        this.spawnPiece();
    }
    
    returnToMenu() {
        this.gameState = 'menu';
        this.scrollOffset = 0;
    }
    
    drawMenu() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 32px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TETRIS', this.canvas.width / 2, 50);
        
        // Draw scrolling high scores (Star Wars style)
        this.ctx.save();
        this.ctx.translate(0, 100 + this.scrollOffset);
        
        // Create perspective effect
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.fillText('HIGH SCORES', this.canvas.width / 2, 0);
        
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#FFF';
        
        let yPos = 40;
        this.highScores.forEach((score, index) => {
            const rank = index + 1;
            const text = `${rank}. ${score.name.padEnd(15)} ${score.score}`;
            this.ctx.fillText(text, this.canvas.width / 2, yPos);
            yPos += 30;
        });
        
        this.ctx.restore();
        
        // Draw start instruction
        this.ctx.fillStyle = '#0F0';
        this.ctx.font = '18px monospace';
        this.ctx.fillText('Press ENTER to Start', this.canvas.width / 2, this.canvas.height - 50);
        
        this.ctx.textAlign = 'left';
    }
    
    drawNameInput() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 - 80);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px monospace';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.fillText('Enter your name:', this.canvas.width / 2, this.canvas.height / 2);
        
        // Draw name input box
        const boxWidth = 200;
        const boxHeight = 40;
        const boxX = this.canvas.width / 2 - boxWidth / 2;
        const boxY = this.canvas.height / 2 + 20;
        
        this.ctx.strokeStyle = '#0F0';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        this.ctx.fillStyle = '#0F0';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.fillText(this.playerName + '_', this.canvas.width / 2, boxY + 28);
        
        this.ctx.fillStyle = '#888';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('Press ENTER when done', this.canvas.width / 2, this.canvas.height / 2 + 100);
        
        this.ctx.textAlign = 'left';
    }
    
    drawGame() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (this.board[y][x]) {
                    this.ctx.fillStyle = COLORS[this.board[y][x]];
                    this.ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece && !this.gameOver) {
            this.ctx.fillStyle = COLORS[this.currentType];
            for (let y = 0; y < this.currentPiece.length; y++) {
                for (let x = 0; x < this.currentPiece[y].length; x++) {
                    if (this.currentPiece[y][x]) {
                        this.ctx.fillRect(
                            (this.currentPos.x + x) * BLOCK_SIZE,
                            (this.currentPos.y + y) * BLOCK_SIZE,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                    }
                }
            }
        }
        
        // Draw grid
        this.ctx.strokeStyle = '#333';
        for (let x = 0; x <= COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * BLOCK_SIZE, 0);
            this.ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            this.ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * BLOCK_SIZE);
            this.ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        // Draw next pieces preview (only if we have next pieces)
        if (this.nextPieces && this.nextPieces.length >= 2) {
            const previewX = COLS * BLOCK_SIZE + 10;
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('NEXT:', previewX, 20);
            
            for (let i = 0; i < 2; i++) {
                const nextType = this.nextPieces[i];
                const nextShape = SHAPES[nextType];
                const offsetY = 30 + i * 70;
                
                // Draw preview box background
                this.ctx.fillStyle = '#111';
                this.ctx.fillRect(previewX, offsetY, 65, 60);
                this.ctx.strokeStyle = '#555';
                this.ctx.strokeRect(previewX, offsetY, 65, 60);
                
                // Center the piece in the preview box
                const pieceWidth = nextShape[0].length * PREVIEW_SIZE;
                const pieceHeight = nextShape.length * PREVIEW_SIZE;
                const centerX = previewX + (65 - pieceWidth) / 2;
                const centerY = offsetY + (60 - pieceHeight) / 2;
                
                this.ctx.fillStyle = COLORS[nextType];
                for (let y = 0; y < nextShape.length; y++) {
                    for (let x = 0; x < nextShape[y].length; x++) {
                        if (nextShape[y][x]) {
                            this.ctx.fillRect(
                                centerX + x * PREVIEW_SIZE,
                                centerY + y * PREVIEW_SIZE,
                                PREVIEW_SIZE - 1,
                                PREVIEW_SIZE - 1
                            );
                        }
                    }
                }
            }
        }
        
        // Draw score and level
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`Score: ${this.score}`, 5, ROWS * BLOCK_SIZE + 15);
        this.ctx.fillText(`Level: ${this.level}`, 5, ROWS * BLOCK_SIZE + 32);
        
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, ROWS * BLOCK_SIZE / 2 - 30, COLS * BLOCK_SIZE, 60);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '20px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', COLS * BLOCK_SIZE / 2, ROWS * BLOCK_SIZE / 2);
            this.ctx.font = '14px monospace';
            this.ctx.fillText('Press P to resume', COLS * BLOCK_SIZE / 2, ROWS * BLOCK_SIZE / 2 + 25);
            this.ctx.textAlign = 'left';
        }
    }
    
    drawGameOver() {
        // Draw the final game state
        this.drawGame();
        
        // Draw game over overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, ROWS * BLOCK_SIZE / 2 - 60, COLS * BLOCK_SIZE, 120);
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', COLS * BLOCK_SIZE / 2, ROWS * BLOCK_SIZE / 2 - 20);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`Final Score: ${this.score}`, COLS * BLOCK_SIZE / 2, ROWS * BLOCK_SIZE / 2 + 10);
        
        this.ctx.font = '14px monospace';
        this.ctx.fillStyle = '#0F0';
        this.ctx.fillText('Press R to Restart', COLS * BLOCK_SIZE / 2, ROWS * BLOCK_SIZE / 2 + 40);
        this.ctx.fillText('Press M for Menu', COLS * BLOCK_SIZE / 2, ROWS * BLOCK_SIZE / 2 + 60);
        
        this.ctx.textAlign = 'left';
    }
    
    draw() {
        if (this.gameState === 'menu') {
            this.drawMenu();
        } else if (this.gameState === 'playing') {
            this.drawGame();
        } else if (this.gameState === 'gameover') {
            this.drawGameOver();
        } else if (this.gameState === 'nameinput') {
            this.drawNameInput();
        }
    }
    
    update(deltaTime) {
        if (this.gameState === 'menu') {
            // Scroll high scores
            this.scrollOffset -= 0.5;
            if (this.scrollOffset < -(this.highScores.length * 30 + 100)) {
                this.scrollOffset = this.canvas.height;
            }
        } else if (this.gameState === 'playing') {
            if (this.paused) return;
            
            this.dropCounter += deltaTime;
            if (this.dropCounter >= this.dropInterval) {
                this.drop();
                this.dropCounter -= this.dropInterval;
            }
        }
    }
    
    handleInput(key) {
        if (this.gameState === 'menu') {
            if (key === 'Enter') {
                this.startGame();
            }
        } else if (this.gameState === 'nameinput') {
            if (key === 'Enter' && this.playerName.length > 0) {
                this.addHighScore(this.playerName, this.score);
                this.gameState = 'menu';
            } else if (key === 'Backspace') {
                this.playerName = this.playerName.slice(0, -1);
            } else if (key.length === 1 && this.playerName.length < 10) {
                if (/[a-zA-Z0-9]/.test(key)) {
                    this.playerName += key.toUpperCase();
                }
            }
        } else if (this.gameState === 'gameover') {
            if (key === 'r' || key === 'R') {
                this.startGame();
            } else if (key === 'm' || key === 'M') {
                this.returnToMenu();
            }
        } else if (this.gameState === 'playing') {
            if (key === 'p' || key === 'P') {
                this.paused = !this.paused;
                return;
            }
            
            if (this.paused) return;
            
            switch(key) {
                case 'ArrowLeft':
                    this.move(-1);
                    break;
                case 'ArrowRight':
                    this.move(1);
                    break;
                case 'ArrowDown':
                    this.drop();
                    this.dropCounter = 0;
                    break;
                case 'ArrowUp':
                    this.rotate();
                    break;
                case ' ':
                    this.hardDrop();
                    break;
            }
        }
    }
}

app.registerExtension({
    name: "Comfy.TetrisNode",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "TetrisNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                const canvas = document.createElement('canvas');
                canvas.width = COLS * BLOCK_SIZE + 85;
                canvas.height = ROWS * BLOCK_SIZE + 45;
                canvas.style.border = '2px solid #555';
                
                const game = new TetrisGame(canvas);
                
                let lastTime = null;
                
                const keyHandler = (e) => {
                    game.handleInput(e.key);
                    game.draw();
                };
                
                document.addEventListener('keydown', keyHandler);
                
                const gameLoop = (time = 0) => {
                    if (lastTime === null) {
                        lastTime = time;
                    }
                    
                    const deltaTime = time - lastTime;
                    lastTime = time;
                    
                    game.update(deltaTime);
                    game.draw();
                    
                    requestAnimationFrame(gameLoop);
                };
                
                gameLoop();
                
                const widget = this.addDOMWidget("tetris_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                this.onRemoved = function() {
                    document.removeEventListener('keydown', keyHandler);
                };
                
                this.setSize([COLS * BLOCK_SIZE + 105, ROWS * BLOCK_SIZE + 120]);
                
                return result;
            };
        }
    }
});