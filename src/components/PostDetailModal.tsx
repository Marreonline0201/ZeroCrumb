import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getProfilesByIds } from '../lib/profiles'
import {
  getPostById,
  getComments,
  addComment,
  updatePost,
  toggleLike,
  toggleSave,
  getLikedPostIds,
  getSavedPostIds,
  type CommentWithAuthor,
} from '../lib/posts'
import { SeeMoreText } from './SeeMoreText'
import { searchGifsMultiple } from '../lib/klipy'

type AnalysisData =
  | { type: 'calorie'; calories?: number; macros?: Array<{ label: string; value: string }> }
  | {
      type: 'before_after'
      caloriesBefore?: number
      caloriesAfter?: number
      caloriesConsumed?: number
      foodWasteCalories?: number
      macrosBefore?: Array<{ label: string; value: string }>
      macrosAfter?: Array<{ label: string; value: string }>
    }

interface PostDetailModalProps {
  postId: string
  isOwnPost: boolean
  onClose: () => void
  onDelete: (postId: string) => void
  onUpdate?: (postId: string, updates: { caption?: string }) => void
}

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

export function PostDetailModal({ postId, isOwnPost, onClose, onDelete, onUpdate }: PostDetailModalProps) {
  const { user: currentUser } = useAuth()
  const [post, setPost] = useState<Awaited<ReturnType<typeof getPostById>>>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [commentText, setCommentText] = useState('')
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [editing, setEditing] = useState(false)
  const [editCaption, setEditCaption] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [sillyTabs, setSillyTabs] = useState<Array<{ id: string; url: string; x: number; y: number }>>([])
  const [visibleTabsCount, setVisibleTabsCount] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!postId) return
    const load = async () => {
      setLoading(true)
      const { data: postData } = await supabase.from('posts').select('user_id').eq('id', postId).single()
      const authorId = (postData as { user_id?: string } | null)?.user_id
      const profiles = await getProfilesByIds(authorId ? [authorId] : [])
      const fullPost = await getPostById(postId, profiles)
      setPost(fullPost)
      if (fullPost) {
        setEditCaption(fullPost.caption)
        setLikesCount(fullPost.likes)
        const rawComments = await getComments(postId, {})
        const commentUserIds = [...new Set(rawComments.map((c) => c.user_id))]
        const commentProfiles = await getProfilesByIds(commentUserIds)
        const list = await getComments(postId, commentProfiles)
        setComments(list)
      }
      if (currentUser?.id) {
        const [likedIds, savedIds] = await Promise.all([
          getLikedPostIds(currentUser.id),
          getSavedPostIds(currentUser.id),
        ])
        setLiked(likedIds.has(postId))
        setSaved(savedIds.has(postId))
      }
      setLoading(false)
    }
    load()
  }, [postId, currentUser?.id])

  useEffect(() => {
    if (sillyTabs.length === 0 || visibleTabsCount >= sillyTabs.length) return
    const t = setTimeout(() => setVisibleTabsCount((c) => c + 1), 200)
    return () => clearTimeout(t)
  }, [sillyTabs.length, visibleTabsCount])

  const handleLike = async () => {
    if (!currentUser) return
    const newCount = await toggleLike(postId, currentUser.id, liked)
    setLiked(!liked)
    setLikesCount(newCount)
  }

  const handleSave = async () => {
    if (!currentUser) return
    const nowSaved = await toggleSave(postId, currentUser.id, saved)
    setSaved(nowSaved)
  }

  const handleAddComment = async () => {
    const text = commentText.trim()
    if (!text || !currentUser) return
    try {
      await addComment(postId, currentUser.id, text)
      setCommentText('')
      const profiles = await getProfilesByIds([currentUser.id])
      const list = await getComments(postId, profiles)
      setComments(list)
    } catch {
      // ignore
    }
  }

  const handleEditSave = async () => {
    if (!currentUser || !post || post.user_id !== currentUser.id) return
    setSavingEdit(true)
    try {
      await updatePost(postId, currentUser.id, { description: editCaption.trim() })
      setPost((p) => (p ? { ...p, caption: editCaption.trim() } : p))
      setEditing(false)
      onUpdate?.(postId, { caption: editCaption.trim() })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await supabase.from('posts').delete().eq('id', postId)
      onDelete(postId)
      onClose()
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSillyFace = async () => {
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

  const analysisData = post?.analysisData as AnalysisData | undefined

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 max-w-md w-full">
          <p className="text-zinc-400 text-center">Loading...</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <p className="text-zinc-400 text-center">Post not found</p>
          <button onClick={onClose} className="mt-4 w-full py-2 rounded-lg bg-zinc-800 text-zinc-300">
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden max-w-md w-full my-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <Link
              to={`/profile/${post.user_id}`}
              onClick={onClose}
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <img src={post.user.avatar} alt="" className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-semibold text-zinc-100">{post.user.name}</p>
                <p className="text-xs text-zinc-500">{formatTimeAgo(post.created_at)}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`transition-colors ${liked ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'}`}
                >
                  <svg className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <span className="text-zinc-300 font-medium">{likesCount} likes</span>
                <button
                  type="button"
                  onClick={handleSillyFace}
                  className="text-zinc-400 hover:text-yellow-400 text-xl leading-none"
                  title="Silly"
                >
                  😜
                </button>
              </div>
              {currentUser && (
                <button
                  type="button"
                  onClick={handleSave}
                  className={saved ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'}
                >
                  <svg className="w-6 h-6" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={savingEdit}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm">
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

            {analysisData && (
              <div>
                <button
                  type="button"
                  onClick={() => setDetailOpen(!detailOpen)}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {detailOpen ? 'Hide detail' : 'View detail'}
                </button>
                {detailOpen && (
                  <div className="mt-2 p-2 rounded-lg bg-zinc-800/50 text-xs text-zinc-400 space-y-1">
                    {analysisData.type === 'calorie' && (
                      <>
                        <p>Calories: {Math.round(analysisData.calories ?? 0)}</p>
                        {analysisData.macros?.map((m) => (
                          <p key={m.label}>{m.label}: {m.value}</p>
                        ))}
                      </>
                    )}
                    {analysisData.type === 'before_after' && (
                      <>
                        <p>Before: {Math.round(analysisData.caloriesBefore ?? 0)} cal</p>
                        <p>After: {Math.round(analysisData.caloriesAfter ?? 0)} cal</p>
                        <p className="text-emerald-400">Consumed: {Math.round(analysisData.caloriesConsumed ?? 0)} cal</p>
                        <p className="text-red-400">Waste: {Math.round(analysisData.foodWasteCalories ?? 0)} cal</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-zinc-800 pt-3">
              <p className="text-sm font-medium text-zinc-400 mb-2">Comments ({comments.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((c) => (
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
              </div>
              {currentUser && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
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

            {isOwnPost && (
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-0 z-[100] pointer-events-none">
        {sillyTabs.length > 0 && (
          <>
            <div className="absolute inset-0 pointer-events-auto" onClick={() => setSillyTabs([])} />
            {[...sillyTabs.slice(0, visibleTabsCount)].reverse().map((tab, idx) => (
              <div
                key={tab.id}
                className="absolute w-48 rounded-lg overflow-hidden border-2 border-red-500 bg-zinc-900 shadow-xl pointer-events-auto"
                style={{ left: `${tab.x}%`, top: `${tab.y}%`, zIndex: 100 + idx }}
              >
                <div className="flex items-center justify-between px-2 py-1 bg-red-500/20 border-b border-red-500/50">
                  <span className="text-xs font-mono text-red-400">Error 0x{Math.random().toString(16).slice(2, 8)}</span>
                  <button type="button" onClick={() => setSillyTabs([])} className="text-red-400 hover:text-red-300 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <img src={tab.url} alt="" className="w-full aspect-square object-cover" />
              </div>
            ))}
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Delete Post?</h3>
            <p className="text-zinc-400 text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
