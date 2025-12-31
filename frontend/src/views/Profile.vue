<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import api from '@/utils/http'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const myPosts = ref([])
const activeTab = ref('posts') // posts, likes, favorites

// Tabs configuration
const tabs = [
  { key: 'posts', label: '我的文章' },
  { key: 'drafts', label: '草稿箱' },
  { key: 'scheduled', label: '定时发布' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'likes', label: '我的赞' }
]

// Mock data for other tabs since backend doesn't support them yet
const likedPosts = ref([])
const favoritePosts = ref([])

onMounted(async () => {
  if (route.query.tab) {
      activeTab.value = route.query.tab
  }
  
  if (authStore.user) {
    try {
      // Fetch user posts (using specific endpoint that supports drafts for owner)
      const response = await api.get(`/posts/user/${authStore.user.username}`) 
      myPosts.value = response.data
      
      // Refresh user info to get latest stats
      const userRes = await api.get('/users/me')
      console.log('User stats:', userRes.data)
      if (userRes.data.stats) {
          authStore.user = { ...authStore.user, ...userRes.data, stats: userRes.data.stats }
      }
    } catch (e) {
      console.error(e)
    }
  }
})

watch(() => route.query.tab, (newTab) => {
    if (newTab) activeTab.value = newTab
    else activeTab.value = 'posts'
})

const changeTab = (tabKey) => {
    activeTab.value = tabKey
    router.replace({ query: { ...route.query, tab: tabKey } })
}

const currentList = computed(() => {
    if (activeTab.value === 'posts') {
        const now = new Date();
        return myPosts.value.filter(p => !p.status || p.status === 'published' || (p.status === 'scheduled' && new Date(p.publishAt) <= now))
    }
    if (activeTab.value === 'drafts') {
        return myPosts.value.filter(p => p.status === 'draft')
    }
    if (activeTab.value === 'scheduled') {
        const now = new Date();
        return myPosts.value.filter(p => p.status === 'scheduled' && new Date(p.publishAt) > now)
    }
    if (activeTab.value === 'favorites') {
        return favoritePosts.value.filter(f => f && f.post).map(f => f.post)
    }
    if (activeTab.value === 'likes') return likedPosts.value
    return []
})

const fetchUserData = async () => {
    if (!authStore.user) return
    try {
        // Fetch posts
        const postsRes = await api.get(`/posts/user/${authStore.user.username}`) 
        myPosts.value = postsRes.data
        
        // Fetch favorites
        const favRes = await api.get('/users/me/favorites')
        favoritePosts.value = favRes.data
        
        // Fetch likes
        const likeRes = await api.get('/users/me/likes')
        likedPosts.value = likeRes.data

        // Refresh user info
        const userRes = await api.get('/users/me')
        if (userRes.data.stats) {
            authStore.user = { ...authStore.user, ...userRes.data, stats: userRes.data.stats }
        }
    } catch (e) {
        console.error(e)
    }
}

onMounted(async () => {
  if (route.query.tab) {
      activeTab.value = route.query.tab
  }
  await fetchUserData()
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString()
}

// Edit Profile Logic
const showEditModal = ref(false)
const editForm = ref({ username: '', email: '', avatar: '', avatarPreview: '', password: '', confirmPassword: '' })

const openEditModal = () => {
    editForm.value = {
        username: authStore.user.username,
        email: authStore.user.email || '',
        avatar: '',
        avatarPreview: '',
        password: '',
        confirmPassword: ''
    }
    showEditModal.value = true
}

const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Check size (e.g., max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('图片大小不能超过 2MB')
        return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
        editForm.value.avatar = e.target.result // Base64 string
        editForm.value.avatarPreview = e.target.result
        editForm.value.avatarFilename = file.name // Store filename
    }
    reader.readAsDataURL(file)
}

