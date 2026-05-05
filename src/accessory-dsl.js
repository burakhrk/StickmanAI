export const ACCESSORY_TARGET_LOCATIONS = [
  "head",
  "head_top",
  "eyes",
  "neck",
  "hand",
  "wrist",
  "torso",
  "back",
  "foot",
];

export const ACCESSORY_KINDS = [
  "visor",
  "goggles",
  "mask",
  "helmet",
  "crown",
  "hat",
  "hood",
  "horns",
  "collar",
  "amulet",
  "armor",
  "cape",
  "backpack",
  "scarf",
  "belt",
  "bracer",
  "boots",
  "shoulderpad",
  "badge",
];

export const ACCESSORY_LAYER_SHAPES = [
  "circle",
  "ellipse",
  "rect",
  "roundRect",
  "line",
  "polygon",
  "arc",
];

const DEFAULT_PALETTE = {
  primaryColor: "#38bdf8",
  accentColor: "#f8fafc",
  detailColor: "#111827",
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

function sanitizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function normalizePoint(rawPoint, fallbackX = 0, fallbackY = 0) {
  return {
    x: clamp(rawPoint?.x, -40, 40, fallbackX),
    y: clamp(rawPoint?.y, -40, 40, fallbackY),
  };
}

function normalizePalette(rawPalette) {
  const palette = rawPalette && typeof rawPalette === "object" ? rawPalette : {};

  return {
    primaryColor: sanitizeColor(palette.primaryColor, DEFAULT_PALETTE.primaryColor),
    accentColor: sanitizeColor(palette.accentColor, DEFAULT_PALETTE.accentColor),
    detailColor: sanitizeColor(palette.detailColor, DEFAULT_PALETTE.detailColor),
  };
}

function resolveColor(value, palette, fallbackKey = "primaryColor") {
  if (value === "primary") {
    return palette.primaryColor;
  }
  if (value === "accent") {
    return palette.accentColor;
  }
  if (value === "detail") {
    return palette.detailColor;
  }

  return sanitizeColor(value, palette[fallbackKey]);
}

function normalizePolygonPoints(points) {
  const safePoints = Array.isArray(points) ? points : [];
  const normalized = safePoints
    .slice(0, 8)
    .map((point, index) => normalizePoint(point, index * 2, 0));

  if (normalized.length >= 3) {
    return normalized;
  }

  return [
    { x: -6, y: 4 },
    { x: 0, y: -6 },
    { x: 6, y: 4 },
  ];
}

function normalizeLayer(rawLayer, palette) {
  const layer = rawLayer && typeof rawLayer === "object" ? rawLayer : {};
  const shape = pickEnum(layer.shape, ACCESSORY_LAYER_SHAPES, "rect");

  return {
    shape,
    x: clamp(layer.x, -40, 40, 0),
    y: clamp(layer.y, -40, 40, 0),
    width: clamp(layer.width, 0.5, 48, 12),
    height: clamp(layer.height, 0.5, 48, 6),
    radius: clamp(layer.radius, 0.5, 24, 5),
    radiusX: clamp(layer.radiusX, 0.5, 24, 8),
    radiusY: clamp(layer.radiusY, 0.5, 24, 4),
    rotationDeg: clamp(layer.rotationDeg, -180, 180, 0),
    strokeWidth: clamp(layer.strokeWidth, 0, 6, 1),
    opacity: clamp(layer.opacity, 0.08, 1, 1),
    shadowBlur: clamp(layer.shadowBlur, 0, 20, 0),
    fillColor: resolveColor(layer.fillColor, palette, "primaryColor"),
    strokeColor: resolveColor(layer.strokeColor, palette, "detailColor"),
    shadowColor: resolveColor(layer.shadowColor, palette, "primaryColor"),
    startDeg: clamp(layer.startDeg, 0, 360, 0),
    endDeg: clamp(layer.endDeg, 0, 360, 180),
    x2: clamp(layer.x2, -40, 40, 8),
    y2: clamp(layer.y2, -40, 40, 0),
    points: normalizePolygonPoints(layer.points),
    fill: sanitizeBoolean(layer.fill, true),
    stroke: sanitizeBoolean(layer.stroke, shape === "line" || shape === "arc"),
    closed: sanitizeBoolean(layer.closed, true),
  };
}

export function normalizeAccessorySpec(rawAccessory) {
  const accessory = rawAccessory && typeof rawAccessory === "object" ? rawAccessory : {};
  const palette = normalizePalette(accessory.palette);
  const layersSource = Array.isArray(accessory.layers) ? accessory.layers : [];

  if (layersSource.length === 0) {
    throw new Error("Each accessory must include at least one visual layer.");
  }

  return {
    description:
      typeof accessory.description === "string" && accessory.description.trim()
        ? accessory.description.trim()
        : "Unnamed accessory",
    targetLocation: pickEnum(accessory.targetLocation, ACCESSORY_TARGET_LOCATIONS, "torso"),
    kind: pickEnum(accessory.kind, ACCESSORY_KINDS, "armor"),
    scale: clamp(accessory.scale, 0.55, 2.6, 1),
    offsetX: clamp(accessory.offsetX, -20, 20, 0),
    offsetY: clamp(accessory.offsetY, -20, 20, 0),
    rotationDeg: clamp(accessory.rotationDeg, -180, 180, 0),
    flipWithFacing: sanitizeBoolean(accessory.flipWithFacing, false),
    palette,
    layers: layersSource.slice(0, 8).map((layer) => normalizeLayer(layer, palette)),
  };
}

export function normalizeAccessorySet(response) {
  const payload = Array.isArray(response) ? { accessories: response } : response;
  const accessoriesSource = Array.isArray(payload?.accessories) ? payload.accessories : [];

  if (accessoriesSource.length === 0) {
    throw new Error("The accessory DSL payload did not include any accessories.");
  }

  return accessoriesSource.map((accessory) => normalizeAccessorySpec(accessory));
}

function pathRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawLayer(ctx, layer, scaleUnit) {
  const x = layer.x * scaleUnit;
  const y = layer.y * scaleUnit;
  const width = layer.width * scaleUnit;
  const height = layer.height * scaleUnit;
  const radius = layer.radius * scaleUnit;
  const radiusX = layer.radiusX * scaleUnit;
  const radiusY = layer.radiusY * scaleUnit;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(degreesToRadians(layer.rotationDeg));
  ctx.globalAlpha = layer.opacity;
  ctx.shadowBlur = layer.shadowBlur * scaleUnit;
  ctx.shadowColor = layer.shadowColor;
  ctx.fillStyle = layer.fillColor;
  ctx.strokeStyle = layer.strokeColor;
  ctx.lineWidth = Math.max(0.5, layer.strokeWidth * scaleUnit);

  switch (layer.shape) {
    case "circle":
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      if (layer.fill) ctx.fill();
      if (layer.stroke) ctx.stroke();
      break;
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
      if (layer.fill) ctx.fill();
      if (layer.stroke) ctx.stroke();
      break;
    case "rect":
      ctx.beginPath();
      ctx.rect(-width / 2, -height / 2, width, height);
      if (layer.fill) ctx.fill();
      if (layer.stroke) ctx.stroke();
      break;
    case "roundRect":
      pathRoundRect(ctx, -width / 2, -height / 2, width, height, radius);
      if (layer.fill) ctx.fill();
      if (layer.stroke) ctx.stroke();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(layer.x2 * scaleUnit, layer.y2 * scaleUnit);
      ctx.stroke();
      break;
    case "polygon":
      ctx.beginPath();
      layer.points.forEach((point, index) => {
        const px = point.x * scaleUnit;
        const py = point.y * scaleUnit;
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      if (layer.closed) {
        ctx.closePath();
      }
      if (layer.fill) ctx.fill();
      if (layer.stroke) ctx.stroke();
      break;
    case "arc":
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        radius,
        degreesToRadians(layer.startDeg),
        degreesToRadians(layer.endDeg),
      );
      if (layer.fill && Math.abs(layer.endDeg - layer.startDeg) >= 359) {
        ctx.fill();
      }
      if (layer.stroke) ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.rect(-width / 2, -height / 2, width, height);
      if (layer.fill) ctx.fill();
      if (layer.stroke) ctx.stroke();
  }

  ctx.restore();
}

export function createAccessoryRenderer(spec) {
  return function drawAccessory(player, ctx, x, y, angle, scale) {
    const scaleUnit = scale * spec.scale;

    ctx.save();
    ctx.translate(x + spec.offsetX * scaleUnit, y + spec.offsetY * scaleUnit);
    ctx.rotate(degreesToRadians(spec.rotationDeg));

    if (spec.flipWithFacing && player.facing < 0) {
      ctx.scale(-1, 1);
    }

    spec.layers.forEach((layer) => drawLayer(ctx, layer, scaleUnit));
    ctx.restore();
  };
}

export function describeAccessorySpec(spec) {
  return `${spec.description} (${spec.kind} on ${spec.targetLocation})`;
}
