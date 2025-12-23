class ResponsiveGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameOverlay = document.getElementById('gameOverlay');
        this.messageTitle = document.getElementById('messageTitle');
        this.messageText = document.getElementById('messageText');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.restartIcon = document.getElementById('restartIcon');
        
        // Responsive canvas setup
        this.baseWidth = 1200;
        this.baseHeight = 400;
        this.scale = 1;
        this.gameState = 'waiting'; // waiting, playing, gameOver, deathAnimation
        
        // Game variables
        this.score = 0;
        this.highScore = localStorage.getItem('gameHighScore') || 0;
        this.frameCount = 0;
        this.coinCount = 0;
        this.deathAnimationFrame = 0;
        
        // Game physics (will be adjusted based on scale)
        this.baseGameSpeed = 6;
        this.baseGravity = 0.8;
        this.baseJumpPower = -15;
        this.gameSpeed = this.baseGameSpeed;
        this.gravity = this.baseGravity;
        this.jumpPower = this.baseJumpPower;
        
        // Game objects
        this.dino = this.createDino();
        this.obstacles = [];
        this.coins = [];
        this.clouds = [];
        this.fallingCoins = [];
        this.groundPattern = [];
        
        // Sprites
        this.sprites = {
            dino: { run: [], jump: null, duck: null },
            obstacles: { cactus: null, cactusLarge: null, bird: null },
            coins: { gold: null },
            background: { cloud: null }
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        this.highScoreElement.textContent = this.highScore;
        this.setupCanvas();
        this.setupEventListeners();
        this.loadSprites();
        this.createGround();
        this.createInitialClouds();
        this.ctx.imageSmoothingEnabled = false;
        
        window.addEventListener('resize', () => this.handleResize());
        requestAnimationFrame(() => this.gameLoop());
    }
    
    setupCanvas() {
        // Get container dimensions
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight - 100; // Leave space for header
        
        // Calculate scale to fit screen while maintaining aspect ratio
        const scaleX = availableWidth / this.baseWidth;
        const scaleY = availableHeight / this.baseHeight;
        this.scale = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5x for large screens
        
        // Set canvas dimensions
        this.canvas.width = this.baseWidth * this.scale;
        this.canvas.height = this.baseHeight * this.scale;
        
        // Update physics based on scale
        this.updatePhysics();
        
        console.log(`Canvas: ${this.canvas.width}x${this.canvas.height}, Scale: ${this.scale}`);
    }
    
    updatePhysics() {
        // Scale physics for different screen sizes
        this.gameSpeed = this.baseGameSpeed * this.scale;
        this.gravity = this.baseGravity * this.scale;
        this.jumpPower = this.baseJumpPower * this.scale;
    }
    
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            const oldScale = this.scale;
            this.setupCanvas();
            
            // Reposition dino and game elements if scale changed significantly
            if (Math.abs(oldScale - this.scale) > 0.1) {
                this.recalculatePositions();
            }
        }, 250);
    }
    
    recalculatePositions() {
        const scaleFactor = this.scale;
        this.dino.x = 50 * scaleFactor;
        this.dino.y = this.canvas.height - 70 * scaleFactor - 3;
        this.dino.width = 50 * scaleFactor;
        this.dino.height = 70 * scaleFactor;
        
        // Clear and recreate ground and clouds
        this.createGround();
        this.createInitialClouds();
    }
    
    createDino() {
        return {
            x: 50 * this.scale,
            y: this.canvas.height - 70 * this.scale - 3,
            width: 50 * this.scale,
            height: 70 * this.scale,
            velocityY: 0,
            isJumping: false,
            isDucking: false,
            animationFrame: 0,
            color: '#535353'
        };
    }
    
    createGround() {
        this.groundPattern = [];
        const segmentWidth = 30 * this.scale;
        const numSegments = Math.ceil(this.canvas.width / segmentWidth) + 2;
        
        for (let i = 0; i < numSegments; i++) {
            this.groundPattern.push({
                x: i * segmentWidth,
                width: segmentWidth
            });
        }
    }
    
    createInitialClouds() {
        this.clouds = [];
        for (let i = 0; i < 3; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * (this.canvas.height * 0.15) + 20 * this.scale,
                width: 60 * this.scale,
                height: 20 * this.scale,
                speed: (Math.random() * 0.3 + 0.1) * this.scale
            });
        }
    }
    
    loadSprites() {
        // Load dino sprites
        const dinoFrames = ['dino-run-1.png', 'dino-run-2.png', 'dino-run-3.png', 'dino-run-4.png'];
        dinoFrames.forEach(frame => {
            const img = new Image();
            img.src = `assets/${frame}`;
            this.sprites.dino.run.push(img);
        });
        
        const dinoJump = new Image();
        dinoJump.src = 'assets/dino-jump.png';
        this.sprites.dino.jump = dinoJump;
        
        const dinoDuck = new Image();
        dinoDuck.src = 'assets/dino-duck.png';
        this.sprites.dino.duck = dinoDuck;
        
        // Load obstacle sprites
        this.sprites.obstacles.cactus = new Image();
        this.sprites.obstacles.cactus.src = 'assets/cactus.png';
        
        this.sprites.obstacles.cactusLarge = new Image();
        this.sprites.obstacles.cactusLarge.src = 'assets/cactus-large.png';
        
        this.sprites.obstacles.bird = new Image();
        this.sprites.obstacles.bird.src = 'assets/bird.svg';
        
        this.sprites.coins.gold = new Image();
        this.sprites.coins.gold.src = 'assets/coin.png';
        
        this.sprites.background.cloud = new Image();
        this.sprites.background.cloud.src = 'assets/cloud.png';
    }
    
    setupEventListeners() {
        // Desktop keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleJump();
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.handleDuck(true);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.handleDuck(false);
            }
        });
        
        // Mobile touch controls
        document.addEventListener('touchstart', (e) => {
            if (this.gameState === 'waiting' || this.gameState === 'playing' || this.gameState === 'gameOver') {
                e.preventDefault();
                this.handleJump();
            }
        }, { passive: false });
        
        // Click/tap for restart
        this.restartIcon.addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    handleJump() {
        if (this.gameState === 'waiting') {
            this.startGame();
        } else if (this.gameState === 'playing' && !this.dino.isJumping) {
            this.dino.velocityY = this.jumpPower;
            this.dino.isJumping = true;
        } else if (this.gameState === 'gameOver') {
            this.restartGame();
        }
    }
    
    handleDuck(isDucking) {
        if (this.gameState === 'playing') {
            this.dino.isDucking = isDucking;
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.coinCount = 0;
        this.frameCount = 0;
        this.obstacles = [];
        this.coins = [];
        this.dino = this.createDino();
        this.gameOverlay.classList.add('hidden');
        this.restartIcon.classList.remove('visible');
    }
    
    restartGame() {
        this.startGame();
    }
    
    update() {
        if (this.gameState !== 'playing') {
            if (this.gameState === 'deathAnimation') {
                this.updateDeathAnimation();
            }
            return;
        }
        
        this.frameCount++;
        
        // Update dino
        if (this.dino.isJumping) {
            this.dino.velocityY += this.gravity;
            this.dino.y += this.dino.velocityY;
            
            const groundY = this.canvas.height - this.dino.height - 3;
            if (this.dino.y >= groundY) {
                this.dino.y = groundY;
                this.dino.isJumping = false;
                this.dino.velocityY = 0;
            }
        }
        
        // Update animation frame
        if (!this.dino.isJumping && !this.dino.isDucking) {
            this.dino.animationFrame = (this.dino.animationFrame + 1) % 20;
        }
        
        // Adjust dino size when ducking
        this.dino.height = this.dino.isDucking ? 40 * this.scale : 70 * this.scale;
        this.dino.width = this.dino.isDucking ? 70 * this.scale : 50 * this.scale;
        
        // Update obstacles
        this.updateObstacles();
        
        // Update coins
        this.updateCoins();
        
        // Update clouds
        this.updateClouds();
        
        // Update ground
        this.updateGround();
        
        // Check collisions
        this.checkCollisions();
    }
    
    updateObstacles() {
        // Spawn obstacles
        const spawnRate = Math.max(80, 120 * this.scale); // Scales with screen size
        if (this.frameCount % spawnRate === 0 && Math.random() < 0.6) {
            const types = ['cactus', 'cactus-large', 'bird'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            const obstacle = {
                x: this.canvas.width,
                type: type,
                passed: false,
                animationFrame: 0
            };
            
            const groundY = this.canvas.height - 3;
            
            switch(type) {
                case 'cactus':
                    obstacle.y = groundY - 25 * this.scale;
                    obstacle.width = 25 * this.scale;
                    obstacle.height = 25 * this.scale;
                    break;
                case 'cactus-large':
                    obstacle.y = groundY - 20 * this.scale;
                    obstacle.width = 25 * this.scale;
                    obstacle.height = 20 * this.scale;
                    break;
                case 'bird':
                    obstacle.y = this.canvas.height * (Math.random() < 0.5 ? 0.4 : 0.5);
                    obstacle.width = 50 * this.scale;
                    obstacle.height = 35 * this.scale;
                    break;
            }
            
            this.obstacles.push(obstacle);
        }
        
        // Update and filter obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;
            obstacle.animationFrame = (obstacle.animationFrame + 1) % 30;
            
            // Award points when obstacle passes
            if (!obstacle.passed && obstacle.x + obstacle.width < this.dino.x) {
                obstacle.passed = true;
                this.score++;
                this.scoreElement.textContent = this.score;
                
                // Increase difficulty
                if (this.score % 10 === 0) {
                    this.gameSpeed += 0.2 * this.scale;
                }
            }
            
            return obstacle.x > -100 * this.scale;
        });
    }
    
    updateCoins() {
        // Spawn coins
        const spawnRate = Math.max(80, 120 * this.scale);
        if (this.frameCount % spawnRate === 0 && Math.random() < 0.3) {
            const groundY = this.canvas.height - 3;
            this.coins.push({
                x: this.canvas.width,
                y: Math.random() < 0.5 ? 
                    (groundY - 100 * this.scale) : (groundY - 60 * this.scale),
                width: 20 * this.scale,
                height: 20 * this.scale,
                collected: false,
                animationFrame: Math.floor(Math.random() * 20)
            });
        }
        
        // Update and filter coins
        this.coins = this.coins.filter(coin => {
            coin.x -= this.gameSpeed;
            coin.animationFrame = (coin.animationFrame + 1) % 20;
            return coin.x > -30 * this.scale;
        });
    }
    
    updateClouds() {
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            
            if (cloud.x < -100 * this.scale) {
                cloud.x = this.canvas.width + Math.random() * (200 * this.scale);
                cloud.y = Math.random() * (this.canvas.height * 0.2) + 20;
            }
        });
    }
    
    updateGround() {
        this.groundPattern.forEach(segment => {
            segment.x -= this.gameSpeed;
            
            if (segment.x < -segment.width) {
                segment.x = this.canvas.width;
            }
        });
    }
    
    checkCollisions() {
        const dinoLeft = this.dino.x;
        const dinoRight = this.dino.x + this.dino.width;
        const dinoTop = this.dino.y;
        const dinoBottom = this.dino.y + this.dino.height;
        
        // Check obstacle collisions
        for (let obstacle of this.obstacles) {
            const obstLeft = obstacle.x;
            const obstRight = obstacle.x + obstacle.width;
            const obstTop = obstacle.y;
            const obstBottom = obstacle.y + obstacle.height;
            
            if (dinoRight > obstLeft && dinoLeft < obstRight &&
                dinoBottom > obstTop && dinoTop < obstBottom) {
                this.gameOver();
                return;
            }
        }
        
        // Check coin collisions
        for (let coin of this.coins) {
            if (!coin.collected) {
                const coinLeft = coin.x;
                const coinRight = coin.x + coin.width;
                const coinTop = coin.y;
                const coinBottom = coin.y + coin.height;
                
                if (dinoRight > coinLeft && dinoLeft < coinRight &&
                    dinoBottom > coinTop && dinoTop < coinBottom) {
                    coin.collected = true;
                    this.coinCount++;
                    this.score += 5;
                    this.scoreElement.textContent = this.score;
                }
            }
        }
    }
    
    gameOver() {
        this.gameState = 'deathAnimation';
        this.deathAnimationFrame = 0;
        
        // Create falling coins
        for (let i = 0; i < this.coinCount; i++) {
            this.fallingCoins.push({
                x: this.dino.x + Math.random() * 40 - 20,
                y: this.dino.y + 35,
                velocityX: (Math.random() - 0.5) * (4 * this.scale),
                velocityY: -Math.random() * (8 * this.scale) - (4 * this.scale),
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                size: 15 * this.scale
            });
        }
    }
    
    updateDeathAnimation() {
        this.deathAnimationFrame++;
        
        // Update falling coins
        this.fallingCoins.forEach(coin => {
            coin.velocityY += 0.5 * this.scale;
            coin.x += coin.velocityX;
            coin.y += coin.velocityY;
            coin.rotation += coin.rotationSpeed;
        });
        
        this.fallingCoins = this.fallingCoins.filter(coin => coin.y < this.canvas.height);
        
        if (this.deathAnimationFrame > 120) {
            this.showGameOver();
        }
    }
    
    showGameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('gameHighScore', this.highScore);
            this.highScoreElement.textContent = this.highScore;
        }
        
        this.gameOverlay.classList.remove('hidden');
        this.messageTitle.textContent = 'Game Over!';
        this.messageText.textContent = `Score: ${this.score} | Coins: ${this.coinCount}`;
        this.restartIcon.classList.add('visible');
    }
    
    // Drawing functions
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#f7f7f7';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game elements
        this.drawClouds();
        this.drawGround();
        this.drawCoins();
        this.drawObstacles();
        this.drawDino();
        
        // Draw falling coins during death animation
        if (this.gameState === 'deathAnimation') {
            this.drawFallingCoins();
        }
    }
    
    drawDino() {
        const x = this.dino.x;
        const y = this.dino.y;
        const w = this.dino.width;
        const h = this.dino.height;
        
        this.ctx.fillStyle = this.dino.color;
        
        if (this.dino.isDucking) {
            // Duck position
            this.ctx.fillRect(x, y + h * 0.4, w, h * 0.6);
            this.ctx.fillRect(x + w * 0.8, y + h * 0.4, w * 0.2, h * 0.3);
        } else if (this.dino.isJumping) {
            // Jump position
            this.ctx.fillRect(x, y, w, h);
            this.ctx.fillRect(x + w * 0.8, y + h * 0.1, w * 0.2, h * 0.3);
            this.ctx.fillRect(x - w * 0.15, y + h * 0.75, w * 0.15, h * 0.25);
        } else {
            // Running position
            this.ctx.fillRect(x, y, w, h);
            this.ctx.fillRect(x + w * 0.8, y + h * 0.1, w * 0.2, h * 0.3);
            
            // Alternating legs
            if (this.dino.animationFrame < 10) {
                this.ctx.fillRect(x + w * 0.15, y + h, w * 0.15, h * 0.25);
                this.ctx.fillRect(x + w * 0.55, y + h, w * 0.15, h * 0.25);
            } else {
                this.ctx.fillRect(x + w * 0.35, y + h, w * 0.15, h * 0.25);
                this.ctx.fillRect(x + w * 0.75, y + h, w * 0.15, h * 0.25);
            }
        }
        
        // Draw eye
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(x + w * 0.65, y + h * 0.15, w * 0.1, h * 0.08);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + w * 0.68, y + h * 0.17, w * 0.05, h * 0.05);
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = '#2d5016';
            
            switch(obstacle.type) {
                case 'cactus':
                    // Main trunk
                    this.ctx.fillRect(
                        obstacle.x + obstacle.width * 0.3,
                        obstacle.y + obstacle.height * 0.2,
                        obstacle.width * 0.4,
                        obstacle.height * 0.8
                    );
                    // Left arm
                    this.ctx.fillRect(
                        obstacle.x,
                        obstacle.y + obstacle.height * 0.4,
                        obstacle.width * 0.3,
                        obstacle.height * 0.15
                    );
                    // Right arm
                    this.ctx.fillRect(
                        obstacle.x + obstacle.width * 0.7,
                        obstacle.y + obstacle.height * 0.5,
                        obstacle.width * 0.3,
                        obstacle.height * 0.15
                    );
                    break;
                    
                case 'cactus-large':
                    // Main trunk
                    this.ctx.fillRect(
                        obstacle.x + obstacle.width * 0.3,
                        obstacle.y + obstacle.height * 0.1,
                        obstacle.width * 0.4,
                        obstacle.height * 0.9
                    );
                    // Left branch
                    this.ctx.fillRect(
                        obstacle.x,
                        obstacle.y + obstacle.height * 0.4,
                        obstacle.width * 0.3,
                        obstacle.height * 0.15
                    );
                    // Right branch
                    this.ctx.fillRect(
                        obstacle.x + obstacle.width * 0.7,
                        obstacle.y + obstacle.height * 0.5,
                        obstacle.width * 0.3,
                        obstacle.height * 0.15
                    );
                    break;
                    
                case 'bird':
                    this.ctx.fillStyle = '#8b4513';
                    // Body
                    this.ctx.fillRect(
                        obstacle.x,
                        obstacle.y + obstacle.height * 0.3,
                        obstacle.width * 0.5,
                        obstacle.height * 0.4
                    );
                    // Head
                    this.ctx.fillRect(
                        obstacle.x + obstacle.width * 0.4,
                        obstacle.y + obstacle.height * 0.2,
                        obstacle.width * 0.35,
                        obstacle.height * 0.35
                    );
                    // Wings (animate)
                    const wingOffset = obstacle.animationFrame < 15 ? -obstacle.height * 0.15 : 0;
                    this.ctx.fillRect(
                        obstacle.x - obstacle.width * 0.25,
                        obstacle.y + obstacle.height * 0.3 + wingOffset,
                        obstacle.width * 0.25,
                        obstacle.height * 0.4
                    );
                    this.ctx.fillRect(
                        obstacle.x + obstacle.width * 0.5,
                        obstacle.y + obstacle.height * 0.3 - wingOffset,
                        obstacle.width * 0.25,
                        obstacle.height * 0.4
                    );
                    // Beak
                    this.ctx.fillStyle = '#ff6b35';
                    this.ctx.fillRect(
                        obstacle.x + obstacle.width * 0.7,
                        obstacle.y + obstacle.height * 0.4,
                        obstacle.width * 0.2,
                        obstacle.height * 0.15
                    );
                    break;
            }
        });
    }
    
    drawCoins() {
        this.coins.forEach(coin => {
            if (!coin.collected) {
                const bounce = Math.sin(coin.animationFrame * 0.3) * (2 * this.scale);
                const size = coin.width;
                
                this.ctx.save();
                this.ctx.translate(coin.x + size / 2, coin.y + size / 2 + bounce);
                this.ctx.rotate(coin.animationFrame * 0.1);
                
                this.ctx.fillStyle = '#ffd700';
                this.ctx.fillRect(-size / 2, -size / 2, size, size);
                
                this.ctx.fillStyle = '#ffed4e';
                this.ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);
                
                this.ctx.restore();
            }
        });
    }
    
    drawFallingCoins() {
        this.fallingCoins.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x, coin.y);
            this.ctx.rotate(coin.rotation);
            
            this.ctx.fillStyle = '#ffd700';
            this.ctx.fillRect(-coin.size / 2, -coin.size / 2, coin.size, coin.size);
            
            this.ctx.fillStyle = '#ffed4e';
            this.ctx.fillRect(-coin.size * 0.3, -coin.size * 0.3, coin.size * 0.6, coin.size * 0.6);
            
            this.ctx.restore();
        });
    }
    
    drawClouds() {
        this.clouds.forEach(cloud => {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            
            // Cloud shape using circles
            this.ctx.beginPath();
            this.ctx.ellipse(cloud.x, cloud.y + cloud.height * 0.3, cloud.width * 0.3, cloud.height * 0.4, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.ellipse(cloud.x + cloud.width * 0.3, cloud.y, cloud.width * 0.35, cloud.height * 0.5, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.ellipse(cloud.x + cloud.width * 0.6, cloud.y + cloud.height * 0.2, cloud.width * 0.3, cloud.height * 0.4, 0, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawGround() {
        // Ground line
        this.ctx.fillStyle = '#8b7355';
        this.ctx.fillRect(0, this.canvas.height - 3, this.canvas.width, 3);
        
        // Ground texture
        this.ctx.fillStyle = '#6b5a45';
        const segmentSpacing = 30 * this.scale;
        this.groundPattern.forEach(segment => {
            this.ctx.fillRect(segment.x, this.canvas.height - 5, segmentSpacing * 0.65, 2);
        });
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new ResponsiveGame();
});
