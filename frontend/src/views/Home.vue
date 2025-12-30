<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '@/utils/http'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const posts = ref([])
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const followedAuthors = ref(new Set()) // Track followed user IDs
const tags = ref([])

onMounted(async () => {
    // Fetch Tags
    try {
        const res = await api.get('/tags')
        tags.value = res.data
    } catch (e) {
        console.error('Failed to fetch tags', e)
    }
    fetchPosts()
})

const fetchPosts = async () => {
    loading.value = true
    try {
        const params = {}
        if (route.query.filter) params.filter = route.query.filter
        if (route.query.tag && route.query.tag !== 'all') params.tag = route.query.tag
        if (route.query.tag && route.query.tag !== 'all') params.tag = route.query.tag
        if (route.query.date) params.date = route.query.date
        if (route.query.authorId) params.authorId = route.query.authorId
        
        // Pass filter to backend. We don't verify q/category in backend yet, so we stick to client side filtering for those if needed.
        // Actually, let's pass params to api.
        const response = await api.get('/posts', { params })
        let allPosts = response.data.map(p => ({
            ...p,
            likes: p.likeCount,
            comments: [], 
            showCommentBox: false,
            newComment: ''
        }))

        // Client-side search (since backend doesn't support 'q' yet)
        if (route.query.q) {
            const q = route.query.q.toLowerCase()
            allPosts = allPosts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
        }

        // Backend now handles sort and follow filter
        
        posts.value = allPosts
    } catch (e) {
        console.error(e)
        if (e.response && e.response.status === 401 && route.query.filter === 'follow') {
             // If trying to view follow tab without login, maybe redirect or just show nothing.
             // For now, let's redirect to login if they explicitly asked for follow tab
             router.push('/login')
        }
    } finally {
        loading.value = false
    }
}

// onMounted(fetchPosts) // Moved to top-level onMounted to combine with tags fetch