const submitUpdate = async () => {
    if (editForm.value.password && editForm.value.password !== editForm.value.confirmPassword) {
        alert('两次输入的密码不一致')
        return
    }

    try {
        const payload = { 
            username: editForm.value.username,
            email: editForm.value.email 
        }
        if (editForm.value.avatar) {
            payload.avatar = editForm.value.avatar
            payload.avatarFilename = editForm.value.avatarFilename // Send filename
        }
        if (editForm.value.password) {
            payload.newPassword = editForm.value.password
        }
        
        const res = await api.put('/users/me', payload)
        
        // Update store
        authStore.user = { ...authStore.user, ...res.data }
        showEditModal.value = false
        alert('修改成功')
    } catch (e) {
        console.error(e)
        alert(e.response?.data?.message || '修改失败')
    }
}


const deletePost = async (id) => {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) return
    try {
        await api.delete(`/posts/${id}`)
        // Remove from local list
        myPosts.value = myPosts.value.filter(p => p.id !== id)
        // Refresh stats if needed
        if (authStore.user && authStore.user.stats) {
             authStore.user.stats.post_count--
        }
    } catch (e) {
        console.error(e)
        alert('删除失败')
    }
}
</script>

<template>
  <div class="profile-layout">
    <!-- Header / Cover -->
    <div class="profile-header">
       <div class="user-info-large">
           <div class="avatar-large" :style="{ backgroundImage: authStore.user?.avatar ? `url(${authStore.user.avatar})` : '' }">
               {{ !authStore.user?.avatar ? authStore.user?.username?.charAt(0).toUpperCase() : '' }}
           </div>
           <div class="info-text">
               <h1>{{ authStore.user?.username }}</h1>
               <p class="bio">Web Developer | Tech Enthusiast</p>
               <div class="stats-row">
                   <span><strong>{{ authStore.user?.stats?.post_count || myPosts.length }}</strong> 文章</span>
                   <span><strong>{{ authStore.user?.stats?.following_count || 0 }}</strong> 关注</span>
                   <span><strong>{{ authStore.user?.stats?.followers_count || 0 }}</strong> 粉丝</span>
               </div>
           </div>
           <button class="edit-btn" @click="openEditModal">编辑资料</button>
       </div>
    </div>

    <!-- Content Area -->
    <div class="profile-body">
        <!-- Tabs -->
        <div class="profile-tabs">
            <div 
                v-for="tab in tabs" 
                :key="tab.key"
                class="tab-item"
                :class="{ active: activeTab === tab.key }"
                @click="changeTab(tab.key)"
            >
                {{ tab.label }}
            </div>
        </div>

        <!-- List -->
        <div class="content-list">
            <template v-if="activeTab === 'likes'">
                 <div v-for="like in currentList" :key="like.id" class="list-item like-item">
                     <div class="like-info" v-if="like && like.post">
                         <div class="avatar-small" :style="{ backgroundImage: like.liker?.avatar ? `url(${like.liker.avatar})` : '' }">
                             {{ !like.liker?.avatar ? like.liker?.username?.charAt(0).toUpperCase() : '' }}
                         </div>
                         <span class="liker-name">{{ like.liker?.username }}</span>
                         <span class="action-text">赞了你的文章</span>
                         <span class="op-time">{{ formatDate(like.createdAt) }}</span>
                     </div>
                     <div class="liked-post" v-if="like && like.post">
                         <RouterLink :to="'/posts/' + like.post.id">{{ like.post.title }}</RouterLink>
                     </div>
                 </div>
            </template>
            <template v-else>
                <div v-for="post in currentList" :key="post.id" class="list-item">
                    <div class="item-main">
                        <h3><RouterLink :to="'/posts/' + post.id">{{ post.title }}</RouterLink></h3>
                        <div v-if="post.image" class="post-cover-small">
                             <img :src="post.image" alt="Cover" />
                        </div>
                        <p class="excerpt">{{ post.content.substring(0, 100) }}...</p>
                        <div class="meta">
                            <span>{{ formatDate(post.publishAt || post.createdAt) }}</span>
                            <span v-if="post.status === 'scheduled' && activeTab === 'scheduled'" class="status-tag scheduled">
                                计划发布: {{ new Date(post.publishAt).toLocaleString() }}
                            </span>
                            <span v-if="activeTab !== 'posts' && activeTab !== 'drafts' && activeTab !== 'scheduled'">By {{ post.author?.username || 'Unknown' }}</span>
                        </div>
                    </div>
                    <button class="delete-btn-small" @click.stop="deletePost(post.id)" title="删除文章">🗑️</button>
                </div>
            </template>
            <div v-if="currentList.length === 0" class="empty-state">
                <div class="empty-icon">📂</div>
                <p>暂无内容</p>
            </div>
        </div>
    </div>
    <!-- Edit Profile Modal -->
    <div class="modal-overlay" v-if="showEditModal" @click.self="showEditModal = false">
        <div class="modal-content">
            <h3>编辑资料</h3>
            <div class="modal-body">
                <div class="form-group avatar-group">
                    <label>更换头像</label>
                    <div class="avatar-upload">
                        <div class="preview" :style="{ backgroundImage: `url(${editForm.avatarPreview || (authStore.user?.avatar || '')})` }">
                            <span v-if="!editForm.avatarPreview && !authStore.user?.avatar" class="placeholder">{{ authStore.user?.username?.charAt(0).toUpperCase() }}</span>
                        </div>
                        <input type="file" @change="handleFileChange" accept="image/*" id="file-input" class="file-input" />
                        <label for="file-input" class="upload-btn">选择图片</label>
                    </div>
                </div>
                <div class="form-group">
                    <label>用户名</label>
                    <input type="text" v-model="editForm.username" placeholder="请输入用户名" />
                </div>
                <div class="form-group">
                    <label>邮箱</label>
                    <input type="email" v-model="editForm.email" placeholder="请输入邮箱地址" />
                </div>
                <div class="form-group">
                    <label>新密码 (选填)</label>
                    <input type="password" v-model="editForm.password" placeholder="若不修改请留空" />
                </div>
                <div class="form-group" v-if="editForm.password">
                    <label>确认新密码</label>
                    <input type="password" v-model="editForm.confirmPassword" placeholder="请再次输入新密码" />
                </div>
            </div>
             <div class="modal-actions">
                <button @click="showEditModal = false" class="cancel-btn">取消</button>
                <button @click="submitUpdate" class="save-btn">保存</button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
    width: 100%;
}

