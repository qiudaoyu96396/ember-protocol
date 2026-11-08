const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const upgradeOverlay = document.querySelector("#upgradeOverlay");
const upgradeOptions = document.querySelector("#upgradeOptions");
const mainMenu = document.querySelector("#mainMenu");
const pauseOverlay = document.querySelector("#pauseOverlay");

const startButton = document.querySelector("#startButton");
const resumeButton = document.querySelector("#resumeButton");
const menuButton = document.querySelector("#menuButton");
const soundButton = document.querySelector("#soundButton");
const highScoreText = document.querySelector("#highScoreText");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WAVE_DURATION = 24;
const HIGH_SCORE_KEY = "ember-protocol-high-score";

const input = {
  keys: new Set(),
  pointer: {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    down: false,
    inside: false,
  },
};

const bullets = [];

//创建敌人数组和生成计时器
const enemies = [];
const particles = [];
let shake = 0;

let spawnTimer = 0.8;
let gameOver = false;
let damageFlash = 0;
let score = 0;
let kills = 0;
let wave = 1;
let waveTime = WAVE_DURATION;
let waveBanner = 2.5;
let highScore = loadHighScore();
let upgradeOpen = false;
let offeredUpgrades = [];
let menuOpen = true;
let paused = false;
let soundEnabled = true;

const player = {
  x: WIDTH / 2,
  y: HEIGHT / 2,
  radius: 16,
  speed: 220,
  angle: 0,
  fireRate: 5,
  fireTimer: 0,
  muzzle: 0,
  health: 100,
  maxHealth: 100,
  invulnerable: 0,
  damage: 1,
  bulletSpeed: 700,
  moveSpeed: 1,
};

//定义所有升级
const upgradePool = [
  {
    id: "damage",
    title: "过载弹芯",
    description: "子弹伤害提高 25%。",
    apply() {
      player.damage *= 1.25;
    },
  },
  {
    id: "fireRate",
    title: "脉冲加速",
    description: "每秒射击次数提高 18%。",
    apply() {
      player.fireRate *= 1.18;
    },
  },
  {
    id: "speed",
    title: "伺服驱动",
    description: "角色移动速度提高 12%。",
    apply() {
      player.moveSpeed *= 1.12;
    },
  },
  {
    id: "bulletSpeed",
    title: "磁轨加速",
    description: "子弹飞行速度提高 18%。",
    apply() {
      player.bulletSpeed *= 1.18;
    },
  },
  {
    id: "health",
    title: "应急电池",
    description: "最大生命提高 20，并恢复 35 生命。",
    apply() {
      player.maxHealth += 20;
      player.health = Math.min(
        player.maxHealth,
        player.health + 35
      );
    },
  },
  {
    id: "repair",
    title: "纳米修复",
    description: "立即恢复 45 点生命，但不能超过上限。",
    apply() {
      player.health = Math.min(
        player.maxHealth,
        player.health + 45
      );
    },
  },
];

//随机三个升级
function rollUpgrades() {
  const pool = [...upgradePool];
  const result = [];

  while (result.length < 3 && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }

  return result;
}

//打开升级界面
function openUpgradeScreen() {
  upgradeOpen = true;
  input.pointer.down = false;
  input.keys.clear();

  offeredUpgrades = rollUpgrades();

  upgradeOptions.innerHTML = "";

  offeredUpgrades.forEach((upgrade, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";

    button.innerHTML = `
      <span class="upgrade-index">MODULE 0${index + 1}</span>
      <h3>${upgrade.title}</h3>
      <p>${upgrade.description}</p>
    `;

    button.addEventListener("click", () => {
      chooseUpgrade(index);
    });

    upgradeOptions.appendChild(button);
  });

  upgradeOverlay.hidden = false;
}

//应用强化并开始下一波
function chooseUpgrade(index) {
  if (!upgradeOpen) {
    return;
  }

  const upgrade = offeredUpgrades[index];

  if (!upgrade) {
    return;
  }

  upgrade.apply();
  audio.upgrade();

  upgradeOpen = false;
  upgradeOverlay.hidden = true;
  offeredUpgrades = [];

  wave += 1;
  waveTime = WAVE_DURATION;
  waveBanner = 2.5;
  spawnTimer = 0.4;

  canvas.focus();
}

//读取函数
function loadHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

//保存
function saveHighScore() {
  try {
    localStorage.setItem(
      HIGH_SCORE_KEY,
      String(highScore)
    );
  } catch {
    // 某些隐私模式不允许本地存储
  }
}

