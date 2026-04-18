export const DEFAULT_ATTACK_IDEAS = [
  "Ateş Topu fırlat",
  "Zıplayan Elektrik Topu",
  "Lazer Tüfek Atışı",
];

export const DEFAULT_ACCESSORY_IDEAS = [
  "Silahlı Robot Kol (El)",
  "Plazma Tüfeği (El)",
  "Keskin Nişancı Gözlüğü (Göz)",
];

export const GAME_CONTEXT_DETAILS = `
OYUN MOTORU DETAYLARI VE KULLANILABİLİR DEĞİŞKENLER:

1. KARAKTER NESNESİ ('player' ve 'opponent'):
    - KRİTİK FİZİK DEĞİŞKENLERİ: player.x, player.y (Gövde Merkezi), player.vx, player.vy (Hızlar).
    - YASAK: ASLA 'velX', 'velY', 'vel' gibi isimlendirmeler kullanmayın. SADECE player.vx ve player.vy geçerlidir.
    - DİĞER: player.onGround, player.facing, player.takeDamage(amount), player.headRadius.

2. GLOBAL SABİTLER VE ORTAMLAR:
    - ATTACK_DAMAGE: 10
    - FLOOR_Y: 400, GRAVITY: 0.5
    - Canvas/Mouse: ctx, canvas, mouseX, mouseY
    - Mermi Fırlatma: spawnProjectile(startX, startY, vx, vy, ATTACK_DAMAGE, size, color, drawCode, behaviorCode)
    - Partikül Efekti: spawnParticleEffect(x, y, count, color, size, maxSpeed, lifespan)

3. SALDIRI KURALLARI:
    - Boyut ve hızları player.headRadius üzerinden oransal hesaplayın.
    - PROJECTILE_BEHAVIOR_CODE sabitini kullanın.
    - Mermi çıkışı için handRX ve handRY kullanın.
    - Hız için yalnızca vx ve vy kullanın.

4. MERMİ DAVRANIŞ KODU:
    - Bu kod yalnızca 'p', 'player', 'opponent', 'GRAVITY' ve 'FLOOR_Y' değişkenlerine erişir.
    - Mermi hareketi için p.x += p.vx; ve p.y += p.vy; kullanın.

5. GÖRSEL KISITLAMALAR:
    - Aksesuar çizim kodunda tüm boyutları ve konumları scale ile çarpın.
    - Silah gerekiyorsa requiredEquipmentDrawCode alanını doldurun.
    - scale değişkenini yeniden tanımlamayın.
    - Gölgelendirme, parlama ve zengin renkler kullanın.
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

        TASK: Return a single JSON OBJECT strictly adhering to the attackSchema. Use Turkish comments for any complex parts.
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

        TASK: Return a JSON ARRAY strictly adhering to the accessorySchema. Use Turkish comments for any complex parts.
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
        text: "You are a creative director for a stickman game. Provide a JSON object with creative ideas. Ideas must be extremely short, concise, and directly translatable into simple game code. Use simple Turkish phrases.",
      }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ideaSchema,
    },
  };
}