.profile-header {
    background: #fff;
    padding: 30px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    display: flex;
    align-items: center;
}

.user-info-large {
    display: flex;
    align-items: center;
    gap: 30px;
    width: 100%;
}

.avatar-large {
    width: 100px;
    height: 100px;
    background: #fa7d3c;
    color: #fff;
    border-radius: 50%;
    font-size: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    box-shadow: 0 4px 10px rgba(250, 125, 60, 0.3);
    background-size: cover;
    background-position: center;
}

.info-text h1 {
    font-size: 24px;
    margin: 0 0 5px 0;
    color: #333;
}

.info-text .bio {
    color: #999;
    margin-bottom: 15px;
    font-size: 14px;
}

.stats-row {
    display: flex;
    gap: 20px;
    color: #555;
    font-size: 14px;
}

.edit-btn {
    margin-left: auto;
    padding: 8px 20px;
    border: 1px solid #fa7d3c;
    color: #fa7d3c;
    background: #fff;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
}
.edit-btn:hover {
    background: #fa7d3c;
    color: #fff;
}

.profile-body {
    background: #fff;
    border-radius: 8px;
    min-height: 500px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.profile-tabs {
    display: flex;
    border-bottom: 1px solid #eee;
    margin-bottom: 20px;
}

.tab-item {
    padding: 15px 25px;
    font-size: 16px;
    color: #666;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    font-weight: 500;
}
.tab-item:hover {
    color: #fa7d3c;
}
.tab-item.active {
    color: #fa7d3c;
    border-bottom-color: #fa7d3c;
}

.list-item {
    padding: 20px;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}
.list-item:hover {
    background: #f9f9f9;
}
.list-item h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
}
.list-item h3 a {
    color: #333;
    text-decoration: none;
}
.list-item h3 a:hover {
    color: #fa7d3c;
}
.post-cover-small {
    margin: 8px 0;
    width: 120px;
    height: 80px;
    border-radius: 4px;
    overflow: hidden;
}
.post-cover-small img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.excerpt {
    color: #888;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 10px;
}
.meta {
    font-size: 12px;
    color: #bbb;
}

