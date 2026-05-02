export const ATTACK_DSL_FAMILIES = ["blade", "ballistic", "arcane", "explosive", "summon"];
export const ATTACK_WEAPON_KINDS = [
  "sword",
  "saber",
  "axe",
  "chakram",
  "rifle",
  "pistol",
  "cannon",
  "railgun",
  "staff",
  "wand",
  "orb",
  "bomb",
  "launcher",
  "drone",
  "sigil",
  "spear",
];
export const ATTACK_ACTION_TYPES = ["projectiles", "beam"];
export const ATTACK_PROJECTILE_PATTERNS = [
  "straight",
  "spread",
  "radial",
  "orbit",
  "lob",
  "ground_wave",
];
export const ATTACK_PROJECTILE_KINDS = [
  "bullet",
  "bolt",
  "orb",
  "rocket",
  "chakram",
  "shard",
  "flame",
  "beamlet",
];
export const STANDARD_ATTACK_DAMAGE = 10;

const FAMILY_DEFAULTS = {
  blade: {
    palette: { primary: "#fb923c", accent: "#fef08a" },
    weaponKind: "saber",
    projectileKind: "chakram",
    pattern: "spread",
  },
  ballistic: {
    palette: { primary: "#38bdf8", accent: "#f8fafc" },
    weaponKind: "rifle",
    projectileKind: "bullet",
    pattern: "straight",
  },
  arcane: {
    palette: { primary: "#a78bfa", accent: "#67e8f9" },
    weaponKind: "staff",
    projectileKind: "bolt",
    pattern: "beam",
  },
  explosive: {
    palette: { primary: "#f97316", accent: "#fde047" },
    weaponKind: "launcher",
    projectileKind: "rocket",
    pattern: "lob",
  },
  summon: {
    palette: { primary: "#34d399", accent: "#93c5fd" },
    weaponKind: "orb",
    projectileKind: "orb",
    pattern: "orbit",
  },
};

