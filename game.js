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
        this.musicStarted = false; // Flag to check if music has started
    }

    preload() {
        // FIX: Replaced labs.phaser.io links with CORS-friendly jsDelivr links
        this.load.audio('clearSound', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/audio/SoundEffects/p-ping.mp3');
        this.load.audio('dropSound', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/audio/SoundEffects/low.mp3');
        this.load.audio('bgm', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/audio/demon-tune.mp3');
        this.load.audio('gameOverMusic', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/audio/gameover.mp3');
    }

    create() {
        this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
        // We will start the music on first user input

        const boardBg = this.add.graphics();
        boardBg.fillStyle(0x222222);
        boardBg.fillRect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);

        this.initBoard();
        this.spawnPiece();
        this.spawnPiece();

        this.graphics = this.add.graphics();
        this.scoreText = this.add.text(COLS * BLOCK_SIZE + 20, 20, 'Score: 0', { fontSize: '24px', fill: '#fff' });

        this.add.text(COLS * BLOCK_SIZE + 20, 80, 'Next:', { fontSize: '24px', fill: '#fff' });
        this.previewGraphics = this.add.graphics();
        const previewBox = this.add.graphics();
        previewBox.lineStyle(2, 0x888888, 1);
        previewBox.strokeRect(COLS * BLOCK_SIZE + 20, 120, 4 * BLOCK_SIZE, 4 * BLOCK_SIZE);

        this.gameOverText = this.add.text((COLS * BLOCK_SIZE) / 2, (ROWS * BLOCK_SIZE) / 2, 'GAME OVER', { fontSize: '48px', fill: '#f00' }).setOrigin(0.5);
        this.gameOverText.setVisible(false);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
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

                if(this.bgm.isPlaying) this.bgm.stop();
                this.sound.play('gameOverMusic');
            }
        }
    }

    handleInput() {
        // FIX: Start music on first user interaction to prevent AudioContext error
        if (!this.musicStarted && (this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.down.isDown || this.cursors.up.isDown || this.spaceKey.isDown)) {
            if (!this.sound.locked) {
                // some browsers won't allow sound to play until user interaction
                this.bgm.play();
                this.musicStarted = true;
            }
        }

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
        } else if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.hardDrop();
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

    hardDrop() {
        while (!this.checkCollision(this.currentPiece.shape, this.pieceX, this.pieceY + 1)) {
            this.pieceY++;
        }
        this.solidifyPiece();
        this.sound.play('dropSound');
        this.clearLines();
        this.spawnPiece();
    }

    rotatePiece() {
        const originalShape = this.currentPiece.shape;
        const newShape = [];
        for (let y = 0; y < originalShape[0].length; y++) {
            newShape[y] = [];
            for (let x = 0; x < originalShape.length; x++) {
                newShape[y][x] = originalShape[originalShape.length - 1 - x][y];
            }
        }

        const testOffsets = [0, -1, 1, -2, 2];

        for (const offsetX of testOffsets) {
            if (!this.checkCollision(newShape, this.pieceX + offsetX, this.pieceY)) {
                this.pieceX += offsetX;
                this.currentPiece.shape = newShape;
                return;
            }
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
                y++;
            }
        }
        if (linesCleared > 0) {
            this.score += linesCleared * 10 * linesCleared;
            this.scoreText.setText('Score: ' + this.score);
            this.sound.play('clearSound');
        }
    }

    draw() {
        this.graphics.clear();
        this.previewGraphics.clear();

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (this.board[y][x] !== 0) {
                    this.graphics.fillStyle(COLORS[this.board[y][x]], 1);
                    this.graphics.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }

        if (this.currentPiece) {
            const shape = this.currentPiece.shape;
            this.graphics.fillStyle(COLORS[this.currentPiece.colorId], 1);
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x] !== 0) {
                         this.graphics.fillRect((this.pieceX + x) * BLOCK_SIZE, (this.pieceY + y) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    }
                }
            }
        }

        if (this.nextPiece) {
            const shape = this.nextPiece.shape;
            const previewBoxWidth = 4 * BLOCK_SIZE;
            const previewBoxHeight = 4 * BLOCK_SIZE;
            const pieceWidth = shape[0].length * BLOCK_SIZE;
            const pieceHeight = shape.length * BLOCK_SIZE;

            const previewX = (COLS * BLOCK_SIZE + 20) + (previewBoxWidth - pieceWidth) / 2;
            const previewY = 120 + (previewBoxHeight - pieceHeight) / 2;

            this.previewGraphics.fillStyle(COLORS[this.nextPiece.colorId], 1);
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x] !== 0) {
                        this.previewGraphics.fillRect(previewX + x * BLOCK_SIZE, previewY + y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
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