//更新最高分
function updateHighScoreDisplay() {
  highScoreText.textContent = String(highScore).padStart(
    6,
    "0"
  );
}

//提交最高分
function commitHighScore() {
  if (score <= highScore) {
    return;
  }

  highScore = score;
  saveHighScore();
  updateHighScoreDisplay();
}

//重新开始函数
function restartGame() {
  player.x = WIDTH / 2;
  player.y = HEIGHT / 2;
  player.angle = 0;
  player.health = player.maxHealth;
  player.invulnerable = 0;
  player.fireTimer = 0;
  player.muzzle = 0;
  player.damage = 1;
  player.bulletSpeed = 700;
  player.moveSpeed = 1;
  player.fireRate = 5;
  player.maxHealth = 100;
  player.health = 100;
  particles.length = 0;
  shake = 0;

  upgradeOpen = false;
  offeredUpgrades = [];
  upgradeOverlay.hidden = true;

  bullets.length = 0;
  enemies.length = 0;

  spawnTimer = 0.8;
  damageFlash = 0;
  gameOver = false;

  score = 0;
  kills = 0;
  wave = 1;
  waveTime = WAVE_DURATION;
  waveBanner = 2.5;

  canvas.focus();
}

//开始新游戏
function startNewGame() {
  commitHighScore();
  restartGame();

  menuOpen = false;
  paused = false;
  gameOver = false;

  mainMenu.hidden = true;
  pauseOverlay.hidden = true;
  upgradeOverlay.hidden = true;
  upgradeOpen = false;

  canvas.focus();
}

//暂停游戏
function pauseGame() {
  if (gameOver || upgradeOpen || menuOpen || paused) {
    return;
  }

  paused = true;
  input.keys.clear();
  input.pointer.down = false;

  pauseOverlay.hidden = false;
}

//继续游戏
function resumeGame() {
  if (!paused) {
    return;
  }

  paused = false;
  pauseOverlay.hidden = true;
  canvas.focus();
}

//返回主菜单
function returnToMenu() {
  commitHighScore();
  restartGame();

  gameOver = false;
  paused = false;
  menuOpen = true;
  upgradeOpen = false;

  pauseOverlay.hidden = true;
  upgradeOverlay.hidden = true;
  mainMenu.hidden = false;

  updateHighScoreDisplay();
}

//开始新游戏按钮
startButton.addEventListener("click", () => {
  startNewGame();
});

//继续按钮
resumeButton.addEventListener("click", () => {
  resumeGame();
});

//返回主菜单按钮
menuButton.addEventListener("click", () => {
  returnToMenu();
});

//声音开关按钮
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  soundButton.textContent = soundEnabled
    ? "声音：开"
    : "声音：关";

  soundButton.setAttribute(
    "aria-label",
    soundEnabled ? "关闭声音" : "开启声音"
  );

  if (soundEnabled) {
    const context = audio.init();

    if (context) {
      audio.tone(420, 620, 0.08, "sine", 0.018);
    }
  }
});

//动态生成间隔
function getSpawnInterval() {
  return Math.max(0.35, 1.2 - (wave - 1) * 0.09);
}

//粒子生成
function spawnBurst(x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.25 + Math.random() * 0.75);
    const life = 0.2 + Math.random() * 0.45;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life,
      maxLife: life,
      size: 1.5 + Math.random() * 3,
      color,
      drag: 0.88,
    });
  }
}

//更新粒子
function updateParticles(dt) {
  for (const particle of particles) {
    particle.life -= dt;

    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;

    particle.vx *= Math.pow(particle.drag, dt * 60);
    particle.vy *= Math.pow(particle.drag, dt * 60);
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }
}

//敌人生成函数
function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  const margin = 30;

  let x;
  let y;

  if (side === 0) {
    // 从上方出现
    x = Math.random() * WIDTH;
    y = -margin;
  } else if (side === 1) {
    // 从右方出现
    x = WIDTH + margin;
    y = Math.random() * HEIGHT;
  } else if (side === 2) {
    // 从下方出现
    x = Math.random() * WIDTH;
    y = HEIGHT + margin;
  } else {
    // 从左方出现
    x = -margin;
    y = Math.random() * HEIGHT;
  }

  const healthScale = 1 + (wave - 1) * 0.16;
  const speedScale = 1 + (wave - 1) * 0.045;

  const maxHealth = 3 * healthScale;

