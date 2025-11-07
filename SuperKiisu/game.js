const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hudScore = document.getElementById("score");
const hudLives = document.getElementById("lives");
const hudPowerUps = document.getElementById("powerUps");

const LEVEL_WIDTH = 3200;
const LEVEL_HEIGHT = canvas.height;
const GRAVITY = 0.6;

const keyState = {
  left: false,
  right: false,
  jump: false
};

const state = {
  score: 0,
  lives: 3,
  powerUps: 0,
  cameraX: 0
};

const catPalette = {
  fur: "#ffb347",
  shade: "#f6983d",
  outline: "#433227",
  eye: "#1b1b1b"
};

class Entity {
  constructor(x, y, width, height) {
    this.position = { x, y };
    this.prevPosition = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.width = width;
    this.height = height;
    this.remove = false;
  }

  get left() {
    return this.position.x;
  }

  get right() {
    return this.position.x + this.width;
  }

  get top() {
    return this.position.y;
  }

  get bottom() {
    return this.position.y + this.height;
  }
}

class Player extends Entity {
  constructor(x, y) {
    super(x, y, 48, 48);
    this.speed = 4;
  this.jumpStrength = 14;
    this.onGround = false;
    this.powerTimer = 0;
    this.invulnerableTimer = 0;
  }

  update(platforms) {
    this.prevPosition.x = this.position.x;
    this.prevPosition.y = this.position.y;

    const targetSpeed = keyState.left === keyState.right ? 0 : (keyState.left ? -this.speed : this.speed);
    const acceleration = 0.7;
    this.velocity.x += (targetSpeed - this.velocity.x) * acceleration * 0.16;

    if (keyState.jump && this.onGround) {
      this.velocity.y = -this.jumpStrength;
      this.onGround = false;
    }

    this.velocity.y += GRAVITY;
    if (this.velocity.y > 16) {
      this.velocity.y = 16;
    }

    this.position.x += this.velocity.x;
    resolveAxisCollision(this, platforms, "x");

    this.position.y += this.velocity.y;
    resolveAxisCollision(this, platforms, "y");

    if (this.powerTimer > 0) {
      this.powerTimer -= 1;
      this.speed = 4.8;
      this.jumpStrength = 18;
    } else {
      this.speed = 4;
      this.jumpStrength = 14;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= 1;
    }
  }

  draw(offsetX) {
    const x = Math.round(this.position.x - offsetX);
    const y = Math.round(this.position.y);

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = catPalette.outline;
    ctx.fillRect(10, 0, 28, 6);
    ctx.fillRect(0, 18, 48, 30);

    ctx.fillStyle = catPalette.fur;
    ctx.fillRect(12, 2, 24, 12);
    ctx.fillRect(4, 20, 40, 26);

    ctx.fillStyle = catPalette.shade;
    ctx.fillRect(4, 34, 12, 12);
    ctx.fillRect(32, 34, 12, 12);

    ctx.fillStyle = catPalette.eye;
    ctx.fillRect(18, 22, 4, 6);
    ctx.fillRect(26, 22, 4, 6);

    ctx.restore();
  }
}

class Platform {
  constructor(x, y, width, height = 24) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(offsetX) {
    const drawX = Math.round(this.x - offsetX);
    const patternHeight = 12;
    ctx.fillStyle = "#5b3a1a";
    ctx.fillRect(drawX, this.y, this.width, this.height);
    ctx.fillStyle = "#8f5b2d";
    ctx.fillRect(drawX, this.y - patternHeight, this.width, patternHeight);
  }
}

class Collectible extends Entity {
  constructor(x, y) {
    super(x, y, 32, 32);
  }

