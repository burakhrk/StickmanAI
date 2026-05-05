import {
  ATTACK_ACTION_TYPES,
  ATTACK_DSL_FAMILIES,
  ATTACK_PROJECTILE_KINDS,
  ATTACK_PROJECTILE_PATTERNS,
  ATTACK_WEAPON_KINDS,
} from "./attack-dsl.js";
import {
  ACCESSORY_KINDS,
  ACCESSORY_LAYER_SHAPES,
  ACCESSORY_TARGET_LOCATIONS,
} from "./accessory-dsl.js";

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
  "Golden crown",
  "Tinted visor",
  "Layered cape",
];

export function getAttackFamilyConfig(familyId = DEFAULT_ATTACK_FAMILY) {
  return ATTACK_FAMILIES.find((family) => family.id === familyId) || ATTACK_FAMILIES[0];
}

export function getDefaultAttackIdeas(familyId = DEFAULT_ATTACK_FAMILY) {
  return DEFAULT_ATTACK_IDEAS_BY_FAMILY[familyId] || DEFAULT_ATTACK_IDEAS;
}

export const GAME_CONTEXT_DETAILS = `
GAME ENGINE DETAILS AND AVAILABLE VARIABLES:

1. ATTACK GENERATION MODE:
    - Do NOT write raw JavaScript for attacks.
    - Return a standardized attack DSL object that the game engine can interpret safely.
    - Your job is to describe the attack using weaponVisual, castFx, and actions.

2. ATTACK STYLE RULES:
    - Attacks must be weapon-based, gadget-based, projectile-based, or magic/spell-based.
    - Do NOT build melee choreography such as kicks, punches, spinning moves, flips, grapples, or martial-arts combos.
    - If the user asks for a body move, reinterpret it as a themed combat tool instead.
    - Stay compact and game-like: choose 1 to 3 actions only.

3. ACTION SYSTEM:
    - Allowed action types: ${ATTACK_ACTION_TYPES.join(", ")}.
    - Allowed projectile patterns: ${ATTACK_PROJECTILE_PATTERNS.join(", ")}.
    - Allowed projectile visuals: ${ATTACK_PROJECTILE_KINDS.join(", ")}.
    - Allowed weapon visuals: ${ATTACK_WEAPON_KINDS.join(", ")}.
    - Use 'beam' only for line-based magic, laser, or rail attacks.
    - Use 'projectiles' for everything else, with a fitting pattern.

4. VISUAL CONSTRAINTS:
    - The arena backdrop is light ivory, so avoid pale white, faint yellow, or washed-out pastel effects unless they include a darker outline or saturated glow.
    - Favor high-contrast colors that stay readable on a bright stage.
    - Keep descriptions short and clean English.

5. ACCESSORY DSL MODE:
    - Do NOT write raw JavaScript for accessories either.
    - Accessory visuals must be described with simple primitive layers such as circles, ellipses, rounded rectangles, polygons, lines, and arcs.
    - Keep accessory layer stacks readable and compact.
    - Accessories are purely cosmetic. They must never function like weapons, projectiles, summons, companions, drones, or gameplay tools.
    - Do not generate guns, swords, staffs, cannons, drones, orbiting orbs, spell circles, turrets, thrusters, or anything that looks attack-ready.
`;

