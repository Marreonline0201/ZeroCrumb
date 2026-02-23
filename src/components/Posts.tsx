import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getProfilesByIds } from '../lib/profiles'
import {
  toggleLike,
  toggleSave,
  getLikedPostIds,
  getSavedPostIds,
  getComments,
  addComment,
  updatePost,
  type CommentWithAuthor,
} from '../lib/posts'
import { SeeMoreText } from './SeeMoreText'
import { searchGifsMultiple } from '../lib/klipy'

type AnalysisData =
  | {
      type: 'calorie'
      calories?: number
      macros?: Array<{ label: string; value: string }>
    }
  | {
      type: 'before_after'
      caloriesBefore?: number
      caloriesAfter?: number
      caloriesConsumed?: number
      foodWasteCalories?: number
      macrosBefore?: Array<{ label: string; value: string }>
      macrosAfter?: Array<{ label: string; value: string }>
    }

interface Post {
  id: string
  user: { name: string; avatar: string; username: string }
  image: string
  imageAfter?: string
  caption: string
  likes: number
  comments: number
  timestamp: string
  tags: string[]
  analysisData?: AnalysisData | null
}

interface DbPost {
  id: string
  user_id: string
  image_url: string
  image_url_after?: string
  description: string
  hashtags: string | null
  created_at: string
  likes: number | null
  analysis_data?: AnalysisData | null
}

const fallbackAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'

