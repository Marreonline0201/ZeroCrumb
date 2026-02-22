import { useState } from 'react'

interface Post {
  id: string
  user: {
    name: string
    avatar: string
    username: string
  }
  image: string
  caption: string
  likes: number
  comments: number
  timestamp: string
  tags: string[]
}

// Mock data for demonstration
const mockPosts: Post[] = [
  {
    id: '1',
    user: {
      name: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      username: 'sarahc'
    },
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop',
    caption: 'Fresh salad with locally sourced veggies! 🌱 #sustainable #zerocrust',
    likes: 24,
    comments: 3,
    timestamp: '2h',
    tags: ['sustainable', 'zerocrust']
  },
  {
    id: '2',
    user: {
      name: 'Mike Johnson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      username: 'mikej'
    },
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500&h=500&fit=crop',
    caption: 'Zero waste meal prep for the week! No food left behind 💚',
    likes: 18,
    comments: 5,
    timestamp: '4h',
    tags: ['zerowaste', 'mealprep']
  },
  {
    id: '3',
    user: {
      name: 'Emma Davis',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      username: 'emmad'
    },
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&h=500&fit=crop',
    caption: 'Homemade veggie stir-fry using leftover ingredients. Delicious and planet-friendly! 🌍🍲',
    likes: 31,
    comments: 7,
    timestamp: '6h',
    tags: ['homemade', 'veggie']
  },
  {
    id: '4',
    user: {
      name: 'Alex Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      username: 'alexr'
    },
    image: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=500&h=500&fit=crop',
    caption: 'Breakfast bowl with organic fruits and nuts. Starting the day right! 🥣✨',
    likes: 42,
    comments: 8,
    timestamp: '8h',
    tags: ['breakfast', 'organic']
  },
  {
    id: '5',
    user: {
      name: 'Lisa Park',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      username: 'lisap'
    },
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=500&h=500&fit=crop',
    caption: 'Sustainable sushi night! Fresh fish from local fishermen. 🐟🌊',
    likes: 67,
    comments: 12,
    timestamp: '12h',
    tags: ['sushi', 'sustainable']
  }
]

export function Posts() {
  const [posts] = useState<Post[]>(mockPosts)

  return (
    <div className="max-w-md mx-auto pb-6">
      {/* Posts feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
            {/* Post header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <img
                  src={post.user.avatar}
                  alt={post.user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">{post.user.name}</h3>
                  <p className="text-zinc-500 text-xs">{post.timestamp}</p>
                </div>
              </div>
              <button className="text-zinc-400 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            {/* Post image */}
            <div className="aspect-square">
              <img
                src={post.image}
                alt="Post"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Post actions */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button className="text-zinc-400 hover:text-red-400 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <button className="text-zinc-400 hover:text-zinc-300 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                  <button className="text-zinc-400 hover:text-zinc-300 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <button className="text-zinc-400 hover:text-zinc-300 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>

              {/* Likes and caption */}
              <div className="space-y-2">
                <p className="font-semibold text-zinc-100 text-sm">{post.likes} likes</p>
                <p className="text-sm">
                  <span className="font-semibold text-zinc-100">{post.user.username}</span>
                  <span className="text-zinc-300 ml-2">{post.caption}</span>
                </p>
                {post.comments > 0 && (
                  <button className="text-zinc-500 text-sm hover:text-zinc-400">
                    View all {post.comments} comments
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}