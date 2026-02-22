/**
 * Klipy GIF Search API
 * Docs: https://docs.klipy.com/gifs-api/gifs-search-api
 * Get API key at: https://partner.klipy.com
 *
 * Add VITE_KLIPY_API_KEY to your .env
 */

const KLIPY_BASE = 'https://api.klipy.com'

function getApiKey(): string | null {
  return import.meta.env.VITE_KLIPY_API_KEY ?? null
}

export interface KlipySearchResult {
  url: string
  dims?: [number, number]
}

/**
 * Search for GIFs using Klipy API. Returns the first result's GIF URL.
 */
export async function searchGifs(query: string, limit = 1): Promise<KlipySearchResult | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn('VITE_KLIPY_API_KEY not set. Get a free key at https://partner.klipy.com')
    return null
  }

  const params = new URLSearchParams({
    q: query,
    key: apiKey,
    limit: String(limit),
  })

  const res = await fetch(`${KLIPY_BASE}/v2/search?${params}`)
  if (!res.ok) {
    console.error('Klipy API error:', res.status, await res.text())
    return null
  }

  const data = (await res.json()) as {
    results?: Array<{
      media_formats?: {
        gif?: { url?: string; dims?: [number, number] }
      }
    }>
  }

  const first = data.results?.[0]
  const gif = first?.media_formats?.gif
  if (!gif?.url) return null

  return {
    url: gif.url,
    dims: gif.dims,
  }
}