const formatTimeAgo = (iso: string) => {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function Posts() {
  const { user: currentUser } = useAuth()
  const [posts, setPosts] = useState<(Post & { user_id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [postToDelete, setPostToDelete] = useState<{ postId: string; userId: string } | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [commentsOpenId, setCommentsOpenId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, CommentWithAuthor[]>>({})
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [detailOpenId, setDetailOpenId] = useState<string | null>(null)
  const [sillyTabs, setSillyTabs] = useState<Array<{ id: string; url: string; x: number; y: number }>>([])
  const [visibleTabsCount, setVisibleTabsCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const loadPosts = async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select('id, user_id, image_url, image_url_after, description, hashtags, created_at, likes, analysis_data')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setPosts([])
      setLoading(false)
      return
    }

    const postsData = (data ?? []) as DbPost[]
    const userIds = [...new Set(postsData.flatMap((p) => [p.user_id]))]
    const profiles = await getProfilesByIds(userIds)

    const mapped = postsData.map((post) => {
      const profile = profiles[post.user_id]
      const name = profile?.full_name?.trim() || `User ${post.user_id.slice(0, 8)}`
      const avatar = profile?.avatar_url || fallbackAvatar
      const username = name.replace(/\s+/g, '').toLowerCase() || post.user_id.slice(0, 8)
      const tags = post.hashtags
        ? post.hashtags.split(' ').map((tag) => tag.trim()).filter(Boolean)
        : []

      return {
        id: post.id,
        user_id: post.user_id,
        user: { name, avatar, username },
        image: post.image_url,
        imageAfter: post.image_url_after ?? undefined,
        caption: post.description ?? '',
        likes: post.likes ?? 0,
        comments: 0,
        timestamp: formatTimeAgo(post.created_at),
        tags,
        analysisData: post.analysis_data ?? undefined,
      }
    })

    setPosts(mapped)
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    loadPosts().then(() => {
      if (!isMounted || !currentUser?.id) return
      Promise.all([getLikedPostIds(currentUser.id), getSavedPostIds(currentUser.id)]).then(
        ([liked, saved]) => {
          if (isMounted) {
            setLikedIds(liked)
            setSavedIds(saved)
          }
        }
      )
    })
    return () => { isMounted = false }
  }, [currentUser?.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuOpenId) return
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenId])

  useEffect(() => {
    if (!commentsOpenId) return
    getComments(commentsOpenId).then((c) => {
      const ids = [...new Set(c.map((x) => x.user_id))]
      return getProfilesByIds(ids).then((profiles) =>
        getComments(commentsOpenId!, profiles).then((full) => {
          setComments((prev) => ({ ...prev, [commentsOpenId!]: full }))
        })
      )
    })
  }, [commentsOpenId])

  const handleLike = async (postId: string) => {
    if (!currentUser) return
    const isLiked = likedIds.has(postId)
    const newCount = await toggleLike(postId, currentUser.id, isLiked)
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (isLiked) next.delete(postId)
      else next.add(postId)
      return next
    })
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: newCount } : p)))
  }

  const handleSave = async (postId: string) => {
    if (!currentUser) return
    const isSaved = savedIds.has(postId)
    const nowSaved = await toggleSave(postId, currentUser.id, isSaved)
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (nowSaved) next.add(postId)
      else next.delete(postId)
      return next
    })
  }

  const handleDeleteClick = (postId: string, userId: string) => {
    setMenuOpenId(null)
    if (!currentUser || currentUser.id !== userId) {
      setError('You can only delete your own posts')
      return
    }
    setPostToDelete({ postId, userId })
    setShowDeleteConfirm(true)
  }

  const handleEditClick = (post: Post & { user_id: string }) => {
    setMenuOpenId(null)
    setError(null)
    setEditingPostId(post.id)
    setEditCaption(post.caption)
  }

  const handleEditSave = async () => {
    if (!editingPostId || !currentUser) return
    const post = posts.find((p) => p.id === editingPostId)
    if (!post || post.user_id !== currentUser.id) return
    setSavingEdit(true)
    setError(null)
    try {
      await updatePost(editingPostId, currentUser.id, { description: editCaption.trim() })
      setPosts((prev) => prev.map((p) => (p.id === editingPostId ? { ...p, caption: editCaption.trim() } : p)))
      setEditingPostId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!postToDelete) return
    const { postId } = postToDelete
    setDeletingId(postId)
    setShowDeleteConfirm(false)
    try {
      const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId)
      if (deleteError) throw deleteError
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post')
    } finally {
      setDeletingId(null)
      setPostToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setPostToDelete(null)
  }

  const handleSillyFace = async (postId: string) => {
    const queries = ['food fail', 'cooking fail', 'food meme', 'eating funny', 'food reaction']
    const q = queries[Math.floor(Math.random() * queries.length)]
    const gifs = await searchGifsMultiple(q, 12)
    if (gifs.length === 0) return
    const tabs = gifs.slice(0, 9).map((g, i) => ({
      id: `${postId}-${i}-${Date.now()}`,
      url: g.url,
      x: 10 + Math.random() * 60,
      y: 15 + Math.random() * 50,
    }))
    setVisibleTabsCount(0)
    setSillyTabs(tabs)
  }

  useEffect(() => {
    if (sillyTabs.length === 0 || visibleTabsCount >= sillyTabs.length) return
    const t = setTimeout(() => setVisibleTabsCount((c) => c + 1), 200)
    return () => clearTimeout(t)
  }, [sillyTabs.length, visibleTabsCount])

  const handleAddComment = async (postId: string) => {
    const text = commentText[postId]?.trim()
    if (!text || !currentUser) return
    try {
      await addComment(postId, currentUser.id, text)
      setCommentText((prev) => ({ ...prev, [postId]: '' }))
      const post = posts.find((p) => p.id === postId)
      if (post) {
        const profiles = await getProfilesByIds([currentUser.id])
        const list = await getComments(postId, profiles)
        setComments((prev) => ({ ...prev, [postId]: list }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    }
  }

  return (
    <div className="max-w-md mx-auto pb-6 px-3">
      {loading && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm">
          Loading posts...
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      {!loading && !error && posts.length === 0 && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm">
          No posts yet. Be the first to share!
        </div>
      )}
      <div className="space-y-6">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className={`bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 ${index === 0 ? 'mt-4' : ''}`}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <img src={post.user.avatar} alt={post.user.name} className="w-8 h-8 rounded-full" />
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">{post.user.name}</h3>
                  <p className="text-zinc-500 text-xs">{post.timestamp}</p>
                </div>
              </div>
              <div
                className="relative"
                ref={(el) => {
                  if (currentUser?.id === post.user_id && menuOpenId === post.id) {
                    (menuRef as React.MutableRefObject<HTMLDivElement | null>).current = el
                  }
                }}
              >
                {currentUser?.id === post.user_id ? (
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="6" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="18" r="1.5" />
                    </svg>
                  </button>
                ) : null}
                {menuOpenId === post.id && (
                  <div className="absolute right-0 top-full mt-1 py-1 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl z-10 min-w-[120px]">
                    <button
                      type="button"
                      onClick={() => handleEditClick(post)}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(post.id, post.user_id)}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="aspect-square flex">
              {post.imageAfter ? (
                <div className="flex-1 grid grid-cols-2">
                  <img src={post.image} alt="Before" className="w-full h-full object-cover" />
                  <img src={post.imageAfter} alt="After" className="w-full h-full object-cover" />
                </div>
              ) : (
                <img src={post.image} alt="Post" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleLike(post.id)}
                    className={`transition-colors ${likedIds.has(post.id) ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'}`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill={likedIds.has(post.id) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentsOpenId(commentsOpenId === post.id ? null : post.id)}
                    className="text-zinc-400 hover:text-zinc-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSillyFace(post.id)}
                    className="text-zinc-400 hover:text-yellow-400 text-xl leading-none"
                    title="Silly"
                  >
                    😜
                  </button>
                </div>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => handleSave(post.id)}
                    className={savedIds.has(post.id) ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'}
                  >
                    <svg
                      className="w-6 h-6"
                      fill={savedIds.has(post.id) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-zinc-100 text-sm">{post.likes} likes</p>
                {editingPostId === post.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Edit your description..."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      rows={4}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleEditSave}
                        disabled={savingEdit}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                      >
                        {savingEdit ? 'Saving...' : 'Finish Editing'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPostId(null)}
                        className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">
                    <span className="font-semibold text-zinc-100">{post.user.username}</span>
                    <span className="text-zinc-300 ml-2">
                      <SeeMoreText text={post.caption} />
                    </span>
                  </p>
                )}

                {post.analysisData && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setDetailOpenId(detailOpenId === post.id ? null : post.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {detailOpenId === post.id ? 'Hide calorie detail' : 'See calorie detail'}
                    </button>
                    {detailOpenId === post.id && (
                      <div className="mt-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-300 space-y-1">
                        {post.analysisData.type === 'calorie' && (
                          <>
                            <p className="text-emerald-400 font-medium">Calories: {Math.round(post.analysisData.calories ?? 0)}</p>
                            {post.analysisData.macros?.map((m) => (
                              <p key={m.label}>{m.label}: {m.value}</p>
                            ))}
                          </>
                        )}
                        {post.analysisData.type === 'before_after' && (
                          <>
                            <p>Before: {Math.round(post.analysisData.caloriesBefore ?? 0)} cal</p>
                            <p>After: {Math.round(post.analysisData.caloriesAfter ?? 0)} cal</p>
                            <p className="text-emerald-400">Consumed: {Math.round(post.analysisData.caloriesConsumed ?? 0)} cal</p>
                            <p className="text-red-400">Waste: {Math.round(post.analysisData.foodWasteCalories ?? 0)} cal</p>
                            {post.analysisData.macrosBefore?.length ? (
                              <p className="mt-1">Before macros: {post.analysisData.macrosBefore.map((m) => `${m.label}: ${m.value}`).join(', ')}</p>
                            ) : null}
                            {post.analysisData.macrosAfter?.length ? (
                              <p>After macros: {post.analysisData.macrosAfter.map((m) => `${m.label}: ${m.value}`).join(', ')}</p>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {commentsOpenId === post.id && (
                  <div className="pt-3 border-t border-zinc-700 space-y-2">
                    {(comments[post.id] ?? []).map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <img src={c.author_avatar} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-semibold text-zinc-200">{c.author_name}</span>
                            <span className="text-zinc-400 ml-2">
                              <SeeMoreText text={c.text} />
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                    {currentUser && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentText[post.id] ?? ''}
                          onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post.id)}
                          className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                          title="Submit comment"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Silly GIF error tabs overlay */}
      {sillyTabs.length > 0 && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="absolute inset-0 pointer-events-auto" onClick={() => setSillyTabs([])} />
          {[...sillyTabs.slice(0, visibleTabsCount)].reverse().map((tab, idx) => (
            <div
              key={tab.id}
              className="absolute w-48 rounded-lg overflow-hidden border-2 border-red-500 bg-zinc-900 shadow-xl pointer-events-auto"
              style={{
                left: `${tab.x}%`,
                top: `${tab.y}%`,
                zIndex: 100 + idx,
              }}
            >
              <div className="flex items-center justify-between px-2 py-1 bg-red-500/20 border-b border-red-500/50">
                <span className="text-xs font-mono text-red-400">Error 0x{Math.random().toString(16).slice(2, 8)}</span>
                <button
                  type="button"
                  onClick={() => setSillyTabs([])}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <img src={tab.url} alt="" className="w-full aspect-square object-cover" />
            </div>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Delete Post?</h3>
            <p className="text-zinc-400 text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId === postToDelete?.postId}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
              >
                {deletingId === postToDelete?.postId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
