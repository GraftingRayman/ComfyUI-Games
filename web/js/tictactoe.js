// tictactoe.js
import { app } from "/scripts/app.js";

class TicTacToeGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.boardSize = 3;
        this.cellSize = 160; // 50% bigger than 120 (120 * 1.5 = 180, but using 160 for better fit)
        this.boardWidth = this.boardSize * this.cellSize;
        this.boardHeight = this.boardSize * this.cellSize;
        
        this.canvas.width = 800; // Slightly wider to accommodate bigger board
        this.canvas.height = 900; // Taller to fit bigger board and scores
        
        // Center the board horizontally, position near top
        this.boardOffsetX = (this.canvas.width - this.boardWidth) / 2;
        this.boardOffsetY = 60; // Moved up a bit to make room
        
        // Info panel position (much lower below the board)
        this.infoPanelY = this.boardOffsetY + this.boardHeight + 60; // Increased spacing
        this.infoPanelHeight = 180;
        
        this.board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(''));
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.gameState = 'menu';
        this.winner = null;
        this.winningLine = null;
        
        this.scores = {
            'X': 0,
            'O': 0,
            'Draw': 0
        };
        
        this.difficulty = 'medium';
        this.gameMode = 'pvp';
        this.player1Type = 'human';
        this.player2Type = 'human';
        this.aiThinking = false;
        
        this.highScores = this.getDefaultHighScores();
        this.loadHighScores();
        
        this.initSounds();
        
        this.aiStrategies = {
            'easy': this.getRandomMove.bind(this),
            'medium': this.getMediumMove.bind(this),
            'hard': this.getHardMove.bind(this)
        };
        
        // Store button positions for click detection
        this.startButtonX = this.canvas.width / 2 - 120;
        this.startButtonWidth = 240;
        this.startButtonHeight = 50;
        
        // Bind methods for event listeners
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
    }
    
    async loadHighScores() {
        try {
            const response = await fetch('/tictactoe/highscores');
            if (response.ok) {
                this.highScores = await response.json();
            }
        } catch (e) {
            console.log('No tic-tac-toe high scores found');
        }
        
        this.highScores.sort((a, b) => b.wins - a.wins);
    }
    
    async saveHighScores() {
        try {
            const response = await fetch('/tictactoe/highscores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.highScores)
            });
        } catch (e) {
            console.log('Could not save tic-tac-toe high scores', e);
        }
    }
    
    getDefaultHighScores() {
        return [
            { name: 'CHAMPION', wins: 50, draws: 10, losses: 5, date: new Date().toISOString() },
            { name: 'MASTER', wins: 30, draws: 15, losses: 20, date: new Date().toISOString() },
            { name: 'PLAYER', wins: 20, draws: 20, losses: 25, date: new Date().toISOString() },
            { name: 'ROOKIE', wins: 10, draws: 5, losses: 40, date: new Date().toISOString() },
            { name: 'BEGINNER', wins: 5, draws: 10, losses: 50, date: new Date().toISOString() }
        ];
    }
    
    initSounds() {
        this.sounds = {
            click: this.createBeep(300, 0.1, 0.1),
            win: this.createBeep(600, 0.3, 0.2),
            draw: this.createBeep(200, 0.2, 0.1),
            error: this.createBeep(100, 0.1, 0.1)
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
    
    resetBoard() {
        this.board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(''));
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.gameState = 'playing';
        this.winner = null;
        this.winningLine = null;
        this.aiThinking = false;
    }
    
    isComputerTurn() {
        if (this.currentPlayer === 'X') {
            return this.player1Type === 'computer';
        } else {
            return this.player2Type === 'computer';
        }
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        if (this.gameState === 'menu') {
            // Calculate menu item positions for click detection
            const modeStartY = 200;
            const modes = [
                { key: '1', name: 'Player vs Player', desc: 'Two human players' },
                { key: '2', name: 'Player vs Computer', desc: 'Play against AI' },
                { key: '3', name: 'Computer vs Computer', desc: 'Watch AI battle' }
            ];
            
            const optionWidth = 180;
            const optionHeight = 80;
            const modeSpacing = 30;
            
            // Check if clicked on a game mode
            for (let i = 0; i < modes.length; i++) {
                const optionX = (this.canvas.width / 2) - (optionWidth * 1.5) + (i * (optionWidth + modeSpacing));
                const optionY = modeStartY;
                
                if (x >= optionX && x <= optionX + optionWidth && 
                    y >= optionY && y <= optionY + optionHeight) {
                    this.gameMode = i === 0 ? 'pvp' : i === 1 ? 'pvc' : 'cvc';
                    this.player1Type = this.gameMode === 'pvp' ? 'human' : (this.gameMode === 'pvc' ? 'human' : 'computer');
                    this.player2Type = this.gameMode === 'pvp' ? 'human' : 'computer';
                    this.draw();
                    return;
                }
            }
            
            // Check if clicked on difficulty (only if not PvP)
            if (this.gameMode !== 'pvp') {
                const difficultyStartY = modeStartY + optionHeight + 80;
                
                const difficulties = [
                    { key: '4', name: 'Easy', desc: 'Random moves' },
                    { key: '5', name: 'Medium', desc: 'Basic strategy' },
                    { key: '6', name: 'Hard', desc: 'Unbeatable AI' }
                ];
                
                for (let i = 0; i < difficulties.length; i++) {
                    const optionX = (this.canvas.width / 2) - (optionWidth * 1.5) + (i * (optionWidth + modeSpacing));
                    const optionY = difficultyStartY;
                    
                    if (x >= optionX && x <= optionX + optionWidth && 
                        y >= optionY && y <= optionY + optionHeight) {
                        this.difficulty = difficulties[i].name.toLowerCase();
                        this.draw();
                        return;
                    }
                }
            }
            
            // Calculate start button position based on game mode
            const startButtonY = this.gameMode !== 'pvp' ? 600 : 480;
            const startButtonTop = startButtonY - 25;
            const startButtonBottom = startButtonY + 25;
            const startButtonLeft = this.startButtonX;
            const startButtonRight = this.startButtonX + this.startButtonWidth;
            
            // Check if clicked on start button
            if (x >= startButtonLeft && x <= startButtonRight && 
                y >= startButtonTop && y <= startButtonBottom) {
                this.startGame();
            }
            
            return;
        }
        
        // Handle game board clicks
        const boardX = x - this.boardOffsetX;
        const boardY = y - this.boardOffsetY;
        
        if (!this.gameActive || this.aiThinking || 
            boardX < 0 || boardX >= this.boardWidth || 
            boardY < 0 || boardY >= this.boardHeight) {
            return;
        }
        
        const col = Math.floor(boardX / this.cellSize);
        const row = Math.floor(boardY / this.cellSize);
        
        if (this.board[row][col] !== '') {
            this.sounds.error();
            return;
        }
        
        if (this.isComputerTurn()) {
            return;
        }
        
        this.board[row][col] = this.currentPlayer;
        this.sounds.click();
        this.checkGameState();
        
        if (this.gameActive) {
            this.switchPlayer();
            if (this.isComputerTurn()) {
                this.makeAIMove();
            }
        }
        
        this.draw();
    }
    
    handleKeyDown(e) {
        if (this.gameState === 'menu') {
            switch(e.key) {
                case '1':
                    this.gameMode = 'pvp';
                    this.player1Type = 'human';
                    this.player2Type = 'human';
                    this.draw();
                    break;
                case '2':
                    this.gameMode = 'pvc';
                    this.player1Type = 'human';
                    this.player2Type = 'computer';
                    this.draw();
                    break;
                case '3':
                    this.gameMode = 'cvc';
                    this.player1Type = 'computer';
                    this.player2Type = 'computer';
                    this.draw();
                    break;
                case '4':
                    if (this.gameMode !== 'pvp') {
                        this.difficulty = 'easy';
                        this.draw();
                    }
                    break;
                case '5':
                    if (this.gameMode !== 'pvp') {
                        this.difficulty = 'medium';
                        this.draw();
                    }
                    break;
                case '6':
                    if (this.gameMode !== 'pvp') {
                        this.difficulty = 'hard';
                        this.draw();
                    }
                    break;
                case 'Enter':
                case ' ':
                    this.startGame();
                    break;
            }
        } else {
            switch(e.key.toLowerCase()) {
                case 'n':
                    this.startGame();
                    break;
                case 'm':
                    this.gameState = 'menu';
                    this.draw();
                    break;
            }
        }
    }
    
    startGame() {
        this.resetBoard();
        this.gameState = 'playing';
        
        if (this.isComputerTurn()) {
            this.makeAIMove();
        }
        
        this.draw();
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }
    
    makeAIMove() {
        if (!this.gameActive) return;
        
        this.aiThinking = true;
        this.draw();
        
        setTimeout(() => {
            const aiFunction = this.aiStrategies[this.difficulty];
            const move = aiFunction();
            
            if (move) {
                this.board[move.row][move.col] = this.currentPlayer;
                this.sounds.click();
                this.checkGameState();
                
                if (this.gameActive) {
                    this.switchPlayer();
                    if (this.isComputerTurn()) {
                        this.makeAIMove();
                    }
                }
            }
            
            this.aiThinking = false;
            this.draw();
        }, 500);
    }
    
    getRandomMove() {
        const emptyCells = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === '') {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length === 0) return null;
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    getMediumMove() {
        const winMove = this.findWinningMove(this.currentPlayer);
        if (winMove) return winMove;
        
        const opponent = this.currentPlayer === 'X' ? 'O' : 'X';
        const blockMove = this.findWinningMove(opponent);
        if (blockMove) return blockMove;
        
        const center = Math.floor(this.boardSize / 2);
        if (this.board[center][center] === '') {
            return { row: center, col: center };
        }
        
        const corners = [
            { row: 0, col: 0 },
            { row: 0, col: this.boardSize - 1 },
            { row: this.boardSize - 1, col: 0 },
            { row: this.boardSize - 1, col: this.boardSize - 1 }
        ];
        const availableCorners = corners.filter(corner => this.board[corner.row][corner.col] === '');
        if (availableCorners.length > 0) {
            return availableCorners[Math.floor(Math.random() * availableCorners.length)];
        }
        
        return this.getRandomMove();
    }
    
    getHardMove() {
        const bestMove = this.minimax(this.board, 0, true);
        return bestMove.move;
    }
    
    minimax(board, depth, isMaximizing) {
        const winner = this.checkWinnerForMinimax(board);
        
        if (winner === this.currentPlayer) return { score: 10 - depth, move: null };
        if (winner === (this.currentPlayer === 'X' ? 'O' : 'X')) return { score: depth - 10, move: null };
        if (this.isBoardFull(board)) return { score: 0, move: null };
        
        const emptyCells = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (board[row][col] === '') {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (isMaximizing) {
            let bestScore = -Infinity;
            let bestMove = null;
            
            for (const cell of emptyCells) {
                const newBoard = this.copyBoard(board);
                newBoard[cell.row][cell.col] = this.currentPlayer;
                const result = this.minimax(newBoard, depth + 1, false);
                
                if (result.score > bestScore) {
                    bestScore = result.score;
                    bestMove = cell;
                }
            }
            
            return { score: bestScore, move: bestMove };
        } else {
            let bestScore = Infinity;
            let bestMove = null;
            
            for (const cell of emptyCells) {
                const newBoard = this.copyBoard(board);
                newBoard[cell.row][cell.col] = (this.currentPlayer === 'X' ? 'O' : 'X');
                const result = this.minimax(newBoard, depth + 1, true);
                
                if (result.score < bestScore) {
                    bestScore = result.score;
                    bestMove = cell;
                }
            }
            
            return { score: bestScore, move: bestMove };
        }
    }
    
    checkWinnerForMinimax(board) {
        // Check rows
        for (let row = 0; row < this.boardSize; row++) {
            const first = board[row][0];
            if (first !== '' && board[row].every(cell => cell === first)) {
                return first;
            }
        }
        
        // Check columns
        for (let col = 0; col < this.boardSize; col++) {
            const first = board[0][col];
            if (first !== '') {
                let same = true;
                for (let row = 1; row < this.boardSize; row++) {
                    if (board[row][col] !== first) {
                        same = false;
                        break;
                    }
                }
                if (same) {
                    return first;
                }
            }
        }
        
        // Check diagonals
        const diag1 = board[0][0];
        if (diag1 !== '') {
            let same = true;
            for (let i = 1; i < this.boardSize; i++) {
                if (board[i][i] !== diag1) {
                    same = false;
                    break;
                }
            }
            if (same) {
                return diag1;
            }
        }
        
        const diag2 = board[0][this.boardSize - 1];
        if (diag2 !== '') {
            let same = true;
            for (let i = 1; i < this.boardSize; i++) {
                if (board[i][this.boardSize - 1 - i] !== diag2) {
                    same = false;
                    break;
                }
            }
            if (same) {
                return diag2;
            }
        }
        
        return null;
    }
    
    copyBoard(board) {
        return board.map(row => [...row]);
    }
    
    findWinningMove(player) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === '') {
                    this.board[row][col] = player;
                    const winner = this.checkWinnerForMinimax(this.board);
                    this.board[row][col] = '';
                    
                    if (winner === player) {
                        return { row, col };
                    }
                }
            }
        }
        return null;
    }
    
    checkGameState() {
        const winner = this.checkWinner(this.board);
        
        if (winner) {
            this.gameActive = false;
            this.gameState = 'won';
            this.winner = winner;
            this.scores[winner]++;
            this.sounds.win();
        } else if (this.isBoardFull(this.board)) {
            this.gameActive = false;
            this.gameState = 'draw';
            this.scores['Draw']++;
            this.sounds.draw();
        }
    }
    
    checkWinner(board) {
        this.winningLine = null;
        
        // Check rows
        for (let row = 0; row < this.boardSize; row++) {
            const first = board[row][0];
            if (first !== '' && board[row].every(cell => cell === first)) {
                this.winningLine = { type: 'row', index: row };
                return first;
            }
        }
        
        // Check columns
        for (let col = 0; col < this.boardSize; col++) {
            const first = board[0][col];
            if (first !== '') {
                let same = true;
                for (let row = 1; row < this.boardSize; row++) {
                    if (board[row][col] !== first) {
                        same = false;
                        break;
                    }
                }
                if (same) {
                    this.winningLine = { type: 'col', index: col };
                    return first;
                }
            }
        }
        
        // Check diagonals
        const diag1 = board[0][0];
        if (diag1 !== '') {
            let same = true;
            for (let i = 1; i < this.boardSize; i++) {
                if (board[i][i] !== diag1) {
                    same = false;
                    break;
                }
            }
            if (same) {
                this.winningLine = { type: 'diag', index: 0 };
                return diag1;
            }
        }
        
        const diag2 = board[0][this.boardSize - 1];
        if (diag2 !== '') {
            let same = true;
            for (let i = 1; i < this.boardSize; i++) {
                if (board[i][this.boardSize - 1 - i] !== diag2) {
                    same = false;
                    break;
                }
            }
            if (same) {
                this.winningLine = { type: 'diag', index: 1 };
                return diag2;
            }
        }
        
        return null;
    }
    
    isBoardFull(board) {
        return board.every(row => row.every(cell => cell !== ''));
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawBoard() {
        // Draw board background
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(this.boardOffsetX, this.boardOffsetY, this.boardWidth, this.boardHeight);
        
        // Draw thicker grid lines for bigger board
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 5;
        
        // Vertical lines
        for (let i = 1; i < this.boardSize; i++) {
            const x = this.boardOffsetX + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.boardOffsetY);
            this.ctx.lineTo(x, this.boardOffsetY + this.boardHeight);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = 1; i < this.boardSize; i++) {
            const y = this.boardOffsetY + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(this.boardOffsetX, y);
            this.ctx.lineTo(this.boardOffsetX + this.boardWidth, y);
            this.ctx.stroke();
        }
        
        // Draw X's and O's with thicker lines for bigger board
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = this.board[row][col];
                if (cell !== '') {
                    const x = this.boardOffsetX + col * this.cellSize + this.cellSize / 2;
                    const y = this.boardOffsetY + row * this.cellSize + this.cellSize / 2;
                    const radius = this.cellSize / 3;
                    
                    if (cell === 'X') {
                        this.ctx.strokeStyle = '#e74c3c';
                        this.ctx.lineWidth = 10;
                        this.ctx.lineCap = 'round';
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(x - radius, y - radius);
                        this.ctx.lineTo(x + radius, y + radius);
                        this.ctx.stroke();
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(x + radius, y - radius);
                        this.ctx.lineTo(x - radius, y + radius);
                        this.ctx.stroke();
                    } else {
                        this.ctx.strokeStyle = '#2ecc71';
                        this.ctx.lineWidth = 10;
                        this.ctx.lineCap = 'round';
                        
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                }
            }
        }
        
        // Highlight winning line if game is won
        if (this.winningLine && !this.gameActive && this.gameState === 'won') {
            this.ctx.strokeStyle = '#f1c40f';
            this.ctx.lineWidth = 12;
            this.ctx.lineCap = 'round';
            const padding = 25;
            
            switch(this.winningLine.type) {
                case 'row':
                    const rowY = this.boardOffsetY + (this.winningLine.index + 0.5) * this.cellSize;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.boardOffsetX + padding, rowY);
                    this.ctx.lineTo(this.boardOffsetX + this.boardWidth - padding, rowY);
                    this.ctx.stroke();
                    break;
                    
                case 'col':
                    const colX = this.boardOffsetX + (this.winningLine.index + 0.5) * this.cellSize;
                    this.ctx.beginPath();
                    this.ctx.moveTo(colX, this.boardOffsetY + padding);
                    this.ctx.lineTo(colX, this.boardOffsetY + this.boardHeight - padding);
                    this.ctx.stroke();
                    break;
                    
                case 'diag':
                    if (this.winningLine.index === 0) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(this.boardOffsetX + padding, this.boardOffsetY + padding);
                        this.ctx.lineTo(this.boardOffsetX + this.boardWidth - padding, this.boardOffsetY + this.boardHeight - padding);
                        this.ctx.stroke();
                    } else {
                        this.ctx.beginPath();
                        this.ctx.moveTo(this.boardOffsetX + this.boardWidth - padding, this.boardOffsetY + padding);
                        this.ctx.lineTo(this.boardOffsetX + padding, this.boardOffsetY + this.boardHeight - padding);
                        this.ctx.stroke();
                    }
                    break;
            }
        }
    }
    
    drawInfoPanel() {
        const panelX = 50;
        const panelY = this.infoPanelY;
        const panelWidth = this.canvas.width - 100;
        
        // Draw panel background
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(panelX, panelY, panelWidth, this.infoPanelHeight);
        
        // Draw panel border
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, panelY, panelWidth, this.infoPanelHeight);
        
        // Draw title
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 22px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME INFO', panelX + panelWidth / 2, panelY + 35);
        
        // Draw scores in a compact row (moved lower)
        this.ctx.font = 'bold 18px Arial';
        
        // Calculate positions for compact layout
        const scoreStartX = panelX + 40;
        const scoreSpacing = 120;
        const scoreY = panelY + 80; // Moved lower
        
        // Player X score
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(scoreStartX - 18, scoreY - 14, 14, 14);
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('X:', scoreStartX, scoreY);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.scores.X.toString(), scoreStartX + 50, scoreY);
        
        // Player O score
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(scoreStartX + scoreSpacing - 18, scoreY - 14, 14, 14);
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('O:', scoreStartX + scoreSpacing, scoreY);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.scores.O.toString(), scoreStartX + scoreSpacing + 50, scoreY);
        
        // Draws
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.fillRect(scoreStartX + (scoreSpacing * 2) - 18, scoreY - 14, 14, 14);
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Draws:', scoreStartX + (scoreSpacing * 2), scoreY);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.scores.Draw.toString(), scoreStartX + (scoreSpacing * 2) + 70, scoreY);
        
        // Draw game status below scores (moved much lower)
        this.ctx.textAlign = 'center';
        const statusY = panelY + 130; // Moved lower
        
        if (this.gameState === 'playing') {
            const playerType = this.currentPlayer === 'X' ? this.player1Type : this.player2Type;
            const playerText = playerType === 'computer' ? 'Computer' : 'Human';
            
            this.ctx.fillStyle = this.currentPlayer === 'X' ? '#e74c3c' : '#2ecc71';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`Current Turn: ${this.currentPlayer}`, panelX + panelWidth / 2, statusY);
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`(${playerText})`, panelX + panelWidth / 2, statusY + 28);
            
            if (this.aiThinking) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillText('AI thinking...', panelX + panelWidth / 2, statusY + 60);
            }
        } else if (this.gameState === 'won') {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText(`${this.winner} Wins!`, panelX + panelWidth / 2, statusY);
        } else if (this.gameState === 'draw') {
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText("It's a Draw!", panelX + panelWidth / 2, statusY);
        }
        
        // Draw game mode and controls at the bottom
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        const bottomY = panelY + this.infoPanelHeight - 20;
        
        let modeText = '';
        if (this.gameMode === 'pvp') {
            modeText = 'PvP';
        } else if (this.gameMode === 'pvc') {
            modeText = 'PvC';
        } else if (this.gameMode === 'cvc') {
            modeText = 'CvC';
        }
        
        this.ctx.fillText(`Mode: ${modeText}`, panelX + 20, bottomY);
        
        if (this.gameMode !== 'pvp') {
            this.ctx.fillText(`Difficulty: ${this.difficulty}`, panelX + 140, bottomY);
        }
        
        this.ctx.textAlign = 'right';
        this.ctx.fillText('N - New Game | M - Menu', panelX + panelWidth - 20, bottomY);
    }
    
    drawMenu() {
        this.clearCanvas();
        
        // Draw background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.shadowColor = '#3498db';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#3498db';
        this.ctx.font = 'bold 44px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TIC-TAC-TOE', this.canvas.width / 2, 100);
        this.ctx.shadowBlur = 0;
        
        // Draw subtitle
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '22px Arial';
        this.ctx.fillText('Select Game Mode', this.canvas.width / 2, 160);
        
        // Draw game mode options (side by side)
        const modes = [
            { key: '1', name: 'Player vs Player', desc: 'Two human players' },
            { key: '2', name: 'Player vs Computer', desc: 'Play against AI' },
            { key: '3', name: 'Computer vs Computer', desc: 'Watch AI battle' }
        ];
        
        const modeStartY = 200;
        const optionWidth = 180;
        const optionHeight = 80;
        const modeSpacing = 30;
        
        modes.forEach((mode, index) => {
            const x = (this.canvas.width / 2) - (optionWidth * 1.5) + (index * (optionWidth + modeSpacing));
            const y = modeStartY;
            const isSelected = this.gameMode === (index === 0 ? 'pvp' : index === 1 ? 'pvc' : 'cvc');
            
            // Draw mode card
            this.ctx.fillStyle = isSelected ? '#3498db' : '#2c3e50';
            this.ctx.fillRect(x, y, optionWidth, optionHeight);
            
            // Draw border
            this.ctx.strokeStyle = isSelected ? '#f1c40f' : '#34495e';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, optionWidth, optionHeight);
            
            // Draw mode name
            this.ctx.fillStyle = isSelected ? '#f1c40f' : '#ecf0f1';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${mode.key}. ${mode.name}`, x + optionWidth/2, y + 25);
            
            // Draw description
            this.ctx.fillStyle = isSelected ? '#bdc3c7' : '#95a5a6';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(mode.desc, x + optionWidth/2, y + 45);
            
            // Draw key hint
            this.ctx.fillStyle = '#3498db';
            this.ctx.font = '11px Arial';
            this.ctx.fillText(`Press ${mode.key}`, x + optionWidth/2, y + 65);
        });
        
        // Draw difficulty options (only if not PvP, with same size boxes)
        if (this.gameMode !== 'pvp') {
            const difficultyStartY = modeStartY + optionHeight + 80;
            
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText('Select Difficulty', this.canvas.width / 2, difficultyStartY - 30);
            
            const difficulties = [
                { key: '4', name: 'Easy', desc: 'Random moves' },
                { key: '5', name: 'Medium', desc: 'Basic strategy' },
                { key: '6', name: 'Hard', desc: 'Unbeatable AI' }
            ];
            
            // Use same width and height as game mode options
            difficulties.forEach((diff, index) => {
                const x = (this.canvas.width / 2) - (optionWidth * 1.5) + (index * (optionWidth + modeSpacing));
                const y = difficultyStartY;
                const isSelected = this.difficulty === diff.name.toLowerCase();
                
                // Draw difficulty card (same size as game mode cards)
                this.ctx.fillStyle = isSelected ? '#e74c3c' : '#2c3e50';
                this.ctx.fillRect(x, y, optionWidth, optionHeight);
                
                // Draw border
                this.ctx.strokeStyle = isSelected ? '#f1c40f' : '#34495e';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, optionWidth, optionHeight);
                
                // Draw difficulty name
                this.ctx.fillStyle = isSelected ? '#f1c40f' : '#ecf0f1';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillText(`${diff.key}. ${diff.name}`, x + optionWidth/2, y + 25);
                
                // Draw description
                this.ctx.fillStyle = isSelected ? '#bdc3c7' : '#95a5a6';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(diff.desc, x + optionWidth/2, y + 45);
                
                // Draw key hint
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.font = '11px Arial';
                this.ctx.fillText(`Press ${diff.key}`, x + optionWidth/2, y + 65);
            });
        }
        
        // Draw start button (positioned much lower to avoid overlap)
        const startButtonY = this.gameMode !== 'pvp' ? 620 : 500;
        
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
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('START GAME', this.canvas.width / 2, startButtonY + 5);
        this.ctx.shadowBlur = 0;
        
        // Draw instructions at the very bottom
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '15px Arial';
        this.ctx.fillText('Press ENTER or SPACE to Start', this.canvas.width / 2, this.canvas.height - 50);
        this.ctx.fillText('Or click on menu items', this.canvas.width / 2, this.canvas.height - 25);
    }
    
    draw() {
        this.clearCanvas();
        
        if (this.gameState === 'menu') {
            this.drawMenu();
        } else {
            this.drawBoard();
            this.drawInfoPanel();
        }
    }
}

app.registerExtension({
    name: "Comfy.TicTacToeNode",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "TicTacToeNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                const canvas = document.createElement('canvas');
                canvas.style.border = '2px solid #555';
                canvas.style.borderRadius = '8px';
                canvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                
                const game = new TicTacToeGame(canvas);
                
                // Add click listener to canvas
                canvas.addEventListener('click', game.handleCanvasClick);
                
                // Add keyboard listener
                const keyHandler = game.handleKeyDown;
                document.addEventListener('keydown', keyHandler);
                
                // Initial draw
                game.draw();
                
                const widget = this.addDOMWidget("tictactoe_canvas", "canvas", canvas, {
                    serialize: false,
                    hideOnZoom: false
                });
                
                this.onRemoved = function() {
                    document.removeEventListener('keydown', keyHandler);
                    canvas.removeEventListener('click', game.handleCanvasClick);
                };
                
                this.setSize([game.canvas.width + 40, game.canvas.height + 40]);
                
                return result;
            };
        }
    }
});