  draw(offsetX) {
    const x = Math.round(this.position.x - offsetX);
    const y = Math.round(this.position.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#f4aa42";
    ctx.beginPath();
    ctx.ellipse(16, 20, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(8, 8, 16, 10);
    ctx.restore();
  }
}

class PowerUp extends Entity {
  constructor(x, y) {
    super(x, y, 32, 32);
  }

  draw(offsetX) {
    const x = Math.round(this.position.x - offsetX);
    const y = Math.round(this.position.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#c0cbdc";
    ctx.fillRect(4, 4, 24, 24);
    ctx.fillStyle = "#9aa7b8";
    ctx.fillRect(4, 4, 24, 8);
    ctx.fillStyle = "#ef6470";
    ctx.fillRect(12, 14, 8, 10);
    ctx.restore();
  }
}

class DogEnemy extends Entity {
  constructor(x, y, range) {
    super(x, y, 48, 40);
    this.originX = x;
    this.range = range;
    this.speed = 1.8;
    this.direction = 1;
  }

  update(platforms) {
    this.prevPosition.x = this.position.x;
    this.prevPosition.y = this.position.y;

    this.velocity.x = this.speed * this.direction;
    this.position.x += this.velocity.x;

    const minX = this.originX - this.range;
    const maxX = this.originX + this.range;
    if (this.position.x < minX || this.position.x > maxX) {
      this.direction *= -1;
      this.position.x = Math.max(minX, Math.min(this.position.x, maxX));
    }

    this.velocity.y += GRAVITY;
    this.position.y += this.velocity.y;
    resolveEnemyCollisions(this, platforms);
  }

  draw(offsetX) {
    const x = Math.round(this.position.x - offsetX);
    const y = Math.round(this.position.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#51382b";
    ctx.fillRect(0, 8, 48, 32);
    ctx.fillRect(4, 0, 12, 12);
    ctx.fillRect(32, 0, 12, 12);
    ctx.fillStyle = "#f5d6a1";
    ctx.fillRect(12, 20, 10, 10);
    ctx.fillRect(26, 20, 10, 10);
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(16, 24, 4, 4);
    ctx.fillRect(28, 24, 4, 4);
    ctx.fillRect(22, 30, 4, 4);
    ctx.restore();
  }
}

const level = {
  spawn: { x: 80, y: LEVEL_HEIGHT - 160 },
  platforms: [],
  catFood: [],
  powerUps: [],
  enemies: []
};

function buildLevel() {
  level.platforms = [
    new Platform(0, LEVEL_HEIGHT - 48, LEVEL_WIDTH, 48),
    new Platform(320, LEVEL_HEIGHT - 140, 160),
    new Platform(640, LEVEL_HEIGHT - 220, 120),
    new Platform(820, LEVEL_HEIGHT - 260, 120),
    new Platform(980, LEVEL_HEIGHT - 220, 120),
    new Platform(1160, LEVEL_HEIGHT - 180, 160),
    new Platform(1460, LEVEL_HEIGHT - 260, 140),
    new Platform(1780, LEVEL_HEIGHT - 200, 260),
    new Platform(2100, LEVEL_HEIGHT - 140, 160),
    new Platform(2400, LEVEL_HEIGHT - 220, 200),
    new Platform(2740, LEVEL_HEIGHT - 160, 160),
    new Platform(3000, LEVEL_HEIGHT - 120, 180)
  ];

  level.catFood = [
    new Collectible(360, LEVEL_HEIGHT - 200),
    new Collectible(700, LEVEL_HEIGHT - 260),
    new Collectible(860, LEVEL_HEIGHT - 320),
    new Collectible(1010, LEVEL_HEIGHT - 260),
    new Collectible(1500, LEVEL_HEIGHT - 320),
    new Collectible(1840, LEVEL_HEIGHT - 260),
    new Collectible(2160, LEVEL_HEIGHT - 200),
    new Collectible(2440, LEVEL_HEIGHT - 280),
    new Collectible(2780, LEVEL_HEIGHT - 220),
    new Collectible(3060, LEVEL_HEIGHT - 180)
  ];

  level.powerUps = [
    new PowerUp(1180, LEVEL_HEIGHT - 220),
    new PowerUp(2450, LEVEL_HEIGHT - 260)
  ];

  level.enemies = [
    new DogEnemy(520, LEVEL_HEIGHT - 88, 80),
    new DogEnemy(1320, LEVEL_HEIGHT - 88, 110),
    new DogEnemy(1900, LEVEL_HEIGHT - 248, 90),
    new DogEnemy(2680, LEVEL_HEIGHT - 208, 70)
  ];
}

const player = new Player(level.spawn.x, level.spawn.y);

function resolveAxisCollision(entity, platforms, axis) {
  if (axis === "x") {
    for (const platform of platforms) {
      if (intersectsRect(entity, platform)) {
        if (entity.velocity.x > 0) {
          entity.position.x = platform.x - entity.width;
        } else if (entity.velocity.x < 0) {
          entity.position.x = platform.x + platform.width;
        }
        entity.velocity.x = 0;
      }
    }
  } else {
    entity.onGround = false;
    for (const platform of platforms) {
      if (intersectsRect(entity, platform)) {
        if (entity.velocity.y > 0) {
          entity.position.y = platform.y - entity.height;
          entity.velocity.y = 0;
          entity.onGround = true;
        } else if (entity.velocity.y < 0) {
          entity.position.y = platform.y + platform.height;
          entity.velocity.y = 0;
        }
      }
    }
  }
}

function resolveEnemyCollisions(enemy, platforms) {
  for (const platform of platforms) {
    if (intersectsRect(enemy, platform)) {
      if (enemy.velocity.y > 0) {
        enemy.position.y = platform.y - enemy.height;
        enemy.velocity.y = 0;
      } else if (enemy.velocity.y < 0) {
        enemy.position.y = platform.y + platform.height;
        enemy.velocity.y = 0;
      }
    }
  }
}

function intersectsRect(a, b) {
  const ax = a.position ? a.position.x : a.x;
  const ay = a.position ? a.position.y : a.y;
  const aw = a.width;
  const ah = a.height;

  const bx = b.position ? b.position.x : b.x;
  const by = b.position ? b.position.y : b.y;
  const bw = b.width;
  const bh = b.height;

  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function handleCollectibles() {
  for (const item of level.catFood) {
    if (!item.remove && intersectsRect(player, item)) {
      item.remove = true;
      state.score += 100;
    }
  }
  for (const item of level.powerUps) {
    if (!item.remove && intersectsRect(player, item)) {
      item.remove = true;
      player.powerTimer = 620;
      state.powerUps += 1;
    }
  }
  level.catFood = level.catFood.filter(item => !item.remove);
  level.powerUps = level.powerUps.filter(item => !item.remove);
}

function handleEnemies() {
  for (const enemy of level.enemies) {
    enemy.update(level.platforms);

    if (enemy.remove) {
      continue;
    }

    if (intersectsRect(player, enemy)) {
      const playerFalling = player.prevPosition.y + player.height <= enemy.position.y + 5;
      if (playerFalling && player.velocity.y > 0) {
        enemy.remove = true;
        player.velocity.y = -10;
        state.score += 200;
      } else if (player.invulnerableTimer === 0) {
        state.lives -= 1;
        player.invulnerableTimer = 120;
        if (state.lives <= 0) {
          resetGame();
          return;
        }
        respawnPlayer();
      }
    }
  }
  level.enemies = level.enemies.filter(enemy => !enemy.remove);
}

function respawnPlayer() {
  player.position.x = level.spawn.x;
  player.position.y = level.spawn.y;
  player.velocity.x = 0;
  player.velocity.y = 0;
  if (player.invulnerableTimer < 90) {
    player.invulnerableTimer = 90;
  }
}

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.powerUps = 0;
  state.cameraX = 0;
  buildLevel();
  respawnPlayer();
  player.powerTimer = 0;
}

function updateCamera() {
  const target = player.position.x + player.width / 2;
  state.cameraX = Math.max(0, Math.min(target - canvas.width / 2, LEVEL_WIDTH - canvas.width));
}

function updateHud() {
  hudScore.textContent = state.score.toString();
  hudLives.textContent = state.lives.toString();
  hudPowerUps.textContent = state.powerUps.toString();
}

function drawBackground(offsetX) {
  const horizon = LEVEL_HEIGHT - 140;
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, horizon);
  ctx.fillStyle = "#6bd16b";
  ctx.fillRect(0, horizon, canvas.width, LEVEL_HEIGHT - horizon);

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  for (let i = -200; i < LEVEL_WIDTH; i += 280) {
    const x = (i - offsetX * 0.6) % (canvas.width + 200) - 100;
    ctx.beginPath();
    ctx.ellipse(x + 60, 90, 70, 26, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 120, 110, 60, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(x, 110, 60, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#5fb25f";
  for (let i = -160; i < LEVEL_WIDTH; i += 200) {
    const x = (i - offsetX * 0.4) % (canvas.width + 160) - 80;
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.lineTo(x + 80, horizon - 90);
    ctx.lineTo(x + 160, horizon);
    ctx.fill();
  }
}

function drawLevel(offsetX) {
  for (const platform of level.platforms) {
    platform.draw(offsetX);
  }
  for (const food of level.catFood) {
    food.draw(offsetX);
  }
  for (const power of level.powerUps) {
    power.draw(offsetX);
  }
  for (const enemy of level.enemies) {
    enemy.draw(offsetX);
  }
}

function update() {
  player.update(level.platforms);
  handleCollectibles();
  handleEnemies();
  updateCamera();
  updateHud();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(state.cameraX);
  drawLevel(state.cameraX);
  player.draw(state.cameraX);
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

function setupInput() {
  const setControlState = (control, value) => {
    if (control === "left") {
      keyState.left = value;
    } else if (control === "right") {
      keyState.right = value;
    } else if (control === "jump") {
      keyState.jump = value;
    }
  };

  const handleDown = (event) => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      setControlState("left", true);
      event.preventDefault();
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      setControlState("right", true);
      event.preventDefault();
    }
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      setControlState("jump", true);
      event.preventDefault();
    }
  };

  const handleUp = (event) => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      setControlState("left", false);
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      setControlState("right", false);
    }
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      setControlState("jump", false);
    }
  };

  window.addEventListener("keydown", handleDown, { passive: false });
  window.addEventListener("keyup", handleUp);

  const buttons = document.querySelectorAll("[data-control]");
  buttons.forEach((button) => {
    const control = button.dataset.control;
    const activePointers = new Set();

    const updateState = () => {
      setControlState(control, activePointers.size > 0);
    };

    const handlePointerDown = (event) => {
      event.preventDefault();
      activePointers.add(event.pointerId);
      if (button.setPointerCapture) {
        button.setPointerCapture(event.pointerId);
      }
      updateState();
    };

    const handlePointerUp = (event) => {
      event.preventDefault();
      activePointers.delete(event.pointerId);
      updateState();
      if (button.releasePointerCapture) {
        try {
          button.releasePointerCapture(event.pointerId);
        } catch (error) {
          /* Pointer capture might already be released; ignore. */
        }
      }
    };

    const handlePointerCancel = (event) => {
      activePointers.clear();
      updateState();
      if (button.releasePointerCapture) {
        try {
          button.releasePointerCapture(event.pointerId);
        } catch (error) {
          /* Pointer capture might already be released; ignore. */
        }
      }
    };

    button.addEventListener("pointerdown", handlePointerDown);
    button.addEventListener("pointerup", handlePointerUp);
    button.addEventListener("pointercancel", handlePointerCancel);
    button.addEventListener("lostpointercapture", handlePointerCancel);
    button.addEventListener("pointerleave", handlePointerUp);
    button.addEventListener("pointerout", handlePointerUp);
  });
}

buildLevel();
respawnPlayer();
setupInput();
loop();
