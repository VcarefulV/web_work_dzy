<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
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
  <div class="post-detail-container" v-if="post">
    <h1>{{ post.title }}</h1>
    <div class="meta">
      作者: {{ post.author?.username }} | 时间: {{ formatDate(post.createdAt) }}
    </div>
    <div class="content">
      {{ post.content }}
    </div>

    <div class="comments-section">
      <h3>评论</h3>
      <div class="comment-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <strong>{{ comment.author?.username }}</strong>: {{ comment.content }}
          <div class="comment-date">{{ formatDate(comment.createdAt) }}</div>
        </div>
      </div>
      
      <div v-if="authStore.user" class="add-comment">
        <textarea v-model="newComment" placeholder="写下你的评论..."></textarea>
        <button @click="submitComment">发表评论</button>
      </div>
      <div v-else>
        <RouterLink to="/login">登录以评论</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-detail-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
.meta {
  color: #666;
  margin-bottom: 2rem;
}
.content {
  line-height: 1.6;
  margin-bottom: 3rem;
  white-space: pre-wrap;
}
.comments-section {
  border-top: 1px solid #eee;
  padding-top: 2rem;
}
.comment-item {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f9f9f9;
}
.comment-date {
  font-size: 0.8rem;
  color: #999;
}
textarea {
  width: 100%;
  height: 80px;
  margin-bottom: 0.5rem;
}
button {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  cursor: pointer;
}
</style>