export const attackSchema = {
  type: "OBJECT",
  description: "Returns a single standardized attack definition object. No raw JavaScript is allowed for attacks.",
  properties: {
    description: {
      type: "STRING",
      description: "Short name or summary of the attack.",
    },
    family: {
      type: "STRING",
      enum: ATTACK_DSL_FAMILIES,
      description: "Attack family lane for the generated attack.",
    },
    palette: {
      type: "OBJECT",
      properties: {
        primaryColor: {
          type: "STRING",
          description: "Main effect color in #RRGGBB format.",
        },
        accentColor: {
          type: "STRING",
          description: "Secondary highlight color in #RRGGBB format.",
        },
      },
      required: ["primaryColor", "accentColor"],
    },
    weaponVisual: {
      type: "OBJECT",
      description: "Standardized visual metadata for the held weapon or focus object.",
      properties: {
        kind: {
          type: "STRING",
          enum: ATTACK_WEAPON_KINDS,
          description: "Choose the closest weapon/focus visual.",
        },
        primaryColor: {
          type: "STRING",
          description: "Main weapon color in #RRGGBB format.",
        },
        accentColor: {
          type: "STRING",
          description: "Accent weapon color in #RRGGBB format.",
        },
        scale: {
          type: "NUMBER",
          description: "Weapon size multiplier, usually between 0.8 and 1.5.",
        },
        handOffsetX: {
          type: "NUMBER",
          description: "Optional horizontal visual offset from the hand.",
        },
        handOffsetY: {
          type: "NUMBER",
          description: "Optional vertical visual offset from the hand.",
        },
      },
      required: ["kind", "primaryColor", "accentColor", "scale", "handOffsetX", "handOffsetY"],
    },
    castFx: {
      type: "OBJECT",
      description: "Startup particles or muzzle flash effect.",
      properties: {
        color: {
          type: "STRING",
          description: "Primary cast color in #RRGGBB format.",
        },
        accentColor: {
          type: "STRING",
          description: "Secondary cast color in #RRGGBB format.",
        },
        count: {
          type: "NUMBER",
          description: "Suggested particle count.",
        },
        sizeScale: {
          type: "NUMBER",
          description: "Particle size scale multiplier.",
        },
        speedScale: {
          type: "NUMBER",
          description: "Particle speed multiplier.",
        },
        lifespan: {
          type: "NUMBER",
          description: "Particle lifespan in seconds.",
        },
      },
      required: ["color", "accentColor", "count", "sizeScale", "speedScale", "lifespan"],
    },
    actions: {
      type: "ARRAY",
      description: "One to three standardized attack actions.",
      items: {
        type: "OBJECT",
        properties: {
          type: {
            type: "STRING",
            enum: ATTACK_ACTION_TYPES,
            description: "Attack action type.",
          },
          pattern: {
            type: "STRING",
            enum: [...ATTACK_PROJECTILE_PATTERNS, "beam"],
            description: "Projectile path pattern or beam marker.",
          },
          projectileKind: {
            type: "STRING",
            enum: [...ATTACK_PROJECTILE_KINDS, "beamlet"],
            description: "Visual style for the projectile or beam tracer.",
          },
          count: {
            type: "NUMBER",
            description: "How many projectiles to spawn.",
          },
          speed: {
            type: "NUMBER",
            description: "Projectile travel speed scalar.",
          },
          sizeScale: {
            type: "NUMBER",
            description: "Projectile size multiplier based on head radius.",
          },
          spreadDeg: {
            type: "NUMBER",
            description: "Spread angle in degrees for spread or lob patterns.",
          },
          damageScale: {
            type: "NUMBER",
            description: "Damage multiplier around the base attack damage.",
          },
          lifetimeFrames: {
            type: "NUMBER",
            description: "Approximate projectile lifetime in frames.",
          },
          gravityScale: {
            type: "NUMBER",
            description: "Gravity multiplier for lobbed shots.",
          },
          homingStrength: {
            type: "NUMBER",
            description: "Small homing amount from 0 to around 0.12.",
          },
          orbitFrames: {
            type: "NUMBER",
            description: "How long orbiting projectiles circle before release.",
          },
          orbitRadiusScale: {
            type: "NUMBER",
            description: "Orbit radius multiplier based on head radius.",
          },
          waveAmplitudeScale: {
            type: "NUMBER",
            description: "Ground-wave vertical wobble multiplier.",
          },
          waveFrequency: {
            type: "NUMBER",
            description: "Ground-wave wobble speed.",
          },
          beamLengthScale: {
            type: "NUMBER",
            description: "Beam reach multiplier based on head radius.",
          },
          beamWidthScale: {
            type: "NUMBER",
            description: "Beam thickness multiplier based on head radius.",
          },
          knockback: {
            type: "NUMBER",
            description: "Hit pushback amount.",
          },
          color: {
            type: "STRING",
            description: "Primary action color in #RRGGBB format.",
          },
          accentColor: {
            type: "STRING",
            description: "Secondary action color in #RRGGBB format.",
          },
          splashRadiusScale: {
            type: "NUMBER",
            description: "Explosion radius multiplier for lobbed payloads.",
          },
          splashDamageScale: {
            type: "NUMBER",
            description: "Explosion damage multiplier for lobbed payloads.",
          },
        },
        required: [
          "type",
          "pattern",
          "projectileKind",
          "count",
          "speed",
          "sizeScale",
          "spreadDeg",
          "damageScale",
          "lifetimeFrames",
          "gravityScale",
          "homingStrength",
          "orbitFrames",
          "orbitRadiusScale",
          "waveAmplitudeScale",
          "waveFrequency",
          "beamLengthScale",
          "beamWidthScale",
          "knockback",
          "color",
          "accentColor",
          "splashRadiusScale",
          "splashDamageScale",
        ],
      },
    },
  },
  required: ["description", "family", "palette", "weaponVisual", "castFx", "actions"],
};