enemies.push({
  x,
  y,
  radius: 14,
  speed: 70 * speedScale,
  health: maxHealth,
  maxHealth,
  angle: 0,
  flash: 0,
  damage: 12,
  points: 100 + (wave - 1) * 20,
  alive: true,
});
}

//受伤函数
function damagePlayer(amount, enemy) {
  if (player.invulnerable > 0 || gameOver) {
    return;
  }

  player.health -= amount;
  player.invulnerable = 0.8;
  damageFlash = 0.35;

  spawnBurst(player.x, player.y, "#ff526b", 12, 145);
  shake = Math.max(shake, 10);
  audio.hurt();

  player.health = Math.max(0, player.health);

  if (enemy) {
    const angle = Math.atan2(
      player.y - enemy.y,
      player.x - enemy.x
    );

    // 玩家向远离敌人的方向后退
    player.x += Math.cos(angle) * 14;
    player.y += Math.sin(angle) * 14;

    // 敌人也被弹开一些
    enemy.x -= Math.cos(angle) * 24;
    enemy.y -= Math.sin(angle) * 24;
  }

  player.x = Math.max(
    player.radius,
    Math.min(WIDTH - player.radius, player.x)
  );

  player.y = Math.max(
    player.radius,
    Math.min(HEIGHT - player.radius, player.y)
  );

  if (player.health <= 0) {
  gameOver = true;
  input.pointer.down = false;

  spawnBurst(player.x, player.y, "#61f7dc", 32, 230);
  shake = 16;
  commitHighScore();
}
}

//击杀函数
function killEnemy(enemy) {
  if (!enemy.alive) {
    return;
  }

  enemy.alive = false;
  kills += 1;
  score += enemy.points;

  spawnBurst(enemy.x, enemy.y, "#ff526b", 20, 190);
  shake = Math.max(shake, 6);
  audio.kill();
}

//合成音效
const audio = {
  context: null,

  init() {
    if (!soundEnabled) {
  return null;
}
    if (this.context) {
      if (this.context.state === "suspended") {
        this.context.resume();
      }
      return this.context;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    this.context = new AudioContextClass();
    return this.context;
  },

  tone(startFrequency, endFrequency, duration, type, volume) {
    const context = this.init();

    if (!context) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
      startFrequency,
      now
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      now + duration
    );

    gain.gain.setValueAtTime(0.0001, now);

    gain.gain.exponentialRampToValueAtTime(
      volume,
      now + 0.008
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  },

  shoot() {
    this.tone(480, 180, 0.055, "square", 0.018);
  },

  hit() {
    this.tone(140, 70, 0.07, "sawtooth", 0.02);
  },

  kill() {
    this.tone(220, 55, 0.13, "triangle", 0.04);
  },

  hurt() {
    this.tone(95, 40, 0.24, "sawtooth", 0.055);
  },

  upgrade() {
    this.tone(330, 660, 0.14, "sine", 0.03);
    setTimeout(() => {
      this.tone(500, 900, 0.16, "sine", 0.02);
    }, 90);
  },
};

//敌人更新函数
function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.alive) {
      continue;
    }

    const angle = Math.atan2(
      player.y - enemy.y,
      player.x - enemy.x
    );

    enemy.angle = angle;

    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);

    if (distance < player.radius + enemy.radius) {
      damagePlayer(enemy.damage, enemy);
    }

    enemy.flash = Math.max(0, enemy.flash - dt);
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (!enemies[i].alive) {
      enemies.splice(i, 1);
    }
  }
}

function shoot() {
 if (
  player.fireTimer > 0 ||
  gameOver ||
  upgradeOpen ||
  menuOpen ||
  paused
  ) {
    return;
  }

  player.fireTimer = 1 / player.fireRate;
  player.muzzle = 0.06;

  const bulletSpeed = player.bulletSpeed;

  const muzzleX =
    player.x + Math.cos(player.angle) * 24;

  const muzzleY =
    player.y + Math.sin(player.angle) * 24;

  bullets.push({
    x: muzzleX,
    y: muzzleY,
    vx: Math.cos(player.angle) * bulletSpeed,
    vy: Math.sin(player.angle) * bulletSpeed,
    radius: 3,
    damage: player.damage,
    life: 1.2,
  });

  spawnBurst(muzzleX, muzzleY, "#fff0a6", 4, 90);
  shake = Math.max(shake, 1);
  audio.shoot();
}

