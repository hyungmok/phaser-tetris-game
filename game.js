const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const COLORS = [
    0x000000, // Empty
    0x00FFFF, // I
    0x0000FF, // J
    0xFFA500, // L
    0xFFFF00, // O
    0x008000, // S
    0x800080, // T
    0xFF0000  // Z
];

const SHAPES = [
    [], // Empty
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]],       // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]]  // Z
];

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.pieceX = 0;
        this.pieceY = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000; // ms
        this.lastTime = 0;
        this.score = 0;
        this.gameOver = false;
    }

    preload() {
        // No assets to load for this simple version
    }

    create() {
        this.initBoard();
        this.spawnPiece();
        this.spawnPiece(); // Call twice to have a 'next' piece

        this.graphics = this.add.graphics();
        this.scoreText = this.add.text(COLS * BLOCK_SIZE + 20, 20, 'Score: 0', { fontSize: '24px', fill: '#fff' });
        this.gameOverText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, 'GAME OVER', { fontSize: '48px', fill: '#f00' }).setOrigin(0.5);
        this.gameOverText.setVisible(false);

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update(time, delta) {
        if (this.gameOver) {
            return;
        }

        this.handleInput();

        this.dropCounter += delta;
        if (this.dropCounter > this.dropInterval) {
            this.dropPiece();
            this.dropCounter = 0;
        }

        this.draw();
    }

    initBoard() {
        for (let y = 0; y < ROWS; y++) {
            this.board[y] = [];
            for (let x = 0; x < COLS; x++) {
                this.board[y][x] = 0;
            }
        }
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;
        const typeId = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
        this.nextPiece = {
            shape: SHAPES[typeId],
            colorId: typeId
        };

        if (this.currentPiece) {
            this.pieceX = Math.floor(COLS / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
            this.pieceY = 0;

            if (this.checkCollision(this.currentPiece.shape, this.pieceX, this.pieceY)) {
                this.gameOver = true;
                this.gameOverText.setVisible(true);
            }
        }
    }

    handleInput() {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            if (!this.checkCollision(this.currentPiece.shape, this.pieceX - 1, this.pieceY)) {
                this.pieceX--;
            }
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            if (!this.checkCollision(this.currentPiece.shape, this.pieceX + 1, this.pieceY)) {
                this.pieceX++;
            }
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.dropPiece();
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.rotatePiece();
        }
    }

    dropPiece() {
        if (!this.checkCollision(this.currentPiece.shape, this.pieceX, this.pieceY + 1)) {
            this.pieceY++;
        } else {
            this.solidifyPiece();
            this.clearLines();
            this.spawnPiece();
        }
    }

    rotatePiece() {
        const shape = this.currentPiece.shape;
        const newShape = [];
        for (let y = 0; y < shape[0].length; y++) {
            newShape[y] = [];
            for (let x = 0; x < shape.length; x++) {
                newShape[y][x] = shape[shape.length - 1 - x][y];
            }
        }

        if (!this.checkCollision(newShape, this.pieceX, this.pieceY)) {
            this.currentPiece.shape = newShape;
        }
    }

    checkCollision(shape, pieceX, pieceY) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    let newX = pieceX + x;
                    let newY = pieceY + y;
                    if (newX < 0 || newX >= COLS || newY >= ROWS || (this.board[newY] && this.board[newY][newX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    solidifyPiece() {
        const shape = this.currentPiece.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    this.board[this.pieceY + y][this.pieceX + x] = this.currentPiece.colorId;
                }
            }
        }
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(value => value !== 0)) {
                linesCleared++;
                this.board.splice(y, 1);
                this.board.unshift(Array(COLS).fill(0));
                // Since we removed a line, we need to check the same y index again
                y++;
            }
        }
        if (linesCleared > 0) {
            this.score += linesCleared * 10 * linesCleared; // Basic scoring
            this.scoreText.setText('Score: ' + this.score);
        }
    }

    draw() {
        this.graphics.clear();
        // Draw board
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (this.board[y][x] !== 0) {
                    this.graphics.fillStyle(COLORS[this.board[y][x]], 1);
                    this.graphics.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    this.graphics.lineStyle(2, 0xffffff, 0.5);
                    this.graphics.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }

        // Draw current piece
        if (this.currentPiece) {
            const shape = this.currentPiece.shape;
            this.graphics.fillStyle(COLORS[this.currentPiece.colorId], 1);
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x] !== 0) {
                         this.graphics.fillRect((this.pieceX + x) * BLOCK_SIZE, (this.pieceY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                         this.graphics.lineStyle(2, 0xffffff, 0.5);
                         this.graphics.strokeRect((this.pieceX + x) * BLOCK_SIZE, (this.pieceY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                }
            }
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: COLS * BLOCK_SIZE + 200,
    height: ROWS * BLOCK_SIZE,
    backgroundColor: '#000',
    scene: GameScene
};

const game = new Phaser.Game(config);