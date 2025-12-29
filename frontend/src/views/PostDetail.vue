<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const post = ref(null)
const comments = ref([])
const newComment = ref('')
const authStore = useAuthStore()

const postId = route.params.id

onMounted(async () => {
  try {
    const postRes = await api.get(`/posts/${postId}`)
    post.value = postRes.data
    
    const commentRes = await api.get(`/comments?postId=${postId}`)
    comments.value = commentRes.data
  } catch (e) {
    console.error(e)
  }
})

const submitComment = async () => {
  if (!newComment.value.trim()) return
  try {
    const res = await api.post('/comments', {
      content: newComment.value,
      post: { id: postId }
    })
    comments.value.push(res.data)
    newComment.value = ''
  } catch (e) {
    alert('评论失败')
  }
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <div class="post-detail-wrapper" v-if="post">
    <div class="post-card">
        <h1 class="post-title">{{ post.title }}</h1>
        <div class="post-meta">
            <div class="author-info">
                <div class="avatar-small" :style="{ backgroundImage: post.author?.avatar ? `url(${post.author.avatar})` : '' }">
                    {{ !post.author?.avatar ? post.author?.username?.charAt(0).toUpperCase() : '' }}
                </div>
                <span class="username">{{ post.author?.username }}</span>
            </div>
            <span class="date">{{ formatDate(post.createdAt) }}</span>
        </div>
        <div class="post-body">
            {{ post.content }}
        </div>
    </div>

    <div class="comments-container">
      <div class="comments-header">
          <h3>评论 ({{ comments.length }})</h3>
      </div>
      
      <!-- Comment Input -->
      <div class="comment-input-section" v-if="authStore.user">
        <div class="input-wrapper">
             <div class="avatar-small current-user">{{ authStore.user.username.charAt(0).toUpperCase() }}</div>
             <div class="textarea-box">
                <textarea 
                    v-model="newComment" 
                    placeholder="写下你的评论..."
                    @keyup.enter.ctrl="submitComment"
                ></textarea>
                <div class="actions">
                    <span class="tip">Ctrl + Enter 发表</span>
                    <button @click="submitComment" :disabled="!newComment.trim()">发表评论</button>
                </div>
             </div>
        </div>
      </div>
      <div v-else class="login-prompt">
        <RouterLink to="/login">登录</RouterLink> 后参与评论
      </div>

      <!-- Comment List -->
      <div class="comment-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-avatar">
              {{ comment.author?.username?.charAt(0).toUpperCase() || '?' }}
          </div>
          <div class="comment-content-wrapper">
              <div class="comment-header">
                  <span class="comment-user">{{ comment.author?.username }}</span>
                  <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
              </div>
              <div class="comment-text">
                  {{ comment.content }}
              </div>
          </div>
        </div>
        <div v-if="comments.length === 0" class="empty-comments">
            暂无评论，快来抢沙发吧~
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-detail-wrapper {
  max-width: 800px;
  margin: 30px auto;
  padding: 0 20px;
}

.post-card {
  background: #fff;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  margin-bottom: 20px;
}

.post-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 0 0 20px 0;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fa7d3c;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  background-size: cover;
  background-position: center;
}

.username {
  font-weight: 500;
  color: #333;
  font-size: 15px;
}

.date {
  color: #999;
  font-size: 13px;
}

.post-body {
  line-height: 1.8;
  font-size: 16px;
  color: #333;
  white-space: pre-wrap;
}

/* Comments */
.comments-container {
  background: #fff;
  padding: 30px 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}

.comments-header h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    border-left: 4px solid #fa7d3c;
    padding-left: 10px;
    line-height: 1;
}

.comment-input-section {
    margin-bottom: 40px;
}

.input-wrapper {
    display: flex;
    gap: 15px;
}

.textarea-box {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 10px;
    background: #f9f9f9;
    transition: all 0.2s;
}

.textarea-box:focus-within {
    border-color: #fa7d3c;
    background: #fff;
}

textarea {
    width: 100%;
    height: 80px;
    border: none;
    background: transparent;
    outline: none;
    resize: none;
    font-size: 14px;
    margin-bottom: 10px;
}

.actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tip {
    font-size: 12px;
    color: #ccc;
}

button {
    background: #fa7d3c;
    color: #fff;
    border: none;
    padding: 6px 20px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.2s;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

button:hover:not(:disabled) {
    opacity: 0.9;
}

.login-prompt {
    text-align: center;
    padding: 30px;
    background: #f9f9f9;
    border-radius: 8px;
    color: #666;
    margin-bottom: 30px;
}

.login-prompt a {
    color: #fa7d3c;
    font-weight: bold;
}

/* List */
.comment-item {
    display: flex;
    gap: 15px;
    padding: 20px 0;
    border-bottom: 1px solid #f5f5f5;
}

.comment-item:last-child {
    border-bottom: none;
}

.comment-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #eee;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
}

.comment-content-wrapper {
    flex: 1;
}

.comment-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}

.comment-user {
    font-weight: bold;
    font-size: 14px;
    color: #333;
}

.comment-time {
    font-size: 12px;
    color: #999;
}

.comment-text {
    font-size: 14px;
    color: #555;
    line-height: 1.6;
}

.empty-comments {
    text-align: center;
    padding: 40px;
    color: #999;
    font-size: 14px;
}
</style>