function updateBullets(dt) {
  for (const bullet of bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    for (const enemy of enemies) {
      if (!enemy.alive || bullet.life <= 0) {
        continue;
      }

      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const distance = Math.hypot(dx, dy);

      if (distance > bullet.radius + enemy.radius) {
        continue;
      }

      enemy.health -= bullet.damage;
      enemy.flash = 0.08;
      bullet.life = 0;

      spawnBurst(
  bullet.x,
  bullet.y,
  "#bafff5",
  4,
  80
);

shake = Math.max(shake, 1.5);
audio.hit();

      if (enemy.health <= 0) {
        enemy.health = 0;
         killEnemy(enemy);
      }

      break;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];

    const outside =
      bullet.x < -30 ||
      bullet.x > WIDTH + 30 ||
      bullet.y < -30 ||
      bullet.y > HEIGHT + 30;

    if (bullet.life <= 0 || outside) {
      bullets.splice(i, 1);
    }
  }
}

function update(dt) {
  shake = Math.max(0, shake - dt * 24);
  damageFlash = Math.max(0, damageFlash - dt * 2);
  updateParticles(dt);

  if (
    gameOver ||
    upgradeOpen ||
    menuOpen ||
    paused
  ) {
    return;
  }

  let dx = 0;
  let dy = 0;

  if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) {
    dy -= 1;
  }

  if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) {
    dy += 1;
  }

  if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) {
    dx -= 1;
  }

  if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) {
    dx += 1;
  }

  // 同时没有方向输入时，避免除以零
  const length = Math.hypot(dx, dy) || 1;

  const movementSpeed = player.speed * player.moveSpeed;

  player.x += (dx / length) * movementSpeed * dt;
  player.y += (dy / length) * movementSpeed * dt;

  const padding = 8;

  player.x = Math.max(
    player.radius + padding,
    Math.min(WIDTH - player.radius - padding, player.x)
  );

  player.y = Math.max(
    player.radius + padding,
    Math.min(HEIGHT - player.radius - padding, player.y)
  );
  player.angle = Math.atan2(
  input.pointer.y - player.y,
  input.pointer.x - player.x
);

player.fireTimer = Math.max(0, player.fireTimer - dt);
player.muzzle = Math.max(0, player.muzzle - dt);
player.invulnerable = Math.max(0, player.invulnerable - dt);

if (input.pointer.down && input.pointer.inside) {
  shoot();
}

spawnTimer -= dt;

if (spawnTimer <= 0) {
  spawnEnemy();
  spawnTimer=1.2;
}

updateEnemies(dt);
updateBullets(dt);

//推进波次
waveTime -= dt;
waveBanner = Math.max(0, waveBanner - dt);

if (waveTime <= 0) {
  openUpgradeScreen();
}
}

function drawBackground() {
  ctx.fillStyle = "#03090c";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(97, 247, 220, 0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x < WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y < HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();

  const blink =
  player.invulnerable > 0 &&
  Math.floor(performance.now() / 80) % 2 === 0;

  ctx.globalAlpha = blink ? 0.3 : 1;

  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  ctx.shadowColor = "#61f7dc";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#61f7dc";

  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-9, 12);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-9, -12);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#06171b";

  ctx.beginPath();
  ctx.arc(-4, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#bafff5";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(10, -1.5, 13, 3);

  if (player.muzzle > 0) {
    ctx.fillStyle = "#fff0a6";
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(36, -6);
    ctx.lineTo(32, 0);
    ctx.lineTo(36, 6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

//绘制敌人
function drawEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) {
      continue;
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle + Math.PI / 2);

    ctx.shadowColor = "#ff526b";
    ctx.shadowBlur = enemy.flash > 0 ? 25 : 10;
    ctx.fillStyle = enemy.flash > 0 ? "#ffffff" : "#ff526b";

    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius, enemy.radius);
    ctx.lineTo(-enemy.radius, enemy.radius);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#061014";

    ctx.beginPath();
    ctx.arc(0, 3, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff526b";

    ctx.beginPath();
    ctx.arc(0, 3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (enemy.health < enemy.maxHealth) {
      const barWidth = 28;
      const barX = enemy.x - barWidth / 2;
      const barY = enemy.y - enemy.radius - 12;

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(barX, barY, barWidth, 3);

      ctx.fillStyle = "#ff526b";
      ctx.fillRect(
        barX,
        barY,
        barWidth * (enemy.health / enemy.maxHealth),
        3
      );
    }
  }
}

function drawBullets() {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#bafff5";
  ctx.shadowColor = "#61f7dc";
  ctx.shadowBlur = 10;

  for (const bullet of bullets) {
    const angle = Math.atan2(bullet.vy, bullet.vx);

    ctx.beginPath();
    ctx.moveTo(
      bullet.x - Math.cos(angle) * 13,
      bullet.y - Math.sin(angle) * 13
    );
    ctx.lineTo(bullet.x, bullet.y);
    ctx.stroke();
  }

  ctx.restore();
}

//绘制粒子
function drawParticles() {
  ctx.save();

  for (const particle of particles) {
    const opacity = Math.max(
      0,
      particle.life / particle.maxLife
    );

    ctx.globalAlpha = opacity;
    ctx.fillStyle = particle.color;

    ctx.fillRect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  }

  ctx.restore();
}

//准星
function drawCrosshair() {
  if (
    !input.pointer.inside ||
    gameOver ||
    upgradeOpen ||
    menuOpen ||
    paused
  ) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(220, 255, 250, 0.85)";
  ctx.lineWidth = 1;
  ctx.translate(input.pointer.x, input.pointer.y);

  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-7, 0);
  ctx.moveTo(7, 0);
  ctx.lineTo(14, 0);
  ctx.moveTo(0, -14);
  ctx.lineTo(0, -7);
  ctx.moveTo(0, 7);
  ctx.lineTo(0, 14);
  ctx.stroke();

  ctx.restore();
}

