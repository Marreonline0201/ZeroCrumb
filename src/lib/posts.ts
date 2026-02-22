import { supabase } from './supabase'

export async function toggleLike(postId: string, userId: string, isLiked: boolean): Promise<number> {
  if (isLiked) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
  }
  // posts.likes is kept in sync by DB trigger sync_post_likes_count
  const { count } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId)
  return count ?? 0
}

export async function toggleSave(postId: string, userId: string, isSaved: boolean): Promise<boolean> {
  if (isSaved) {
    await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', userId)
    return false
  } else {
    await supabase.from('post_saves').insert({ post_id: postId, user_id: userId })
    return true
  }
}

export async function getLikedPostIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', userId)
  return new Set((data ?? []).map((r) => r.post_id))
}

export async function getSavedPostIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('post_saves').select('post_id').eq('user_id', userId)
  return new Set((data ?? []).map((r) => r.post_id))
}

export interface CommentWithAuthor {
  id: string
  post_id: string
  user_id: string
  text: string
  created_at: string
  author_name: string
  author_avatar: string
}

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'

export async function getComments(
  postId: string,
  profiles?: Record<string, { full_name: string | null; avatar_url: string | null }>
): Promise<CommentWithAuthor[]> {
  const { data } = await supabase
    .from('post_comments')
    .select('id, post_id, user_id, text, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  const comments = (data ?? []) as Array<{ id: string; post_id: string; user_id: string; text: string; created_at: string }>
  const prof = profiles ?? {}
  return comments.map((c) => {
    const p = prof[c.user_id]
    return {
      ...c,
      author_name: p?.full_name?.trim() || `User ${c.user_id.slice(0, 8)}`,
      author_avatar: p?.avatar_url || FALLBACK_AVATAR,
    }
  })
}

export async function addComment(postId: string, userId: string, text: string): Promise<void> {
  const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, text: text.trim() })
  if (error) throw error
}

export async function getPostById(
  postId: string,
  profiles: Record<string, { full_name: string | null; avatar_url: string | null }>
): Promise<{
  id: string
  user_id: string
  user: { name: string; avatar: string; username: string }
  image: string
  imageAfter?: string
  caption: string
  likes: number
  tags: string[]
  analysisData?: unknown
  created_at: string
} | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, image_url, image_url_after, description, hashtags, created_at, likes, analysis_data')
    .eq('id', postId)
    .single()
  if (error || !data) return null
  const p = data as {
    id: string
    user_id: string
    image_url: string
    image_url_after?: string
    description: string
    hashtags: string | null
    created_at: string
    likes: number | null
    analysis_data?: unknown
  }
  const prof = profiles[p.user_id]
  const name = prof?.full_name?.trim() || `User ${p.user_id.slice(0, 8)}`
  const avatar = prof?.avatar_url || FALLBACK_AVATAR
  const username = name.replace(/\s+/g, '').toLowerCase() || p.user_id.slice(0, 8)
  const tags = p.hashtags ? p.hashtags.split(' ').map((t) => t.trim()).filter(Boolean) : []
  return {
    id: p.id,
    user_id: p.user_id,
    user: { name, avatar, username },
    image: p.image_url,
    imageAfter: p.image_url_after ?? undefined,
    caption: p.description ?? '',
    likes: p.likes ?? 0,
    tags,
    analysisData: p.analysis_data,
    created_at: p.created_at,
  }
}

export async function updatePost(postId: string, userId: string, updates: { description?: string; hashtags?: string }): Promise<void> {
  const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined))
  if (Object.keys(filtered).length === 0) return
  const { data, error } = await supabase
    .from('posts')
    .update(filtered)
    .eq('id', postId)
    .eq('user_id', userId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Could not update post. You may not have permission to edit it.')
  }
}
