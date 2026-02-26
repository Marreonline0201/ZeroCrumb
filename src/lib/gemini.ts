/**
 * Gemini API for food image analysis and caption generation
 * Add VITE_GEMINI_API_KEY to .env - get key at https://aistudio.google.com/apikey
 */

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function getApiKey(): string | null {
  return import.meta.env.VITE_GEMINI_API_KEY ?? null
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export interface GeminiFoodAnalysis {
  caption: string
  calories?: number
  items?: Array<{ name: string; calories: number }>
  macros?: Record<string, { value: number; unit: string }>
}

/**
 * Analyze a food image with Gemini - returns caption and nutrition estimate.
 * Used as the primary (free) food analyzer, replacing LogMeal.
 */
export async function analyzeFoodWithGemini(imageFile: File): Promise<GeminiFoodAnalysis> {
  const key = getApiKey()
  if (!key) throw new Error('VITE_GEMINI_API_KEY not set')

  const base64 = await fileToBase64(imageFile)
  const mimeType = imageFile.type || 'image/jpeg'

  const res = await fetch(`${GEMINI_API}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64 } },
          {
            text: `Analyze this food photo. You MUST provide:
1. Total calories
2. Each food item separately with its calories (e.g. lettuce, chicken, cheese - NOT "burger with lettuce and cheese")
3. Macronutrients: protein, carbs, fat, fiber, sugar in grams - REQUIRED, estimate from the food even if approximate

Reply with ONLY this JSON (no other text):
{"caption":"Burrito bowl","calories":650,"items":[{"name":"lettuce","calories":15},{"name":"guacamole","calories":150},{"name":"chicken","calories":250},{"name":"cheese","calories":110},{"name":"chips","calories":125}],"macros":{"protein":{"value":35,"unit":"g"},"carbs":{"value":45,"unit":"g"},"fat":{"value":28,"unit":"g"},"fiber":{"value":8,"unit":"g"},"sugar":{"value":3,"unit":"g"}}}

The macros object is REQUIRED. Estimate protein/carbs/fat from typical food composition (meat=protein, bread/rice=carbs, cheese/oil=fat). Use 0 only if truly unknown.`
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Gemini API error: ${res.status}`)
  }

  const data = await res.json().catch(() => {
    throw new Error('Invalid response from Gemini API')
  })
  const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
  if (!text) throw new Error('No response from Gemini')

  // Strip markdown code blocks if present
  let jsonStr = text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  // Extract first { ... } if there's extra text
  const braceMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (braceMatch) jsonStr = braceMatch[0]

  // Fix common JSON issues from LLM output
  jsonStr = jsonStr
    .replace(/,(\s*[}\]])/g, '$1')           // trailing commas
    .replace(/[\x00-\x1f]/g, '')            // control characters (but keep \n for now)

  let parsed: GeminiFoodAnalysis
  try {
    parsed = JSON.parse(jsonStr) as GeminiFoodAnalysis
  } catch {
    // Fallback: extract values with regex when JSON is malformed
    const calMatch = jsonStr.match(/"calories"\s*:\s*(\d+(?:\.\d+)?)/) ?? jsonStr.match(/calories["']?\s*:\s*(\d+)/)
    const captionMatch = jsonStr.match(/"caption"\s*:\s*"([^"]*)"/)
    let calories = calMatch ? Number(calMatch[1]) : 0
    const caption = (captionMatch?.[1] ?? '').trim() || 'Food'
    const items: Array<{ name: string; calories: number }> = []
    const itemRegex = /"name"\s*:\s*"([^"]*)"\s*,\s*"calories"\s*:\s*(\d+(?:\.\d+)?)/g
    let m
    while ((m = itemRegex.exec(jsonStr)) !== null) {
      items.push({ name: (m[1] || 'Food').trim(), calories: Number(m[2]) || 0 })
    }
    if (items.length === 0 && calories > 0) {
      items.push({ name: caption, calories })
    }
    if (calories === 0 && items.length > 0) {
      calories = items.reduce((sum, i) => sum + i.calories, 0)
    }
    const macros: Record<string, { value: number; unit: string }> = {}
    const macroPatterns = [
      ['protein', /"protein"\s*:\s*\{\s*"value"\s*:\s*(\d+(?:\.\d+)?)/i],
      ['carbs', /"carbs"\s*:\s*\{\s*"value"\s*:\s*(\d+(?:\.\d+)?)/i],
      ['fat', /"fat"\s*:\s*\{\s*"value"\s*:\s*(\d+(?:\.\d+)?)/i],
      ['fiber', /"fiber"\s*:\s*\{\s*"value"\s*:\s*(\d+(?:\.\d+)?)/i],
      ['sugar', /"sugar"\s*:\s*\{\s*"value"\s*:\s*(\d+(?:\.\d+)?)/i],
    ]
    for (const [key, re] of macroPatterns) {
      const match = jsonStr.match(re as RegExp)
      if (match) macros[key as keyof typeof macros] = { value: Number(match[1]), unit: 'g' }
    }
    parsed = { caption, calories, items, macros }
  }

  const result = {
    caption: parsed.caption ?? 'Food',
    calories: parsed.calories ?? 0,
    items: parsed.items ?? [],
    macros: parsed.macros ?? {},
  }
  if (result.calories === 0 && result.items.length === 0) {
    throw new Error('Gemini returned no nutrition data. Try analyzing again.')
  }
  return result
}

/** Get numeric value from macro object - supports value, quantity, amount, or plain number */
function getMacroQty(obj: unknown): number | null {
  if (obj == null) return null
  if (typeof obj === 'number' && !Number.isNaN(obj)) return obj
  if (typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const v = o.value ?? o.quantity ?? o.amount
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') return parseFloat(v) || null
  return null
}

/** Find macro value in object with flexible key matching (protein, Protein, PROTEIN, etc.) */
function findMacro(macros: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = macros[key] ?? macros[key.toLowerCase()]
    const qty = getMacroQty(val)
    if (qty != null) return qty
  }
  return null
}

/** Estimate macros from calories using typical distribution: ~20% protein, ~50% carbs, ~30% fat */
function estimateMacrosFromCalories(cal: number): { protein: number; carbs: number; fat: number; fiber: number; sugar: number } {
  const pCal = cal * 0.2
  const cCal = cal * 0.5
  const fCal = cal * 0.3
  return {
    protein: Math.round((pCal / 4) * 10) / 10,
    carbs: Math.round((cCal / 4) * 10) / 10,
    fat: Math.round((fCal / 9) * 10) / 10,
    fiber: Math.round((cal / 500) * 5 * 10) / 10,
    sugar: Math.round((cal / 500) * 10 * 10) / 10,
  }
}

/**
 * Convert Gemini analysis to LogMeal-compatible format for use across the app
 */
export function geminiToLogMealFormat(g: GeminiFoodAnalysis): {
  imageId: number
  foodName: string | string[]
  hasNutritionalInfo: boolean
  ids: null
  nutritional_info?: {
    calories: number
    totalNutrients: Record<string, { label: string; quantity: number; unit: string }>
  }
  nutritional_info_per_item?: Array<{
    food_item_position: number
    id: number
    name?: string
    hasNutritionalInfo: boolean
    nutritional_info?: { calories: number; totalNutrients: Record<string, { label: string; quantity: number; unit: string }> }
  }>
} {
  const calories = g.calories ?? 0
  const items = g.items ?? []
  const macros = (g.macros ?? {}) as Record<string, unknown>

  const macroMap: Record<string, { label: string; quantity: number; unit: string }> = {}
  if (calories > 0) macroMap.ENERC_KCAL = { label: 'Calories', quantity: calories, unit: 'kcal' }

  const protein = findMacro(macros, 'protein', 'Protein', 'PROCNT')
  const carbs = findMacro(macros, 'carbs', 'carbohydrates', 'Carbohydrates', 'CHOCDF')
  const fat = findMacro(macros, 'fat', 'Fat', 'FAT')
  const fiber = findMacro(macros, 'fiber', 'Fiber', 'FIBTG')
  const sugar = findMacro(macros, 'sugar', 'Sugar', 'SUGAR')

  if (protein != null) macroMap.PROCNT = { label: 'Protein', quantity: protein, unit: 'g' }
  if (carbs != null) macroMap.CHOCDF = { label: 'Carbs', quantity: carbs, unit: 'g' }
  if (fat != null) macroMap.FAT = { label: 'Fat', quantity: fat, unit: 'g' }
  if (fiber != null) macroMap.FIBTG = { label: 'Fiber', quantity: fiber, unit: 'g' }
  if (sugar != null) macroMap.SUGAR = { label: 'Sugar', quantity: sugar, unit: 'g' }

  // If we have calories but no macros from API, estimate them so user sees something useful
  if (calories > 0 && Object.keys(macroMap).length <= 1) {
    const est = estimateMacrosFromCalories(calories)
    if (!macroMap.PROCNT) macroMap.PROCNT = { label: 'Protein', quantity: est.protein, unit: 'g' }
    if (!macroMap.CHOCDF) macroMap.CHOCDF = { label: 'Carbs', quantity: est.carbs, unit: 'g' }
    if (!macroMap.FAT) macroMap.FAT = { label: 'Fat', quantity: est.fat, unit: 'g' }
    if (!macroMap.FIBTG) macroMap.FIBTG = { label: 'Fiber', quantity: est.fiber, unit: 'g' }
    if (!macroMap.SUGAR) macroMap.SUGAR = { label: 'Sugar', quantity: est.sugar, unit: 'g' }
  }

  const foodNames = items.length > 0 ? items.map((i) => i.name) : [g.caption || 'Food']
  const nutritional_info_per_item = items.map((item, i) => ({
    food_item_position: i + 1,
    id: i + 1,
    name: item.name,
    hasNutritionalInfo: true,
    nutritional_info: {
      calories: item.calories,
      totalNutrients: {} as Record<string, { label: string; quantity: number; unit: string }>,
    },
  }))

  return {
    imageId: 0,
    foodName: foodNames.length === 1 ? foodNames[0] : foodNames,
    hasNutritionalInfo: true,
    ids: null,
    nutritional_info: {
      calories,
      totalNutrients: macroMap,
    },
    nutritional_info_per_item: nutritional_info_per_item.length > 0 ? nutritional_info_per_item : undefined,
  }
}

/**
 * Generate a fun caption for a food GIF (for meme display)
 */
export async function getMemeCaptionForGif(foodName: string, _gifUrl: string): Promise<string> {
  const key = getApiKey()
  if (!key) return ''

  try {
    const res = await fetch(`${GEMINI_API}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Given the food "${foodName}" and that we're showing a related GIF, write ONE short, funny caption (max 15 words) that would go well below the GIF. Be playful and food-related. Reply with ONLY the caption, no quotes.`
          }],
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 64,
        },
      }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const caption = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return caption || ''
  } catch {
    return ''
  }
}

/**
 * Use Gemini to turn a list of food items into one concise dish name (e.g. "Yakisoba with rice and chicken")
 */
export async function getDishNameFromItems(foodNames: string[]): Promise<string> {
  const key = getApiKey()
  if (!key || foodNames.length === 0) return ''

  try {
    const unique = [...new Set(foodNames.filter(Boolean))]
    const items = unique.join(', ')
    if (!items) return ''

    const res = await fetch(`${GEMINI_API}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Combine these food items into ONE natural dish name: "${items}". Examples: "Yakisoba with rice and chicken", "Grilled chicken salad", "Monster Energy Zero Sugar". Do NOT simply list or repeat the items. Reply with ONLY the dish name (3-8 words), no quotes.`
          }],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 64,
        },
      }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const name = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return name || ''
  } catch {
    return ''
  }
}

/**
 * Generate a short caption for a food image (for calendar display)
 */
export async function getFoodImageCaption(imageUrl: string): Promise<string> {
  const key = getApiKey()
  if (!key) return ''

  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    const file = new File([blob], 'food.jpg', { type: blob.type })
    const analysis = await analyzeFoodWithGemini(file)
    return analysis.caption || ''
  } catch {
    return ''
  }
}
