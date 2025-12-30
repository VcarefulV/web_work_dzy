<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const post = ref(null)
const comments = ref([])
const newComment = ref('')
const commentImage = ref(null) // Base64 string for preview and upload
const fileInput = ref(null)
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

const triggerFileInput = () => {
    fileInput.value.click()
}

const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
        alert('请上传图片文件')
        return
    }

    // Validate size (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB')
        return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
        commentImage.value = e.target.result
    }
    reader.readAsDataURL(file)
}

const clearImage = () => {
    commentImage.value = null
    if (fileInput.value) {
        fileInput.value.value = ''
    }
}

const submitComment = async () => {
  if (!newComment.value.trim() && !commentImage.value) return // Allow sending just image? Or require text? Let's require at least one.
  
  try {
    const res = await api.post('/comments', {
      content: newComment.value,
      post: { id: postId },
      image: commentImage.value
    })
    comments.value.push(res.data)
    newComment.value = ''
    clearImage()
  } catch (e) {
    alert('评论失败')
    console.error(e)
  }
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString()
}

const publishPost = async () => {
    if (!confirm('确定要立即发布这篇文章吗？')) return
    try {
        await api.put(`/posts/${postId}`, { status: 'published' })
        alert('发布成功')
        post.value.status = 'published'
        // Optionally reload or redirect
    } catch (e) {
        alert(e.response?.data?.message || '发布失败')
    }
}

const deletePost = async () => {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) return
    try {
        await api.delete(`/posts/${postId}`)
        alert('删除成功')
        router.push('/')
    } catch (e) {
        alert(e.response?.data?.message || '删除失败')
    }
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
            <div class="meta-right">
                <div class="post-tags" v-if="post.tags && post.tags.length > 0">
                    <span v-for="tag in post.tags" :key="tag.id" class="post-tag">#{{ tag.name }}</span>
                </div>
                <span class="date">{{ formatDate(post.createdAt) }}</span>
            </div>
        </div>
        <div class="post-body">
            <div v-if="post.image" class="post-image-large">
                <img :src="post.image" alt="Post Cover" />
            </div>
            {{ post.content }}
        </div>
        <div v-if="(post.status === 'draft' || post.status === 'scheduled' || post.status === 'published') && authStore.user && authStore.user.id == post.author?.id" class="draft-actions">
            <div class="draft-tip" v-if="post.status !== 'published'">⚠️ {{ post.status === 'draft' ? '当前为草稿状态' : '当前为定时发布状态' }}，仅自己可见</div>
            <div class="draft-tip" v-else style="background: #f6ffed; border-color: #b7eb8f; color: #52c41a;">✅ 文章已发布</div>
            
            <div class="action-buttons">
                <button v-if="post.status !== 'published'" class="action-btn publish-btn" @click="publishPost">立即发布</button>
                <button class="action-btn delete-btn" @click="deletePost">删除文章</button>
            </div>
        </div>
    </div>

    <div class="comments-container" v-if="post.status === 'published'">
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
                
                <!-- Image Preview -->
                <div v-if="commentImage" class="image-preview">
                    <img :src="commentImage" alt="Preview" />
                    <button class="remove-image" @click="clearImage">×</button>
                </div>

                <div class="actions">
                    <div class="left-actions">
                        <span class="tip">Ctrl + Enter 发表</span>
                        <input 
                            type="file" 
                            ref="fileInput" 
                            accept="image/*" 
                            style="display: none" 
                            @change="handleFileChange"
                        >
                        <button class="icon-btn" @click="triggerFileInput" title="上传图片">
                            📷 图片
                        </button>
                    </div>
                    <button @click="submitComment" :disabled="!newComment.trim() && !commentImage">发表评论</button>
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
              <div v-if="comment.author?.avatar" class="avatar-img" :style="{ backgroundImage: `url(${comment.author.avatar})` }"></div>
              <span v-else>{{ comment.author?.username?.charAt(0).toUpperCase() || '?' }}</span>
          </div>
          <div class="comment-content-wrapper">
              <div class="comment-header">
                  <span class="comment-user">{{ comment.author?.username }}</span>
                  <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
              </div>
              <div class="comment-text">
                  {{ comment.content }}
              </div>
              <div v-if="comment.image" class="comment-image">
                  <img :src="comment.image" alt="Comment Image" @click="window.open(comment.image, '_blank')">
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

.meta-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
}

.post-tags {
    display: flex;
    gap: 8px;
}

.post-tag {
    font-size: 12px;
    background: #fff5f0;
    color: #fa7d3c;
    padding: 2px 8px;
    border-radius: 10px;
}

.post-body {
  line-height: 1.8;
  font-size: 16px;
  color: #333;
  white-space: pre-wrap;
}

/* Comments */
.post-image-large {
    margin-bottom: 20px;
}

.post-image-large img {
    max-width: 100%;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

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

/* Image Preview */
.image-preview {
    position: relative;
    display: inline-block;
    margin: 10px 0;
    border: 1px solid #eee;
    padding: 5px;
    border-radius: 4px;
}

.image-preview img {
    max-height: 100px;
    display: block;
}

.remove-image {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ff4d4f;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
}

.left-actions {
    display: flex;
    align-items: center;
    gap: 15px;
}

.icon-btn {
    background: transparent;
    color: #666;
    padding: 5px 10px;
    font-size: 13px;
    border: 1px solid #ddd;
    border-radius: 15px;
}

.icon-btn:hover {
    color: #fa7d3c;
    border-color: #fa7d3c;
    background: #fff5f0;
}

.empty-comments {
    text-align: center;
    padding: 40px;
    color: #999;
    font-size: 14px;
}

.avatar-img {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    border-radius: 50%;
}

.comment-image {
    margin-top: 10px;
}

.comment-image img {
    max-width: 200px;
    max-height: 200px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid #eee;
}


.draft-actions {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px dashed #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.draft-tip {
    color: #faad14;
    background: #fffbe6;
    border: 1px solid #ffe58f;
    padding: 8px 15px;
    border-radius: 4px;
    font-size: 14px;
}

.action-buttons {
    display: flex;
    gap: 15px;
}

.action-btn {
    padding: 8px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
    border: none;
}

.publish-btn {
    background: #52c41a;
    color: white;
}
.publish-btn:hover {
    background: #389e0d;
}

.delete-btn {
    background: #ff4d4f;
    color: white;
}
.delete-btn:hover {
    background: #cf1322;
}
</style>
