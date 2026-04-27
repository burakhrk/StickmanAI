import { apiUrl } from "./env.js";
import {
    ATTACK_FAMILIES,
    accessorySchema,
    attackSchema,
    buildAccessorySystemPrompt,
    buildAttackSystemPrompt,
    buildIdeasPayload,
    DEFAULT_ATTACK_FAMILY,
    DEFAULT_ACCESSORY_IDEAS,
    getDefaultAttackIdeas,
    getAttackFamilyConfig,
} from "./ai-config.js";
import { requestStructuredJson } from "./ai-client.js";

// --- API & GAME STATE SETUP ---
    const userName = 'Player 1';

    let isGamePaused = true; // YENÄ°: BaÅŸlangÄ±Ã§ta duraklatÄ±lmÄ±ÅŸ
    let accessoryIdCounter = 0; // Aksesuar kimliklerini izlemek iÃ§in

    // --- CANVAS AND SETUP (DOM Element Declarations Consolidated Here) ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const FLOOR_Y = canvas.height - 50; 
    
    const loadingOverlay = document.getElementById('loading-overlay'); 
    const pausePlayButton = document.getElementById('pause-play-button');
    const restartButton = document.getElementById('restart-button'); // YENÄ°: Restart butonu
    const generateCodeAttackButton = document.getElementById('generate-attack-code');
    const generateCodeAccessoryButton = document.getElementById('generate-accessory-code');
    
    // REDECLARATION FIX: TÃ¼m prompt ve display elementlerini buraya taÅŸÄ±
    const attackPromptInput = document.getElementById('attack-prompt-input');
    const accessoryPromptInput = document.getElementById('accessory-prompt-input');
    const codeDisplayAttack = document.getElementById('code-display-attack');
    const codeDisplayAccessory = document.getElementById('code-display-accessory');
    const attackPanel = document.getElementById('attack-panel');
    const accessoryPanel = document.getElementById('accessory-panel');
    const attackFamilySelector = document.getElementById('attack-family-selector');
    const attackFamilyDescription = document.getElementById('attack-family-description');
    const coachKicker = document.getElementById('coach-kicker');
    const coachTitle = document.getElementById('coach-title');
    const coachBody = document.getElementById('coach-body');
    const coachStatus = document.getElementById('coach-status');
    const stepChips = Array.from(document.querySelectorAll('.step-chip'));

    
    // --- GAME CONSTANTS ---
    const GRAVITY = 0.5;
    const AIR_DRAG = 0.99;
    const GROUND_FRICTION = 0.85;

    const unsupportedAttackKeywords = [
        'kick',
        'spin kick',
        'roundhouse',
        'dropkick',
        'punch',
        'uppercut',
        'elbow',
        'knee strike',
        'headbutt',
        'slap',
        'grapple',
        'wrestling',
        'martial art',
        'karate',
        'taekwondo',
        'kung fu',
        'spinning move',
        'flip attack',
        'body slam',
        'tekme',
        'doner tekme',
        'döner tekme',
        'yumruk',
        'dirsek',
        'kafa atma',
        'gures',
        'güreş',
    ];

    let isGeneratingCode = false;
    let ideasLoadedForFamily = null;
    let ideasAreLoading = false;
    let selectedAttackFamily = DEFAULT_ATTACK_FAMILY;

    
    // --- MOUSE TRACKING ---
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // --- DYNAMIC FUNCTIONS & STATE ---
    // VarsayÄ±lan saldÄ±rÄ± fonksiyonu (Geri tepme)
    const defaultAttack = function(player, opponent, ctx, canvas, mouseX, mouseY) {
        console.log("VarsayÄ±lan geri tepme saldÄ±rÄ±sÄ± Ã§alÄ±ÅŸÄ±yor.");
        if (Math.abs(player.x - opponent.x) < 50) {
             opponent.takeDamage(5);
             opponent.vx += 10 * player.facing;
        }
        player.vx -= 2 * player.facing; // Geri tepme
    };

    let dynamicAttackFunction = defaultAttack; // BaÅŸlangÄ±Ã§ta varsayÄ±lan saldÄ±rÄ±

    // YENÄ°: Ã‡oklu Aksesuarlar Dizisi
    let currentAccessories = [];

    // YENÄ°: Mermiler ve PartikÃ¼ller dizisi
    let projectiles = [];
    window.projectiles = projectiles; // FIX: Mermi dizisini global olarak eriÅŸilebilir yap
    let particles = []; // YENÄ°: PartikÃ¼l dizisi
    let currentProjectileOwner = null;
    
    // --- AI SaldÄ±rÄ± FonksiyonlarÄ± (AI'nÄ±n Kendi SaldÄ±rÄ± MantÄ±ÄŸÄ±) ---
    // AI Temel SaldÄ±rÄ±: Basit mermi fÄ±rlatma
    const aiBasicAttack = function(ai, opponent) {
        const handRX = ai.x + (ai.facing * 15);
        const handRY = ai.y - 15;
        const speed = 15;
        const angle = Math.atan2(opponent.y - handRY, opponent.x - handRX);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const size = ai.headRadius * 0.3;
        const color = ai.color; // KÄ±rmÄ±zÄ±
        const drawCode = "ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x, y, size, 0, 2*Math.PI); ctx.fill();";
        
        currentProjectileOwner = ai;
        try {
            spawnProjectile(handRX, handRY, vx, vy, 10, size, color, drawCode,
                "p.x += p.vx; p.y += p.vy;"
            );
        } finally {
            currentProjectileOwner = null;
        }
    };

    // AI Ã–zel SaldÄ±rÄ±: Daha gÃ¼Ã§lÃ¼, yavaÅŸ mermi (Can Ã‡alma Efekti iÃ§in)
    const aiSpecialAttack = function(ai, opponent) {
        const handRX = ai.x + (ai.facing * 15);
        const handRY = ai.y - 15;
        const speed = 8;
        const angle = Math.atan2(opponent.y - handRY, opponent.x - handRX);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const size = ai.headRadius * 0.6;
        const color = '#8A2BE2'; // Mor
        const drawCode = "ctx.fillStyle=color; ctx.shadowBlur=15; ctx.shadowColor=color; ctx.beginPath(); ctx.fillRect(x-size, y-size, size*2, size*2); ctx.fill(); ctx.shadowBlur=0;";
        
        currentProjectileOwner = ai;
        try {
            spawnProjectile(handRX, handRY, vx, vy, 15, size, color, drawCode,
                // Mor bÃ¼yÃ¼ yavaÅŸ hareket eder ve yavaÅŸÃ§a yukarÄ± doÄŸru ivmelenir (BÃ¼yÃ¼ Efekti)
                "p.vx *= 0.99; p.vy *= 0.99; p.vy -= 0.1; p.x += p.vx; p.y += p.vy;"
            );
        } finally {
            currentProjectileOwner = null;
        }
    };

    let selectedDifficulty = 'easy'; // BaÅŸlangÄ±Ã§ zorluk seviyesi
    let aiLastAttackTime = 0; // AI saldÄ±rÄ± beklemesini kontrol etmek iÃ§in
    const AI_ATTACK_DELAY_BASE = 1.5; // Saniye

    
    // --- PROJECTILE CLASS ---
    class Projectile {
        /**
         * @param {string} drawCode Merminin nasÄ±l Ã§izileceÄŸini belirleyen saf Canvas kodu (x, y, size, color'a eriÅŸir)
         * @param {string} behaviorCode Merminin update mantÄ±ÄŸÄ±nÄ± belirleyen saf JS kodu (p, player, opponent, GRAVITY, FLOOR_Y'a eriÅŸir)
         */
        constructor(x, y, vx, vy, damage, size = 5, color = '#000000', drawCode = null, behaviorCode = null, owner = null) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.damage = damage;
            this.size = size;
            this.color = color;
            this.isAlive = true;
            this.drawCode = drawCode; 
            this.owner = owner;
            this.ageFrames = 0;
            this.armFrames = 2;
            this.spawnGraceFrames = 10;
            this.ownerSafeRadius = Math.max(size * 2.2, owner ? owner.headRadius * 2.2 : 0, 28);
            this.travelDistance = 0;
            const launchSpeed = Math.hypot(vx, vy);
            this.maxAgeFrames = Math.round(
                Math.min(220, Math.max(26, 34 + size * 3 + launchSpeed * 9 + damage * 1.2))
            );
            this.stagnationFrames = Math.round(Math.max(18, Math.min(this.maxAgeFrames * 0.55, 80)));
            
            this.customUpdate = null;
            if (behaviorCode && behaviorCode.length > 0) {
                try {
                    // p: mermi nesnesinin kendisi (this), player: P1, opponent: P2, GRAVITY: oyun sabiti, FLOOR_Y: zemin
                    this.customUpdate = new Function('p', 'player', 'opponent', 'GRAVITY', 'FLOOR_Y', behaviorCode);
                } catch(e) {
                    console.error("Projectile behavior function creation failed:", e);
                    this.customUpdate = null;
                }
            }
        }

        update() {
            if (!this.isAlive) return;
            this.ageFrames += 1;
            const previousX = this.x;
            const previousY = this.y;
            
            if (this.customUpdate) { // Execute custom logic
                try {
                    this.customUpdate(this, player, computer, GRAVITY, FLOOR_Y);
                } catch(e) {
                    console.error("Custom projectile update failed:", e);
                    this.isAlive = false;
                }
            } else { // Fixed logic (default)
                this.x += this.vx;
                this.y += this.vy;
                // YerÃ§ekimi yoksa lineer hareket
            }
            
            // Basit mermi Ã¶mrÃ¼/sÄ±nÄ±r kontrolÃ¼ (Ekran dÄ±ÅŸÄ±na Ã§Ä±kanlarÄ± kaldÄ±r)
            this.travelDistance += Math.hypot(this.x - previousX, this.y - previousY);

            if (this.ageFrames > this.maxAgeFrames) {
                this.isAlive = false;
            }

            if (
                this.ageFrames > this.stagnationFrames &&
                this.travelDistance < Math.max(16, this.size * 1.8)
            ) {
                this.isAlive = false;
            }

            if (this.ageFrames > 1 && (this.x < 0 || this.x > canvas.width || this.y > FLOOR_Y || this.y < 0)) {
                this.isAlive = false;
            }
        }

        draw() {
            if (!this.isAlive) return;
            ctx.save();
            
            if (this.drawCode && this.drawCode.length > 0) {
                 // Dinamik Ã§izim kodu (AI tarafÄ±ndan tanÄ±mlanÄ±rsa)
                 try {
                    // Draw code can use x/y/size/color directly or access the full projectile as `p`.
                    const opponent =
                        this.owner === player ? computer :
                        this.owner === computer ? player :
                        computer;
                    const func = new Function('ctx', 'x', 'y', 'size', 'color', 'player', 'computer', 'opponent', 'p', this.drawCode);
                    // Koda merminin mevcut konumu, boyutu, rengi ve global oyun nesneleri gonderilir.
                    func(ctx, this.x, this.y, this.size, this.color, player, computer, opponent, this);
                 } catch(e) {
                     console.error("Projectile draw error:", e);
                     this.isAlive = false; // Hata veren mermiyi kaldÄ±r
                 }
            } else {
                // VarsayÄ±lan Ã§izim: Basit daire
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
    window.Projectile = Projectile; // FIX: Projectile sÄ±nÄ±fÄ±nÄ± global olarak eriÅŸilebilir yap
    
    function normalizeProjectileBehaviorCode(code) {
        if (!code) {
            return '';
        }

        return code
            .trim()
            .replace(/^```(js|javascript)?\s*/i, '')
            .replace(/\s*```$/, '')
            .replace(/\bp\.dead\s*=\s*true\b/g, 'p.isAlive = false')
            .replace(/\bp\.dead\s*=\s*false\b/g, 'p.isAlive = true');
    }

    function splitProjectileBehaviorFromLogic(attackLogic, behaviorCode) {
        const existingBehavior = normalizeProjectileBehaviorCode(behaviorCode);

        if (existingBehavior.length > 0) {
            return {
                attackLogic,
                behaviorCode: existingBehavior,
            };
        }

        const explicitMarker = attackLogic.search(/\n\s*\/\/[^\n]*projectile behavior[^\n]*\n/i);
        if (explicitMarker !== -1) {
            return {
                attackLogic: attackLogic.slice(0, explicitMarker).trim(),
                behaviorCode: normalizeProjectileBehaviorCode(attackLogic.slice(explicitMarker)),
            };
        }

        const strayProjectileLogic = attackLogic.search(/\n\s*p\.[a-zA-Z_]/);
        if (strayProjectileLogic !== -1) {
            return {
                attackLogic: attackLogic.slice(0, strayProjectileLogic).trim(),
                behaviorCode: normalizeProjectileBehaviorCode(attackLogic.slice(strayProjectileLogic)),
            };
        }

        return {
            attackLogic,
            behaviorCode: existingBehavior,
        };
    }

    /**
     * Mermi oluÅŸturur ve fÄ±rlatÄ±r. (AI kodu bu fonksiyonu kullanmalÄ±dÄ±r)
     * @param {number} startX BaÅŸlangÄ±Ã§ X
     * @param {number} startY BaÅŸlangÄ±Ã§ Y
     * @param {number} vx Yatay HÄ±z
     * @param {number} vy Dikey HÄ±z
     * @param {number} damage Hasar (ATTACK_DAMAGE ile Ã§aÄŸÄ±rÄ±lmalÄ±)
     * @param {number} size Boyut (Opsiyonel, varsayÄ±lan 5)
     * @param {string} color Renk (Opsiyonel, varsayÄ±lan siyah)
     * @param {string} drawCode Ã–zel Ã§izim kodu (Opsiyonel)
     * @param {string} behaviorCode Ã–zel davranÄ±ÅŸ kodu (Opsiyonel)
     */
    function spawnProjectile(startX, startY, vx, vy, damage, size = 5, color = '#000000', drawCode = '', behaviorCode = '') {
        const newProjectile = new Projectile(startX, startY, vx, vy, damage, size, color, drawCode, behaviorCode, currentProjectileOwner);
        projectiles.push(newProjectile);
        // addMessage('Sistem', `Mermi fÄ±rlatÄ±ldÄ±!`, '#ff6600'); // Debug
    }
    window.spawnProjectile = spawnProjectile; // FIX: Mermi fÄ±rlatma fonksiyonunu global olarak eriÅŸilebilir yap

    // --- PARTICLE CLASS & SYSTEM (YENÄ°) ---
    class Particle {
        constructor(x, y, vx, vy, color, size, lifespan) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.size = size;
            this.lifespan = lifespan; // Saniye cinsinden
            this.age = 0;
            this.isAlive = true;
        }

        update() {
            if (!this.isAlive) return;

            this.vx *= 0.98; // Hava direnci
            this.vy += GRAVITY * 0.1; // Hafif yerÃ§ekimi
            this.x += this.vx;
            this.y += this.vy;

            this.age += 1/60; // 60 FPS varsayÄ±mÄ±
            if (this.age > this.lifespan) {
                this.isAlive = false;
            }
        }

        draw() {
            if (!this.isAlive) return;
            const alpha = 1 - (this.age / this.lifespan); // YaÅŸa baÄŸlÄ± saydamlÄ±k
            ctx.fillStyle = `rgba(${parseInt(this.color.substring(1,3), 16)}, ${parseInt(this.color.substring(3,5), 16)}, ${parseInt(this.color.substring(5,7), 16)}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Basit bir partikÃ¼l patlamasÄ± efekti oluÅŸturur.
     * @param {number} x Merkez X
     * @param {number} y Merkez Y
     * @param {number} count PartikÃ¼l sayÄ±sÄ±
     * @param {string} color Renk kodu (#RRGGBB)
     * @param {number} size Max boyut
     * @param {number} maxSpeed Max hÄ±z
     * @param {number} lifespan YaÅŸam sÃ¼resi (saniye)
     */
    function spawnParticleEffect(x, y, count = 10, color = '#FFFFFF', size = 5, maxSpeed = 5, lifespan = 0.5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * maxSpeed;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            particles.push(new Particle(x, y, vx, vy, color, size, lifespan));
        }
    }
    window.spawnParticleEffect = spawnParticleEffect; // Global olarak eriÅŸilebilir yap

    /**
     * Stickman Class
     */
    class Stickman {
        // ... Stickman class iÃ§eriÄŸi aynÄ±
        constructor(x, color, isPlayer = false) {
            this.headRadius = 15;
            this.torsoLength = 65; 
            this.limbLength = 50;
            this.fullLegLength = 80;
            this.legSegmentLength = this.fullLegLength / 2; 
            
            this.x = x; 
            this.y = FLOOR_Y - this.fullLegLength; 
            
            this.vx = 0; 
            this.vy = 0; 
            this.ax = 0; 
            this.color = color;
            this.isPlayer = isPlayer;
            this.onGround = true;
            this.moveSpeed = 0.7;
            this.maxSpeed = 5;
            this.jumpPower = 15;

            this.facing = 1; 
            this.collisionWidth = 20; 

            this.health = 100;
            this.isAlive = true;

            this.damping = 0.15; 
            
            this.head = {
                x: x, 
                y: this.y - this.torsoLength - this.headRadius
            };
            this.shoulder = {
                x: x, 
                y: this.y - this.torsoLength + 10 
            };

            this.legPhase = 0; 
            this.legAmplitude = 0.3; 
            this.legSpeed = 0.15; 
        }

        performAttack() {
            console.log("performAttack called, executing dynamicAttackFunction."); // DEBUG LOG
            const opponent = this.isPlayer ? computer : player;
            // Dinamik saldÄ±rÄ± fonksiyonunu mouseX ve mouseY ile Ã§aÄŸÄ±r
            currentProjectileOwner = this;
            try {
                dynamicAttackFunction(this, opponent, ctx, canvas, mouseX, mouseY);
            } finally {
                currentProjectileOwner = null;
            }
        }

        takeDamage(amount) {
            if (!this.isAlive) return;
            this.health -= amount;
            
            // YENÄ°: Hasar alÄ±ndÄ±ÄŸÄ±nda partikÃ¼l efekti
            spawnParticleEffect(this.x, this.y - 30, 8, '#FFA0A0', 4, 8, 0.3);

            if (this.health <= 0) {
                this.health = 0;
                this.isAlive = false;
            }
        }

        update() {
            if (!this.isAlive) {
                this.vy += GRAVITY;
                this.y += this.vy;
                
                if (this.y + this.fullLegLength >= FLOOR_Y) {
                    this.y = FLOOR_Y - this.fullLegLength;
                    this.vy = 0;
                }
                return;
            }

            this.vx += this.ax * this.moveSpeed;

            if (this.onGround) {
                this.vx *= GROUND_FRICTION;
            } else {
                this.vx *= AIR_DRAG;
            }

            this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));

            // Facing Update
            if (this.isPlayer) {
                this.facing = (mouseX > this.x) ? 1 : -1;
            } else {
                // Basit AI Facing (P2)
                 if (player.x > this.x && player.x - this.x > 10) {
                    this.facing = 1;
                } else if (player.x < this.x && this.x - player.x > 10) {
                    this.facing = -1;
                }
                
                // Basit AI Hareketi - ArtÄ±k updateComputerAI fonksiyonunda
            }

            this.vy += GRAVITY;
            this.x += this.vx;
            this.y += this.vy;

            const feetY = this.y + this.fullLegLength;
            
            if (feetY >= FLOOR_Y) {
                this.y = FLOOR_Y - this.fullLegLength; 
                this.vy = 0; 
                this.onGround = true;

                if (Math.abs(this.vx) < 0.1) {
                    this.vx = 0;
                }
            } else {
                this.onGround = false;
            }

            // Boundary checks
            const maxRight = canvas.width - 50;
            const maxLeft = 50;
            if (this.x < maxLeft) {
                this.x = maxLeft;
                this.vx = 0;
            } else if (this.x > maxRight) {
                this.x = maxRight;
                this.vx = 0;
            }
            
            // Walk/Run phase
            if (this.onGround && Math.abs(this.vx) > 0.5) {
                this.legPhase += Math.abs(this.vx) * this.legSpeed;
            } else {
                this.legPhase *= 0.9;
            }

            // Jiggly Physics Update
            const faceOffset = this.facing * 5; 
            const targetHeadX = this.x + faceOffset;
            const targetHeadY = this.y - this.torsoLength - this.headRadius; 
            const targetShoulderY = targetHeadY + this.headRadius + 10;
            
            this.head.x += (targetHeadX - this.head.x) * this.damping;
            this.head.y += (targetHeadY - this.head.y) * this.damping;
            this.shoulder.y += (targetShoulderY - this.shoulder.y) * this.damping;
            this.shoulder.x += (targetHeadX - this.shoulder.x) * this.damping;

            // Yapay eksen sÄ±fÄ±rlama, AI iÃ§in deÄŸil, sadece P1 iÃ§in AX kontrolÃ¼nÃ¼ koru
            if (this.isPlayer) {
                this.ax = 0;
            }
        }

        draw() {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            
            if (!this.isAlive) {
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.7)'; 
            }

            const hipY = this.y;
            const headX = this.head.x;
            const headY = this.head.y;
            const shoulderX = this.shoulder.x;
            const shoulderY = this.shoulder.y;

            const drawHipX = this.x + (this.facing * 3);
            
            const tiltAngle = -this.vx * 0.015; 

            // 1. Head (Kafa)
            ctx.beginPath();
            ctx.arc(headX, headY, this.headRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Orijinal renk ayarlarÄ±na geri dÃ¶n
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            if (!this.isAlive) {
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.7)'; 
            }
            
            // 2. Torso (GÃ¶vde)
            ctx.beginPath();
            ctx.moveTo(shoulderX, shoulderY);
            ctx.lineTo(drawHipX, hipY); 
            ctx.stroke();

            // 3. Legs (Ä°ki ParÃ§alÄ± Bacaklar)
            const legSegment = this.legSegmentLength;
            const hipOffset = 5; 
            
            let leftLegAngle = Math.PI / 2; 
            let rightLegAngle = Math.PI / 2;

            if (this.isAlive) {
                if (this.onGround) {
                    leftLegAngle += Math.sin(this.legPhase) * this.legAmplitude;
                    rightLegAngle += Math.sin(this.legPhase + Math.PI) * this.legAmplitude;
                }
                if (!this.onGround) {
                    const jumpBend = Math.PI / 4; 
                    leftLegAngle = Math.PI / 2 + jumpBend;
                    rightLegAngle = Math.PI / 2 + jumpBend;
                }
            } else {
                leftLegAngle = Math.PI / 2 + Math.PI / 3;
                rightLegAngle = Math.PI / 2 + Math.PI / 3;
            }
            
            // Sol Bacak
            const kneeLX = drawHipX - hipOffset + Math.cos(leftLegAngle) * legSegment * 0.2; 
            const kneeLY = hipY + Math.sin(leftLegAngle) * legSegment; 
            let footLX = kneeLX + Math.cos(leftLegAngle + Math.PI / 10) * legSegment;
            let footLY = kneeLY + Math.sin(leftLegAngle + Math.PI / 10) * legSegment; 
            if (this.onGround && this.isAlive) { footLY = FLOOR_Y; }
            ctx.beginPath(); ctx.moveTo(drawHipX - hipOffset, hipY); ctx.lineTo(kneeLX, kneeLY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(kneeLX, kneeLY); ctx.lineTo(footLX, footLY); ctx.stroke();


            // SaÄŸ Bacak
            const kneeRX = drawHipX + hipOffset + Math.cos(rightLegAngle) * legSegment * 0.2; 
            const kneeRY = hipY + Math.sin(rightLegAngle) * legSegment; 
            let footRX = kneeRX + Math.cos(rightLegAngle + Math.PI / 10) * legSegment;
            let footRY = kneeRY + Math.sin(rightLegAngle + Math.PI / 10) * legSegment; 
            if (this.onGround && this.isAlive) { footRY = FLOOR_Y; }
            ctx.beginPath(); ctx.moveTo(drawHipX + hipOffset, hipY); ctx.lineTo(kneeRX, kneeRY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(kneeRX, kneeRY); ctx.lineTo(footRX, footRY); ctx.stroke();


            // 4. Arms (Kollar - Hedefleme)
            const targetX = this.isPlayer ? mouseX : player.head.x;
            const targetY = this.isPlayer ? mouseY : player.head.y;
            const angleToTarget = Math.atan2(targetY - shoulderY, targetX - shoulderX);
            const armOffsetAngle = Math.PI / 12;
            const armLength = this.limbLength * 1.5;

            const leftArmAngle = angleToTarget - armOffsetAngle;
            const rightArmAngle = angleToTarget + armOffsetAngle;
            
            // Left Arm
            const handLX = shoulderX + Math.cos(leftArmAngle) * armLength;
            const handLY = shoulderY + Math.sin(leftArmAngle) * armLength;
            ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(handLX, handLY); ctx.stroke();

            // Right Arm
            const handRX = shoulderX + Math.cos(rightArmAngle) * armLength;
            const handRY = shoulderY + Math.sin(rightArmAngle) * armLength;
            ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(handRX, handRY); ctx.stroke();

            // Sadece P1 iÃ§in dinamik aksesuar Ã§izimi
            // Buradaki logic P1'in aksesuarlarÄ±nÄ± Ã§izer
            if (this.isPlayer) {
                ctx.fillStyle = this.isAlive ? '#374151' : 'transparent';
                ctx.beginPath();
                ctx.arc(handRX, handRY, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // --- YENÄ° KONUM HESAPLAMALARI ---
                const wristLength = armLength * 0.6; // Omuzdan bileÄŸe olan uzaklÄ±k (Ã¶r: %60)
                const wristRX = shoulderX + Math.cos(rightArmAngle) * wristLength;
                const wristRY = shoulderY + Math.sin(rightArmAngle) * wristLength;
                
                const neckX = shoulderX;
                const neckY = shoulderY - 5;
                
                const eyeX = headX + (this.facing * 5); // Basit gÃ¶z pozisyonu
                const eyeY = headY;
                
                const headTopX = headX;
                const headTopY = headY - this.headRadius - 5; // Kafa Ã¼stÃ¼ (5 birim yukarÄ±)
                
                // YENÄ°: SÄ±rt Ã‡antasÄ± Konumu (GÃ¶vde merkezinden 8 birim geride, omuz hizasÄ±nda)
                const backX = this.x - (this.facing * 8); 
                const backY = shoulderY + 5; 

                // --- DYNAMIC ACCESSORY DRAWING ---
                const accessoryScale = this.headRadius / 15; // Ã–lÃ§ek faktÃ¶rÃ¼nÃ¼ hesapla
                
                // YENÄ°: Hata yakalama ve kaldÄ±rma iÃ§in dizi
                const accessoriesToRemove = [];

                currentAccessories.forEach((accessory, index) => {
                    
                    let accessoryX, accessoryY;
                    let accessoryAngle = 0; 
                    let drawOnBothFeet = false;

                    // KonumlandÄ±rma MantÄ±ÄŸÄ±
                    if (accessory.location === 'head') {
                        accessoryX = headX;
                        accessoryY = headY;
                        accessoryAngle = tiltAngle; 
                    } else if (accessory.location === 'head_top') {
                        accessoryX = headTopX;
                        accessoryY = headTopY;
                        accessoryAngle = tiltAngle; 
                    } else if (accessory.location === 'eyes') {
                        accessoryX = eyeX;
                        accessoryY = eyeY;
                        accessoryAngle = tiltAngle; 
                    } else if (accessory.location === 'neck') {
                        accessoryX = neckX;
                        accessoryY = neckY;
                        accessoryAngle = tiltAngle; 
                    } else if (accessory.location === 'hand') {
                        accessoryX = handRX; // SaÄŸ el
                        accessoryY = handRY;
                    } else if (accessory.location === 'wrist') {
                        accessoryX = wristRX; // SaÄŸ bilek
                        accessoryY = wristRY;
                        accessoryAngle = angleToTarget; 
                    } else if (accessory.location === 'torso') {
                        accessoryX = shoulderX;
                        accessoryY = shoulderY + 5; 
                        accessoryAngle = tiltAngle; 
                    } else if (accessory.location === 'back') { // YENÄ° KONUM
                        accessoryX = backX;
                        accessoryY = backY; 
                        accessoryAngle = tiltAngle; 
                    } else if (accessory.location === 'foot') {
                        drawOnBothFeet = true;
                    }
                    
                    // AksesuarÄ± Ã§iz
                    try {
                        if (drawOnBothFeet) {
                            // Sol Ayak
                            ctx.save();
                            ctx.translate(footLX, footLY);
                            accessory.code(this, ctx, 0, 0, 0, accessoryScale); 
                            ctx.restore();
                            // SaÄŸ Ayak
                            ctx.save();
                            ctx.translate(footRX, footRY);
                            accessory.code(this, ctx, 0, 0, 0, accessoryScale); 
                            ctx.restore();
                        } else {
                            // DiÄŸer tÃ¼m konumlar
                            ctx.save();
                            ctx.translate(accessoryX, accessoryY);
                            ctx.rotate(accessoryAngle);
                            // Koda x=0, y=0 gÃ¶nderildiÄŸi iÃ§in translate'i burada yapÄ±yoruz
                            accessory.code(this, ctx, 0, 0, accessoryAngle, accessoryScale); 
                            ctx.restore();
                        }
                    } catch (e) {
                        console.error(`ERROR drawing accessory ${accessory.description}:`, e);
                        accessoriesToRemove.push(accessory.id);
                    }
                });

                // HatalÄ± aksesuarlarÄ± dÃ¶ngÃ¼ dÄ±ÅŸÄ±nda kaldÄ±r
                if (accessoriesToRemove.length > 0) {
                    currentAccessories = currentAccessories.filter(acc => !accessoriesToRemove.includes(acc.id));
                    renderAccessoryList();
                    addMessage('System', `${accessoriesToRemove.length} broken accessory items were removed. Please check the console.`, '#b91c1c');
                }
            }
        }

        move(direction) {
            if (!this.isAlive || isGamePaused) return; // DuraklatÄ±lmÄ±ÅŸsa hareket etme

            if (direction === 'left') {
                this.ax = -1;
            } else if (direction === 'right') {
                this.ax = 1;
            } else if (direction === 'jump' && this.onGround) {
                this.vy = -this.jumpPower; 
                this.onGround = false;
            }
        }
    }

    // --- GAME OBJECTS ---
    const player = new Stickman(150, '#10b981', true); 
    const computer = new Stickman(canvas.width - 150, '#ef4444', false); 
    
    // --- YENÄ°: OYUN DURUMUNU SIFIRLAMA FONKSÄ°YONU ---
    function restartGame() {
        // Karakter pozisyon ve can sÄ±fÄ±rlama
        player.health = 100;
        player.isAlive = true;
        player.x = 150;
        player.y = FLOOR_Y - player.fullLegLength;
        player.vx = 0;
        player.vy = 0;
        
        computer.health = 100;
        computer.isAlive = true;
        computer.x = canvas.width - 150;
        computer.y = FLOOR_Y - computer.fullLegLength;
        computer.vx = 0;
        computer.vy = 0;

        // Mermileri ve PartikÃ¼lleri temizle
        projectiles = [];
        particles = [];
        
        // Dinamik iÃ§eriÄŸi sÄ±fÄ±rla (SaldÄ±rÄ± ve Ekipmanlar)
        resetAttack({ pauseGame: false, quiet: true });
        
        // Oyun durumunu baÅŸlat
        isGamePaused = false;
        pausePlayButton.textContent = 'Pause Match';
        // Buton rengini sadece metin deÄŸiÅŸtirme durumunda ayarlÄ±yoruz, aksi halde CSS gradient kullanacak
        // pausePlayButton.style.backgroundColor = '#059669'; 
        addMessage('System', `Game restarted. Difficulty: ${selectedDifficulty.toUpperCase()}`, '#059669');
        updateCoachState();
        requestAnimationFrame(gameLoop);
    }


    // --- COLLISION HANDLER ---
    function handleStickmanCollision(s1, s2) {
        if (!s1.isAlive || !s2.isAlive) return;

        const dx = s1.x - s2.x;
        const distance = Math.abs(dx);
        const requiredSeparation = s1.collisionWidth + s2.collisionWidth; 

        if (distance < requiredSeparation) {
            const overlap = requiredSeparation - distance;

            if (dx > 0) {
                s1.x += overlap / 2;
                s2.x -= overlap / 2;
            } else {
                s1.x -= overlap / 2;
                s2.x += overlap / 2;
            }

            const bounce = 0.5;
            const totalVX = s1.vx - s2.vx;
            
            s1.vx -= totalVX * bounce;
            s2.vx += totalVX * bounce;
            
            if (Math.abs(s1.vx) < 0.1) s1.vx = 0;
            if (Math.abs(s2.vx) < 0.1) s2.vx = 0;
        }
    }


    // --- DRAW UI / HEALTH BARS ---
    function drawHealthBars() {
        const BAR_WIDTH = 180;
        const BAR_HEIGHT = 20;
        const MARGIN = 20;
        
        // --- Player 1 (Sol Alt) ---
        const p1X = MARGIN;
        const p1Y = canvas.height - MARGIN - BAR_HEIGHT;
        const p1HealthPercent = player.health / 100;

        ctx.fillStyle = '#374151'; 
        ctx.fillRect(p1X, p1Y, BAR_WIDTH, BAR_HEIGHT);

        ctx.fillStyle = player.isAlive ? '#10b981' : '#b91c1c'; 
        ctx.fillRect(p1X, p1Y, BAR_WIDTH * p1HealthPercent, BAR_HEIGHT);
        
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.strokeRect(p1X, p1Y, BAR_WIDTH, BAR_HEIGHT);

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`${userName} Health: ${player.health}`, p1X + 5, p1Y + 15);


        // --- Computer (SaÄŸ Alt) ---
        const p2X = canvas.width - BAR_WIDTH - MARGIN;
        const p2Y = canvas.height - MARGIN - BAR_HEIGHT;
        const p2HealthPercent = computer.health / 100;

        ctx.fillStyle = '#374151';
        ctx.fillRect(p2X, p2Y, BAR_WIDTH, BAR_HEIGHT);

        ctx.fillStyle = computer.isAlive ? '#ef4444' : '#10b981';
        ctx.fillRect(p2X + BAR_WIDTH * (1 - p2HealthPercent), p2Y, BAR_WIDTH * p2HealthPercent, BAR_HEIGHT);
        
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.strokeRect(p2X, p2Y, BAR_WIDTH, BAR_HEIGHT);
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(`AI Health: ${computer.health}`, p2X + BAR_WIDTH - 5, p2Y + 15);
    }


    // --- INPUT HANDLING ---
    const keys = {};

    // DEBUG LOG: Mousedown olayÄ±nÄ±n tetiklenip tetiklenmediÄŸini kontrol et
    canvas.addEventListener('mousedown', (e) => {
        console.log(`Mouse Down: Button=${e.button}, isAlive=${player.isAlive}, isPaused=${isGamePaused}`); 
        if (e.button === 0 && player.isAlive && !isGamePaused) { 
            player.performAttack();
        }
    });

    window.addEventListener('keydown', (e) => {
        // Kontrol alanlarÄ±nÄ±n dÄ±ÅŸÄ±nda basÄ±lan tuÅŸlarÄ± yakala
        if (document.activeElement.id !== 'attack-prompt-input' && document.activeElement.id !== 'accessory-prompt-input' && !isGamePaused) {
            keys[e.key.toUpperCase()] = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toUpperCase()] = false;
    });

    const debugOutput = document.getElementById('debug-output');
    const clearDebugButton = document.getElementById('clear-debug-button');

    function normalizeConsoleArgs(args) {
        return args.map((item) => {
            if (item instanceof Error) {
                return item.stack || item.message;
            }

            if (typeof item === 'string') {
                return item;
            }

            try {
                return JSON.stringify(item);
            } catch (error) {
                return String(item);
            }
        }).join(' ');
    }

    function addMessage(sender, text, color) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';

        const label = document.createElement('strong');
        label.style.color = color;
        label.textContent = `${sender}:`;

        const body = document.createElement('span');
        body.textContent = ` ${text}`;

        messageElement.appendChild(label);
        messageElement.appendChild(body);
        debugOutput.appendChild(messageElement);
        debugOutput.scrollTop = debugOutput.scrollHeight;
    }
    window.addMessage = addMessage;

    const originalConsoleWarn = console.warn.bind(console);
    const originalConsoleError = console.error.bind(console);

    console.warn = (...args) => {
        originalConsoleWarn(...args);
        addMessage('Warn', normalizeConsoleArgs(args), '#f59e0b');
    };

    console.error = (...args) => {
        originalConsoleError(...args);
        addMessage('Error', normalizeConsoleArgs(args), '#ef4444');
    };

    window.addEventListener('error', (event) => {
        if (event.error) {
            addMessage('Runtime', event.error.stack || event.error.message, '#ef4444');
        } else if (event.message) {
            addMessage('Runtime', event.message, '#ef4444');
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason instanceof Error
            ? event.reason.stack || event.reason.message
            : normalizeConsoleArgs([event.reason]);
        addMessage('Promise', reason, '#ef4444');
    });

    clearDebugButton.addEventListener('click', () => {
        debugOutput.innerHTML = '';
        addMessage('System', 'Debug log cleared.', '#9ca3af');
    });

    addMessage('System', 'Debug log ready.', '#9ca3af');

    function isUnsupportedAttackPrompt(promptText) {
        const normalizedPrompt = promptText.toLocaleLowerCase('tr-TR');
        return unsupportedAttackKeywords.some((keyword) => normalizedPrompt.includes(keyword));
    }

    function hasPromptValue(input) {
        return input.value.trim().length > 0;
    }

    function syncPromptCtaState() {
        const attackReady = hasPromptValue(attackPromptInput);
        const accessoryReady = hasPromptValue(accessoryPromptInput);

        attackPromptInput.classList.toggle('has-value', attackReady);
        accessoryPromptInput.classList.toggle('has-value', accessoryReady);
        attackPanel.classList.toggle('is-prompt-ready', attackReady);
        accessoryPanel.classList.toggle('is-prompt-ready', accessoryReady);
        generateCodeAttackButton.classList.toggle('is-ready-to-generate', attackReady && !generateCodeAttackButton.disabled);
        generateCodeAccessoryButton.classList.toggle('is-ready-to-generate', accessoryReady && !generateCodeAccessoryButton.disabled);
    }

    function updateAttackFamilyUi() {
        const activeFamily = getAttackFamilyConfig(selectedAttackFamily);
        attackFamilyDescription.textContent = activeFamily.summary;
        attackPromptInput.placeholder = `Example: ${activeFamily.examples[0]}`;

        Array.from(attackFamilySelector.querySelectorAll('.family-button')).forEach((button) => {
            button.classList.toggle('active', button.dataset.family === selectedAttackFamily);
        });

        syncPromptCtaState();
    }

    function handleAttackFamilyChange(nextFamily) {
        if (nextFamily === selectedAttackFamily) {
            return;
        }

        selectedAttackFamily = nextFamily;
        ideasLoadedForFamily = null;
        updateAttackFamilyUi();
        updateCoachState();
        addMessage('System', `${getAttackFamilyConfig(nextFamily).label} family selected for new attacks.`, '#38bdf8');
        fetchCreativeIdeas();
    }

    function renderAttackFamilySelector() {
        attackFamilySelector.innerHTML = '';

        ATTACK_FAMILIES.forEach((family) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'family-button';
            button.dataset.family = family.id;
            button.textContent = family.shortLabel;
            button.title = family.summary;
            button.addEventListener('click', () => handleAttackFamilyChange(family.id));
            attackFamilySelector.appendChild(button);
        });

        updateAttackFamilyUi();
    }

    function hasCustomAttackLoaded() {
        return dynamicAttackFunction !== defaultAttack;
    }

    function setActiveTargets(targetIds) {
        ['attack-panel', 'accessory-panel', 'pause-play-button', 'generate-attack-code', 'generate-accessory-code', 'gameCanvas', 'attack-prompt-input', 'accessory-prompt-input']
            .forEach((id) => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.toggle('is-active-target', targetIds.includes(id));
                }
            });
    }

    function updateStepRail(activeStep) {
        const order = ['family', 'attack', 'start', 'fight'];
        const activeIndex = order.indexOf(activeStep);

        stepChips.forEach((chip) => {
            const stepIndex = order.indexOf(chip.dataset.stepId);
            chip.classList.toggle('is-active-step', chip.dataset.stepId === activeStep);
            chip.classList.toggle('is-complete-step', stepIndex !== -1 && activeIndex !== -1 && stepIndex < activeIndex);
        });
    }

    function updateCoachState() {
        const attackPromptReady = hasPromptValue(attackPromptInput);
        let activeStep = 'family';
        let title = 'Pick family';
        let body = 'Pick a family, generate one attack, then start the match.';
        let kicker = 'Step 1';
        let status = 'Setup';
        let targets = ['attack-panel', 'attack-prompt-input'];

        if (isGeneratingCode) {
            activeStep = 'attack';
            title = 'Building';
            body = 'The match is paused while the loadout is being built.';
            kicker = 'Step 2';
            status = 'Build';
            targets = ['attack-panel', 'accessory-panel'];
        } else if (!hasCustomAttackLoaded() && attackPromptReady) {
            activeStep = 'attack';
            title = 'Generate';
            body = 'Your prompt is ready. Generate the attack.';
            kicker = 'Step 2';
            status = 'Ready';
            targets = ['attack-prompt-input', 'generate-attack-code'];
        } else if (!hasCustomAttackLoaded()) {
            activeStep = 'family';
        } else if (isGamePaused) {
            activeStep = 'start';
            title = 'Start';
            body = 'Your attack is loaded. Press Start Match and test it.';
            kicker = 'Step 3';
            status = 'Ready';
            targets = ['pause-play-button', 'gameCanvas'];
        } else {
            activeStep = 'fight';
            title = 'Live';
            body = 'Attack live, then pause to swap family or regenerate.';
            kicker = 'Step 4';
            status = 'Live';
            targets = ['pause-play-button', 'gameCanvas'];
        }

        coachKicker.textContent = kicker;
        coachTitle.textContent = title;
        coachBody.textContent = body;
        coachStatus.textContent = status;
        updateStepRail(activeStep);
        setActiveTargets(targets);
    }

    [attackPromptInput, accessoryPromptInput].forEach((input) => {
        input.addEventListener('input', () => {
            syncPromptCtaState();
            updateCoachState();
        });
    });
    
    // --- ACCESSORY RENDERING & REMOVAL ---
    // const codeDisplayAccessory = document.getElementById('code-display-accessory'); // Redundant const removed

    function renderAccessoryList() {
        if (currentAccessories.length === 0) {
            codeDisplayAccessory.innerHTML = 'No gear loaded.';
            return;
        }

        codeDisplayAccessory.innerHTML = ''; // Temizle
        
        currentAccessories.forEach(accessory => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'accessory-item';
            itemDiv.setAttribute('data-id', accessory.id);

            const descSpan = document.createElement('span');
            // Konum bilgisini kÄ±saltarak gÃ¶ster
            const locationMap = {
                'head': 'Head', 
                'head_top': 'Top of Head (Hat)', 
                'eyes': 'Eyes (Glasses)', 
                'neck': 'Neck (Necklace)', 
                'hand': 'Hand (Weapon)', 
                'wrist': 'Wrist (Watch)', 
                'torso': 'Torso (Armor)', 
                'back': 'Back (Bag)', 
                'foot': 'Foot (Shoe)'
            };
            const locationText = locationMap[accessory.location] || accessory.location;
            
            // SaldÄ±rÄ± EkipmanÄ± ise ek bir bilgi ekle
            const equipmentTag = accessory.isAttackEquipment ? ' [Attack Gear]' : '';
            descSpan.textContent = `[${locationText}] ${accessory.description.split(' (Equipment)')[0]}${equipmentTag}`;
            
            const removeButton = document.createElement('span');
            removeButton.className = 'remove-accessory';
            removeButton.textContent = 'Remove';
            
            // KaldÄ±rma iÅŸlemi
            removeButton.onclick = function() {
                if (accessory.isAttackEquipment) {
                    resetAttack();
                    return;
                }
                // Diziden bu ID'ye sahip aksesuarÄ± filtrele
                currentAccessories = currentAccessories.filter(a => a.id !== accessory.id);
                renderAccessoryList(); // Listeyi yeniden Ã§iz
                addMessage('System', `Accessory "${accessory.description.split(' (Equipment)')[0]}" removed.`, '#059669');
            };

            itemDiv.appendChild(descSpan);
            itemDiv.appendChild(removeButton);
            codeDisplayAccessory.appendChild(itemDiv);
        });
    }

    // --- ATTACK RESET FUNCTION (YENÄ°) ---
    function resetAttack(options = {}) {
        const { pauseGame = true, quiet = false } = options;
        const wasRunning = !isGamePaused;

        if (pauseGame) {
            isGamePaused = true;
            pausePlayButton.textContent = 'Start Match';
            loadingOverlay.classList.add('hidden');
            if (wasRunning && !quiet) {
                addMessage('System', 'Game paused so you can edit the attack.', '#3b82f6');
            }
        }
        // Dinamik saldÄ±rÄ± fonksiyonunu varsayÄ±lana ayarla
        dynamicAttackFunction = defaultAttack;
        // SaldÄ±rÄ± ekipmanlarÄ±nÄ± kaldÄ±r
        currentAccessories = currentAccessories.filter(acc => !acc.isAttackEquipment);
        renderAttackFamilySelector();
        renderAccessoryList();
        
        // const codeDisplayAttack = document.getElementById('code-display-attack'); // Redundant const removed
        codeDisplayAttack.textContent = "Default attack loaded.";
        addMessage('System', 'Attack mechanic reset to default. Your weapon was removed.', '#ef4444');
        fetchCreativeIdeas();
        syncPromptCtaState();
        updateCoachState();
    }

    // FIX: resetAttack fonksiyonunu inline onclick iÃ§in global hale getir
    window.resetAttack = resetAttack; 

    document.getElementById('reset-attack-button').addEventListener('click', resetAttack);

    // --- PAUSE/PLAY TOGGLE (YENÄ°) ---
    function togglePausePlay() {
        // EÄŸer oyun bitmiÅŸse, yeniden baÅŸlatma fonksiyonunu Ã§aÄŸÄ±r
        if (!player.isAlive || !computer.isAlive) {
            restartGame();
            return;
        }

        isGamePaused = !isGamePaused;
        if (isGamePaused) {
            pausePlayButton.textContent = 'Start Match';
            addMessage('System', 'Game paused. Controls are disabled.', '#3b82f6');
            fetchCreativeIdeas();
        } else {
            pausePlayButton.textContent = 'Pause Match';
            addMessage('System', 'Game started. Have fun!', '#059669');
            // Oyun duraklatÄ±lmÄ±ÅŸken dÃ¶ngÃ¼ durduysa, tekrar baÅŸlat
            requestAnimationFrame(gameLoop); 
        }
        updateCoachState();
    }

    pausePlayButton.addEventListener('click', togglePausePlay);
    // YENÄ°: Restart butonu click olayÄ±nÄ± restartGame fonksiyonuna baÄŸla
    restartButton.addEventListener('click', restartGame);


    // --- GENERIC LLM CODE GENERATION FUNCTION ---
    async function generateCode(promptElement, codeDisplayElement, buttonElement, schemaType, systemPrompt, successMessage) {
        const promptText = promptElement.value.trim();
        if (!promptText) {
            console.error("Please enter a description.");
            return;
        }

        if (schemaType === 'attack' && isUnsupportedAttackPrompt(promptText)) {
            codeDisplayElement.innerHTML = `
                <strong>Unsupported attack style.</strong><br>
                Please request a weapon, projectile, gadget, or magic-based attack instead.<br>
                Examples: lightsaber, plasma rifle, magic spell, arc cannon, fire staff.
            `;
            addMessage('System', 'Physical move attacks like kicks or punches are blocked. Please use weapons, projectiles, gadgets, or spells instead.', '#f59e0b');
            return;
        }
        
        // OYUNU DURAKLAT VE BUTONU DEVRE DIÅžI BIRAK
        // FIX: KarÅŸÄ±lÄ±klÄ± butonlarÄ± da deaktif et
        isGamePaused = true; 
        isGeneratingCode = true;
        updateCoachState();
        
        // YENÄ°: YÃ¼kleme mesajÄ±nÄ± gÃ¼ncelle
        loadingOverlay.textContent = schemaType === 'attack' ? 'Generating attack...' : 'Generating accessory...';
        loadingOverlay.classList.remove('hidden');
        
        buttonElement.disabled = true; 
        if (schemaType === 'attack') {
            generateCodeAccessoryButton.disabled = true;
        } else if (schemaType === 'accessory') {
            generateCodeAttackButton.disabled = true;
        }
        syncPromptCtaState();

        let responseSchema = null;
        let contextData = {};
        
        if (schemaType === 'accessory') {
            responseSchema = accessorySchema;
            contextData = {
                headRadius: player.headRadius,
                torsoLength: player.torsoLength,
                fullLegLength: player.fullLegLength,
                limbLength: player.limbLength,
                facing: player.facing, 
            };
        } else if (schemaType === 'attack') {
            responseSchema = attackSchema;
        }
        
        let userQuery = `Generate the JavaScript code for the following description: ${promptText}`;

        if (schemaType === 'accessory') {
            userQuery = `The stickman currently has the following physical dimensions: ${JSON.stringify(contextData)}. Based on this context and the user's request: ${promptText}, generate the accessory code.`;
        } else if (schemaType === 'attack') {
             userQuery = `Based on the user's request: ${promptText}, generate a weapon, projectile, gadget, or magic-based attack in the required JSON format. If the request sounds like a body move, reinterpret it as a combat tool instead of animating the full character body.`;
        }

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        if (responseSchema) {
            payload.generationConfig = {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            };
        }

        let responseText = null;

        try {
            const result = await requestStructuredJson(apiUrl, payload);
            responseText = result.data;
        } catch (error) {
            console.error("API request failed:", error);
            codeDisplayElement.innerHTML = `<strong>AI Error:</strong><br>${error.message}`;
            addMessage('System', `AI error: ${error.message}`, '#b91c1c');
        }
        
        // KOD OLUÅžUMU BÄ°TTÄ°ÄžÄ°NDE OYUN PAUSE KALACAK.
        isGamePaused = true; 
        isGeneratingCode = false;
        loadingOverlay.classList.add('hidden');
        // FIX: KarÅŸÄ±lÄ±klÄ± butonlarÄ± tekrar aktif et
        generateCodeAttackButton.disabled = false;
        generateCodeAccessoryButton.disabled = false;
        syncPromptCtaState();
        fetchCreativeIdeas();
        
        if (responseText) {
            
            if (schemaType === 'accessory') {
                // --- Aksesuar Ä°ÅŸleme MantÄ±ÄŸÄ± (JSON ARRAY) ---
                const accessoryPayload = Array.isArray(responseText)
                    ? { accessories: responseText }
                    : responseText;
                const accessoriesToProcess = Array.isArray(accessoryPayload?.accessories)
                    ? accessoryPayload.accessories
                    : accessoryPayload?.javascriptCode && accessoryPayload?.targetLocation
                        ? [accessoryPayload]
                    : [];

                let accessoriesAdded = 0;
                
                for (const acc of accessoriesToProcess) {
                    if (acc.javascriptCode && acc.targetLocation) {
                        let rawCode = acc.javascriptCode.trim();
                        const targetLocation = acc.targetLocation;
                        const description = acc.description || promptText;

                         // AGRESÄ°F KOD TEMÄ°ZLEME: Fonksiyon sarmalayÄ±cÄ±larÄ±nÄ± temizle
                        const openBraceIndex = rawCode.indexOf('{');
                        const closeBraceIndex = rawCode.lastIndexOf('}');

                        if (openBraceIndex !== -1 && closeBraceIndex !== -1 && closeBraceIndex > openBraceIndex) {
                            rawCode = rawCode.substring(openBraceIndex + 1, closeBraceIndex).trim();
                        } else if (rawCode.startsWith('(') && rawCode.endsWith(')')) {
                            rawCode = rawCode.substring(1, rawCode.length - 1).trim();
                        }
                        rawCode = rawCode.trim(); 

                        // *** FIX: xPos/yPos'u x/y ile otomatik dÃ¼zelt ***
                        rawCode = rawCode.replace(/xPos/g, 'x').replace(/yPos/g, 'y');

                        try {
                             // Parametreler: player, ctx, x, y, angle, scale
                             const newFunc = new Function('player', 'ctx', 'x', 'y', 'angle', 'scale', rawCode);
                             
                             const newAccessory = {
                                 id: 'acc_' + accessoryIdCounter++, // Benzersiz ID
                                 description: description.length > 50 ? description.substring(0, 47) + '...' : description,
                                 code: newFunc,
                                 location: targetLocation
                             };

                             currentAccessories.push(newAccessory);
                             accessoriesAdded++;

                        } catch (e) {
                            codeDisplayElement.innerHTML = `<strong>CODE ERROR (Accessory #${accessoriesAdded + 1}):</strong><br>Error: ${e.message}<br>Raw code:<pre class="debug-code-section" style="color: #f87171;">${rawCode}</pre>`;
                            addMessage('System', `The AI-generated code is invalid. Error: ${e.message}`, '#b91c1c');
                            return; 
                        }
                    } else {
                        console.error("Accessory object is missing required fields (javascriptCode or targetLocation):", acc);
                        
                        codeDisplayElement.innerHTML = `<strong>ERROR:</strong> The AI returned an object missing required fields (${acc.javascriptCode ? '' : 'javascriptCode,'} ${acc.targetLocation ? '' : 'targetLocation'}). Please check the console.`;
                        addMessage('System', `AI structure error: ${(acc.description || 'Unnamed accessory')} was rejected.`, '#b91c1c');
                    }
                }
                
                if (accessoriesAdded > 0) {
                    renderAccessoryList(); 
                    addMessage('System', `Successfully loaded ${accessoriesAdded} new accessory items.`, '#059669');
                } else {
                    console.error("API returned a structure that resulted in 0 valid accessories (Accessories Array):", responseText);

                    codeDisplayElement.innerHTML = `<strong>Error:</strong> The API did not return valid accessory code. (0 items loaded)<br>Please check the console.`;
                    addMessage('System', 'The API returned a response without valid accessory code.', '#b91c1c');
                }
            } else if (schemaType === 'attack') {
                // --- SaldÄ±rÄ± Ä°ÅŸleme MantÄ±ÄŸÄ± (JSON OBJECT) ---
                const attackData = responseText;
                let drawCode = attackData.requiredEquipmentDrawCode || '';
                let behaviorCode = attackData.projectileBehaviorCode || ''; // YENÄ°: DavranÄ±ÅŸ kodu
                let attackLogic = attackData.javascriptCode || '';
                const attackDescription = attackData.description || 'Unnamed Attack';
                
                // Kodu temizle
                attackLogic = attackLogic.trim().replace(/^```(js|javascript)?\s*/i, '').replace(/\s*```$/, '');
                drawCode = drawCode.trim().replace(/^```(js|javascript)?\s*/i, '').replace(/\s*```$/, '');
                behaviorCode = normalizeProjectileBehaviorCode(behaviorCode);

                const attackCodeSections = splitProjectileBehaviorFromLogic(attackLogic, behaviorCode);
                attackLogic = attackCodeSections.attackLogic;
                behaviorCode = attackCodeSections.behaviorCode;
                
                // 1. Ã–nceki saldÄ±rÄ± ekipmanÄ±nÄ± kaldÄ±r
                currentAccessories = currentAccessories.filter(acc => !acc.isAttackEquipment);

                if (drawCode.trim().length > 0) {
                    // FIX: xPos/yPos'u x/y ile otomatik dÃ¼zelt
                    let fixedDrawCode = drawCode.replace(/xPos/g, 'x').replace(/yPos/g, 'y');
                    // Gelen kodun iÃ§indeki satÄ±r sonlarÄ±nÄ± kaldÄ±rÄ±p gÃ¼venli hale getir
                    fixedDrawCode = fixedDrawCode.replace(/\n/g, ' ').replace(/\r/g, ' ');
                    
                    // *** YENÄ° DÃœZELTME: 'scale' deÄŸiÅŸkeninin tekrar tanÄ±mlanmasÄ±nÄ± Ã¶nle ***
                    fixedDrawCode = fixedDrawCode.replace(/const\s+scale\s*=.+?;/g, ''); 

                    try {
                        // Aksesuar kodu parametreleri: player, ctx, x, y, angle, scale
                        const newFunc = new Function('player', 'ctx', 'x', 'y', 'angle', 'scale', fixedDrawCode);
                        const newEquipment = {
                            id: 'att_eq_' + Date.now(),
                            description: attackDescription + " (Equipment)",
                            code: newFunc,
                            location: 'hand', // SaldÄ±rÄ± silahlarÄ± her zaman eldedir
                            isAttackEquipment: true // Bu Ã¶ÄŸenin saldÄ±rÄ± ekipmanÄ± olduÄŸunu iÅŸaretle
                        };
                        currentAccessories.push(newEquipment);
                        renderAccessoryList(); // Aksesuar listesini gÃ¼ncelle
                        addMessage('System', `Attack gear loaded (${attackDescription}).`, '#d97706');
                    } catch (e) {
                        // EÄŸer Ã§izim kodu hatalÄ±ysa, bu kÄ±smÄ± logla ama mantÄ±ÄŸÄ± Ã§alÄ±ÅŸtÄ±rmaya devam et
                        addMessage('System', `Error: equipment drawing code is invalid. Continuing without weapon art. Error: ${e.message}`, '#b91c1c');
                        drawCode = ''; // HatalÄ± Ã§izim kodunu temizle
                        console.error("Equipment Draw Code Error (Hata veren Ã§izim kodu):", fixedDrawCode, e);
                    }
                }

                // --- Ana SaldÄ±rÄ± MantÄ±ÄŸÄ± Entegrasyonu ---
                let correctedLogic = attackLogic
                    .replace(/player\.facingRight/g, 'player.facing > 0'); // YanlÄ±ÅŸ deÄŸiÅŸkeni dÃ¼zelt

                // HÄ±z deÄŸiÅŸkenlerini kontrol et ve dÃ¼zelt (velX -> vx)
                correctedLogic = correctedLogic.replace(/opponent\.velX/g, 'opponent.vx').replace(/opponent\.velY/g, 'opponent.vy');
                correctedLogic = correctedLogic.replace(/player\.velX/g, 'player.vx').replace(/player\.velY/g, 'player.vy');
                correctedLogic = correctedLogic.replace(/\bp\.dead\b/g, 'p.isAlive');
                
                // *** YENÄ° DÃœZELTME: HandRX/RY const redeclaration hatasÄ±nÄ± Ã¶nle ***
                // handRX ve handRY'nin const ile tekrar tanÄ±mlanmasÄ±nÄ± Ã¶nle (eÄŸer AI eklediyse)
                correctedLogic = correctedLogic
                    .replace(/const\s+handRX\s*=/g, 'handRX =')
                    .replace(/const\s+handRY\s*=/g, 'handRY =');
                
                
                try {
                    // Sabit hasar deÄŸerini enjekte et (10 olarak belirlendi)
                    const FIXED_DAMAGE = 10;

                    // Mermi DavranÄ±ÅŸ Kodunu Dizeye Ekle
                    const behaviorCodeString = behaviorCode
                        .replace(/\\/g, '\\\\')
                        .replace(/`/g, '\\`')
                        .replace(/\$\{/g, '\\${')
                        .replace(/\n/g, ' ')
                        .replace(/\r/g, ' ');

                    // SaldÄ±rÄ± sÄ±rasÄ±nda silahÄ±n/merminin Ã§izimini ve mantÄ±ÄŸÄ±nÄ± birleÅŸtir
                    const fullCode = 
                        `// --- SABÄ°T HASAR DEÄžERÄ° ENJEKTE EDÄ°LDÄ° ---\n` +
                        `const ATTACK_DAMAGE = ${FIXED_DAMAGE};\n` + 
                        `const PROJECTILE_BEHAVIOR_CODE = \`${behaviorCodeString}\`;\n` + // DavranÄ±ÅŸ kodunu sabit olarak ekle
                        `// --- Kafa ve El PozisyonlarÄ±nÄ± Hesapla (Player context) ---\n` +
                        `const shoulderX = player.shoulder.x; \n` +
                        `const shoulderY = player.shoulder.y; \n` +
                        `// Mouse koordinatlarÄ± global olarak kullanÄ±labilir, ancak fonksiyon parametrelerine dahil edilmeli\n` +
                        `const targetX = player.isPlayer ? mouseX : opponent.head.x;\n` + 
                        `const targetY = player.isPlayer ? mouseY : opponent.head.y;\n` + 
                        `const angleToTarget = Math.atan2(targetY - shoulderY, targetX - shoulderX);\n` +
                        `const armLength = player.limbLength * 1.5;\n` + 
                        `const handRX = shoulderX + Math.cos(angleToTarget + Math.PI / 12) * armLength; // SaÄŸ el konumu\n` + 
                        `const handRY = shoulderY + Math.sin(angleToTarget + Math.PI / 12) * armLength;\n` +
                        
                        `// --- Ana SaldÄ±rÄ± MantÄ±ÄŸÄ± (Hasar ve Ä°tme) ---\n` +
                        `${correctedLogic}\n`;
                    
                    // mouseX ve mouseY parametrelerini ekledik
                    const newFunc = new Function('player', 'opponent', 'ctx', 'canvas', 'mouseX', 'mouseY', fullCode);
                    dynamicAttackFunction = newFunc;
                    
                    // YENÄ°: SaldÄ±rÄ± UI'Ä±nÄ± gÃ¼ncelle (X ile kaldÄ±rma dahil)
                    codeDisplayElement.innerHTML = `
                        <div class="accessory-item">
                            <span style="font-weight: bold; color: #d97706;">ACTIVE ATTACK:</span>
                            <span>${attackDescription}</span>
                            <span class="remove-accessory" onclick="resetAttack()">Remove</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #6b7280; margin-top: 5px;">(Fixed damage: ${FIXED_DAMAGE})</div>
                    `;
                    
                    addMessage('System', `New attack code loaded successfully: ${attackDescription} (Fixed damage: ${FIXED_DAMAGE})`, '#d97706');

                } catch (e) {
                         // Hata ayÄ±klama Ã§Ä±ktÄ±larÄ±
                       const FIXED_DAMAGE = 10; // Debug iÃ§in sabit deÄŸer
                       codeDisplayElement.innerHTML = `
                           <strong>CODE ERROR (Attack Logic):</strong><br>
                           Error: ${e.message}<br>
                           <br>
                           <span class="debug-label">1. Draw Code (added as accessory or failed):</span>
                           <pre class="debug-code-section">${drawCode || 'EMPTY'}</pre>
                           <span class="debug-label" style="color: #f87171;">2. Logic Code (failing section):</span>
                           <pre class="debug-code-section" style="color: #FFF; background-color: #b91c1c;">${correctedLogic}</pre>
                           <span class="debug-label" style="color: #f59e0b;">3. Projectile Behavior Code:</span>
                           <pre class="debug-code-section">${behaviorCode || 'EMPTY'}</pre>
                       `;
                       addMessage('System', `The AI-generated attack code is invalid. Error: ${e.message}`, '#b91c1c');
                       // Hata durumunda varsayÄ±lana geri dÃ¶nÃ¼lÃ¼r ve varsa ekipman kaldÄ±rÄ±lÄ±r
                       currentAccessories = currentAccessories.filter(acc => !acc.isAttackEquipment);
                       renderAccessoryList();
                       dynamicAttackFunction = defaultAttack; 
                }

            } else {
                // Bilinmeyen JSON yanÄ±tÄ±
                console.error("Unknown JSON structure returned by API:", responseText);
                codeDisplayElement.innerHTML = 'Error: the API returned an unknown structure.';
                addMessage('System', 'API structure error: unknown response format.', '#b91c1c');
            }
        } else {
            codeDisplayElement.textContent = 'Error: no response from the API.';
            addMessage('System', 'No response was received from the code generation API.', '#b91c1c');
        }
        updateCoachState();
    }

    // --- IDEA RENDERING LOGIC (YENÄ°) ---
    // const attackPromptInput = document.getElementById('attack-prompt-input'); // Redundant const removed
    // const accessoryPromptInput = document.getElementById('accessory-prompt-input'); // Redundant const removed

    function renderIdeas(ideas, listElementId, targetInput) {
        const listElement = document.getElementById(listElementId);
        listElement.innerHTML = ''; // Temizle
        
        if (!ideas || ideas.length === 0) {
            listElement.innerHTML = '<span class="idea-placeholder">No ideas found.</span>';
            return;
        }

        ideas.forEach(idea => {
            const tag = document.createElement('span');
            tag.className = 'idea-tag';
            tag.textContent = idea;
            tag.title = 'Click to use this idea';
            
            tag.onclick = () => {
                listElement.querySelectorAll('.idea-tag').forEach((chip) => chip.classList.remove('is-selected-idea'));
                tag.classList.add('is-selected-idea');
                targetInput.value = idea;
                targetInput.focus();
                syncPromptCtaState();
                updateCoachState();
            };
            listElement.appendChild(tag);
        });
    }
    
    // --- IDEA FETCHING FUNCTION (YENÄ°) ---
    async function fetchCreativeIdeas(forceRefresh = false) {
        const attackIdeasList = document.getElementById('attack-ideas-list');
        const accessoryIdeasList = document.getElementById('accessory-ideas-list');

        if (!forceRefresh && (ideasLoadedForFamily === selectedAttackFamily || ideasAreLoading || isGeneratingCode || !isGamePaused)) {
            return;
        }

        ideasAreLoading = true;

        // YÃ¼kleme durumunu gÃ¶ster
        attackIdeasList.innerHTML = '<span class="idea-placeholder">Loading ideas...</span>';
        accessoryIdeasList.innerHTML = '<span class="idea-placeholder">Loading ideas...</span>';

        let ideas = null;
        try {
            const result = await requestStructuredJson(apiUrl, buildIdeasPayload(selectedAttackFamily));
            ideas = result.data;
        } catch (error) {
            console.error("Idea loading error:", error);
        }

        if (ideas && ideas.attackIdeas && ideas.accessoryIdeas) {
            renderIdeas(ideas.attackIdeas, 'attack-ideas-list', attackPromptInput);
            renderIdeas(ideas.accessoryIdeas, 'accessory-ideas-list', accessoryPromptInput);
        } else {
            renderIdeas(getDefaultAttackIdeas(selectedAttackFamily), 'attack-ideas-list', attackPromptInput);
            renderIdeas(DEFAULT_ACCESSORY_IDEAS, 'accessory-ideas-list', accessoryPromptInput);
        }

        ideasLoadedForFamily = selectedAttackFamily;
        ideasAreLoading = false;
    }


    // --- LLM DYNAMIC ATTACK CODE GENERATION ---
    // const attackPromptInput = document.getElementById('attack-prompt-input'); // Redundant const removed
    // const generateCodeAttackButton = document.getElementById('generate-attack-code'); // Zaten yukarÄ±da tanÄ±mlÄ±
    // const codeDisplayAttack = document.getElementById('code-display-attack'); // Redundant const removed

    generateCodeAttackButton.addEventListener('click', () => {
        generateCode(
            attackPromptInput,
            codeDisplayAttack,
            generateCodeAttackButton,
            'attack',
            buildAttackSystemPrompt(selectedAttackFamily),
            'Attack ready. Try it with left click.',
        );
    });


    // --- LLM DYNAMIC ACCESSORY CODE GENERATION ---
    // const accessoryPromptInput = document.getElementById('accessory-prompt-input'); // Redundant const removed
    // const generateCodeAccessoryButton = document.getElementById('generate-accessory-code'); // Zaten yukarÄ±da tanÄ±mlÄ±
    // const codeDisplayAccessory = document.getElementById('code-display-accessory'); // Redundant const removed

    generateCodeAccessoryButton.addEventListener('click', () => {
        generateCode(accessoryPromptInput, codeDisplayAccessory, generateCodeAccessoryButton, 'accessory', buildAccessorySystemPrompt(), 'Gear ready.');
    });

    function canProjectileHitTarget(projectile, target) {
        if (!projectile.isAlive || !target.isAlive) {
            return false;
        }

        if (projectile.ageFrames <= projectile.armFrames) {
            return false;
        }

        if (projectile.owner === target) {
            const dxOwner = projectile.x - target.x;
            const dyOwner = projectile.y - target.head.y;
            const ownerDistanceSq = dxOwner * dxOwner + dyOwner * dyOwner;
            return projectile.ageFrames > projectile.spawnGraceFrames && ownerDistanceSq > projectile.ownerSafeRadius * projectile.ownerSafeRadius;
        }

        return true;
    }


    // --- GAME LOOP ---
    let animationFrameId; // Animasyon Ã§erÃ§evesi ID'sini saklamak iÃ§in

    function gameLoop() {
        // 1. Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 2. Draw the ground
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y);
        
        if (isGamePaused) {
            // DuraklatÄ±lmÄ±ÅŸken sadece Ã§izim yap ve dÃ¶ngÃ¼yÃ¼ yeniden isteme
            player.draw(); 
            computer.draw();
            drawHealthBars();
            
            // YENÄ°: Pause yazÄ±sÄ±nÄ± Ã§iz
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '40px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
            
            animationFrameId = requestAnimationFrame(gameLoop); // Ã‡izimi gÃ¼ncellemeye devam et
            return;
        }

        // 3. Handle Player Input 
        if (document.activeElement.id !== 'attack-prompt-input' && document.activeElement.id !== 'accessory-prompt-input') {
            if (keys['A']) player.move('left');
            if (keys['D']) player.move('right');
            if (keys['W']) player.move('jump');
        }

        // 4. Update AI 
        updateComputerAI(); // YENÄ°: AI davranÄ±ÅŸÄ±nÄ± buraya taÅŸÄ±dÄ±k
        
        // 4.5. Update Projectiles and check collision (YENÄ°)
        projectiles = projectiles.filter(p => p.isAlive); // Ã–lÃ¼ mermileri filtrele
        projectiles.forEach(p => {
            p.update();

            const collisionTargets =
                p.owner === player ? [computer] :
                p.owner === computer ? [player] :
                [computer];

            collisionTargets.forEach((target) => {
                if (!canProjectileHitTarget(p, target)) {
                    return;
                }

                const dx = p.x - target.x;
                const dy = p.y - target.head.y;
                const distanceSq = dx * dx + dy * dy;
                const collisionDistSq = (p.size + target.headRadius) * (p.size + target.headRadius);

                if (p.isAlive && distanceSq < collisionDistSq) {
                    target.takeDamage(p.damage);
                    target.vx += (p.vx > 0 ? 1 : -1) * 5;
                    p.isAlive = false;
                    spawnParticleEffect(p.x, p.y, 15, p.color, 6, 10, 0.4);
                }
            });

            if (p.isAlive && p.owner && p.ageFrames <= p.spawnGraceFrames) {
                const dxOwner = p.x - p.owner.x;
                const dyOwner = p.y - p.owner.head.y;
                const ownerDistanceSq = dxOwner * dxOwner + dyOwner * dyOwner;
                if (ownerDistanceSq < p.ownerSafeRadius * p.ownerSafeRadius) {
                    return;
                }
            }
        });

        // 4.6 Update and Draw Particles (YENÄ°)
        particles = particles.filter(p => p.isAlive);
        particles.forEach(p => {
            p.update();
            p.draw();
        });


        // 5. Handle Collision
        handleStickmanCollision(player, computer);

        // 6. Update and Draw Stickmen
        player.update();
        computer.update();

        player.draw();
        computer.draw();

        // YENÄ°: Mermileri Ã§iz
        projectiles.forEach(p => p.draw());

        // 7. Draw UI (Health Bars)
        drawHealthBars();
        
        // 8. Check for game end
        if (!player.isAlive || !computer.isAlive) {
             isGamePaused = true; // Oyunu bitir ve duraklat
             pausePlayButton.textContent = 'Play Again';
             updateCoachState();
             // pausePlayButton.style.backgroundColor = '#dc2626'; // CSS gradient ile yapÄ±ldÄ±

             ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             ctx.fillStyle = 'white';
             ctx.font = '40px Inter';
             ctx.textAlign = 'center';
             const winner = player.isAlive ? 'PLAYER WINS!' : 'COMPUTER WINS!';
             ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2 - 30);
             ctx.fillText(winner, canvas.width / 2, canvas.height / 2 + 20);
             
             animationFrameId = requestAnimationFrame(gameLoop); // Son ekranÄ± Ã§izmek iÃ§in devam et
             return; 
        }

        // 9. Request next frame
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // --- AI Logic (GeliÅŸtirilmiÅŸ) ---
    function updateComputerAI() {
        if (!computer.isAlive) return;

        // Zorluk ayarlarÄ±na gÃ¶re parametreler
        let targetDistance = 150; // Hedeflenen uzaklÄ±k
        let attackChance = 0.005; // SaldÄ±rÄ± ÅŸansÄ± (her karede)
        let specialAttackChance = 0.001;
        let evasionChance = 0.01; // KaÃ§Ä±nma ÅŸansÄ±

        if (selectedDifficulty === 'easy') {
            targetDistance = 200;
            attackChance = 0.003;
            specialAttackChance = 0.0005;
        } else if (selectedDifficulty === 'medium') {
            targetDistance = 150;
            attackChance = 0.005;
            specialAttackChance = 0.001;
        } else if (selectedDifficulty === 'hard') {
            targetDistance = 100;
            attackChance = 0.008;
            specialAttackChance = 0.003;
        }

        const distanceToPlayer = player.x - computer.x;
        const absDistance = Math.abs(distanceToPlayer);

        computer.ax = 0; // Hareketi sÄ±fÄ±rla

        // 1. Hareket (Pozisyonu Koru)
        if (absDistance > targetDistance + 20) {
            computer.ax = distanceToPlayer > 0 ? 1 : -1; // YaklaÅŸ
        } else if (absDistance < targetDistance - 20) {
            computer.ax = distanceToPlayer > 0 ? -1 : 1; // UzaklaÅŸ
        }

        // 2. KaÃ§Ä±nma (Evasion)
        if (projectiles.length > 0 && Math.random() < evasionChance) {
            const nearestProjectile = projectiles.reduce((nearest, p) => {
                const dist = Math.hypot(p.x - computer.x, p.y - computer.y);
                if (dist < nearest.dist) {
                    return { dist, p };
                }
                return nearest;
            }, { dist: Infinity, p: null });

            if (nearestProjectile.dist < 100) {
                 // EÄŸer mermi Ã§ok yakÄ±nsa zÄ±pla
                if (computer.onGround) {
                    computer.move('jump');
                }
                // HÄ±zlÄ±ca merminin tersi yÃ¶ne hareket et
                computer.ax = nearestProjectile.p.x < computer.x ? 1 : -1;
            }
        }


        // 3. SaldÄ±rÄ± (Attack)
        const currentTime = performance.now() / 1000; // Saniye
        const attackReady = (currentTime - aiLastAttackTime) > AI_ATTACK_DELAY_BASE;
        
        if (attackReady && absDistance < 350) { // Sadece menzil iÃ§indeyse saldÄ±r
            if (Math.random() < specialAttackChance) {
                aiSpecialAttack(computer, player);
                aiLastAttackTime = currentTime;
            } else if (Math.random() < attackChance) {
                aiBasicAttack(computer, player);
                aiLastAttackTime = currentTime;
            }
        }
    }


    // --- Difficulty Selector Logic ---
    const difficultyButtons = document.querySelectorAll('#difficulty-selector .difficulty-button');

    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            // TÃ¼m butonlardan 'selected' sÄ±nÄ±fÄ±nÄ± kaldÄ±r
            difficultyButtons.forEach(btn => btn.classList.remove('selected'));
            
            // TÄ±klanan butona 'selected' sÄ±nÄ±fÄ±nÄ± ekle
            button.classList.add('selected');
            
            selectedDifficulty = button.getAttribute('data-difficulty');
            addMessage('System', `Difficulty set to **${selectedDifficulty.toUpperCase()}**.`, '#a78bfa');

            // EÄŸer oyun duraklatÄ±lmÄ±ÅŸsa, zorluk deÄŸiÅŸikliÄŸi yapÄ±ldÄ±ktan sonra AI'yÄ± sÄ±fÄ±rla
            if(isGamePaused) {
                // UI'Ä± temizle ama oyunu baÅŸlatma
                resetAttack();
            } else {
                // Oyun devam ediyorsa, hemen yeniden baÅŸlat
                restartGame();
            }
        });
    });


    // Start the game loop on window load.
    window.onload = function () {
        loadingOverlay.classList.add('hidden'); // BaÅŸlangÄ±Ã§ta gizle
        // Oyun otomatik baÅŸlamadÄ±ÄŸÄ± iÃ§in sadece bir kez gameLoop Ã§aÄŸrÄ±sÄ± yapÄ±lÄ±r
        // Bu, pause ekranÄ±nÄ±n Ã§izilmesini saÄŸlar.
        gameLoop(); 
        renderAccessoryList(); // BoÅŸ listeyi ilk baÅŸta gÃ¶ster
        addMessage('System', 'Game is paused. Press Start Match to begin.', '#888888');
        renderAttackFamilySelector();
        syncPromptCtaState();
        updateCoachState();
        fetchCreativeIdeas(); // YaratÄ±cÄ± fikirleri yÃ¼kle
        
        // YENÄ°: Fikirleri 12 saniyede bir yenile
    }