export const accessorySchema = {
  type: "OBJECT",
  description: "Returns an object containing an accessories array of standardized accessory DSL objects. No raw JavaScript is allowed for accessories.",
  properties: {
    accessories: {
      type: "ARRAY",
      description: "Array of standardized accessory objects.",
      items: {
        type: "OBJECT",
        properties: {
          targetLocation: {
            type: "STRING",
            enum: ACCESSORY_TARGET_LOCATIONS,
            description: "Body anchor where the accessory should attach.",
          },
          description: {
            type: "STRING",
            description: "Short summary of the requested accessory.",
          },
          kind: {
            type: "STRING",
            enum: ACCESSORY_KINDS,
            description: "Closest visual category for the accessory.",
          },
          scale: {
            type: "NUMBER",
            description: "Overall accessory size multiplier.",
          },
          offsetX: {
            type: "NUMBER",
            description: "Horizontal offset from the anchor point.",
          },
          offsetY: {
            type: "NUMBER",
            description: "Vertical offset from the anchor point.",
          },
          rotationDeg: {
            type: "NUMBER",
            description: "Base accessory rotation in degrees.",
          },
          flipWithFacing: {
            type: "BOOLEAN",
            description: "Whether the accessory should mirror when the fighter changes facing direction.",
          },
          palette: {
            type: "OBJECT",
            properties: {
              primaryColor: {
                type: "STRING",
                description: "Main accessory color in #RRGGBB format.",
              },
              accentColor: {
                type: "STRING",
                description: "Secondary highlight color in #RRGGBB format.",
              },
              detailColor: {
                type: "STRING",
                description: "Dark detail or outline color in #RRGGBB format.",
              },
            },
            required: ["primaryColor", "accentColor", "detailColor"],
          },
          layers: {
            type: "ARRAY",
            description: "Two to six primitive visual layers for the accessory.",
            items: {
              type: "OBJECT",
              properties: {
                shape: {
                  type: "STRING",
                  enum: ACCESSORY_LAYER_SHAPES,
                  description: "Primitive drawing shape.",
                },
                x: { type: "NUMBER", description: "Local X offset." },
                y: { type: "NUMBER", description: "Local Y offset." },
                width: { type: "NUMBER", description: "Width for rect-like shapes." },
                height: { type: "NUMBER", description: "Height for rect-like shapes." },
                radius: { type: "NUMBER", description: "Radius for circles and arcs." },
                radiusX: { type: "NUMBER", description: "Horizontal radius for ellipses." },
                radiusY: { type: "NUMBER", description: "Vertical radius for ellipses." },
                rotationDeg: { type: "NUMBER", description: "Local layer rotation." },
                strokeWidth: { type: "NUMBER", description: "Stroke thickness." },
                opacity: { type: "NUMBER", description: "Layer opacity from 0 to 1." },
                shadowBlur: { type: "NUMBER", description: "Optional glow/shadow blur." },
                fillColor: {
                  type: "STRING",
                  description: "Use #RRGGBB or one of the palette aliases: primary, accent, detail.",
                },
                strokeColor: {
                  type: "STRING",
                  description: "Use #RRGGBB or one of the palette aliases: primary, accent, detail.",
                },
                shadowColor: {
                  type: "STRING",
                  description: "Use #RRGGBB or one of the palette aliases: primary, accent, detail.",
                },
                startDeg: { type: "NUMBER", description: "Arc start angle in degrees." },
                endDeg: { type: "NUMBER", description: "Arc end angle in degrees." },
                x2: { type: "NUMBER", description: "Line end X." },
                y2: { type: "NUMBER", description: "Line end Y." },
                fill: { type: "BOOLEAN", description: "Whether the layer should be filled." },
                stroke: { type: "BOOLEAN", description: "Whether the layer should be stroked." },
                closed: { type: "BOOLEAN", description: "Whether polygon paths should close." },
                points: {
                  type: "ARRAY",
                  description: "Polygon points for polygon layers.",
                  items: {
                    type: "OBJECT",
                    properties: {
                      x: { type: "NUMBER", description: "Point x." },
                      y: { type: "NUMBER", description: "Point y." },
                    },
                    required: ["x", "y"],
                  },
                },
              },
              required: [
                "shape",
                "x",
                "y",
                "width",
                "height",
                "radius",
                "radiusX",
                "radiusY",
                "rotationDeg",
                "strokeWidth",
                "opacity",
                "shadowBlur",
                "fillColor",
                "strokeColor",
                "shadowColor",
                "startDeg",
                "endDeg",
                "x2",
                "y2",
                "fill",
                "stroke",
                "closed",
                "points",
              ],
            },
          },
        },
        required: [
          "targetLocation",
          "description",
          "kind",
          "scale",
          "offsetX",
          "offsetY",
          "rotationDeg",
          "flipWithFacing",
          "palette",
          "layers",
        ],
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
        You are a combat designer for a 2D stickman game.
        You are NOT writing JavaScript.
        You must return a single standardized attack DSL object in the exact JSON schema.

        CONSTRAINTS AND CONTEXT:
        ${GAME_CONTEXT_DETAILS}
        - ACTIVE ATTACK FAMILY: ${family.label}
        - FAMILY SUMMARY: ${family.summary}
        - FAMILY EXAMPLES: ${family.examples.join(", ")}
        - Stay inside the active family.
        - Choose a weaponVisual that matches the family.
        - Prefer 1 or 2 actions. Use 3 only when necessary.
        - Projectile patterns should stay readable and playable, not chaotic.
        - Good mappings:
          - blade -> spread chakrams, straight slashes, radial shards
          - ballistic -> straight bullets, spread shots, rail beams
          - arcane -> beams, bolts, orbiting orbs
          - explosive -> lobbed rockets, ground waves, burst payloads
          - summon -> orbit shots, homing orbs, drone-like volleys
        - If the user asks for a body move, convert it into a weapon, beam, spell, or projectile attack in the same spirit.

        TASK:
        Return a single JSON object that matches attackSchema exactly.
        Use concise English descriptions.
        `;
}

export function buildAccessorySystemPrompt() {
  return `
        You are an accessory designer for a 2D stickman game.
        You are NOT writing JavaScript.
        You must return standardized accessory DSL objects in the exact JSON schema.

        CONTEXT & CONSTRAINTS:
        ${GAME_CONTEXT_DETAILS}
        - Target Locations: ${ACCESSORY_TARGET_LOCATIONS.join(", ")}.
        - Allowed kinds: ${ACCESSORY_KINDS.join(", ")}.
        - Allowed primitive shapes: ${ACCESSORY_LAYER_SHAPES.join(", ")}.
        - Use 2 to 6 layers per accessory.
        - Keep the silhouette readable on a small stickman.
        - Use palette aliases such as "primary", "accent", and "detail" inside layers when possible.
        - Favor bold, high-contrast accessories that stay visible on the bright arena.
        - Avoid giant props that cover the whole fighter.
        - Accessories must be decorative only: hats, crowns, goggles, armor trim, capes, amulets, scarves, backpacks, boots, badges, and similar cosmetics.
        - Never return weapons, handheld combat props, summoned objects, drones, spell effects, floating orbs, turrets, or anything implying gameplay mechanics.

        TASK: Return a single JSON OBJECT strictly adhering to the accessorySchema. Put all generated items inside the 'accessories' array.
        `;
}

export function buildIdeasPayload(attackFamilyId = DEFAULT_ATTACK_FAMILY) {
  const family = getAttackFamilyConfig(attackFamilyId);
  return {
    contents: [{
      parts: [{
        text: `Generate 3 extremely short ${family.label.toLowerCase()} attack ideas and 3 simple accessory ideas suitable for a stickman fighting game. Attack ideas must stay inside this family: ${family.summary} Do not suggest kicks, punches, wrestling moves, flips, or body-animation-heavy attacks. Ideas must be easy to translate into the attack DSL using beams, projectiles, orbit shots, lobs, or ground waves. Accessory ideas must be purely cosmetic and easy to translate into a primitive-shape accessory DSL. Never suggest weapons, drones, summons, magic props, guns, swords, staffs, or combat tools as accessories.`,
      }],
    }],
    systemInstruction: {
      parts: [{
        text: `You are a creative director for a stickman game. Provide a JSON object with creative ideas. The active attack family is ${family.label}. Attack ideas must stay in that lane: ${family.summary} Never propose kicks, punches, grapples, martial-arts combos, or animation-heavy body attacks. Accessory ideas must stay decorative only and never become weapons, drones, summons, guns, swords, staffs, magic props, or combat tools. Use simple English phrases.`,
      }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ideaSchema,
    },
  };
}