.item-main {
    flex: 1;
}
.delete-btn-small {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 16px;
    opacity: 0.5;
    transition: opacity 0.2s;
    padding: 10px;
}
.delete-btn-small:hover {
    opacity: 1;
    transform: scale(1.1);
}
.list-item {
    padding: 20px;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}
.status-tag {
    margin-left: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
}

.status-tag.scheduled {
    background: #e6f7ff;
    color: #1890ff;
    border: 1px solid #91d5ff;
}

.like-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.like-info {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
}
.avatar-small {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fa7d3c;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    background-size: cover;
    background-position: center;
}
.liker-name {
    font-weight: bold;
    color: #333;
}
.action-text {
    color: #666;
}
.op-time {
    color: #999;
    font-size: 12px;
    margin-left: auto;
}
.liked-post {
    background: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
    margin-left: 34px; /* Align with text */
}
.liked-post a {
    color: #555;
    text-decoration: none;
    font-weight: 500;
}
.liked-post a:hover {
    color: #fa7d3c;
}

.empty-state {
    text-align: center;
    padding: 60px 0;
    color: #ccc;
}
.empty-icon {
    font-size: 48px;
    margin-bottom: 10px;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.modal-content {
    background: #fff;
    border-radius: 12px;
    width: 450px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    overflow: hidden;
    animation: modalFadeIn 0.3s ease;
}
.modal-content h3 {
    margin: 0;
    padding: 20px;
    text-align: center;
    color: #333;
    font-size: 20px;
    border-bottom: 1px solid #f0f0f0;
    font-weight: 600;
}
.modal-body {
    padding: 25px;
}
.form-group {
    margin-bottom: 20px;
}
.form-group:last-child {
    margin-bottom: 0;
}
.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #555;
    font-size: 14px;
}
.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"] {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    outline: none;
    box-sizing: border-box;
    font-size: 14px;
    transition: border-color 0.3s;
}
.form-group input:focus {
    border-color: #fa7d3c;
}
.avatar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 25px;
}
.avatar-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
}
.avatar-upload .preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #f0f2f5;
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid #fff;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.file-input {
    display: none;
}
.upload-btn {
    font-size: 13px;
    color: #fa7d3c;
    cursor: pointer;
    border: 1px solid #fa7d3c;
    padding: 6px 16px;
    border-radius: 20px;
    background: white;
    transition: all 0.3s;
}
.upload-btn:hover {
    background: #fff0eb;
}
.placeholder {
    font-size: 32px;
    color: #ccc;
    font-weight: bold;
}
.modal-actions {
    padding: 20px;
    background: #f9f9f9;
    display: flex;
    justify-content: flex-end; /* Align right */
    gap: 15px;
    border-top: 1px solid #eee;
}
.save-btn {
    background: #fa7d3c;
    color: #fff;
    border: none;
    padding: 10px 25px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.3s;
}
.save-btn:hover {
    background: #e06d30;
}
.cancel-btn {
    background: #fff;
    border: 1px solid #ddd;
    color: #666;
    padding: 10px 25px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
}
.cancel-btn:hover {
    background: #f5f5f5;
    color: #333;
}

@keyframes modalFadeIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
