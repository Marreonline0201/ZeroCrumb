/**
 * Gemini API for food image analysis and caption generation
 * Add VITE_GEMINI_API_KEY to .env - get key at https://aistudio.google.com/apikey
 */

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

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
            text: `Analyze this food image and estimate nutrition. Respond in JSON only, no markdown:
{
  "caption": "Short 3-5 word description of the main food (e.g. Grilled chicken salad)",
  "calories": estimated total calories (number),
  "items": [{"name": "food item", "calories": number}],
  "macros": {
    "protein": {"value": number, "unit": "g"},
    "carbs": {"value": number, "unit": "g"},
    "fat": {"value": number, "unit": "g"},
    "fiber": {"value": number, "unit": "g"},
    "sugar": {"value": number, "unit": "g"}
  }
}
Estimate portions realistically. If unsure about fiber/sugar, use 0.`
          },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')

  return JSON.parse(text) as GeminiFoodAnalysis
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
  const macros = g.macros ?? {}

  const macroMap: Record<string, { label: string; quantity: number; unit: string }> = {}
  if (calories > 0) macroMap.ENERC_KCAL = { label: 'Calories', quantity: calories, unit: 'kcal' }
  if (macros.protein?.value != null) macroMap.PROCNT = { label: 'Protein', quantity: macros.protein.value, unit: macros.protein.unit || 'g' }
  if (macros.carbs?.value != null) macroMap.CHOCDF = { label: 'Carbs', quantity: macros.carbs.value, unit: macros.carbs.unit || 'g' }
  if (macros.fat?.value != null) macroMap.FAT = { label: 'Fat', quantity: macros.fat.value, unit: macros.fat.unit || 'g' }
  if (macros.fiber?.value != null) macroMap.FIBTG = { label: 'Fiber', quantity: macros.fiber.value, unit: macros.fiber.unit || 'g' }
  if (macros.sugar?.value != null) macroMap.SUGAR = { label: 'Sugar', quantity: macros.sugar.value, unit: macros.sugar.unit || 'g' }

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