watch(() => route.query, fetchPosts)

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`
}

const handleLike = async (post) => {
    if (!authStore.user) return router.push('/login')
    try {
        const response = await api.post(`/posts/${post.id}/like`)
        const liked = response.data.liked
        post.isLiked = liked
        if (liked) post.likes++ 
        else post.likes--
    } catch (e) {
        console.error(e)
        alert('操作失败')
    }
}

const handleFavorite = async (post) => {
    if (!authStore.user) return router.push('/login')
    try {
        const response = await api.post(`/posts/${post.id}/favorite`)
        const favorited = response.data.favorited
        post.isFavorited = favorited
    } catch (e) {
        console.error(e)
        alert('操作失败')
    }
}

const handleShare = (post) => {
    navigator.clipboard.writeText(window.location.origin + '/posts/' + post.id)
    alert('🔗 链接已复制，快去分享给朋友吧！')
}

const handleCommentClick = async (post) => {
    post.showCommentBox = !post.showCommentBox
    if (post.showCommentBox && post.comments.length === 0) {
        // Fetch comments
        try {
            const res = await api.get(`/comments?postId=${post.id}`)
            post.comments = res.data
        } catch (e) {
            console.error(e)
        }
    }
}

const submitComment = async (post) => {
    if (!authStore.user) return router.push('/login')
    if (!post.newComment.trim()) return
    try {
        const res = await api.post('/comments', {
            content: post.newComment,
            postId: post.id
        })
        post.comments.push(res.data)
        post.newComment = ''
    } catch (e) {
        console.error(e)
        alert('评论失败')
    }
}

const handleFollow = async (author) => {
    if (!authStore.user) return router.push('/login')
    if (!author || !author.id) return // Valid author ID required
    
    try {
        const res = await api.post('/users/follow', { userId: author.id })
        const isFollowed = res.data.followed
        
        // Update all posts by this author in the list
        posts.value.forEach(p => {
            if (p.author && p.author.id === author.id) {
                p.author.isFollowed = isFollowed
            }
        })
        
        // Also update the param passed in if it's a reference (though we updated posts above)
        author.isFollowed = isFollowed
    } catch (e) {
        console.error(e)
        alert(e.response?.data?.message || '操作失败')
    }
}
const isFollowed = (author) => {
    return author?.isFollowed || false
}
</script>

<template>
  <section class="main-feed">
    <!-- Tabs -->
    <!-- Tabs -->
    <div class="feed-tabs">
        <RouterLink to="/" :class="{ active: !route.query.tag || route.query.tag === 'all' }">全部</RouterLink>
        <RouterLink 
            v-for="tag in tags" 
            :key="tag.id" 
            :to="'/?tag=' + tag.id"
            :class="{ active: Number(route.query.tag) === tag.id }"
        >
            {{ tag.name }}
        </RouterLink>
    </div>

    <!-- Create Post Trigger (if logged in) -->
    <div class="create-trigger" v-if="authStore.user">
      <RouterLink to="/create" class="input-fake">
        分享你的技术与生活...
      </RouterLink>
    </div>

    <!-- Post List -->
    <div class="post-list">
      <div v-for="post in posts" :key="post.id" class="post-card">
        <div class="post-header">
          <div class="avatar-placeholder" :style="{ backgroundImage: post.author?.avatar ? `url(${post.author.avatar})` : '' }">
              {{ !post.author?.avatar ? post.author?.username?.charAt(0).toUpperCase() : '' }}
          </div>
          <div class="info">
            <span class="username">{{ post.author?.username }}</span>
            <span class="time">{{ formatDate(post.createdAt) }}</span>
          </div>
          <button 
            class="follow-btn" 
            :class="{ 'followed': isFollowed(post.author) }"
            @click="handleFollow(post.author)"
          >
            {{ isFollowed(post.author) ? '已关注' : '+ 关注' }}
          </button>
        </div>
        <div class="post-content">
          <h3>
              <RouterLink :to="'/posts/' + post.id">{{ post.title }}</RouterLink>
              <span v-for="tag in post.tags" :key="tag.id" class="post-tag">#{{ tag.name }}</span>
          </h3>
          <div v-if="post.image" class="post-cover">
              <img :src="post.image" alt="Cover" @click="$router.push('/posts/' + post.id)" />
          </div>
          <p>{{ post.content }}</p>
        </div>
        <div class="post-footer">
          <div class="action" @click="handleShare(post)">
             <span>转发</span>
             <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
          </div>
          <div class="action" @click="handleCommentClick(post)">
             <span>{{ (post.comments.length || post.commentCount) ? (post.comments.length || post.commentCount) + ' 评论' : '评论' }}</span>
             <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </div>
          <div class="action" :class="{ 'liked': post.isLiked }" @click="handleLike(post)">
             <span>{{ post.likes > 0 ? post.likes + ' 点赞' : '点赞' }}</span>
             <!-- Thumb Up Icon -->
             <svg v-if="!post.isLiked" class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
             <!-- Solid/Filled Thumb for Liked state (handled by CSS fill usually, but let's use fill='currentColor' structure for simplicity or specific icon) -->
             <!-- Solid/Filled Thumb for Liked state (handled by CSS fill usually, but let's use fill='currentColor' structure for simplicity or specific icon) -->
             <svg v-else class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
          </div>
          <div class="action" :class="{ 'favorited': post.isFavorited }" @click="handleFavorite(post)">
             <span>{{ post.isFavorited ? '已收藏' : '收藏' }}</span>
             <svg v-if="!post.isFavorited" class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
             <svg v-else class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="orange" stroke-width="2" fill="orange" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
        </div>
        
        <!-- Comment Section -->
        <div class="comment-section" v-if="post.showCommentBox">
            <div class="comment-input-area">
                <input 
                    v-model="post.newComment" 
                    type="text" 
                    placeholder="写下你的评论..." 
                    @keyup.enter="submitComment(post)"
                />
                <button @click="submitComment(post)">发布</button>
            </div>
            <div class="comments-list" v-if="post.comments.length > 0">
                <div class="comment-item" v-for="comment in post.comments" :key="comment.id">
                    <span class="comment-author">{{ comment.author?.username || comment.author }}:</span>
                    <span class="comment-content">{{ comment.content }}</span>
                </div>
            </div>
        </div>
      </div>
      <div v-if="posts.length === 0" class="empty-state">
         <span v-if="loading">加载中...</span>
         <span v-else>暂无内容</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Center Feed */
.feed-tabs {
  background: #fff;
  border-radius: 4px;
  padding: 0 15px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 30px;
  margin-bottom: 10px;
  border: 1px solid #eee;
  height: 50px;
}
.feed-tabs a {
  font-size: 15px;
  font-weight: 500;
  color: #666;
  text-decoration: none;
  height: 100%;
  display: flex;
  align-items: center;
  position: relative;
  transition: color 0.3s;
}
.feed-tabs a:hover {
  color: #fa7d3c;
}
.feed-tabs a.active {
  color: #fa7d3c;
  font-weight: bold;
}
.feed-tabs a.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: #fa7d3c;
  border-radius: 2px;
}

.create-trigger {
  background: #fff;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 10px;
  border: 1px solid #eee;
}
.input-fake {
  display: block;
  background: #f5f5f5;
  border-radius: 20px;
  padding: 10px 20px;
  color: #999;
  text-decoration: none;
  font-size: 14px;
  cursor: text;
}
.input-fake:hover {
  background: #f0f0f0;
}

.post-card {
  background: #fff;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 10px;
  border: 1px solid #eee;
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}
.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #eee;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
  background-size: cover;
  background-position: center;
}
.info {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.username {
  font-weight: bold;
  font-size: 15px;
  color: #333;
}
.time {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.follow-btn {
  border: 1px solid #fa7d3c;
  color: #fa7d3c;
  background: #fff;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.follow-btn:hover {
  background: #fceceb;
}
.follow-btn.followed {
  background: #f5f5f5;
  color: #999;
  border-color: #ddd;
}

.post-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.post-content h3 a {
  text-decoration: none;
  color: #333;
}
.post-content h3 a:hover {
  color: #fa7d3c;
}
.post-tag {
    font-size: 12px;
    background: #fff5f0;
    color: #fa7d3c;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: normal;
}

.post-cover {
    margin: 10px 0;
    max-height: 200px;
    overflow: hidden;
    border-radius: 6px;
}

.post-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    cursor: pointer;
    transition: transform 0.3s;
}

.post-cover img:hover {
    transform: scale(1.02);
}

.post-content p {
  color: #555;
  line-height: 1.6;
  font-size: 15px;
}

.post-footer {
  display: flex;
  border-top: 1px solid #f5f5f5;
  padding-top: 15px;
  margin-top: 15px;
}
.action {
  flex: 1;
  text-align: center;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: color 0.2s;
}
.action:hover {
  color: #fa7d3c;
}
.action.liked {
    color: #fa7d3c;
}
.action.favorited {
    color: orange;
}

/* Comment Section */
.comment-section {
    background: #fafafa;
    border-radius: 8px;
    padding: 15px;
    margin-top: 15px;
}
.comment-input-area {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}
.comment-input-area input {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px 12px;
    outline: none;
    font-size: 14px;
}
.comment-input-area input:focus {
    border-color: #fa7d3c;
}
.comment-input-area button {
    background: #fa7d3c;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 0 15px;
    cursor: pointer;
    font-size: 13px;
}
.comment-item {
    font-size: 14px;
    margin-bottom: 8px;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
}
.comment-author {
    font-weight: bold;
    margin-right: 5px;
    color: #333;
}
.comment-content {
    color: #555;
}
</style>
