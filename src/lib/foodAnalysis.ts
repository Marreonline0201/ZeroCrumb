/**
 * Food image analysis - uses Gemini API (free tier)
 * Add VITE_GEMINI_API_KEY to .env - get key at https://aistudio.google.com/apikey
 */

import { analyzeFoodWithGemini, geminiToLogMealFormat } from './gemini'

export interface LogMealNutrient {
  label: string
  quantity: number
  unit: string
}

export interface LogMealNutritionResponse {
  imageId: number
  foodName: string | string[]
  hasNutritionalInfo: boolean
  ids: number | number[] | null
  nutritional_info?: {
    calories: number
    totalNutrients: Record<string, LogMealNutrient>
  }
  nutritional_info_per_item?: Array<{
    food_item_position: number
    id: number
    name?: string
    hasNutritionalInfo: boolean
    nutritional_info?: { calories: number; totalNutrients: Record<string, LogMealNutrient> }
  }>
}

/**
 * Analyze a food image and return nutrition data.
 * Uses Gemini API (free) - no LogMeal key required.
 */
export async function analyzeFoodImage(imageFile: File): Promise<{
  data: LogMealNutritionResponse
  caption?: string
}> {
  const geminiResult = await analyzeFoodWithGemini(imageFile)
  const data = geminiToLogMealFormat(geminiResult) as LogMealNutritionResponse
  return { data, caption: geminiResult.caption }
}
