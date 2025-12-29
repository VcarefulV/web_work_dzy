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

const fetchPosts = async () => {
  loading.value = true
  try {
    const params = {}
    if (route.query.filter) params.filter = route.query.filter
    if (route.query.category) params.category = route.query.category
    if (route.query.q) params.q = route.query.q

    const response = await api.get('/posts')
    let allPosts = response.data.map(p => ({
        ...p,
        likes: p.likeCount, // Use real count
        comments: [], // Comments fetched on demand
        showCommentBox: false,
        newComment: ''
    }))

    if (params.q) {
        const q = params.q.toLowerCase()
        allPosts = allPosts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
    }

    if (params.filter === 'hot') {
        allPosts.sort((a, b) => b.likes - a.likes)
    } else if (params.filter === 'latest') {
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (params.filter === 'follow') {
        // Since we don't have a "get posts by followed users" API yet, 
        // we might still mock this part or just show all reversed. 
        // For now, let's keep the mock reverse but note it.
        // Or if we check is_followed in allPosts (if we added it to getAllPosts), we can filter.
        // NOTE: getAllPosts currently only checks if *current user* liked the post, it doesn't check if current user follows the author.
        // To implement true "Follow" tab, we need a new API endpoint. 
        // For this step, I will just stick to the existing mock behavior for the TAB, but make the BUTTON functional.
        allPosts.reverse()
    }

    posts.value = allPosts
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchPosts)

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
    <div class="feed-tabs">
      <RouterLink to="/?filter=recommended" :class="{ active: !route.query.filter || route.query.filter === 'recommended' }">推荐</RouterLink>
      <RouterLink to="/?filter=follow" :class="{ active: route.query.filter === 'follow' }">关注</RouterLink>
      <RouterLink to="/?filter=latest" :class="{ active: route.query.filter === 'latest' }">最新</RouterLink>
      <RouterLink to="/?filter=hot" :class="{ active: route.query.filter === 'hot' }">热榜</RouterLink>
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
          <div class="avatar-placeholder">{{ post.author?.username?.charAt(0).toUpperCase() }}</div>
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
          <h3><RouterLink :to="'/posts/' + post.id">{{ post.title }}</RouterLink></h3>
          <p>{{ post.content }}</p>
        </div>
        <div class="post-footer">
          <div class="action" @click="handleShare(post)">
             <i class="iconfont icon-share"></i> <span>转发</span>
          </div>
          <div class="action" @click="handleCommentClick(post)">
             <i class="iconfont icon-comment"></i> <span>{{ (post.comments.length || post.commentCount) ? (post.comments.length || post.commentCount) + ' 评论' : '评论' }}</span>
          </div>
          <div class="action" :class="{ 'liked': post.likes > 0 }" @click="handleLike(post)">
             <i class="iconfont icon-like"></i> <span>{{ post.likes > 0 ? post.likes + ' 点赞' : '点赞' }}</span>
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
}
.post-content h3 a {
  text-decoration: none;
  color: #333;
}
.post-content h3 a:hover {
  color: #fa7d3c;
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
