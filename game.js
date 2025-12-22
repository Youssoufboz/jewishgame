class DinoGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameOverlay = document.getElementById('gameOverlay');
        this.messageTitle = document.getElementById('messageTitle');
        this.messageText = document.getElementById('messageText');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.restartIcon = document.getElementById('restartIcon');
        
        this.gameState = 'waiting'; // waiting, playing, gameOver, deathAnimation
        this.score = 0;
        this.highScore = localStorage.getItem('dinoHighScore') || 0;
        this.gameSpeed = 6;
        this.gravity = 0.8;
        this.jumpPower = -15;
        this.deathAnimationFrame = 0;
        this.fallingCoins = [];
        this.sounds = {
            death: null,
            coinFall: null
        };
        
        // Load PNG sprites
        this.sprites = {
            dino: {
                run: [],
                jump: null,
                duck: null
            },
            obstacles: {
                cactus: null,
                cactusLarge: null,
                bird: null
            },
            coins: {
                gold: null
            },
            background: {
                cloud: null
            }
        };
        
        this.dino = {
            x: 50,
            y: 350,
            width: 60,
            height: 70,
            velocityY: 0,
            isJumping: false,
            isDucking: false,
            animationFrame: 0,
            animationSpeed: 0
        };
        
        this.obstacles = [];
        this.coins = [];
        this.clouds = [];
        this.groundLines = [];
        this.frameCount = 0;
        this.coinCount = 0;
        
        this.init();
    }
    
    init() {
        this.highScoreElement.textContent = this.highScore;
        this.setupEventListeners();
        this.loadSprites();
        this.createGroundLines();
        this.createClouds();
        
        // Load sounds
        this.loadSounds();
        
        // Fix canvas image rendering and scaling
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Mobile debugging
        this.isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
        console.log('Mobile device detected:', this.isMobileDevice);
        console.log('Screen size:', window.innerWidth, 'x', window.innerHeight);
        console.log('Touch support:', 'ontouchstart' in window);
        
        // Show mobile status
        const mobileStatus = document.getElementById('mobileStatus');
        if (mobileStatus) {
            mobileStatus.style.display = this.isMobileDevice ? 'inline' : 'none';
        }
        
        // Set responsive canvas size with delay to ensure DOM is ready
        setTimeout(() => {
            this.setupResponsiveCanvas();
            this.gameLoop();
        }, 100);
    }
    
    setupResponsiveCanvas() {
        try {
            // Get the game area dimensions
            const gameArea = this.canvas.parentElement;
            const gameAreaWidth = gameArea.clientWidth || window.innerWidth - 40;
            const gameAreaHeight = gameArea.clientHeight || window.innerHeight - 200;
            
            // Calculate aspect ratio (3:1 for desktop, adjust for mobile)
            const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
            const aspectRatio = isMobile ? 2.5 : 3;
            
            // Calculate canvas size based on available space
            let canvasWidth, canvasHeight;
            
            if (isMobile) {
                // For mobile, use most of the screen width
                canvasWidth = Math.min(gameAreaWidth - 20, 800);
                canvasHeight = canvasWidth / aspectRatio;
                
                // Ensure it fits in the game area
                if (canvasHeight > gameAreaHeight - 20) {
                    canvasHeight = gameAreaHeight - 20;
                    canvasWidth = canvasHeight * aspectRatio;
                }
            } else {
                // For desktop, use fixed size with max constraints
                canvasWidth = Math.min(gameAreaWidth - 40, 1200);
                canvasHeight = canvasWidth / aspectRatio;
            }
            
            // Set canvas dimensions
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            
            // Store scale factor for game logic
            this.scaleFactor = canvasWidth / 1200;
            
            // Adjust game elements for mobile
            if (isMobile) {
                this.adjustGameForMobile();
            }
            
            // Handle window resize (debounced for mobile)
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(() => {
                this.setupResponsiveCanvas();
            }, 250);
        } catch (error) {
            console.log('Canvas setup error:', error);
            // Fallback to default size
            this.canvas.width = 800;
            this.canvas.height = 320;
            this.scaleFactor = 0.67;
        }
    }
    
    adjustGameForMobile() {
        // Adjust game speed and positions for mobile
        this.gameSpeed = 6 * this.scaleFactor;
        
        // Adjust dino position
        this.dino.x = 50 * this.scaleFactor;
        this.dino.y = (this.canvas.height - 50);
        
        // Adjust ground and cloud positions
        this.groundLines.forEach(line => {
            line.y = this.canvas.height - 3;
        });
        
        this.clouds.forEach(cloud => {
            cloud.y = Math.random() * (this.canvas.height * 0.2) + 20;
        });
    }
    
    loadSprites() {
        // Dino sprites - add more running frames
        const dinoRun1 = new Image();
        dinoRun1.src = 'assets/dino-run-1.png';
        const dinoRun2 = new Image();
        dinoRun2.src = 'assets/dino-run-2.png';
        const dinoRun3 = new Image();
        dinoRun3.src = 'assets/dino-run-3.png';
        const dinoRun4 = new Image();
        dinoRun4.src = 'assets/dino-run-4.png';
        const dinoJump = new Image();
        dinoJump.src = 'assets/dino-jump.png';
        const dinoDuck = new Image();
        dinoDuck.src = 'assets/dino-duck.png';
        
        this.sprites.dino.run = [dinoRun1, dinoRun2, dinoRun3, dinoRun4];
        this.sprites.dino.jump = dinoJump;
        this.sprites.dino.duck = dinoDuck;
        
        // Obstacle sprites
        const cactus = new Image();
        cactus.src = 'assets/cactus.png';
        const cactusLarge = new Image();
        cactusLarge.src = 'assets/cactus-large.png';
        const bird = new Image();
        bird.src = 'assets/bird.svg';
        
        // Handle missing bird sprite gracefully
        bird.onerror = () => {
            console.log('Bird sprite not found, using pixel art fallback');
        };
        
        this.sprites.obstacles.cactus = cactus;
        this.sprites.obstacles.cactusLarge = cactusLarge;
        this.sprites.obstacles.bird = bird;
        
        // Coin sprite
        const coin = new Image();
        coin.src = 'assets/coin.png';
        this.sprites.coins.gold = coin;
        
        // Background sprites
        const cloud = new Image();
        cloud.src = 'assets/cloud.png';
        
        this.sprites.background.cloud = cloud;
    }
    
    loadSounds() {
        // Create death sound using Web Audio API
        this.sounds.death = this.createDeathSound();
        this.sounds.coinFall = this.createCoinFallSound();
    }
    
    createDeathSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        };
    }
    
    createCoinFallSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        };
    }
    
    playSound(type) {
        try {
            if (this.sounds[type]) {
                this.sounds[type]();
            }
        } catch (error) {
            console.log('Sound play failed:', error);
        }
    }
    
    setupEventListeners() {
        // Keyboard controls for desktop
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
        
        this.restartIcon.addEventListener('click', () => {
            this.restartGame();
        });
        
        // Simple global touch events like Chrome Dino
        this.setupChromeStyleMobileControls();
    }
    
    setupChromeStyleMobileControls() {
        // Global touch listener - tap anywhere to jump
        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('Touch detected - jumping');
            this.handleJump();
        }, { passive: false });
        
        // Also handle click events for desktop testing
        document.addEventListener('click', (e) => {
            // Only handle clicks on game area, not buttons
            if (e.target.closest('.game-area') && !e.target.closest('button')) {
                console.log('Click detected - jumping');
                this.handleJump();
            }
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
        this.gameSpeed = 6;
        this.obstacles = [];
        this.coins = [];
        this.dino.y = 350;
        this.dino.velocityY = 0;
        this.dino.isJumping = false;
        this.dino.isDucking = false;
        this.gameOverlay.classList.add('hidden');
        this.restartIcon.classList.remove('visible');
    }
    
    restartGame() {
        this.startGame();
    }
    
    gameOver() {
        this.gameState = 'deathAnimation';
        this.deathAnimationFrame = 0;
        
        // Create falling coins from collected coins
        for (let i = 0; i < this.coinCount; i++) {
            this.fallingCoins.push({
                x: this.dino.x + Math.random() * 40 - 20,
                y: this.dino.y + 35,
                velocityX: (Math.random() - 0.5) * 4,
                velocityY: -Math.random() * 8 - 4,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                size: 15
            });
            
            // Play coin fall sound with delay
            setTimeout(() => this.playSound('coinFall'), i * 50);
        }
        
        // Play death sound
        this.playSound('death');
        
        // Start death animation
        this.animateDeath();
    }
    
    animateDeath() {
        this.deathAnimationFrame++;
        
        // Update falling coins
        this.fallingCoins.forEach(coin => {
            coin.velocityY += 0.5; // gravity
            coin.x += coin.velocityX;
            coin.y += coin.velocityY;
            coin.rotation += coin.rotationSpeed;
        });
        
        // Remove coins that fell off screen
        this.fallingCoins = this.fallingCoins.filter(coin => coin.y < 450);
        
        // After animation completes, show game over screen
        if (this.deathAnimationFrame > 120) { // 2 seconds at 60fps
            this.showGameOverScreen();
        }
    }
    
    showGameOverScreen() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('dinoHighScore', this.highScore);
            this.highScoreElement.textContent = this.highScore;
        }
        
        this.gameOverlay.classList.remove('hidden');
        this.messageTitle.textContent = 'Game Over!';
        this.messageText.textContent = `Score: ${this.score} | Coins: ${this.coinCount} | Press SPACE to restart`;
        this.restartIcon.classList.add('visible');
    }
    
    createGroundLines() {
        const scaleFactor = this.scaleFactor || 1;
        for (let i = 0; i < 35; i++) {
            this.groundLines.push({
                x: i * 40 * scaleFactor,
                y: this.canvas.height - 3
            });
        }
    }
    
    createClouds() {
        const scaleFactor = this.scaleFactor || 1;
        for (let i = 0; i < 3; i++) {
            this.clouds.push({
                x: Math.random() * (this.canvas.width * 0.8) + (this.canvas.width * 0.2),
                y: Math.random() * (this.canvas.height * 0.2) + 20,
                width: 60 * scaleFactor,
                height: 20 * scaleFactor,
                speed: Math.random() * 0.5 + 0.2
            });
        }
    }
    
    updateDino() {
        if (this.dino.isJumping) {
            this.dino.velocityY += this.gravity;
            this.dino.y += this.dino.velocityY;
            
            if (this.dino.y >= 350) {
                this.dino.y = 350;
                this.dino.isJumping = false;
                this.dino.velocityY = 0;
            }
        }
        
        this.dino.height = this.dino.isDucking ? 40 : 70;
        this.dino.width = this.dino.isDucking ? 70 : 60;
        
        if (!this.dino.isJumping && !this.dino.isDucking) {
            this.dino.animationFrame = (this.dino.animationFrame + 1) % 20; // Faster frame changes
        }
    }
    
    updateObstacles() {
        if (this.frameCount % 100 === 0 && Math.random() < 0.6) {
            const types = ['cactus', 'cactus-large', 'bird'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            let obstacle = {
                x: this.canvas.width - 100,
                type: type,
                passed: false
            };
            
            const groundY = this.canvas.height - 3;
            const scaleFactor = this.scaleFactor || 1;
            
            switch(type) {
                case 'cactus':
                    obstacle.y = groundY - 25 * scaleFactor;
                    obstacle.width = 25 * scaleFactor;
                    obstacle.height = 25 * scaleFactor;
                    break;
                case 'cactus-large':
                    obstacle.y = groundY - 20 * scaleFactor;
                    obstacle.width = 25 * scaleFactor;
                    obstacle.height = 20 * scaleFactor;
                    break;
                case 'bird':
                    obstacle.y = Math.random() < 0.5 ? 
                        (this.canvas.height * 0.4) : (this.canvas.height * 0.5);
                    obstacle.width = 50 * scaleFactor;
                    obstacle.height = 35 * scaleFactor;
                    obstacle.animationFrame = 0;
                    break;
            }
            
            this.obstacles.push(obstacle);
        }
        
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x -= this.gameSpeed;
            
            if (obstacle.type === 'bird') {
                obstacle.animationFrame = (obstacle.animationFrame + 1) % 30;
            }
            
            if (!obstacle.passed && obstacle.x + obstacle.width < this.dino.x) {
                obstacle.passed = true;
                this.score++;
                this.scoreElement.textContent = this.score;
                
                if (this.score % 10 === 0) {
                    this.gameSpeed += 0.5 * this.scaleFactor;
                }
            }
            
            return obstacle.x > -50 * this.scaleFactor;
        });
    }
    
    updateCoins() {
        if (this.frameCount % 80 === 0 && Math.random() < 0.4) {
            const scaleFactor = this.scaleFactor || 1;
            const groundY = this.canvas.height - 3;
            this.coins.push({
                x: this.canvas.width - 100,
                y: Math.random() < 0.5 ? 
                    (groundY - 120 * scaleFactor) : (groundY - 80 * scaleFactor),
                width: 20 * scaleFactor,
                height: 20 * scaleFactor,
                collected: false,
                animationFrame: Math.floor(Math.random() * 20)
            });
        }
        
        this.coins = this.coins.filter(coin => {
            coin.x -= this.gameSpeed;
            coin.animationFrame = (coin.animationFrame + 1) % 20;
            return coin.x > -30 * this.scaleFactor;
        });
    }
    
    updateClouds() {
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            
            if (cloud.x < -100 * this.scaleFactor) {
                cloud.x = this.canvas.width + Math.random() * (200 * this.scaleFactor);
                cloud.y = Math.random() * (this.canvas.height * 0.2) + 20;
            }
        });
    }
    
    updateGround() {
        this.groundLines.forEach(line => {
            line.x -= this.gameSpeed;
            
            if (line.x < -40 * this.scaleFactor) {
                line.x = this.canvas.width;
            }
        });
    }
    
    checkCollisions() {
        for (let obstacle of this.obstacles) {
            if (obstacle.x < this.dino.x + 200 && obstacle.x > this.dino.x - 50) {
                if (this.dino.x < obstacle.x + obstacle.width &&
                    this.dino.x + this.dino.width > obstacle.x &&
                    this.dino.y < obstacle.y + obstacle.height &&
                    this.dino.y + this.dino.height > obstacle.y) {
                    this.gameOver();
                    return;
                }
            }
        }
        
        for (let coin of this.coins) {
            if (!coin.collected &&
                this.dino.x < coin.x + coin.width &&
                this.dino.x + this.dino.width > coin.x &&
                this.dino.y < coin.y + coin.height &&
                this.dino.y + this.dino.height > coin.y) {
                coin.collected = true;
                this.coinCount++;
                this.score += 5;
                this.scoreElement.textContent = this.score;
            }
        }
    }
    
    drawDino() {
        let sprite;
        
        if (this.dino.isDucking && this.sprites.dino.duck && this.sprites.dino.duck.complete) {
            sprite = this.sprites.dino.duck;
            const width = sprite.naturalWidth;
            const height = sprite.naturalHeight;
            const scale = 0.15;
            this.ctx.drawImage(sprite, this.dino.x, this.dino.y + 25, width * scale, height * scale);
        } else if (this.dino.isJumping && this.sprites.dino.jump && this.sprites.dino.jump.complete) {
            sprite = this.sprites.dino.jump;
            const width = sprite.naturalWidth;
            const height = sprite.naturalHeight;
            const scale = 0.15;
            this.ctx.drawImage(sprite, this.dino.x - 5, this.dino.y - 5, width * scale, height * scale);
        } else {
            const runSprites = this.sprites.dino.run.filter(s => s && s.complete);
            if (runSprites.length > 0) {
                sprite = runSprites[Math.floor(this.dino.animationFrame / 5) % runSprites.length];
                const width = sprite.naturalWidth;
                const height = sprite.naturalHeight;
                const scale = 0.15;
                this.ctx.drawImage(sprite, this.dino.x - 5, this.dino.y - 5, width * scale, height * scale);
            } else {
                this.drawPixelDino();
            }
        }
    }
    
    drawPixelDino() {
        this.ctx.fillStyle = '#535353';
        
        if (this.gameState === 'deathAnimation') {
            // Death animation - dino falls backwards
            const rotation = this.deathAnimationFrame * 0.1;
            this.ctx.save();
            this.ctx.translate(this.dino.x + 25, this.dino.y + 35);
            this.ctx.rotate(rotation);
            
            // Draw dead dino (X eyes)
            this.ctx.fillRect(-25, -35, 50, 70);
            this.ctx.fillRect(20, -25, 20, 10);
            this.ctx.fillRect(20, -15, 10, 20);
            this.ctx.fillRect(-30, 20, 10, 15);
            
            // X eyes
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(-10, -20);
            this.ctx.lineTo(-5, -15);
            this.ctx.moveTo(-5, -20);
            this.ctx.lineTo(-10, -15);
            this.ctx.moveTo(5, -20);
            this.ctx.lineTo(10, -15);
            this.ctx.moveTo(10, -20);
            this.ctx.lineTo(5, -15);
            this.ctx.stroke();
            
            this.ctx.restore();
        } else if (this.dino.isDucking) {
            this.ctx.fillRect(this.dino.x, this.dino.y + 30, this.dino.width, 40);
            this.ctx.fillRect(this.dino.x + 50, this.dino.y + 35, 20, 10);
            this.ctx.fillRect(this.dino.x + 50, this.dino.y + 45, 10, 20);
        } else if (this.dino.isJumping) {
            this.ctx.fillRect(this.dino.x, this.dino.y, 50, 70);
            this.ctx.fillRect(this.dino.x + 45, this.dino.y + 10, 20, 10);
            this.ctx.fillRect(this.dino.x + 45, this.dino.y + 20, 10, 20);
            this.ctx.fillRect(this.dino.x - 5, this.dino.y + 55, 10, 15);
        } else {
            this.ctx.fillRect(this.dino.x, this.dino.y, 50, 70);
            this.ctx.fillRect(this.dino.x + 45, this.dino.y + 10, 20, 10);
            this.ctx.fillRect(this.dino.x + 45, this.dino.y + 20, 10, 20);
            
            if (this.dino.animationFrame < 10) {
                this.ctx.fillRect(this.dino.x + 10, this.dino.y + 70, 10, 15);
                this.ctx.fillRect(this.dino.x + 30, this.dino.y + 70, 10, 15);
            } else {
                this.ctx.fillRect(this.dino.x + 15, this.dino.y + 70, 10, 15);
                this.ctx.fillRect(this.dino.x + 35, this.dino.y + 70, 10, 15);
            }
        }
        
        if (this.gameState !== 'deathAnimation') {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(this.dino.x + 40, this.dino.y + 15, 6, 6);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(this.dino.x + 42, this.dino.y + 17, 3, 3);
        }
    }
    
    drawFallingCoins() {
        this.fallingCoins.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x, coin.y);
            this.ctx.rotate(coin.rotation);
            
            // Draw coin
            this.ctx.fillStyle = '#ffd700';
            this.ctx.fillRect(-coin.size/2, -coin.size/2, coin.size, coin.size);
            this.ctx.fillStyle = '#ffed4e';
            this.ctx.fillRect(-coin.size/3, -coin.size/3, coin.size/1.5, coin.size/1.5);
            
            this.ctx.restore();
        });
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            // Always use pixel art - no PNG sprites for cactus
            switch(obstacle.type) {
                case 'cactus':
                    this.drawPixelCactus(obstacle);
                    break;
                case 'cactus-large':
                    this.drawPixelCactusLarge(obstacle);
                    break;
                case 'bird':
                    let sprite = this.sprites.obstacles.bird;
                    if (sprite.complete) {
                        const wingOffset = obstacle.animationFrame < 15 ? -3 : 0;
                        // Small but clear size
                        const width = sprite.naturalWidth;
                        const height = sprite.naturalHeight;
                        const scale = 0.13;
                        this.ctx.drawImage(sprite, obstacle.x - 5, obstacle.y + wingOffset - 5, width * scale, height * scale);
                    } else {
                        this.drawPixelBird(obstacle);
                    }
                    break;
            }
        });
    }
    
    drawPixelCactus(obstacle) {
        // Small pixel art cactus - fits in 25x25 box
        this.ctx.fillStyle = '#2d5016';
        
        // Main trunk
        this.ctx.fillRect(obstacle.x + 8, obstacle.y + 5, 8, 15);
        
        // Left arm
        this.ctx.fillRect(obstacle.x + 2, obstacle.y + 10, 6, 4);
        
        // Right arm
        this.ctx.fillRect(obstacle.x + 17, obstacle.y + 12, 6, 4);
        
        // Top
        this.ctx.fillRect(obstacle.x + 9, obstacle.y + 2, 6, 4);
        
        // Spikes detail
        this.ctx.fillStyle = '#1a3010';
        this.ctx.fillRect(obstacle.x + 10, obstacle.y + 4, 1, 2);
        this.ctx.fillRect(obstacle.x + 14, obstacle.y + 8, 1, 2);
    }
    
    drawPixelCactusLarge(obstacle) {
        // Small pixel art cactus - fits in 25x20 box
        this.ctx.fillStyle = '#2d5016';
        
        // Main trunk
        this.ctx.fillRect(obstacle.x + 8, obstacle.y + 2, 8, 15);
        
        // Left branch
        this.ctx.fillRect(obstacle.x + 2, obstacle.y + 8, 6, 4);
        
        // Right branch
        this.ctx.fillRect(obstacle.x + 17, obstacle.y + 10, 6, 4);
        
        // Top
        this.ctx.fillRect(obstacle.x + 9, obstacle.y + 0, 6, 3);
        
        // Spikes detail
        this.ctx.fillStyle = '#1a3010';
        this.ctx.fillRect(obstacle.x + 10, obstacle.y + 2, 1, 2);
        this.ctx.fillRect(obstacle.x + 14, obstacle.y + 6, 1, 2);
    }
    
    drawPixelBird(obstacle) {
        this.ctx.fillStyle = '#8b4513';
        const wingOffset = obstacle.animationFrame < 15 ? -5 : 0;
        this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        this.ctx.fillRect(obstacle.x - 8, obstacle.y + wingOffset, 8, 15);
        this.ctx.fillRect(obstacle.x + obstacle.width, obstacle.y - wingOffset, 8, 15);
        this.ctx.fillStyle = '#ff6b35';
        this.ctx.fillRect(obstacle.x + obstacle.width - 5, obstacle.y + 8, 5, 3);
    }
    
    drawCoins() {
        this.coins.forEach(coin => {
            if (!coin.collected) {
                const coinSprite = this.sprites.coins.gold;
                if (coinSprite.complete) {
                    const bounce = Math.sin(coin.animationFrame * 0.3) * 2;
                    
                    // Smaller size without scaling animation
                    const width = coinSprite.naturalWidth;
                    const height = coinSprite.naturalHeight;
                    const baseScale = 0.05;
                    
                    this.ctx.save();
                    this.ctx.translate(coin.x + 10, coin.y + bounce + 10);
                    this.ctx.rotate(coin.animationFrame * 0.1);
                    this.ctx.drawImage(coinSprite, -width * baseScale / 2, -height * baseScale / 2, 
                                     width * baseScale, height * baseScale);
                    this.ctx.restore();
                } else {
                    this.drawPixelCoin(coin);
                }
            }
        });
    }
    
    drawPixelCoin(coin) {
        const bounce = Math.sin(coin.animationFrame * 0.3) * 2;
        
        // Small pixel art coin
        this.ctx.fillStyle = '#ffd700';
        this.ctx.save();
        this.ctx.translate(coin.x + 10, coin.y + bounce + 10);
        this.ctx.rotate(coin.animationFrame * 0.1);
        this.ctx.fillRect(-4, -4, 8, 8);
        this.ctx.restore();
        
        // Inner detail
        this.ctx.fillStyle = '#ffed4e';
        this.ctx.save();
        this.ctx.translate(coin.x + 10, coin.y + bounce + 10);
        this.ctx.rotate(coin.animationFrame * 0.1);
        this.ctx.fillRect(-2, -2, 4, 4);
        this.ctx.restore();
    }
    
    drawClouds() {
        this.clouds.forEach(cloud => {
            const cloudSprite = this.sprites.background.cloud;
            if (cloudSprite.complete) {
                // Small but clear size
                const width = cloudSprite.naturalWidth;
                const height = cloudSprite.naturalHeight;
                const scale = 0.08;
                this.ctx.drawImage(cloudSprite, cloud.x, cloud.y, width * scale, height * scale);
            } else {
                this.drawPixelCloud(cloud);
            }
        });
    }
    
    drawPixelCloud(cloud) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(cloud.x, cloud.y, 20, 15);
        this.ctx.fillRect(cloud.x + 15, cloud.y - 5, 20, 15);
        this.ctx.fillRect(cloud.x + 30, cloud.y, 20, 15);
        this.ctx.fillRect(cloud.x + 10, cloud.y + 10, 30, 10);
    }
    
    drawGround() {
        // Simple clean ground line
        this.ctx.fillStyle = '#8b7355';
        this.ctx.fillRect(0, this.canvas.height - 3, this.canvas.width, 3);
        
        // Simple ground texture
        this.ctx.fillStyle = '#6b5a45';
        for (let i = 0; i < this.canvas.width; i += 30 * this.scaleFactor) {
            this.ctx.fillRect(i, this.canvas.height - 5, 20 * this.scaleFactor, 2);
        }
        
        // Moving ground lines
        this.ctx.strokeStyle = '#5c4a3a';
        this.ctx.lineWidth = 2;
        this.groundLines.forEach(line => {
            this.ctx.beginPath();
            this.ctx.moveTo(line.x, line.y);
            this.ctx.lineTo(line.x + 20 * this.scaleFactor, line.y);
            this.ctx.stroke();
        });
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#f7f7f7';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Debug: Draw canvas size info
        if (this.frameCount < 60) {
            this.ctx.fillStyle = '#333';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`Canvas: ${this.canvas.width}x${this.canvas.height}`, 10, 30);
            this.ctx.fillText(`Mobile: ${this.isMobileDevice}`, 10, 50);
            this.ctx.fillText(`Scale: ${this.scaleFactor}`, 10, 70);
        }
        
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
    
    update() {
        if (this.gameState === 'playing') {
            this.frameCount++;
            this.updateDino();
            this.updateObstacles();
            this.updateCoins();
            this.updateClouds();
            this.updateGround();
            this.checkCollisions();
        } else if (this.gameState === 'deathAnimation') {
            this.animateDeath();
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new DinoGame();
});
