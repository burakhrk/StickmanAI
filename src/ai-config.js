export const DEFAULT_ATTACK_IDEAS = [
  "Fireball shot",
  "Bouncing lightning orb",
  "Laser rifle blast",
];

export const DEFAULT_ACCESSORY_IDEAS = [
  "Robot arm weapon",
  "Plasma rifle",
  "Sniper goggles",
];

export const GAME_CONTEXT_DETAILS = `
GAME ENGINE DETAILS AND AVAILABLE VARIABLES:

1. CHARACTER OBJECTS ('player' and 'opponent'):
    - CRITICAL PHYSICS VARIABLES: player.x, player.y, player.vx, player.vy.
    - FORBIDDEN: Do not use names like 'velX', 'velY', or 'vel'. Only player.vx and player.vy are valid.
    - OTHER: player.onGround, player.facing, player.takeDamage(amount), player.headRadius.

2. GLOBAL CONSTANTS AND CONTEXT:
    - ATTACK_DAMAGE: 10
    - FLOOR_Y: 400, GRAVITY: 0.5
    - Canvas/Mouse: ctx, canvas, mouseX, mouseY
    - Projectile spawning: spawnProjectile(startX, startY, vx, vy, ATTACK_DAMAGE, size, color, drawCode, behaviorCode)
    - Particle effect: spawnParticleEffect(x, y, count, color, size, maxSpeed, lifespan)

3. ATTACK RULES:
    - Scale projectile size and speed proportionally using player.headRadius.
    - Use the PROJECTILE_BEHAVIOR_CODE constant.
    - Use handRX and handRY as the projectile origin.
    - Use only vx and vy for speed values.

4. PROJECTILE BEHAVIOR CODE:
    - This code can only access 'p', 'player', 'opponent', 'GRAVITY', and 'FLOOR_Y'.
    - Projectile movement must use p.x += p.vx; and p.y += p.vy;.

5. VISUAL CONSTRAINTS:
    - Multiply all accessory sizes and offsets by scale.
    - If a weapon is required, fill in requiredEquipmentDrawCode.
    - Do not redeclare the scale variable.
    - Use shadows, glow, and rich colors where appropriate.
`;

export const attackSchema = {
  type: "OBJECT",
  description: "Returns a single structured attack object containing equipment draw logic and main attack execution logic.",
  properties: {
    description: {
      type: "STRING",
      description: "The name or brief summary of the attack.",
    },
    requiredEquipmentDrawCode: {
      type: "STRING",
      description: "Optional JavaScript Canvas draw code for any required weapon or visual effect.",
    },
    projectileBehaviorCode: {
      type: "STRING",
      description: "Optional JavaScript code for custom projectile movement logic.",
    },
    javascriptCode: {
      type: "STRING",
      description: "The main attack logic body. Use ATTACK_DAMAGE and spawnProjectile(...) when needed.",
    },
  },
  required: ["description", "javascriptCode"],
};

export const accessorySchema = {
  type: "ARRAY",
  description: "Returns an array of accessory objects.",
  items: {
    type: "OBJECT",
    properties: {
      targetLocation: {
        type: "STRING",
        description: "Valid values: head, head_top, eyes, neck, hand, wrist, torso, back, foot.",
      },
      description: {
        type: "STRING",
        description: "Short summary of the requested accessory.",
      },
      javascriptCode: {
        type: "STRING",
        description: "Return only the JavaScript canvas function body using player, ctx, x, y, angle, scale.",
      },
    },
    required: ["targetLocation", "javascriptCode"],
  },
};

export const ideaSchema = {
  type: "OBJECT",
  description: "List of creative attack and accessory ideas.",
  properties: {
    attackIdeas: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of 3 short, simple, and runnable attack ideas for the stickman.",
    },
    accessoryIdeas: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of 3 short, simple, and drawable accessory ideas for the stickman.",
    },
  },
  required: ["attackIdeas", "accessoryIdeas"],
};

export function buildAttackSystemPrompt() {
  return `
        You are a JavaScript code generator for a 2D stickman game. Your primary goal is to generate safe, runnable code in the provided JSON schema.

        CONSTRAINTS AND CONTEXT:
        ${GAME_CONTEXT_DETAILS}
        - JSON output must be perfectly structured.
        - If the user requests a weapon, include its drawing code in 'requiredEquipmentDrawCode'.

        TASK: Return a single JSON OBJECT strictly adhering to the attackSchema. Use English comments for any complex parts.
        `;
}

export function buildAccessorySystemPrompt() {
  return `
        You are a JavaScript code generator specialized in drawing accessories for a 2D stickman.

        CONTEXT & CONSTRAINTS:
        ${GAME_CONTEXT_DETAILS}
        - Drawing Function Signature: (player, ctx, x, y, angle, scale).
        - 'scale' must be applied to all size and distance measurements.
        - Target Locations: 'head', 'head_top', 'eyes', 'neck', 'hand', 'wrist', 'torso', 'back', 'foot'.
        - Use shadows, highlights, and rich colors where appropriate.

        TASK: Return a JSON ARRAY strictly adhering to the accessorySchema. Use English comments for any complex parts.
        `;
}

export function buildIdeasPayload() {
  return {
    contents: [{
      parts: [{
        text: "Generate 3 extremely short, simple attack ideas and 3 simple accessory ideas suitable for a stickman fighting game. Ideas must be easy to translate into code.",
      }],
    }],
    systemInstruction: {
      parts: [{
        text: "You are a creative director for a stickman game. Provide a JSON object with creative ideas. Ideas must be extremely short, concise, and directly translatable into simple game code. Use simple English phrases.",
      }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ideaSchema,
    },
  };
}