function drawHud() {
  const barX = 24;
  const barY = 28;
  const barWidth = 190;
  const barHeight = 10;
  const healthRatio = player.health / player.maxHealth;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = '600 11px "Consolas", monospace';
  ctx.fillStyle = "#82aaa5";
  ctx.fillText("INTEGRITY", barX, 15);

  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle =
    healthRatio > 0.55
      ? "#61f7dc"
      : healthRatio > 0.25
        ? "#ffb54a"
        : "#ff526b";

  ctx.fillRect(
    barX,
    barY,
    barWidth * Math.max(0, healthRatio),
    barHeight
  );

  ctx.fillStyle = "#eaf8f4";
  ctx.fillText(
    `${Math.ceil(player.health)} / ${player.maxHealth}`,
    barX,
    barY + 22
  );

  ctx.textAlign = "center";
  ctx.fillStyle = "#82aaa5";
  ctx.fillText(
    `WAVE ${String(wave).padStart(2, "0")}`,
    WIDTH / 2,
    15
  );

  const waveWidth = 230;
  const waveRatio = Math.max(0, waveTime / WAVE_DURATION);

  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fillRect(WIDTH / 2 - waveWidth / 2, 34, waveWidth, 4);

  ctx.fillStyle = "#ffb54a";
  ctx.fillRect(
    WIDTH / 2 - waveWidth / 2,
    34,
    waveWidth * waveRatio,
    4
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#82aaa5";
  ctx.fillText("SCORE", WIDTH - 24, 15);

  ctx.fillStyle = "#eaf8f4";
  ctx.font = '700 24px "Consolas", monospace';
  ctx.fillText(
    String(score).padStart(6, "0"),
    WIDTH - 24,
    31
  );

  ctx.fillStyle = "#6f9691";
  ctx.font = '600 10px "Consolas", monospace';
  ctx.fillText(
    `KILLS ${String(kills).padStart(2, "0")}`,
    WIDTH - 24,
    62
  );

  ctx.restore();
}

function drawWaveBanner() {
  if (waveBanner <= 0 || gameOver) {
    return;
  }

  const opacity = Math.min(1, waveBanner, (2.5 - waveBanner) * 2);

  ctx.save();
  ctx.globalAlpha = Math.max(0, opacity);
  ctx.textAlign = "center";

  ctx.fillStyle = "#eaf8f4";
  ctx.font = '800 34px "Bahnschrift", sans-serif';
  ctx.fillText(
    `WAVE ${String(wave).padStart(2, "0")}`,
    WIDTH / 2,
    HEIGHT / 2 - 70
  );

  ctx.fillStyle = "#61f7dc";
  ctx.font = '600 11px "Consolas", monospace';
  ctx.fillText(
    "SIGNAL STRENGTH INCREASING",
    WIDTH / 2,
    HEIGHT / 2 - 46
  );

  ctx.restore();
}

function render() {
  ctx.save();

  if (shake > 0) {
    const offsetX = (Math.random() * 2 - 1) * shake;
    const offsetY = (Math.random() * 2 - 1) * shake;

    ctx.translate(offsetX, offsetY);
  }

  drawBackground();
  drawEnemies();
  drawBullets();
  drawPlayer();
  drawParticles();

  ctx.restore();

  drawCrosshair();
  drawHud();
  drawWaveBanner();

  if (damageFlash > 0) {
    ctx.fillStyle =
      `rgba(255, 55, 80, ${damageFlash * 0.45})`;

    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  if (gameOver) {
    drawGameOver();
  }
}

window.addEventListener("keydown", (event) => {

  if (menuOpen && event.code === "Enter") {
    startNewGame();
    return;
  }

  if (gameOver) {
    if (event.code === "KeyR" || event.code === "Enter") {
      startNewGame();
      return;
    }

    if (event.code === "KeyM") {
      returnToMenu();
      return;
    }
  }

  if (
    upgradeOpen &&
    ["Digit1", "Digit2", "Digit3"].includes(event.code)
  ) {
    const index = Number(event.code.slice(-1)) - 1;
    chooseUpgrade(index);
    return;
  }

  if (
    (event.code === "KeyP" || event.code === "Escape") &&
    !event.repeat
  ) {
    if (paused) {
      resumeGame();
    } else {
      pauseGame();
    }

    return;
  }

    if (
    event.code === "ArrowUp" ||
    event.code === "ArrowDown" ||
    event.code === "ArrowLeft" ||
    event.code === "ArrowRight" ||
    event.code === "Space"
  ) {
    event.preventDefault();
  }

  input.keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.code);
});

//暂停失焦
window.addEventListener("blur", () => {
  input.keys.clear();
  input.pointer.down = false;

  if (
    !gameOver &&
    !upgradeOpen &&
    !menuOpen &&
    !paused
  ) {
    pauseGame();
  }
});

//把浏览器坐标转换为游戏坐标
function updatePointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  input.pointer.x =
    ((event.clientX - rect.left) / rect.width) * WIDTH;

  input.pointer.y =
    ((event.clientY - rect.top) / rect.height) * HEIGHT;
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }

  if (gameOver) {
  startNewGame();
  return;
}

  updatePointerPosition(event);
  input.pointer.inside = true;
  input.pointer.down = true;

  shoot();
});
//监听鼠标事件
canvas.addEventListener("pointerenter", () => {
  input.pointer.inside = true;
});

