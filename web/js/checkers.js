// checkers.js
import { app } from "/scripts/app.js";

class CheckersGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.boardSize = 8;
        this.cellSize = 60; // 8x8 board needs smaller cells
        this.boardWidth = this.boardSize * this.cellSize;
        this.boardHeight = this.boardSize * this.cellSize;
        
        this.canvas.width = 800;
        this.canvas.height = 900;
        
        // Center the board horizontally, position near top
        this.boardOffsetX = (this.canvas.width - this.boardWidth) / 2;
        this.boardOffsetY = 60;
        
        // Info panel position (below the board)
        this.infoPanelY = this.boardOffsetY + this.boardHeight + 40;
        this.infoPanelHeight = 180;
        
        // Game state
        this.board = this.createInitialBoard();
        this.currentPlayer = 'red'; // red goes first
        this.gameActive = true;
        this.gameState = 'menu'; // 'menu', 'playing', 'won'
        this.winner = null;
        this.selectedPiece = null;
        this.validMoves = [];
        this.mustJump = false;
        this.jumpChain = false;
        
        // Scores
        this.scores = {
            'red': 0,
            'black': 0
        };
        
        // Game settings
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.gameMode = 'pvp'; // 'pvp', 'pvc', 'cvc'
        this.player1Type = 'human'; // 'human', 'computer'
        this.player2Type = 'human';
        this.aiThinking = false;
        
        // High scores
        this.highScores = this.getDefaultHighScores();
        this.loadHighScores();
        
        // Sounds
        this.initSounds();
        
        // AI strategies
        this.aiStrategies = {
            'easy': this.getEasyMove.bind(this),
            'medium': this.getMediumMove.bind(this),
            'hard': this.getHardMove.bind(this)
        };
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
    }
    
    createInitialBoard() {
        const board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(null));
        
        // Place red pieces (top three rows)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if ((row + col) % 2 === 1) {
                    board[row][col] = { type: 'pawn', player: 'red', king: false };
                }
            }
        }
        
        // Place black pieces (bottom three rows)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if ((row + col) % 2 === 1) {
                    board[row][col] = { type: 'pawn', player: 'black', king: false };
                }
            }
        }
        
        return board;
    }
    
    async loadHighScores() {
        try {
            const response = await fetch('/checkers/highscores');
            if (response.ok) {
                this.highScores = await response.json();
            }
        } catch (e) {
            console.log('No checkers high scores found');
        }
        
        this.highScores.sort((a, b) => b.wins - a.wins);
    }
    
    async saveHighScores() {
        try {
            const response = await fetch('/checkers/highscores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.highScores)
            });
        } catch (e) {
            console.log('Could not save checkers high scores', e);
        }
    }
    
    getDefaultHighScores() {
        return [
            { name: 'GRANDMASTER', wins: 50, draws: 10, losses: 5, date: new Date().toISOString() },
            { name: 'MASTER', wins: 30, draws: 15, losses: 20, date: new Date().toISOString() },
            { name: 'PLAYER', wins: 20, draws: 20, losses: 25, date: new Date().toISOString() },
            { name: 'ROOKIE', wins: 10, draws: 5, losses: 40, date: new Date().toISOString() },
            { name: 'BEGINNER', wins: 5, draws: 10, losses: 50, date: new Date().toISOString() }
        ];
    }
    
    initSounds() {
        this.sounds = {
            move: this.createBeep(300, 0.1, 0.1),
            jump: this.createBeep(500, 0.2, 0.2),
            king: this.createBeep(700, 0.3, 0.3),
            win: this.createBeep(600, 0.5, 0.3),
            select: this.createBeep(200, 0.05, 0.1),
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
        this.board = this.createInitialBoard();
        this.currentPlayer = 'red';
        this.gameActive = true;
        this.gameState = 'playing';
        this.winner = null;
        this.selectedPiece = null;
        this.validMoves = [];
        this.mustJump = false;
        this.jumpChain = false;
        this.aiThinking = false;
    }
    
    isComputerTurn() {
        if (this.currentPlayer === 'red') {
            return this.player1Type === 'computer';
        } else {
            return this.player2Type === 'computer';
        }
    }
    
    getPieceAt(row, col) {
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
            return null;
        }
        return this.board[row][col];
    }
    
    getValidMoves(row, col, checkJumpsOnly = false) {
        const piece = this.getPieceAt(row, col);
        if (!piece || piece.player !== this.currentPlayer) {
            return [];
        }
        
        const moves = [];
        const jumps = [];
        
        // Directions based on piece type and player
        const directions = [];
        
        // Red pawn moves down, black pawn moves up
        if (piece.type === 'pawn') {
            if (piece.player === 'red' || piece.king) {
                directions.push({ dr: 1, dc: -1 }); // down-left
                directions.push({ dr: 1, dc: 1 });  // down-right
            }
            if (piece.player === 'black' || piece.king) {
                directions.push({ dr: -1, dc: -1 }); // up-left
                directions.push({ dr: -1, dc: 1 });  // up-right
            }
        } else if (piece.type === 'king') {
            // Kings can move in all four diagonal directions
            directions.push({ dr: 1, dc: -1 });
            directions.push({ dr: 1, dc: 1 });
            directions.push({ dr: -1, dc: -1 });
            directions.push({ dr: -1, dc: 1 });
        }
        
        // Check for regular moves and jumps
        for (const dir of directions) {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;
            
            // Check if move is within bounds
            if (newRow >= 0 && newRow < this.boardSize && newCol >= 0 && newCol < this.boardSize) {
                const target = this.getPieceAt(newRow, newCol);
                
                // Regular move to empty square
                if (!target) {
                    if (!checkJumpsOnly) {
                        moves.push({ row: newRow, col: newCol, isJump: false });
                    }
                } 
                // Jump over opponent's piece
                else if (target.player !== this.currentPlayer) {
                    const jumpRow = newRow + dir.dr;
                    const jumpCol = newCol + dir.dc;
                    
                    if (jumpRow >= 0 && jumpRow < this.boardSize && jumpCol >= 0 && jumpCol < this.boardSize) {
                        const jumpTarget = this.getPieceAt(jumpRow, jumpCol);
                        if (!jumpTarget) {
                            jumps.push({ 
                                row: jumpRow, 
                                col: jumpCol, 
                                isJump: true,
                                jumpedRow: newRow,
                                jumpedCol: newCol
                            });
                        }
                    }
                }
            }
        }
        
        // If jumps are available and we're checking for mandatory jumps, return only jumps
        if (jumps.length > 0) {
            return jumps;
        }
        
        // If we're only checking for jumps and none were found, return empty array
        if (checkJumpsOnly) {
            return [];
        }
        
        // Otherwise return regular moves
        return moves;
    }
    
    getAllValidMovesForPlayer(player) {
        const allMoves = [];
        let hasJumps = false;
        
        // First check if any jumps are available (mandatory)
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.player === player) {
                    const jumps = this.getValidMoves(row, col, true);
                    if (jumps.length > 0) {
                        hasJumps = true;
                        allMoves.push({
                            from: { row, col },
                            moves: jumps
                        });
                    }
                }
            }
        }
        
        // If no jumps, get regular moves
        if (!hasJumps) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    const piece = this.getPieceAt(row, col);
                    if (piece && piece.player === player) {
                        const moves = this.getValidMoves(row, col, false);
                        if (moves.length > 0) {
                            allMoves.push({
                                from: { row, col },
                                moves: moves
                            });
                        }
                    }
                }
            }
        }
        
        return allMoves;
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
                    { key: '6', name: 'Hard', desc: 'Advanced AI' }
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
            
            // Check if clicked on start button
            const startButtonY = this.gameMode !== 'pvp' ? 600 : 480;
            const startButtonTop = startButtonY - 25;
            const startButtonBottom = startButtonY + 25;
            const startButtonLeft = this.canvas.width / 2 - 120;
            const startButtonRight = this.canvas.width / 2 + 120;
            
            if (x >= startButtonLeft && x <= startButtonRight && 
                y >= startButtonTop && y <= startButtonBottom) {
                this.startGame();
            }
            
            return;
        }
        
        // Handle game board clicks
        if (!this.gameActive || this.aiThinking || this.isComputerTurn()) {
            return;
        }
        
        const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
        const row = Math.floor((y - this.boardOffsetY) / this.cellSize);
        
        // Check if click is within board bounds
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
            return;
        }
        
        // If a piece is already selected, check if click is on a valid move
        if (this.selectedPiece) {
            const move = this.validMoves.find(m => m.row === row && m.col === col);
            if (move) {
                this.makeMove(this.selectedPiece.row, this.selectedPiece.col, row, col, move.isJump, move.jumpedRow, move.jumpedCol);
                return;
            }
        }
        
        // If no piece selected or clicked on invalid move, try to select a piece
        const piece = this.getPieceAt(row, col);
        if (piece && piece.player === this.currentPlayer) {
            // Check if jumps are mandatory
            const allMoves = this.getAllValidMovesForPlayer(this.currentPlayer);
            let hasJumps = false;
            for (const moveSet of allMoves) {
                if (moveSet.moves.some(m => m.isJump)) {
                    hasJumps = true;
                    break;
                }
            }
            
            // Get valid moves for this piece
            const moves = this.getValidMoves(row, col, hasJumps);
            
            if (moves.length > 0) {
                this.selectedPiece = { row, col };
                this.validMoves = moves;
                this.sounds.select();
                this.draw();
            } else {
                this.sounds.error();
            }
        } else {
            // Clicked on empty square or opponent's piece, deselect
            this.selectedPiece = null;
            this.validMoves = [];
            this.draw();
        }
    }
    
    makeMove(fromRow, fromCol, toRow, toCol, isJump, jumpedRow, jumpedCol) {
        // Move the piece
        const piece = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;
        this.board[toRow][toCol] = piece;
        
        // Handle jump
        if (isJump && jumpedRow !== undefined && jumpedCol !== undefined) {
            // Remove jumped piece
            this.board[jumpedRow][jumpedCol] = null;
            this.sounds.jump();
            
            // Award points
            if (this.currentPlayer === 'red') {
                this.scores.red++;
            } else {
                this.scores.black++;
            }
            
            // Check for additional jumps
            const additionalJumps = this.getValidMoves(toRow, toCol, true);
            if (additionalJumps.length > 0) {
                // Continue jump chain
                this.jumpChain = true;
                this.selectedPiece = { row: toRow, col: toCol };
                this.validMoves = additionalJumps;
                this.draw();
                return;
            }
        } else {
            this.sounds.move();
        }
        
        // Check for king promotion
        if (piece.type === 'pawn') {
            if ((piece.player === 'red' && toRow === this.boardSize - 1) || 
                (piece.player === 'black' && toRow === 0)) {
                piece.king = true;
                piece.type = 'king';
                this.sounds.king();
            }
        }
        
        // Reset selection
        this.selectedPiece = null;
        this.validMoves = [];
        this.jumpChain = false;
        
        // Check game over
        this.checkGameState();
        
        // If game is still active, switch players or trigger AI
        if (this.gameActive) {
            if (!this.jumpChain) {
                this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
                
                if (this.isComputerTurn()) {
                    this.aiThinking = true;
                    setTimeout(() => {
                        this.makeAIMove();
                        this.aiThinking = false;
                        this.draw();
                    }, 500);
                }
            }
        }
        
        this.draw();
    }
    
    makeAIMove() {
        if (!this.gameActive) return;
        
        const aiFunction = this.aiStrategies[this.difficulty];
        const move = aiFunction();
        
        if (move) {
            // Simulate a short delay for AI "thinking"
            setTimeout(() => {
                this.makeMove(
                    move.from.row, 
                    move.from.col, 
                    move.to.row, 
                    move.to.col, 
                    move.isJump, 
                    move.jumpedRow, 
                    move.jumpedCol
                );
            }, 300);
        }
    }
    
    getEasyMove() {
        // Random move selection for easy difficulty
        const allMoves = this.getAllValidMovesForPlayer(this.currentPlayer);
        
        if (allMoves.length === 0) {
            return null;
        }
        
        // Pick a random piece
        const pieceMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        
        // Pick a random move for that piece
        const move = pieceMove.moves[Math.floor(Math.random() * pieceMove.moves.length)];
        
        return {
            from: pieceMove.from,
            to: { row: move.row, col: move.col },
            isJump: move.isJump,
            jumpedRow: move.jumpedRow,
            jumpedCol: move.jumpedCol
        };
    }
    
    getMediumMove() {
        // Medium AI: Prefer jumps, then prefer moves that create kings
        const allMoves = this.getAllValidMovesForPlayer(this.currentPlayer);
        
        if (allMoves.length === 0) {
            return null;
        }
        
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const pieceMove of allMoves) {
            for (const move of pieceMove.moves) {
                let score = 0;
                
                // Prioritize jumps
                if (move.isJump) {
                    score += 10;
                }
                
                // Prioritize king promotion
                const piece = this.board[pieceMove.from.row][pieceMove.from.col];
                if (piece && piece.type === 'pawn') {
                    if ((piece.player === 'red' && move.row === this.boardSize - 1) || 
                        (piece.player === 'black' && move.row === 0)) {
                        score += 15;
                    }
                }
                
                // Prioritize center control
                const centerRow = Math.abs(move.row - (this.boardSize / 2));
                const centerCol = Math.abs(move.col - (this.boardSize / 2));
                score += (this.boardSize - centerRow - centerCol) / 2;
                
                // Avoid moving to edges (except for king promotion)
                if (move.row === 0 || move.row === this.boardSize - 1 || 
                    move.col === 0 || move.col === this.boardSize - 1) {
                    score -= 2;
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = {
                        from: pieceMove.from,
                        to: { row: move.row, col: move.col },
                        isJump: move.isJump,
                        jumpedRow: move.jumpedRow,
                        jumpedCol: move.jumpedCol
                    };
                }
            }
        }
        
        return bestMove;
    }
    
    getHardMove() {
        // Hard AI: Look ahead 2 moves using minimax
        return this.minimax(this.board, 2, -Infinity, Infinity, true).move;
    }
    
    minimax(board, depth, alpha, beta, maximizingPlayer) {
        // Check terminal state or depth limit
        if (depth === 0 || this.isGameOverForBoard(board)) {
            return { score: this.evaluateBoard(board), move: null };
        }
        
        const player = maximizingPlayer ? this.currentPlayer : (this.currentPlayer === 'red' ? 'black' : 'red');
        const allMoves = this.getAllValidMovesForPlayerFromBoard(board, player);
        
        if (allMoves.length === 0) {
            return { score: maximizingPlayer ? -1000 : 1000, move: null };
        }
        
        if (maximizingPlayer) {
            let maxEval = -Infinity;
            let bestMove = null;
            
            for (const pieceMove of allMoves) {
                for (const move of pieceMove.moves) {
                    // Make a copy of the board and apply move
                    const newBoard = this.copyBoard(board);
                    this.applyMoveToBoard(newBoard, pieceMove.from, move, player);
                    
                    const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false).score;
                    
                    if (evaluation > maxEval) {
                        maxEval = evaluation;
                        bestMove = {
                            from: pieceMove.from,
                            to: { row: move.row, col: move.col },
                            isJump: move.isJump,
                            jumpedRow: move.jumpedRow,
                            jumpedCol: move.jumpedCol
                        };
                    }
                    
                    alpha = Math.max(alpha, evaluation);
                    if (beta <= alpha) {
                        break; // Beta cutoff
                    }
                }
                if (beta <= alpha) {
                    break;
                }
            }
            
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            let bestMove = null;
            
            for (const pieceMove of allMoves) {
                for (const move of pieceMove.moves) {
                    const newBoard = this.copyBoard(board);
                    this.applyMoveToBoard(newBoard, pieceMove.from, move, player);
                    
                    const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true).score;
                    
                    if (evaluation < minEval) {
                        minEval = evaluation;
                        bestMove = {
                            from: pieceMove.from,
                            to: { row: move.row, col: move.col },
                            isJump: move.isJump,
                            jumpedRow: move.jumpedRow,
                            jumpedCol: move.jumpedCol
                        };
                    }
                    
                    beta = Math.min(beta, evaluation);
                    if (beta <= alpha) {
                        break; // Alpha cutoff
                    }
                }
                if (beta <= alpha) {
                    break;
                }
            }
            
            return { score: minEval, move: bestMove };
        }
    }
    
    copyBoard(board) {
        return board.map(row => row.map(cell => cell ? { ...cell } : null));
    }
    
    applyMoveToBoard(board, from, move, player) {
        const piece = board[from.row][from.col];
        board[from.row][from.col] = null;
        board[move.row][move.col] = piece;
        
        if (move.isJump) {
            board[move.jumpedRow][move.jumpedCol] = null;
        }
        
        // Check for king promotion
        if (piece && piece.type === 'pawn') {
            if ((piece.player === 'red' && move.row === this.boardSize - 1) || 
                (piece.player === 'black' && move.row === 0)) {
                piece.king = true;
                piece.type = 'king';
            }
        }
    }
    
    getAllValidMovesForPlayerFromBoard(board, player) {
        const allMoves = [];
        const boardSize = board.length;
        
        // Check for jumps first
        let hasJumps = false;
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const piece = board[row][col];
                if (piece && piece.player === player) {
                    const jumps = this.getValidMovesFromBoard(board, row, col, player, true);
                    if (jumps.length > 0) {
                        hasJumps = true;
                        allMoves.push({
                            from: { row, col },
                            moves: jumps
                        });
                    }
                }
            }
        }
        
        // If no jumps, get regular moves
        if (!hasJumps) {
            for (let row = 0; row < boardSize; row++) {
                for (let col = 0; col < boardSize; col++) {
                    const piece = board[row][col];
                    if (piece && piece.player === player) {
                        const moves = this.getValidMovesFromBoard(board, row, col, player, false);
                        if (moves.length > 0) {
                            allMoves.push({
                                from: { row, col },
                                moves: moves
                            });
                        }
                    }
                }
            }
        }
        
        return allMoves;
    }
    
    getValidMovesFromBoard(board, row, col, player, checkJumpsOnly) {
        const piece = board[row][col];
        if (!piece || piece.player !== player) {
            return [];
        }
        
        const moves = [];
        const jumps = [];
        const boardSize = board.length;
        
        const directions = [];
        if (piece.type === 'pawn') {
            if (piece.player === 'red' || piece.king) {
                directions.push({ dr: 1, dc: -1 });
                directions.push({ dr: 1, dc: 1 });
            }
            if (piece.player === 'black' || piece.king) {
                directions.push({ dr: -1, dc: -1 });
                directions.push({ dr: -1, dc: 1 });
            }
        } else if (piece.type === 'king') {
            directions.push({ dr: 1, dc: -1 });
            directions.push({ dr: 1, dc: 1 });
            directions.push({ dr: -1, dc: -1 });
            directions.push({ dr: -1, dc: 1 });
        }
        
        for (const dir of directions) {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;
            
            if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                const target = board[newRow][newCol];
                
                if (!target) {
                    if (!checkJumpsOnly) {
                        moves.push({ row: newRow, col: newCol, isJump: false });
                    }
                } else if (target.player !== player) {
                    const jumpRow = newRow + dir.dr;
                    const jumpCol = newCol + dir.dc;
                    
                    if (jumpRow >= 0 && jumpRow < boardSize && jumpCol >= 0 && jumpCol < boardSize) {
                        const jumpTarget = board[jumpRow][jumpCol];
                        if (!jumpTarget) {
                            jumps.push({ 
                                row: jumpRow, 
                                col: jumpCol, 
                                isJump: true,
                                jumpedRow: newRow,
                                jumpedCol: newCol
                            });
                        }
                    }
                }
            }
        }
        
        if (jumps.length > 0) {
            return jumps;
        }
        
        if (checkJumpsOnly) {
            return [];
        }
        
        return moves;
    }
    
    evaluateBoard(board) {
        let score = 0;
        const boardSize = board.length;
        
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const piece = board[row][col];
                if (piece) {
                    const pieceValue = piece.king ? 3 : 1;
                    const positionValue = this.getPositionValue(row, col, piece.player);
                    
                    if (piece.player === this.currentPlayer) {
                        score += pieceValue + positionValue;
                    } else {
                        score -= pieceValue + positionValue;
                    }
                }
            }
        }
        
        return score;
    }
    
    getPositionValue(row, col, player) {
        // Center positions are more valuable
        const centerRow = Math.abs(row - (this.boardSize / 2));
        const centerCol = Math.abs(col - (this.boardSize / 2));
        let value = (this.boardSize - centerRow - centerCol) * 0.1;
        
        // Back row is safer
        if ((player === 'red' && row === 0) || (player === 'black' && row === this.boardSize - 1)) {
            value += 0.2;
        }
        
        // Edges are safer
        if (col === 0 || col === this.boardSize - 1) {
            value += 0.1;
        }
        
        return value;
    }
    
    isGameOverForBoard(board) {
        // Check if either player has no pieces
        let redPieces = 0;
        let blackPieces = 0;
        let redMoves = 0;
        let blackMoves = 0;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const piece = board[row][col];
                if (piece) {
                    if (piece.player === 'red') {
                        redPieces++;
                        redMoves += this.getValidMovesFromBoard(board, row, col, 'red', false).length;
                    } else {
                        blackPieces++;
                        blackMoves += this.getValidMovesFromBoard(board, row, col, 'black', false).length;
                    }
                }
            }
        }
        
        return redPieces === 0 || blackPieces === 0 || redMoves === 0 || blackMoves === 0;
    }
    
    checkGameState() {
        // Check if game is over
        const allMoves = this.getAllValidMovesForPlayer(this.currentPlayer);
        
        if (allMoves.length === 0) {
            this.gameActive = false;
            this.gameState = 'won';
            this.winner = this.currentPlayer === 'red' ? 'black' : 'red';
            this.sounds.win();
            return;
        }
        
        // Check if either player has no pieces
        let redPieces = 0;
        let blackPieces = 0;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (piece.player === 'red') {
                        redPieces++;
                    } else {
                        blackPieces++;
                    }
                }
            }
        }
        
        if (redPieces === 0) {
            this.gameActive = false;
            this.gameState = 'won';
            this.winner = 'black';
            this.sounds.win();
        } else if (blackPieces === 0) {
            this.gameActive = false;
            this.gameState = 'won';
            this.winner = 'red';
            this.sounds.win();
        }
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
            this.aiThinking = true;
            setTimeout(() => {
                this.makeAIMove();
                this.aiThinking = false;
                this.draw();
            }, 500);
        }
        
        this.draw();
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawBoard() {
        // Draw checkerboard pattern
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const x = this.boardOffsetX + col * this.cellSize;
                const y = this.boardOffsetY + row * this.cellSize;
                
                // Alternate colors
                if ((row + col) % 2 === 0) {
                    this.ctx.fillStyle = '#DDB88C'; // Light brown
                } else {
                    this.ctx.fillStyle = '#8B4513'; // Dark brown
                }
                
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                
                // Draw border
                this.ctx.strokeStyle = '#654321';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
            }
        }
        
        // Draw pieces
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    this.drawPiece(row, col, piece);
                }
            }
        }
        
        // Highlight selected piece
        if (this.selectedPiece) {
            const x = this.boardOffsetX + this.selectedPiece.col * this.cellSize;
            const y = this.boardOffsetY + this.selectedPiece.row * this.cellSize;
            
            this.ctx.strokeStyle = '#FFFF00';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
            
            // Highlight valid moves
            for (const move of this.validMoves) {
                const moveX = this.boardOffsetX + move.col * this.cellSize;
                const moveY = this.boardOffsetY + move.row * this.cellSize;
                
                if (move.isJump) {
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                } else {
                    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                }
                
                this.ctx.fillRect(moveX + 5, moveY + 5, this.cellSize - 10, this.cellSize - 10);
                
                // Draw move indicator
                this.ctx.strokeStyle = move.isJump ? '#FF0000' : '#00FF00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(moveX + 8, moveY + 8, this.cellSize - 16, this.cellSize - 16);
            }
        }
        
        // Draw coordinates (optional, for debugging)
        if (false) { // Set to true to show coordinates
            this.ctx.fillStyle = '#000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    const x = this.boardOffsetX + col * this.cellSize + this.cellSize / 2;
                    const y = this.boardOffsetY + row * this.cellSize + this.cellSize / 2;
                    this.ctx.fillText(`${row},${col}`, x, y);
                }
            }
        }
    }
    
    drawPiece(row, col, piece) {
        const x = this.boardOffsetX + col * this.cellSize + this.cellSize / 2;
        const y = this.boardOffsetY + row * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize / 2 - 8;
        
        // Draw piece shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw piece base
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        
        if (piece.player === 'red') {
            gradient.addColorStop(0, '#FF6B6B');
            gradient.addColorStop(1, '#CC0000');
        } else {
            gradient.addColorStop(0, '#2C3E50');
            gradient.addColorStop(1, '#000000');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw piece border
        this.ctx.strokeStyle = piece.player === 'red' ? '#FFD700' : '#C0C0C0';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw king crown
        if (piece.king) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('♔', x, y);
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
        this.ctx.fillText('CHECKERS', panelX + panelWidth / 2, panelY + 35);
        
        // Draw scores
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        const scoreY = panelY + 80;
        
        // Red score
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(panelX + 30, scoreY - 8, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.fillText('Red:', panelX + 50, scoreY);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.scores.red.toString(), panelX + panelWidth - 30, scoreY);
        
        // Black score
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(panelX + 30, scoreY + 35, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Black:', panelX + 50, scoreY + 43);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.scores.black.toString(), panelX + panelWidth - 30, scoreY + 43);
        
        // Draw game status
        this.ctx.textAlign = 'center';
        const statusY = panelY + 130;
        
        if (this.gameState === 'playing') {
            const playerType = this.currentPlayer === 'red' ? this.player1Type : this.player2Type;
            const playerText = playerType === 'computer' ? 'Computer' : 'Human';
            
            this.ctx.fillStyle = this.currentPlayer === 'red' ? '#e74c3c' : '#2c3e50';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`Current: ${this.currentPlayer.toUpperCase()}`, panelX + panelWidth / 2, statusY);
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`(${playerText})`, panelX + panelWidth / 2, statusY + 28);
            
            if (this.aiThinking) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillText('AI thinking...', panelX + panelWidth / 2, statusY + 60);
            }
            
            // Draw turn indicator
            if (this.selectedPiece) {
                this.ctx.fillStyle = '#bdc3c7';
                this.ctx.font = '14px Arial';
                this.ctx.fillText('Select destination', panelX + panelWidth / 2, statusY + 90);
            } else if (this.jumpChain) {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.fillText('Continue jump chain!', panelX + panelWidth / 2, statusY + 90);
            } else {
                this.ctx.fillStyle = '#bdc3c7';
                this.ctx.font = '14px Arial';
                this.ctx.fillText('Click a piece to select', panelX + panelWidth / 2, statusY + 90);
            }
        } else if (this.gameState === 'won') {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText(`${this.winner.toUpperCase()} Wins!`, panelX + panelWidth / 2, statusY);
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
        this.ctx.fillText('CHECKERS', this.canvas.width / 2, 100);
        this.ctx.shadowBlur = 0;
        
        // Draw subtitle
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '22px Arial';
        this.ctx.fillText('Select Game Mode', this.canvas.width / 2, 160);
        
        // Draw game mode options
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
        
        // Draw difficulty options
        if (this.gameMode !== 'pvp') {
            const difficultyStartY = modeStartY + optionHeight + 80;
            
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText('Select Difficulty', this.canvas.width / 2, difficultyStartY - 30);
            
            const difficulties = [
                { key: '4', name: 'Easy', desc: 'Random moves' },
                { key: '5', name: 'Medium', desc: 'Basic strategy' },
                { key: '6', name: 'Hard', desc: 'Advanced AI' }
            ];
            
            difficulties.forEach((diff, index) => {
                const x = (this.canvas.width / 2) - (optionWidth * 1.5) + (index * (optionWidth + modeSpacing));
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
        
        // Draw start button
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
        
        // Draw instructions
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '15px Arial';
        this.ctx.fillText('Press ENTER or SPACE to Start', this.canvas.width / 2, this.canvas.height - 50);
        this.ctx.fillText('Or click on menu items', this.canvas.width / 2, this.canvas.height - 25);
        
        // Draw game instructions
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Red moves first. Click a piece, then click destination.', this.canvas.width / 2, 750);
        this.ctx.fillText('Jumps are mandatory. Kings can move backwards.', this.canvas.width / 2, 770);
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
    name: "Comfy.CheckersNode",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "CheckersNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                const canvas = document.createElement('canvas');
                canvas.style.border = '2px solid #555';
                canvas.style.borderRadius = '8px';
                canvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                
                const game = new CheckersGame(canvas);
                
                // Add click listener
                canvas.addEventListener('click', game.handleCanvasClick);
                
                // Add keyboard listener
                const keyHandler = game.handleKeyDown;
                document.addEventListener('keydown', keyHandler);
                
                // Initial draw
                game.draw();
                
                const widget = this.addDOMWidget("checkers_canvas", "canvas", canvas, {
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