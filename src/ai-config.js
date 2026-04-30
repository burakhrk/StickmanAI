export const DEFAULT_ATTACK_FAMILY = "blade";

export const ATTACK_FAMILIES = [
  {
    id: "blade",
    label: "Blade",
    shortLabel: "Blades",
    summary: "Energy swords, sabers, axes, chakrams, and cutting weapon attacks.",
    examples: ["Lightsaber slash wave", "Twin chakram burst", "Arc blade crescent"],
  },
  {
    id: "ballistic",
    label: "Ballistic",
    shortLabel: "Ballistics",
    summary: "Rifles, pistols, cannons, railguns, and other firearm-style attacks.",
    examples: ["Plasma rifle burst", "Railgun tracer shot", "Scatter cannon blast"],
  },
  {
    id: "arcane",
    label: "Arcane",
    shortLabel: "Arcane",
    summary: "Staffs, spell circles, runes, curses, and pure magic projectiles.",
    examples: ["Arcane bolt staff", "Rune beam pulse", "Frost sigil lance"],
  },
  {
    id: "explosive",
    label: "Explosive",
    shortLabel: "Explosives",
    summary: "Bombs, grenades, rockets, mines, and burst-heavy payload attacks.",
    examples: ["Sticky bomb lob", "Micro rocket volley", "Pulse mine throw"],
  },
  {
    id: "summon",
    label: "Summon",
    shortLabel: "Summons",
    summary: "Combat drones, spectral weapons, orbiting orbs, and summoned helpers.",
    examples: ["Drone laser escort", "Spectral spear launch", "Orbital shard ring"],
  },
];

export const DEFAULT_ATTACK_IDEAS_BY_FAMILY = Object.fromEntries(
  ATTACK_FAMILIES.map((family) => [family.id, family.examples]),
);

export const DEFAULT_ATTACK_IDEAS = DEFAULT_ATTACK_IDEAS_BY_FAMILY[DEFAULT_ATTACK_FAMILY];

export const DEFAULT_ACCESSORY_IDEAS = [
  "Robot arm weapon",
  "Plasma rifle",
  "Sniper goggles",
];

export function getAttackFamilyConfig(familyId = DEFAULT_ATTACK_FAMILY) {
  return ATTACK_FAMILIES.find((family) => family.id === familyId) || ATTACK_FAMILIES[0];
}

export function getDefaultAttackIdeas(familyId = DEFAULT_ATTACK_FAMILY) {
  return DEFAULT_ATTACK_IDEAS_BY_FAMILY[familyId] || DEFAULT_ATTACK_IDEAS;
}

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
    - Attacks must be weapon-based, gadget-based, projectile-based, or magic/spell-based.
    - Do NOT build melee choreography such as kicks, punches, spinning moves, flips, grapples, or body-animation-heavy martial arts attacks.
    - If the user asks for a physical move, reinterpret it as a themed weapon or spell attack instead of animating the whole body.

4. PROJECTILE BEHAVIOR CODE:
    - This code can only access 'p', 'player', 'opponent', 'GRAVITY', and 'FLOOR_Y'.
    - Projectile movement must use p.x += p.vx; and p.y += p.vy;.

5. VISUAL CONSTRAINTS:
    - Multiply all accessory sizes and offsets by scale.
    - If a weapon is required, fill in requiredEquipmentDrawCode.
    - Do not redeclare the scale variable.
    - Use shadows, glow, and rich colors where appropriate.
    - The arena backdrop is light ivory, so avoid pale white, faint yellow, or washed-out pastel effects unless they include a darker outline, shadow, or saturated glow.
    - Favor high-contrast colors that stay readable on a bright stage.
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
  type: "OBJECT",
  description: "Returns an object containing an accessories array.",
  properties: {
    accessories: {
      type: "ARRAY",
      description: "Array of accessory objects.",
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
    },
  },
  required: ["accessories"],
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

export function buildAttackSystemPrompt(attackFamilyId = DEFAULT_ATTACK_FAMILY) {
  const family = getAttackFamilyConfig(attackFamilyId);
  return `
        You are a JavaScript code generator for a 2D stickman game. Your primary goal is to generate safe, runnable code in the provided JSON schema.

        CONSTRAINTS AND CONTEXT:
        ${GAME_CONTEXT_DETAILS}
        - JSON output must be perfectly structured.
        - ACTIVE ATTACK FAMILY: ${family.label}
        - FAMILY SUMMARY: ${family.summary}
        - FAMILY EXAMPLES: ${family.examples.join(", ")}
        - Only produce combat attacks built around weapons, guns, cannons, staffs, blades, spells, beams, blasts, bombs, or summoned objects.
        - Reject body-move concepts like spin kicks, punches, wrestling moves, karate combos, acrobatics, and other full-character animation requests.
        - If the user asks for a body move, convert it into a visually similar combat tool. Example: "spinning kick" becomes an "energy chakram" or "whirlwind blade".
        - Stay inside the active family. Do not drift into another family unless the user's wording is still clearly compatible with ${family.label}.
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
        - Declare every helper variable before first use. Never reference undeclared names.
        - Target Locations: 'head', 'head_top', 'eyes', 'neck', 'hand', 'wrist', 'torso', 'back', 'foot'.
        - Use shadows, highlights, and rich colors where appropriate.

        TASK: Return a single JSON OBJECT strictly adhering to the accessorySchema. Put all generated items inside the 'accessories' array. Use English comments for any complex parts.
        `;
}

export function buildIdeasPayload(attackFamilyId = DEFAULT_ATTACK_FAMILY) {
  const family = getAttackFamilyConfig(attackFamilyId);
  return {
    contents: [{
      parts: [{
        text: `Generate 3 extremely short ${family.label.toLowerCase()} attack ideas and 3 simple accessory ideas suitable for a stickman fighting game. Attack ideas must stay inside this family: ${family.summary} Do not suggest kicks, punches, wrestling moves, flips, or body-animation-heavy attacks. Ideas must be easy to translate into code.`,
      }],
    }],
    systemInstruction: {
      parts: [{
        text: `You are a creative director for a stickman game. Provide a JSON object with creative ideas. The active attack family is ${family.label}. Attack ideas must stay in that lane: ${family.summary} Never propose kicks, punches, grapples, martial-arts combos, or animation-heavy body attacks. Use simple English phrases.`,
      }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ideaSchema,
    },
  };
}
