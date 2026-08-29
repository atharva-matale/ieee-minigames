// ============================================================
// FRUIT NINJA - Standalone Game Engine (Netlify Ready)
// Direct WebRTC PeerJS Cross-Network Connection
// ============================================================

(function() {
    'use strict';

    // ===== Canvas Setup =====
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ===== Game State =====
    const state = {
        running: false,
        score: 0,
        lives: 3,
        maxLives: 3,
        combo: 0,
        bestCombo: 0,
        fruitsSliced: 0,
        fruitsMissed: 0,
        difficulty: 1,
        spawnTimer: 0,
        spawnInterval: 120,
        mouseMode: false,
        controllerConnected: false,
    };

    // Cursor position (from controller or mouse)
    const cursor = { x: -100, y: -100, prevX: -100, prevY: -100, active: false };
    const bladeTrail = [];
    const MAX_TRAIL = 18;

    // ===== Fruit Definitions =====
    const FRUIT_TYPES = [
        { name: 'watermelon', emoji: '🍉', color: '#e53935', innerColor: '#c62828', splashColor: '#ff5252', size: 55, points: 3 },
        { name: 'orange',     emoji: '🍊', color: '#ff9800', innerColor: '#e65100', splashColor: '#ffb74d', size: 42, points: 1 },
        { name: 'apple',      emoji: '🍎', color: '#d32f2f', innerColor: '#b71c1c', splashColor: '#ef5350', size: 40, points: 1 },
        { name: 'mango',      emoji: '🥭', color: '#ff8f00', innerColor: '#e65100', splashColor: '#ffca28', size: 44, points: 2 },
        { name: 'strawberry', emoji: '🍓', color: '#e91e63', innerColor: '#ad1457', splashColor: '#f48fb1', size: 36, points: 2 },
        { name: 'kiwi',       emoji: '🥝', color: '#689f38', innerColor: '#33691e', splashColor: '#8bc34a', size: 38, points: 2 },
        { name: 'pineapple',  emoji: '🍍', color: '#fdd835', innerColor: '#f9a825', splashColor: '#fff176', size: 50, points: 2 },
        { name: 'peach',      emoji: '🍑', color: '#ff8a65', innerColor: '#e64a19', splashColor: '#ffab91', size: 40, points: 1 },
        { name: 'grape',      emoji: '🍇', color: '#7b1fa2', innerColor: '#4a148c', splashColor: '#ce93d8', size: 38, points: 2 },
        { name: 'lemon',      emoji: '🍋', color: '#fdd835', innerColor: '#f57f17', splashColor: '#fff9c4', size: 36, points: 1 },
    ];

    const BOMB = { name: 'bomb', emoji: '💣', color: '#212121', innerColor: '#000', splashColor: '#ff1744', size: 46 };

    // ===== Collections =====
    let fruits = [];
    let particles = [];
    let splashes = [];
    let sliceEffects = [];
    let comboTexts = [];
    let scorePopups = [];

    // ===== Wooden Background =====
    let woodPattern = null;
    function createWoodBackground() {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const octx = offscreen.getContext('2d');

        const grad = octx.createLinearGradient(0, 0, 0, offscreen.height);
        grad.addColorStop(0, '#c6893a');
        grad.addColorStop(0.3, '#b5762c');
        grad.addColorStop(0.6, '#a86828');
        grad.addColorStop(1, '#8b5520');
        octx.fillStyle = grad;
        octx.fillRect(0, 0, offscreen.width, offscreen.height);

        octx.globalAlpha = 0.12;
        for (let i = 0; i < 80; i++) {
            const y = Math.random() * offscreen.height;
            octx.beginPath();
            octx.moveTo(0, y);
            for (let x = 0; x < offscreen.width; x += 20) {
                octx.lineTo(x, y + Math.sin(x * 0.005 + i) * (3 + Math.random() * 4));
            }
            octx.strokeStyle = i % 2 === 0 ? '#5a3318' : '#d4a26a';
            octx.lineWidth = 0.5 + Math.random() * 1.5;
            octx.stroke();
        }

        octx.globalAlpha = 0.15;
        const plankWidth = offscreen.width / 6;
        for (let i = 1; i < 6; i++) {
            const px = i * plankWidth + (Math.random() - 0.5) * 10;
            octx.beginPath();
            octx.moveTo(px, 0);
            octx.lineTo(px, offscreen.height);
            octx.strokeStyle = '#4a2a10';
            octx.lineWidth = 2;
            octx.stroke();

            octx.beginPath();
            octx.moveTo(px + 2, 0);
            octx.lineTo(px + 2, offscreen.height);
            octx.strokeStyle = 'rgba(210, 170, 120, 0.2)';
            octx.lineWidth = 1;
            octx.stroke();
        }

        octx.globalAlpha = 0.08;
        for (let k = 0; k < 5; k++) {
            const kx = Math.random() * offscreen.width;
            const ky = Math.random() * offscreen.height;
            const kr = 15 + Math.random() * 20;
            const kGrad = octx.createRadialGradient(kx, ky, 0, kx, ky, kr);
            kGrad.addColorStop(0, '#5a3318');
            kGrad.addColorStop(1, 'transparent');
            octx.fillStyle = kGrad;
            octx.beginPath();
            octx.ellipse(kx, ky, kr, kr * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            octx.fill();
        }

        octx.globalAlpha = 1;
        const vGrad = octx.createRadialGradient(
            offscreen.width / 2, offscreen.height / 2, offscreen.width * 0.3,
            offscreen.width / 2, offscreen.height / 2, offscreen.width * 0.8
        );
        vGrad.addColorStop(0, 'transparent');
        vGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
        octx.fillStyle = vGrad;
        octx.fillRect(0, 0, offscreen.width, offscreen.height);

        woodPattern = offscreen;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        createWoodBackground();
    });

    // ===== Fruit Class =====
    class Fruit {
        constructor(type, x, y, vx, vy) {
            this.type = type;
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.12;
            this.sliced = false;
            this.size = type.size;
            this.opacity = 1;
            this.isBomb = type === BOMB;

            this.halfLeft = null;
            this.halfRight = null;
        }

        update() {
            if (this.sliced) {
                if (this.halfLeft) {
                    this.halfLeft.x += this.halfLeft.vx;
                    this.halfLeft.y += this.halfLeft.vy;
                    this.halfLeft.vy += 0.3;
                    this.halfLeft.rotation += this.halfLeft.rotSpeed;
                    this.halfLeft.opacity -= 0.012;
                }
                if (this.halfRight) {
                    this.halfRight.x += this.halfRight.vx;
                    this.halfRight.y += this.halfRight.vy;
                    this.halfRight.vy += 0.3;
                    this.halfRight.rotation += this.halfRight.rotSpeed;
                    this.halfRight.opacity -= 0.012;
                }
                return;
            }

            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.22;
            this.rotation += this.rotSpeed;
        }

        draw(ctx) {
            if (this.sliced) {
                this.drawSlicedHalves(ctx);
                return;
            }

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.globalAlpha = this.opacity;

            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;

            ctx.font = `${this.size * 1.4}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.type.emoji, 0, 0);

            ctx.restore();
        }

        drawSlicedHalves(ctx) {
            [this.halfLeft, this.halfRight].forEach((half, idx) => {
                if (!half || half.opacity <= 0) return;
                ctx.save();
                ctx.translate(half.x, half.y);
                ctx.rotate(half.rotation);
                ctx.globalAlpha = half.opacity;

                ctx.beginPath();
                if (idx === 0) {
                    ctx.rect(-this.size, -this.size, this.size, this.size * 2);
                } else {
                    ctx.rect(0, -this.size, this.size, this.size * 2);
                }
                ctx.clip();

                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = this.type.innerColor;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
                ctx.strokeStyle = this.type.color;
                ctx.lineWidth = 6;
                ctx.stroke();

                if (this.type.name === 'watermelon') {
                    ctx.fillStyle = '#2e2e2e';
                    for (let s = 0; s < 4; s++) {
                        const angle = (s / 4) * Math.PI * 2 + 0.3;
                        const sx = Math.cos(angle) * this.size * 0.25;
                        const sy = Math.sin(angle) * this.size * 0.25;
                        ctx.beginPath();
                        ctx.ellipse(sx, sy, 3, 5, angle, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                ctx.restore();
            });
        }

        slice() {
            if (this.sliced) return;
            this.sliced = true;

            this.halfLeft = {
                x: this.x - 8, y: this.y,
                vx: -2 - Math.random() * 2, vy: -2 - Math.random() * 3,
                rotation: this.rotation, rotSpeed: -0.08 - Math.random() * 0.06,
                opacity: 1,
            };
            this.halfRight = {
                x: this.x + 8, y: this.y,
                vx: 2 + Math.random() * 2, vy: -2 - Math.random() * 3,
                rotation: this.rotation, rotSpeed: 0.08 + Math.random() * 0.06,
                opacity: 1,
            };
        }

        isOffScreen() {
            if (this.sliced) {
                const lOff = !this.halfLeft || this.halfLeft.opacity <= 0 || this.halfLeft.y > canvas.height + 100;
                const rOff = !this.halfRight || this.halfRight.opacity <= 0 || this.halfRight.y > canvas.height + 100;
                return lOff && rOff;
            }
            return this.y > canvas.height + 100;
        }

        missedBottom() {
            return !this.sliced && !this.isBomb && this.y > canvas.height + 50 && this.vy > 0;
        }
    }

    // ===== Particle System =====
    class Particle {
        constructor(x, y, color, size, vx, vy, life) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = size;
            this.vx = vx;
            this.vy = vy;
            this.life = life;
            this.maxLife = life;
            this.rotation = Math.random() * Math.PI * 2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.15;
            this.life--;
            this.size *= 0.98;
        }

        draw(ctx) {
            const alpha = this.life / this.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        isDead() { return this.life <= 0 || this.size < 0.5; }
    }

    // ===== Splash =====
    class Splash {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.opacity = 0.5;
            this.size = 20 + Math.random() * 30;
            this.drips = [];
            for (let d = 0; d < 3 + Math.floor(Math.random() * 4); d++) {
                this.drips.push({
                    x: x + (Math.random() - 0.5) * 40,
                    y: y,
                    vy: 1 + Math.random() * 2,
                    length: 0,
                    maxLength: 30 + Math.random() * 60,
                    width: 2 + Math.random() * 3,
                });
            }
        }

        update() {
            this.opacity -= 0.003;
            this.drips.forEach(d => {
                if (d.length < d.maxLength) {
                    d.length += d.vy;
                    d.vy += 0.05;
                }
            });
        }

        draw(ctx) {
            if (this.opacity <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity;

            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const dist = this.size * (0.8 + Math.random() * 0.5);
                ctx.beginPath();
                ctx.arc(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist * 0.6,
                    3 + Math.random() * 5, 0, Math.PI * 2
                );
                ctx.fill();
            }

            this.drips.forEach(d => {
                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.opacity * 0.8;
                ctx.beginPath();
                ctx.moveTo(d.x - d.width / 2, d.y);
                ctx.lineTo(d.x + d.width / 2, d.y);
                ctx.lineTo(d.x + d.width * 0.3, d.y + d.length);
                ctx.lineTo(d.x - d.width * 0.3, d.y + d.length);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.arc(d.x, d.y + d.length, d.width * 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
        }

        isDead() { return this.opacity <= 0; }
    }

    // ===== Slice Effect =====
    class SliceEffect {
        constructor(x1, y1, x2, y2) {
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
            this.life = 12;
            this.maxLife = 12;
        }

        update() { this.life--; }

        draw(ctx) {
            const alpha = this.life / this.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3 * alpha;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
            ctx.stroke();
            ctx.restore();
        }

        isDead() { return this.life <= 0; }
    }

    // ===== Floating Text =====
    class FloatingText {
        constructor(x, y, text, color, size) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.size = size;
            this.life = 60;
            this.maxLife = 60;
            this.vy = -2;
            this.scale = 0;
            this.targetScale = 1;
        }

        update() {
            this.life--;
            this.y += this.vy;
            this.vy *= 0.96;
            this.scale += (this.targetScale - this.scale) * 0.2;
            if (this.life < 20) {
                this.targetScale = 0;
            }
        }

        draw(ctx) {
            const alpha = Math.min(1, this.life / 20);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(this.scale, this.scale);
            ctx.globalAlpha = alpha;
            ctx.font = `900 ${this.size}px 'Bangers', cursive`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 4;
            ctx.strokeText(this.text, 0, 0);

            ctx.fillStyle = this.color;
            ctx.fillText(this.text, 0, 0);
            ctx.restore();
        }

        isDead() { return this.life <= 0; }
    }

    // ===== Spawn Fruits =====
    function spawnWave() {
        const count = 1 + Math.floor(Math.random() * 2) + Math.floor(state.difficulty * 0.3);
        const hasBomb = Math.random() < 0.12 + state.difficulty * 0.015;

        for (let i = 0; i < count; i++) {
            const delay = i * 6;
            setTimeout(() => {
                const isBomb = hasBomb && i === count - 1;
                const type = isBomb ? BOMB : FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];

                const side = Math.random();
                let x, vx;
                if (side < 0.33) {
                    x = Math.random() * canvas.width * 0.2;
                    vx = 2 + Math.random() * 3;
                } else if (side < 0.66) {
                    x = canvas.width * 0.3 + Math.random() * canvas.width * 0.4;
                    vx = (Math.random() - 0.5) * 4;
                } else {
                    x = canvas.width * 0.8 + Math.random() * canvas.width * 0.2;
                    vx = -2 - Math.random() * 3;
                }

                const y = canvas.height + 40;
                const vy = -12 - Math.random() * 5 - state.difficulty * 0.5;

                fruits.push(new Fruit(type, x, y, vx, vy));
            }, delay * 16);
        }
    }

    // ===== Collision Detection =====
    function checkSlice() {
        if (!cursor.active) return;

        const dx = cursor.x - cursor.prevX;
        const dy = cursor.y - cursor.prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        if (speed < 5) return;

        let slicedThisFrame = [];

        fruits.forEach(fruit => {
            if (fruit.sliced) return;

            const dist = Math.sqrt(
                (cursor.x - fruit.x) ** 2 + (cursor.y - fruit.y) ** 2
            );

            if (dist < fruit.size * 0.8) {
                if (fruit.isBomb) {
                    bombExplosion(fruit.x, fruit.y);
                    fruit.sliced = true;
                    state.lives = 0;
                    return;
                }

                fruit.slice();
                slicedThisFrame.push(fruit);

                for (let p = 0; p < 15; p++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = 2 + Math.random() * 6;
                    particles.push(new Particle(
                        fruit.x, fruit.y,
                        fruit.type.splashColor,
                        3 + Math.random() * 5,
                        Math.cos(angle) * spd,
                        Math.sin(angle) * spd - 2,
                        30 + Math.random() * 30
                    ));
                }

                splashes.push(new Splash(fruit.x, fruit.y, fruit.type.splashColor));

                sliceEffects.push(new SliceEffect(
                    cursor.prevX, cursor.prevY,
                    cursor.x, cursor.y
                ));

                state.score += fruit.type.points;
                state.fruitsSliced++;

                scorePopups.push(new FloatingText(
                    fruit.x, fruit.y - 20,
                    `+${fruit.type.points}`,
                    fruit.type.splashColor,
                    28
                ));
            }
        });

        if (slicedThisFrame.length > 0) {
            state.combo += slicedThisFrame.length;
            if (slicedThisFrame.length >= 3) {
                const bonus = slicedThisFrame.length * 2;
                state.score += bonus;
                comboTexts.push(new FloatingText(
                    canvas.width / 2, canvas.height / 2 - 50,
                    `🔥 CRITICAL x${slicedThisFrame.length}! +${bonus}`,
                    '#ffab40',
                    48
                ));
            }
            state.bestCombo = Math.max(state.bestCombo, state.combo);
        } else {
            state.combo = 0;
        }
    }

    function bombExplosion(x, y) {
        for (let p = 0; p < 40; p++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 4 + Math.random() * 10;
            const colors = ['#ff1744', '#ff6d00', '#ffab00', '#fff'];
            particles.push(new Particle(
                x, y,
                colors[Math.floor(Math.random() * colors.length)],
                4 + Math.random() * 8,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                40 + Math.random() * 20
            ));
        }

        screenShake = 20;

        comboTexts.push(new FloatingText(
            x, y - 40,
            '💥 BOOM!',
            '#ff1744',
            56
        ));
    }

    let screenShake = 0;

    // ===== Draw HUD =====
    function drawHUD() {
        ctx.save();

        ctx.font = '900 20px "Bangers", cursive';
        ctx.fillStyle = 'rgba(255,61,0,0.9)';
        ctx.textAlign = 'left';
        ctx.fillText('🍉', 20, 38);

        ctx.font = '900 36px "Bangers", cursive';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.fillText(state.score, 50, 42);

        ctx.textAlign = 'right';
        ctx.font = '24px serif';
        for (let l = 0; l < state.maxLives; l++) {
            ctx.fillText(
                l < state.lives ? '❌' : '💀',
                canvas.width - 20 - l * 36, 40
            );
        }

        if (state.combo >= 2) {
            ctx.textAlign = 'center';
            ctx.font = `900 ${24 + state.combo * 2}px "Bangers", cursive`;
            ctx.fillStyle = '#ffab40';
            ctx.shadowColor = 'rgba(255, 171, 64, 0.5)';
            ctx.shadowBlur = 15;
            ctx.fillText(`COMBO x${state.combo}`, canvas.width / 2, 50);
        }

        ctx.restore();
    }

    // ===== Draw Blade Trail =====
    function drawBladeTrail() {
        if (bladeTrail.length < 2) return;

        ctx.save();
        for (let w = 0; w < 3; w++) {
            ctx.beginPath();
            ctx.moveTo(bladeTrail[0].x, bladeTrail[0].y);
            for (let i = 1; i < bladeTrail.length; i++) {
                ctx.lineTo(bladeTrail[i].x, bladeTrail[i].y);
            }
            ctx.strokeStyle = w === 0 ? 'rgba(255,255,255,0.8)' : w === 1 ? 'rgba(200,220,255,0.4)' : 'rgba(150,180,255,0.15)';
            ctx.lineWidth = w === 0 ? 3 : w === 1 ? 8 : 16;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
        ctx.restore();
    }

    // ===== Main Game Loop =====
    function gameLoop() {
        if (!state.running) return;

        state.spawnTimer++;
        if (state.spawnTimer >= state.spawnInterval) {
            spawnWave();
            state.spawnTimer = 0;
            state.spawnInterval = Math.max(70, 120 - state.difficulty * 4);
        }

        state.difficulty += 0.0006;

        fruits.forEach(f => f.update());

        fruits.forEach(f => {
            if (f.missedBottom()) {
                f.sliced = true;
                state.fruitsMissed++;
                state.lives--;
                state.combo = 0;

                comboTexts.push(new FloatingText(
                    f.x, canvas.height - 60,
                    '✗ MISS',
                    '#ff1744',
                    32
                ));
            }
        });

        fruits = fruits.filter(f => !f.isOffScreen());

        particles.forEach(p => p.update());
        particles = particles.filter(p => !p.isDead());

        splashes.forEach(s => s.update());
        splashes = splashes.filter(s => !s.isDead());

        sliceEffects.forEach(e => e.update());
        sliceEffects = sliceEffects.filter(e => !e.isDead());

        comboTexts.forEach(t => t.update());
        comboTexts = comboTexts.filter(t => !t.isDead());

        scorePopups.forEach(t => t.update());
        scorePopups = scorePopups.filter(t => !t.isDead());

        checkSlice();

        if (cursor.active) {
            bladeTrail.push({ x: cursor.x, y: cursor.y });
            if (bladeTrail.length > MAX_TRAIL) bladeTrail.shift();
        } else {
            if (bladeTrail.length > 0) bladeTrail.shift();
        }

        if (screenShake > 0) screenShake *= 0.85;

        ctx.save();

        if (screenShake > 0.5) {
            ctx.translate(
                (Math.random() - 0.5) * screenShake,
                (Math.random() - 0.5) * screenShake
            );
        }

        if (woodPattern) {
            ctx.drawImage(woodPattern, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#a86828';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        splashes.forEach(s => s.draw(ctx));
        fruits.forEach(f => f.draw(ctx));
        particles.forEach(p => p.draw(ctx));
        sliceEffects.forEach(e => e.draw(ctx));
        drawBladeTrail();
        comboTexts.forEach(t => t.draw(ctx));
        scorePopups.forEach(t => t.draw(ctx));
        drawHUD();

        ctx.restore();

        if (state.lives <= 0) {
            gameOver();
            return;
        }

        cursor.prevX = cursor.x;
        cursor.prevY = cursor.y;

        requestAnimationFrame(gameLoop);
    }

    // ===== Game Over =====
    function gameOver() {
        state.running = false;
        document.getElementById('finalScore').textContent = state.score;
        document.getElementById('statSliced').textContent = state.fruitsSliced;
        document.getElementById('statMissed').textContent = state.fruitsMissed;
        document.getElementById('statBestCombo').textContent = state.bestCombo;
        document.getElementById('gameOverOverlay').style.display = 'flex';

        if (activePeerConn && activePeerConn.open) {
            activePeerConn.send({
                type: 'game-state',
                state: 'gameover',
                score: state.score,
            });
        }
    }

    // ===== Start Game =====
    function startGame() {
        state.running = true;
        state.score = 0;
        state.lives = 3;
        state.combo = 0;
        state.bestCombo = 0;
        state.fruitsSliced = 0;
        state.fruitsMissed = 0;
        state.difficulty = 1;
        state.spawnTimer = 0;
        state.spawnInterval = 120;

        fruits = [];
        particles = [];
        splashes = [];
        sliceEffects = [];
        comboTexts = [];
        scorePopups = [];
        bladeTrail.length = 0;

        document.getElementById('connectionOverlay').style.display = 'none';
        document.getElementById('gameOverOverlay').style.display = 'none';

        if (!woodPattern) createWoodBackground();

        if (activePeerConn && activePeerConn.open) {
            activePeerConn.send({ type: 'game-state', state: 'playing' });
        }

        gameLoop();
    }

    // ===== Mouse Input =====
    canvas.addEventListener('mousemove', (e) => {
        if (!state.mouseMode) return;
        cursor.prevX = cursor.x;
        cursor.prevY = cursor.y;
        cursor.x = e.clientX;
        cursor.y = e.clientY;
    });

    canvas.addEventListener('mousedown', () => {
        if (!state.mouseMode) return;
        cursor.active = true;
    });

    canvas.addEventListener('mouseup', () => {
        if (!state.mouseMode) return;
        cursor.active = false;
    });

    // Touch support for desktop touch screens
    canvas.addEventListener('touchmove', (e) => {
        if (!state.mouseMode) return;
        e.preventDefault();
        const touch = e.touches[0];
        cursor.prevX = cursor.x;
        cursor.prevY = cursor.y;
        cursor.x = touch.clientX;
        cursor.y = touch.clientY;
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
        if (!state.mouseMode) return;
        e.preventDefault();
        const touch = e.touches[0];
        cursor.x = touch.clientX;
        cursor.y = touch.clientY;
        cursor.prevX = cursor.x;
        cursor.prevY = cursor.y;
        cursor.active = true;
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        if (!state.mouseMode) return;
        cursor.active = false;
    });

    // ===== Direct Global Cross-Network WebRTC Connection (PeerJS) =====
    let peer = null;
    let activePeerConn = null;

    function generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function initGlobalPeerConnection() {
        const roomCode = generateRoomCode();
        const peerId = 'fn-game-' + roomCode.toLowerCase();

        peer = new Peer(peerId, {
            debug: 1,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ]
            }
        });

        peer.on('open', () => {
            document.getElementById('roomCodeDisplay').textContent = roomCode;

            // Generate controller URL on the same origin / deployed host
            const controllerUrl = `${window.location.origin}/controller.html?room=${roomCode}`;
            document.getElementById('controllerUrl').textContent = controllerUrl;

            // Generate QR code pointing directly to controller URL
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(controllerUrl)}`;
            document.getElementById('qrImage').src = qrUrl;

            document.getElementById('connectionStatus').style.display = 'none';
            document.getElementById('qrSection').style.display = 'block';
        });

        peer.on('connection', (conn) => {
            activePeerConn = conn;

            conn.on('open', () => {
                state.controllerConnected = true;
                document.getElementById('connectionOverlay').style.display = 'none';
                document.getElementById('calibrationOverlay').style.display = 'flex';
            });

            conn.on('data', (data) => {
                if (data.action === 'start-game' || data.action === 'calibrated') {
                    document.getElementById('calibrationOverlay').style.display = 'none';
                    if (!state.running) {
                        startGame();
                    }
                }
                handleControllerInput(data);
            });

            conn.on('close', () => {
                state.controllerConnected = false;
            });
        });

        peer.on('error', (err) => {
            console.log('Peer error:', err);
            if (err.type === 'unavailable-id') {
                setTimeout(initGlobalPeerConnection, 1000);
            }
        });
    }

    // ===== Handle Controller Input =====
    function handleControllerInput(data) {
        if (!state.running) return;

        if (data.action === 'move') {
            cursor.prevX = cursor.x;
            cursor.prevY = cursor.y;
            cursor.x = data.x * canvas.width;
            cursor.y = data.y * canvas.height;
            cursor.active = data.active;
        }

        if (data.action === 'swipe') {
            cursor.prevX = data.prevX * canvas.width;
            cursor.prevY = data.prevY * canvas.height;
            cursor.x = data.x * canvas.width;
            cursor.y = data.y * canvas.height;
            cursor.active = true;

            setTimeout(() => { cursor.active = false; }, 50);
        }
    }

    // ===== Button Handlers =====
    document.getElementById('playWithMouse').addEventListener('click', () => {
        state.mouseMode = true;
        document.body.style.cursor = 'none';
        document.getElementById('calibrationOverlay').style.display = 'none';
        startGame();
    });

    document.getElementById('startAnywayBtn').addEventListener('click', () => {
        document.getElementById('calibrationOverlay').style.display = 'none';
        startGame();
    });

    document.getElementById('restartBtn').addEventListener('click', () => {
        startGame();
    });

    // ===== Initialize =====
    createWoodBackground();
    initGlobalPeerConnection();

})();