canvas.addEventListener("pointerleave", () => {
  input.pointer.inside = false;
  input.pointer.down = false;
});

canvas.addEventListener("pointermove", (event) => {
  updatePointerPosition(event);
  input.pointer.inside = true;
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }

  updatePointerPosition(event);
  input.pointer.inside = true;
  input.pointer.down = true;

  shoot();
});

window.addEventListener("pointerup", () => {
  input.pointer.down = false;
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

//绘制游戏结束界面
function drawGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(2, 7, 10, 0.86)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = "center";

  ctx.fillStyle = "#61f7dc";
  ctx.font = '600 12px "Consolas", monospace';
  ctx.fillText("SIGNAL LOST", WIDTH / 2, HEIGHT / 2 - 120);

  ctx.fillStyle = "#eaf8f4";
  ctx.font = '800 52px "Bahnschrift", sans-serif';
  ctx.fillText("协议终止", WIDTH / 2, HEIGHT / 2 - 55);

  ctx.font = '600 16px "Consolas", monospace';
  ctx.fillStyle = "#eaf8f4";
  ctx.fillText(
    `SCORE  ${String(score).padStart(6, "0")}`,
    WIDTH / 2,
    HEIGHT / 2 + 5
  );

  ctx.fillStyle = "#8aa7a2";
  ctx.font = '500 14px "Microsoft YaHei", sans-serif';
  ctx.fillText(
    `到达第 ${wave} 波   ·   清除 ${kills} 个敌人`,
    WIDTH / 2,
    HEIGHT / 2 + 43
  );

  ctx.fillStyle = "#61f7dc";
  ctx.font = '500 13px "Microsoft YaHei", sans-serif';
 ctx.fillText(
  "R / Enter 重新开始   ·   M 返回主菜单",
  WIDTH / 2,
  HEIGHT / 2 + 100
);

  ctx.fillStyle = "#ffb54a";
ctx.font = '600 13px "Consolas", monospace';
ctx.fillText(
  `BEST  ${String(highScore).padStart(6, "0")}`,
  WIDTH / 2,
  HEIGHT / 2 + 34
);

  ctx.restore();
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(frame);
}

updateHighScoreDisplay();
requestAnimationFrame(frame);