function clamp(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

function clampInt(value, min, max, fallback) {
  return Math.round(clamp(value, min, max, fallback));
}

function pickEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function sanitizeColor(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const closestX = x1 + dx * t;
  const closestY = y1 + dy * t;
  return Math.hypot(px - closestX, py - closestY);
}

function getFamilyDefaults(family) {
  return FAMILY_DEFAULTS[family] || FAMILY_DEFAULTS.blade;
}

function getDefaultWeaponKind(family) {
  return getFamilyDefaults(family).weaponKind;
}

function getDefaultProjectileKind(family) {
  return getFamilyDefaults(family).projectileKind;
}

function getDefaultPattern(family) {
  const pattern = getFamilyDefaults(family).pattern;
  return pattern === "beam" ? "straight" : pattern;
}

function normalizePalette(family, primaryColor, accentColor) {
  const defaults = getFamilyDefaults(family).palette;
  return {
    primary: sanitizeColor(primaryColor, defaults.primary),
    accent: sanitizeColor(accentColor, defaults.accent),
  };
}

function normalizeWeaponVisual(rawWeapon, family, palette) {
  const weapon = rawWeapon && typeof rawWeapon === "object" ? rawWeapon : {};

  return {
    kind: pickEnum(weapon.kind, ATTACK_WEAPON_KINDS, getDefaultWeaponKind(family)),
    primaryColor: sanitizeColor(weapon.primaryColor, palette.primary),
    accentColor: sanitizeColor(weapon.accentColor, palette.accent),
    scale: clamp(weapon.scale, 0.7, 1.9, 1),
    handOffsetX: clamp(weapon.handOffsetX, -1.5, 2.4, 0.2),
    handOffsetY: clamp(weapon.handOffsetY, -1.6, 1.6, 0),
  };
}

function normalizeCastFx(rawCastFx, palette) {
  const castFx = rawCastFx && typeof rawCastFx === "object" ? rawCastFx : {};

  return {
    color: sanitizeColor(castFx.color, palette.accent),
    accentColor: sanitizeColor(castFx.accentColor, palette.primary),
    count: clampInt(castFx.count, 4, 24, 10),
    sizeScale: clamp(castFx.sizeScale, 0.2, 1.8, 0.7),
    speedScale: clamp(castFx.speedScale, 0.5, 3.2, 1.5),
    lifespan: clamp(castFx.lifespan, 0.15, 0.9, 0.35),
  };
}

function normalizeProjectileAction(action, family, palette) {
  const pattern = pickEnum(action.pattern, ATTACK_PROJECTILE_PATTERNS, getDefaultPattern(family));

  return {
    type: "projectiles",
    pattern,
    projectileKind: pickEnum(
      action.projectileKind,
      ATTACK_PROJECTILE_KINDS,
      getDefaultProjectileKind(family),
    ),
    count: clampInt(action.count, 1, 8, pattern === "radial" ? 6 : pattern === "orbit" ? 3 : 1),
    speed: clamp(action.speed, 4, 18, pattern === "lob" ? 8 : 11),
    sizeScale: clamp(action.sizeScale, 0.25, 1.8, 0.65),
    spreadDeg: clamp(action.spreadDeg, 0, 90, pattern === "spread" ? 20 : pattern === "radial" ? 360 : 0),
    damageScale: clamp(action.damageScale, 0.5, 1.8, 1),
    lifetimeFrames: clampInt(action.lifetimeFrames, 18, 180, pattern === "orbit" ? 90 : pattern === "lob" ? 80 : 54),
    gravityScale: clamp(action.gravityScale, 0, 2, pattern === "lob" ? 0.8 : 0),
    homingStrength: clamp(action.homingStrength, 0, 0.16, pattern === "orbit" ? 0.06 : 0),
    orbitFrames: clampInt(action.orbitFrames, 0, 90, pattern === "orbit" ? 28 : 0),
    orbitRadiusScale: clamp(action.orbitRadiusScale, 0.8, 4, pattern === "orbit" ? 2.1 : 1.4),
    waveAmplitudeScale: clamp(action.waveAmplitudeScale, 0, 2.5, pattern === "ground_wave" ? 0.45 : 0),
    waveFrequency: clamp(action.waveFrequency, 0, 0.8, pattern === "ground_wave" ? 0.28 : 0),
    beamLengthScale: 0,
    beamWidthScale: 0,
    knockback: clamp(action.knockback, 1, 12, 4),
    color: sanitizeColor(action.color, palette.primary),
    accentColor: sanitizeColor(action.accentColor, palette.accent),
    splashRadiusScale: clamp(action.splashRadiusScale, 0, 4.5, pattern === "lob" ? 2.2 : 0),
    splashDamageScale: clamp(action.splashDamageScale, 0.3, 1.6, pattern === "lob" ? 0.8 : 0.7),
  };
}

function normalizeBeamAction(action, palette) {
  return {
    type: "beam",
    pattern: "beam",
    projectileKind: "beamlet",
    count: 1,
    speed: 0,
    sizeScale: 0,
    spreadDeg: 0,
    damageScale: clamp(action.damageScale, 0.7, 1.8, 1.2),
    lifetimeFrames: clampInt(action.lifetimeFrames, 18, 90, 24),
    gravityScale: 0,
    homingStrength: 0,
    orbitFrames: 0,
    orbitRadiusScale: 0,
    waveAmplitudeScale: 0,
    waveFrequency: 0,
    beamLengthScale: clamp(action.beamLengthScale, 4, 18, 10),
    beamWidthScale: clamp(action.beamWidthScale, 0.3, 2.8, 0.9),
    knockback: clamp(action.knockback, 1, 18, 7),
    color: sanitizeColor(action.color, palette.primary),
    accentColor: sanitizeColor(action.accentColor, palette.accent),
    splashRadiusScale: 0,
    splashDamageScale: 0,
  };
}

function normalizeAction(rawAction, family, palette) {
  const action = rawAction && typeof rawAction === "object" ? rawAction : {};
  const type = pickEnum(action.type, ATTACK_ACTION_TYPES, family === "arcane" ? "beam" : "projectiles");

  if (type === "beam") {
    return normalizeBeamAction(action, palette);
  }

  return normalizeProjectileAction(action, family, palette);
}

export function normalizeAttackSpec(rawAttack, activeFamily) {
  const family = pickEnum(rawAttack?.family, ATTACK_DSL_FAMILIES, activeFamily);
  const palette = normalizePalette(
    family,
    rawAttack?.palette?.primaryColor ?? rawAttack?.weaponVisual?.primaryColor,
    rawAttack?.palette?.accentColor ?? rawAttack?.weaponVisual?.accentColor,
  );
  const actionsSource = Array.isArray(rawAttack?.actions) ? rawAttack.actions : [];

  if (actionsSource.length === 0) {
    throw new Error("The attack DSL must contain at least one action.");
  }

  return {
    description: typeof rawAttack?.description === "string" && rawAttack.description.trim()
      ? rawAttack.description.trim()
      : "Unnamed standardized attack",
    family,
    palette,
    weaponVisual: normalizeWeaponVisual(rawAttack?.weaponVisual, family, palette),
    castFx: normalizeCastFx(rawAttack?.castFx, palette),
    actions: actionsSource.slice(0, 3).map((action) => normalizeAction(action, family, palette)),
  };
}

function getHandOrigin(player, opponent, mouseX, mouseY) {
  const shoulderX = player.shoulder.x;
  const shoulderY = player.shoulder.y;
  const targetX = player.isPlayer ? mouseX : opponent.head.x;
  const targetY = player.isPlayer ? mouseY : opponent.head.y;
  const angle = Math.atan2(targetY - shoulderY, targetX - shoulderX);
  const armLength = player.limbLength * 1.5;

  return {
    angle,
    handX: shoulderX + Math.cos(angle + Math.PI / 12) * armLength,
    handY: shoulderY + Math.sin(angle + Math.PI / 12) * armLength,
  };
}

function addBeamParticles(originX, originY, angle, beamLength, beamWidth, action, runtime) {
  const steps = clampInt(beamLength / 22, 6, 18, 10);

  for (let index = 0; index < steps; index += 1) {
    const distance = (beamLength * index) / Math.max(1, steps - 1);
    const px = originX + Math.cos(angle) * distance;
    const py = originY + Math.sin(angle) * distance;
    runtime.spawnParticleEffect(
      px,
      py,
      2,
      index % 2 === 0 ? action.color : action.accentColor,
      Math.max(1.4, beamWidth * 0.35),
      Math.max(1.5, beamWidth * 0.22),
      0.18,
    );
  }
}

function applyBeamAction(action, context, runtime) {
  const { player, opponent, handX, handY, angle } = context;
  const beamLength = player.headRadius * action.beamLengthScale * 1.9;
  const beamWidth = player.headRadius * action.beamWidthScale * 0.9;
  const endX = handX + Math.cos(angle) * beamLength;
  const endY = handY + Math.sin(angle) * beamLength;

  addBeamParticles(handX, handY, angle, beamLength, beamWidth, action, runtime);

  const bodyY = opponent.y - opponent.torsoLength * 0.45;
  const headDistance = distanceToSegment(opponent.head.x, opponent.head.y, handX, handY, endX, endY);
  const bodyDistance = distanceToSegment(opponent.x, bodyY, handX, handY, endX, endY);
  const hitDistance = Math.min(headDistance, bodyDistance);

  if (hitDistance <= beamWidth + opponent.headRadius) {
    const damage = Math.round(STANDARD_ATTACK_DAMAGE * action.damageScale);
    opponent.takeDamage(damage);
    opponent.vx += Math.cos(angle) * action.knockback * player.facing;
    runtime.spawnParticleEffect(endX, endY, 10, action.color, beamWidth * 0.8, 5, 0.26);
  }
}

function createProjectileVisual(action, size) {
  return {
    kind: action.projectileKind,
    primaryColor: action.color,
    accentColor: action.accentColor,
    size,
  };
}

function createProjectileBehavior(action, player, baseAngle, index, count, targetX, targetY) {
  const behavior = {
    mode: action.pattern,
    lifetimeFrames: action.lifetimeFrames,
    gravity: action.gravityScale,
    homingStrength: action.homingStrength,
    waveAmplitude: player.headRadius * action.waveAmplitudeScale,
    waveFrequency: action.waveFrequency,
    splashRadius: player.headRadius * action.splashRadiusScale,
    splashDamageScale: action.splashDamageScale,
    knockback: action.knockback,
    releaseSpeed: action.speed,
    orbitFrames: action.orbitFrames,
    orbitRadius: player.headRadius * action.orbitRadiusScale,
    orbitAngleOffset: count <= 1 ? 0 : (Math.PI * 2 * index) / count,
    targetX,
    targetY,
    initialAngle: baseAngle,
  };

  if (action.pattern === "ground_wave") {
    behavior.mode = "ground_wave";
  } else if (action.pattern === "lob") {
    behavior.mode = "lob";
  } else if (action.pattern === "orbit") {
    behavior.mode = "orbit";
  } else {
    behavior.mode = "straight";
  }

  return behavior;
}

function spawnProjectileAction(action, context, runtime) {
  const { player, opponent, handX, handY, angle, mouseX, mouseY } = context;
  const count = action.pattern === "straight" ? 1 : action.count;
  const size = player.headRadius * action.sizeScale;
  const speed = action.speed * (player.headRadius / 12);
  const spreadRad = toRadians(action.spreadDeg);
  const damage = Math.round(STANDARD_ATTACK_DAMAGE * action.damageScale);

  for (let index = 0; index < count; index += 1) {
    let projectileAngle = angle;

    if (action.pattern === "spread" && count > 1) {
      const t = count === 1 ? 0 : index / (count - 1);
      projectileAngle += -spreadRad / 2 + spreadRad * t;
    } else if (action.pattern === "radial") {
      projectileAngle = (Math.PI * 2 * index) / count;
    } else if (action.pattern === "lob") {
      const arcLift = player.headRadius * 1.6;
      projectileAngle = Math.atan2((opponent.head.y - arcLift) - handY, opponent.x - handX);
      if (count > 1) {
        const t = count === 1 ? 0 : index / (count - 1);
        projectileAngle += -spreadRad / 2 + spreadRad * t;
      }
    }

    let startX = handX;
    let startY = handY;
    let vx = Math.cos(projectileAngle) * speed;
    let vy = Math.sin(projectileAngle) * speed;

    if (action.pattern === "orbit") {
      const orbitRadius = player.headRadius * action.orbitRadiusScale;
      const orbitAngle = count <= 1 ? 0 : (Math.PI * 2 * index) / count;
      startX = player.x + Math.cos(orbitAngle) * orbitRadius;
      startY = player.head.y + Math.sin(orbitAngle) * orbitRadius;
      vx = 0;
      vy = 0;
    } else if (action.pattern === "ground_wave") {
      startX = handX + player.facing * (index * player.headRadius * 0.35);
      startY = runtime.FLOOR_Y - size * 0.6;
      vx = player.facing * speed;
      vy = 0;
    }

    const behavior = createProjectileBehavior(
      action,
      player,
      projectileAngle,
      index,
      count,
      player.isPlayer ? mouseX : opponent.head.x,
      player.isPlayer ? mouseY : opponent.head.y,
    );

    runtime.spawnProjectile(
      startX,
      startY,
      vx,
      vy,
      damage,
      size,
      action.color,
      createProjectileVisual(action, size),
      behavior,
    );
  }
}

function applyCastFx(spec, player, handX, handY, runtime) {
  runtime.spawnParticleEffect(
    handX,
    handY,
    spec.castFx.count,
    spec.castFx.color,
    player.headRadius * spec.castFx.sizeScale,
    spec.castFx.speedScale * (player.headRadius / 6),
    spec.castFx.lifespan,
  );
}

export function compileAttackSpec(spec, runtime) {
  return function standardizedAttack(player, opponent, ctx, canvas, mouseX, mouseY) {
    const { handX, handY, angle } = getHandOrigin(player, opponent, mouseX, mouseY);

    applyCastFx(spec, player, handX, handY, runtime);

    spec.actions.forEach((action) => {
      const context = { player, opponent, ctx, canvas, mouseX, mouseY, handX, handY, angle };

      if (action.type === "beam") {
        applyBeamAction(action, context, runtime);
      } else {
        spawnProjectileAction(action, context, runtime);
      }
    });

    player.vx -= player.facing * Math.min(2.4, 0.35 + spec.actions.length * 0.3);
  };
}

export function createAttackEquipmentRenderer(spec) {
  const weapon = spec.weaponVisual;

  return function drawAttackEquipment(player, ctx, x, y, angle, scale) {
    const primary = weapon.primaryColor;
    const accent = weapon.accentColor;
    const visualScale = scale * weapon.scale;
    const offsetX = weapon.handOffsetX * scale * player.facing;
    const offsetY = weapon.handOffsetY * scale;

    ctx.save();
    ctx.translate(x + offsetX, y + offsetY);
    ctx.rotate(angle);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = primary;
    ctx.shadowBlur = 14;

    switch (weapon.kind) {
      case "sword":
      case "saber":
      case "axe":
      case "spear": {
        const handleLength = visualScale * 11;
        const bladeLength = visualScale * (weapon.kind === "axe" ? 18 : weapon.kind === "spear" ? 30 : 24);
        ctx.strokeStyle = accent;
        ctx.lineWidth = visualScale * 0.55;
        ctx.beginPath();
        ctx.moveTo(-handleLength * 0.35, 0);
        ctx.lineTo(handleLength, 0);
        ctx.stroke();

        ctx.strokeStyle = primary;
        ctx.lineWidth = visualScale * (weapon.kind === "axe" ? 1.8 : 1.1);
        ctx.beginPath();
        ctx.moveTo(handleLength, 0);
        ctx.lineTo(handleLength + bladeLength, weapon.kind === "axe" ? -visualScale * 4 : 0);
        ctx.stroke();

        if (weapon.kind === "axe") {
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.moveTo(handleLength + bladeLength * 0.2, -visualScale * 4);
          ctx.lineTo(handleLength + bladeLength * 0.7, -visualScale * 8);
          ctx.lineTo(handleLength + bladeLength * 0.52, visualScale * 1.5);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case "chakram": {
        ctx.strokeStyle = primary;
        ctx.lineWidth = visualScale * 1.1;
        ctx.beginPath();
        ctx.arc(visualScale * 7, 0, visualScale * 7.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = visualScale * 0.45;
        ctx.beginPath();
        ctx.arc(visualScale * 7, 0, visualScale * 3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "pistol":
      case "rifle":
      case "railgun":
      case "cannon":
      case "launcher": {
        const bodyLength = visualScale * (weapon.kind === "pistol" ? 14 : weapon.kind === "cannon" ? 26 : 22);
        const bodyHeight = visualScale * (weapon.kind === "pistol" ? 5 : 6.5);
        ctx.fillStyle = "#111827";
        ctx.fillRect(-visualScale * 4, -bodyHeight / 2, bodyLength, bodyHeight);
        ctx.fillStyle = primary;
        ctx.fillRect(bodyLength * 0.2, -bodyHeight * 0.35, bodyLength * 0.65, bodyHeight * 0.7);
        ctx.fillStyle = accent;
        ctx.fillRect(bodyLength * 0.78, -bodyHeight * 0.18, bodyLength * 0.26, bodyHeight * 0.36);
        if (weapon.kind !== "pistol") {
          ctx.fillStyle = "#1f2937";
          ctx.fillRect(-visualScale * 2.5, bodyHeight * 0.3, visualScale * 4, visualScale * 4.5);
        }
        break;
      }
      case "staff":
      case "wand": {
        const shaftLength = visualScale * (weapon.kind === "wand" ? 16 : 24);
        ctx.strokeStyle = "#4b5563";
        ctx.lineWidth = visualScale * 0.8;
        ctx.beginPath();
        ctx.moveTo(-visualScale * 3, 0);
        ctx.lineTo(shaftLength, 0);
        ctx.stroke();
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(shaftLength + visualScale * 2, 0, visualScale * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(shaftLength + visualScale * 2, 0, visualScale * 1.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "orb":
      case "sigil": {
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(visualScale * 7, 0, visualScale * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = visualScale * 0.6;
        ctx.beginPath();
        ctx.arc(visualScale * 7, 0, visualScale * 8.5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "bomb": {
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(visualScale * 6, 0, visualScale * 5.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(visualScale * 5.2, -visualScale * 6.2, visualScale * 2.4, visualScale * 2.8);
        break;
      }
      case "drone": {
        ctx.fillStyle = "#111827";
        ctx.fillRect(visualScale * 1.5, -visualScale * 4, visualScale * 12, visualScale * 8);
        ctx.strokeStyle = primary;
        ctx.lineWidth = visualScale * 0.5;
        ctx.beginPath();
        ctx.moveTo(visualScale * 2, -visualScale * 5.5);
        ctx.lineTo(visualScale * 14, -visualScale * 8);
        ctx.moveTo(visualScale * 2, visualScale * 5.5);
        ctx.lineTo(visualScale * 14, visualScale * 8);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(visualScale * 13.5, 0, visualScale * 2.1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default: {
        ctx.strokeStyle = primary;
        ctx.lineWidth = visualScale * 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(visualScale * 18, 0);
        ctx.stroke();
      }
    }

    ctx.restore();
  };
}

function applyHoming(projectile, target, amount) {
  if (!target || amount <= 0) {
    return;
  }

  const desiredAngle = Math.atan2(target.head.y - projectile.y, target.x - projectile.x);
  const currentAngle = Math.atan2(projectile.vy, projectile.vx);
  const angleDelta = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
  const nextAngle = currentAngle + angleDelta * amount;
  const speed = Math.max(0.001, Math.hypot(projectile.vx, projectile.vy));
  projectile.vx = Math.cos(nextAngle) * speed;
  projectile.vy = Math.sin(nextAngle) * speed;
}

function detonateProjectile(projectile, runtime) {
  if (!projectile.isAlive || projectile.hasDetonated) {
    return;
  }

  const radius = projectile.behaviorSpec?.splashRadius || projectile.size * 2.2;
  const damageScale = projectile.behaviorSpec?.splashDamageScale || 0.75;
  const damage = Math.max(1, Math.round(projectile.damage * damageScale));
  const targets = [runtime.player, runtime.computer].filter((target) => target && target !== projectile.owner);

  targets.forEach((target) => {
    const dx = target.x - projectile.x;
    const dy = target.head.y - projectile.y;
    if (Math.hypot(dx, dy) <= radius + target.headRadius) {
      target.takeDamage(damage);
      const direction = dx === 0 ? 1 : Math.sign(dx);
      target.vx += direction * (projectile.behaviorSpec?.knockback || 4);
    }
  });

  runtime.spawnParticleEffect(
    projectile.x,
    projectile.y,
    18,
    projectile.visualSpec?.accentColor || projectile.color,
    Math.max(projectile.size * 0.6, radius * 0.3),
    Math.max(4, radius * 0.2),
    0.4,
  );

  projectile.hasDetonated = true;
  projectile.isAlive = false;
}

export function updateStandardProjectile(projectile, runtime) {
  const spec = projectile.behaviorSpec;
  if (!spec) {
    return false;
  }

  const target = projectile.owner === runtime.player ? runtime.computer : runtime.player;
  projectile.maxAgeFrames = spec.lifetimeFrames || projectile.maxAgeFrames;

  switch (spec.mode) {
    case "orbit": {
      if (projectile.ageFrames <= spec.orbitFrames) {
        const centerX = projectile.owner ? projectile.owner.x : projectile.x;
        const centerY = projectile.owner ? projectile.owner.head.y : projectile.y;
        const orbitAngle = spec.orbitAngleOffset + projectile.ageFrames * 0.22 * (projectile.owner?.facing || 1);
        projectile.x = centerX + Math.cos(orbitAngle) * spec.orbitRadius;
        projectile.y = centerY + Math.sin(orbitAngle) * spec.orbitRadius;
        projectile.vx = 0;
        projectile.vy = 0;
      } else {
        if (!spec.hasReleased) {
          const releaseAngle = Math.atan2(target.head.y - projectile.y, target.x - projectile.x);
          projectile.vx = Math.cos(releaseAngle) * spec.releaseSpeed;
          projectile.vy = Math.sin(releaseAngle) * spec.releaseSpeed;
          spec.hasReleased = true;
        }

        applyHoming(projectile, target, spec.homingStrength);
        projectile.x += projectile.vx;
        projectile.y += projectile.vy;
      }
      break;
    }
    case "lob": {
      projectile.vy += runtime.GRAVITY * spec.gravity;
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;

      if (projectile.y + projectile.size >= runtime.FLOOR_Y) {
        projectile.y = runtime.FLOOR_Y - projectile.size;
        detonateProjectile(projectile, runtime);
      }
      break;
    }
    case "ground_wave": {
      projectile.x += projectile.vx;
      projectile.y =
        runtime.FLOOR_Y - projectile.size * 0.55 +
        Math.sin(projectile.ageFrames * spec.waveFrequency + spec.orbitAngleOffset) * spec.waveAmplitude;
      break;
    }
    case "straight":
    default: {
      projectile.vy += runtime.GRAVITY * spec.gravity;
      applyHoming(projectile, target, spec.homingStrength);
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      break;
    }
  }

  if (
    projectile.isAlive &&
    spec.splashRadius > 0 &&
    projectile.ageFrames >= projectile.maxAgeFrames
  ) {
    detonateProjectile(projectile, runtime);
  }

  return true;
}

export function drawStandardProjectile(ctx, projectile) {
  const visual = projectile.visualSpec;
  if (!visual) {
    return false;
  }

  const angle = Math.atan2(projectile.vy || 0.001, projectile.vx || 0.001);
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(angle);
  ctx.shadowColor = visual.primaryColor;
  ctx.shadowBlur = Math.max(8, projectile.size * 1.6);

  switch (visual.kind) {
    case "bullet": {
      ctx.fillStyle = visual.primaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, projectile.size * 1.25, projectile.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = visual.accentColor;
      ctx.fillRect(-projectile.size * 0.1, -projectile.size * 0.12, projectile.size * 1.1, projectile.size * 0.24);
      break;
    }
    case "bolt":
    case "beamlet": {
      ctx.fillStyle = visual.primaryColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, projectile.size * 1.7, projectile.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = visual.accentColor;
      ctx.fillRect(-projectile.size * 0.2, -projectile.size * 0.18, projectile.size * 1.3, projectile.size * 0.36);
      break;
    }
    case "orb": {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, projectile.size * 1.4);
      gradient.addColorStop(0, visual.accentColor);
      gradient.addColorStop(0.45, visual.primaryColor);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, projectile.size * 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "rocket": {
      ctx.fillStyle = visual.primaryColor;
      ctx.fillRect(-projectile.size * 1.1, -projectile.size * 0.42, projectile.size * 2.1, projectile.size * 0.84);
      ctx.fillStyle = visual.accentColor;
      ctx.beginPath();
      ctx.moveTo(projectile.size * 1.05, 0);
      ctx.lineTo(projectile.size * 0.35, -projectile.size * 0.52);
      ctx.lineTo(projectile.size * 0.35, projectile.size * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.moveTo(-projectile.size * 1.1, 0);
      ctx.lineTo(-projectile.size * 1.9, -projectile.size * 0.35);
      ctx.lineTo(-projectile.size * 1.9, projectile.size * 0.35);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "chakram": {
      ctx.strokeStyle = visual.primaryColor;
      ctx.lineWidth = Math.max(2, projectile.size * 0.25);
      ctx.beginPath();
      ctx.arc(0, 0, projectile.size * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = visual.accentColor;
      ctx.lineWidth = Math.max(1, projectile.size * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, projectile.size * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "shard": {
      ctx.fillStyle = visual.primaryColor;
      ctx.beginPath();
      ctx.moveTo(projectile.size * 1.3, 0);
      ctx.lineTo(0, -projectile.size * 0.65);
      ctx.lineTo(-projectile.size * 0.6, 0);
      ctx.lineTo(0, projectile.size * 0.65);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "flame": {
      ctx.fillStyle = visual.primaryColor;
      ctx.beginPath();
      ctx.moveTo(projectile.size * 1.2, 0);
      ctx.quadraticCurveTo(0, -projectile.size, -projectile.size * 0.85, 0);
      ctx.quadraticCurveTo(0, projectile.size, projectile.size * 1.2, 0);
      ctx.fill();
      ctx.fillStyle = visual.accentColor;
      ctx.beginPath();
      ctx.arc(projectile.size * 0.1, 0, projectile.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = visual.primaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, projectile.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
  return true;
}

export function describeAttackSpec(spec) {
  const actionSummary = spec.actions
    .map((action) => (action.type === "beam" ? "beam" : action.pattern.replace(/_/g, " ")))
    .join(" + ");

  return `${spec.description} (${spec.weaponVisual.kind}, ${actionSummary})`;
}
