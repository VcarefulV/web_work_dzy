<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { computed, ref, onMounted } from 'vue'
import api from '@/utils/http'
import CalendarWidget from '@/components/CalendarWidget.vue'

const authStore = useAuthStore()
const router = useRouter()
const user = computed(() => authStore.user)
const searchQuery = ref('')
const hotPosts = ref([])
const currentDate = ref('')
const weather = ref('') 
const showCalendar = ref(false)
const postDates = ref(new Set())

const updateDate = () => {
    const now = new Date()
    const days = ['日', '一', '二', '三', '四', '五', '六']
    currentDate.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${days[now.getDay()]}`
}

const fetchPostDates = async () => {
    try {
        const res = await api.get('/posts/dates')
        postDates.value = new Set(res.data)
    } catch (e) {
        console.error('Failed to fetch post dates', e)
    }
}

const handleDateClick = (dateStr) => {
    showCalendar.value = false
    let query = `/?date=${dateStr}`
    if (authStore.user) {
        query += `&authorId=${authStore.user.id}`
    }
    router.push(query)
}

const fetchWeather = async () => {
    try {
        const key = 'Sen6WKjtsEuJgnOPb';
        // Using fetch directly to avoid axios interceptors if they exist for internal API
        const res = await fetch(`https://api.seniverse.com/v3/weather/now.json?key=${key}&location=ip&language=zh-Hans&unit=c`)
        const data = await res.json()
        if (data.results && data.results[0]) {
            const now = data.results[0].now
            const location = data.results[0].location
            weather.value = `${location.name} ${now.text} ${now.temperature}°C` // e.g. 北京 晴 26°C
        }
    } catch (e) {
        console.error('Failed to fetch weather', e)
        weather.value = '天气获取失败'
    }
}

onMounted(async () => {
    updateDate()
    fetchWeather()
    fetchPostDates()
    setInterval(updateDate, 60000) /* Update every minute */
    setInterval(fetchWeather, 30 * 60 * 1000) /* Update weather every 30 mins */
    
    // Fetch hot posts for the right sidebar widget
    try {
        const response = await api.get('/posts?filter=hot&limit=5')
        hotPosts.value = response.data
    } catch (e) {
        console.error('Failed to fetch hot posts', e)
    }
})

const logout = () => {
  authStore.logout()
  router.push('/login')
}

const handleSearch = () => {
    if (searchQuery.value.trim()) {
        router.push(`/?q=${encodeURIComponent(searchQuery.value)}`)
    }
}

const jumpToProfile = (tab) => {
    router.push({ path: '/profile', query: { tab } })
}
</script>

<template>
  <div class="app-container">
    <!-- Standalone Layout (Login/Register) -->
    <div v-if="$route.meta.hideLayout" class="standalone-layout">
        <RouterView />
    </div>

    <!-- Main Layout (Blog App) -->
    <template v-else>
        <!-- Global Background Patterns for Main Layout -->
        <div class="main-bg-layer">
            <div class="bg-pattern p1"></div>
            <div class="bg-pattern p2"></div>
            <div class="bg-pattern p3"></div>
        </div>

        <header class="main-header">
        <div class="header-content">
            <div class="left-section">
                <div class="logo">
                <RouterLink to="/">
                    <span class="blog-logo">个人博客 Blog</span>
                </RouterLink>
                </div>
                <div class="search-bar">
                <input 
                    type="text" 
                    placeholder="搜索文章" 
                    v-model="searchQuery"
                    @keyup.enter="handleSearch"
                />
                <button @click="handleSearch">搜索</button>
                </div>
            </div>
            <div class="nav-links">
            <div class="date-weather-wrapper" @mouseenter="showCalendar = true" @mouseleave="showCalendar = false">
                <span class="weather-info">{{ currentDate }}&nbsp;&nbsp;{{ weather }}</span>
                <div class="calendar-popover" v-if="showCalendar">
                    <CalendarWidget :events="postDates" @dateClick="handleDateClick" />
                </div>
            </div>
            <RouterLink to="/">首页</RouterLink>
            <RouterLink to="/create" v-if="user">发布</RouterLink>
            <div class="auth-area" v-if="!user">
                <RouterLink to="/login">登录</RouterLink>
                <RouterLink to="/register">注册</RouterLink>
            </div>
            <div class="user-area" v-else>
                <div class="user-dropdown">
                    <div class="dropdown-trigger">
                         <span class="header-avatar" :style="{ backgroundImage: user.avatar ? `url(${user.avatar})` : '' }">
                            {{ !user.avatar ? user.username.charAt(0).toUpperCase() : '' }}
                         </span>
                         <span class="header-username">{{ user.username }}</span>
                    </div>
                    <!-- Dropdown Menu -->
                    <div class="dropdown-menu">
                        <RouterLink to="/profile" class="dropdown-item">个人中心</RouterLink>
                        <div @click="logout" class="dropdown-item">退出登录</div>
                    </div>
                </div>
            </div>
            </div>
        </div>
        </header>

        <div class="main-body">
            <!-- Persistent Left Sidebar -->
            <aside class="left-sidebar">
                <div class="menu-group">
                    <h3><i class="iconfont icon-home"></i> 热门推荐</h3>
                    <ul>
                    <li :class="{ active: $route.query.filter === 'recommended' || (!$route.query.filter && $route.path === '/') }"><RouterLink to="/?filter=recommended">综合推荐</RouterLink></li>
                    <li :class="{ active: $route.query.filter === 'follow' }"><RouterLink to="/?filter=follow">关注</RouterLink></li>
                    <li :class="{ active: $route.query.filter === 'latest' }"><RouterLink to="/?filter=latest">最新发布</RouterLink></li>
                    <li :class="{ active: $route.query.filter === 'hot' }"><RouterLink to="/?filter=hot">热榜</RouterLink></li>
                    </ul>
                </div>
                <div class="menu-group">
                    <h3><i class="iconfont icon-user"></i> 我的</h3>
                    <ul>
                    <li :class="{ active: $route.path === '/profile' && !$route.query.tab }"><RouterLink to="/profile">个人中心</RouterLink></li>
                    </ul>
                </div>
                
                <!-- AI Chat Button -->
                <div class="menu-group">
                    <ul>
                         <li :class="{ active: $route.path === '/chat' }"><RouterLink to="/chat"><i class="iconfont icon-heart"></i> 情绪搭子</RouterLink></li>
                    </ul>
                </div>
            </aside>

            <!-- Main Content Area (Dynamic) -->
            <main class="content-area" :class="{ 'full-width': $route.path === '/chat' }">
                <RouterView />
            </main>

            <!-- Persistent Right Sidebar -->
            <aside class="right-sidebar">
                <!-- Login Widget -->
                <div class="login-widget" v-if="!authStore.user">
                    <div class="widget-content">
                    <p class="slogan">记录生活，分享知识</p>
                    <div class="auth-buttons">
                        <RouterLink to="/login" class="btn btn-login">登录</RouterLink>
                        <RouterLink to="/register" class="btn btn-register">注册</RouterLink>
                    </div>
                    </div>
                </div>
                <div class="user-widget" v-else>
                    <div class="user-card">
                    <div class="big-avatar" :style="{ backgroundImage: authStore.user.avatar ? `url(${authStore.user.avatar})` : '' }">
                        {{ !authStore.user.avatar ? authStore.user.username.charAt(0).toUpperCase() : '' }}
                    </div>
                    <p class="user-name">{{ authStore.user.username }}</p>
                    <div class="stats">
                        <div class="stat" @click="jumpToProfile('following')"><strong>{{ authStore.user?.stats?.following_count || authStore.user?.following_count || 0 }}</strong><span>关注</span></div>
                        <div class="stat" @click="jumpToProfile('followers')"><strong>{{ authStore.user?.stats?.followers_count || authStore.user?.followers_count || 0 }}</strong><span>粉丝</span></div>
                        <div class="stat" @click="jumpToProfile('posts')"><strong>{{ authStore.user?.stats?.post_count || authStore.user?.post_count || 0 }}</strong><span>文章</span></div>
                    </div>
                    </div>
                </div>

                <!-- Hot List Widget -->
                <div class="trending-widget">
                    <h3><i class="iconfont icon-fire"></i> 热门榜单</h3>
                    <ul v-if="hotPosts.length > 0">
                        <li v-for="(post, index) in hotPosts" :key="post.id">
                             <span class="rank" :class="{ top: index < 3 }">{{ index + 1 }}</span>
                             <RouterLink :to="'/posts/' + post.id">{{ post.title }}</RouterLink>
                        </li>
                    </ul>
                    <div v-else style="padding: 10px; color: #999; font-size: 13px;">暂无热门内容</div>
                </div>
            </aside>
        </div>
    </template>
  </div>
</template>

<style>
/* Global resets */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f0f2f5; /* Global light gray background */
  color: #333;
}

a {
  text-decoration: none;
  color: inherit;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Background Patterns (Fixed to stay in background) */
.main-bg-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0; /* Behind everything */
  overflow: hidden;
  pointer-events: none; /* Ignore clicks */
}

.bg-pattern {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px); /* Very soft blur */
  opacity: 0.4; /* Subtle opacity */
}
.p1 {
  width: 600px;
  height: 600px;
  background: #fa7d3c;
  top: -200px;
  left: -200px;
  animation: float 20s infinite ease-in-out;
}
.p2 {
  width: 500px;
  height: 500px;
  background: #667eea;
  bottom: -150px;
  right: -150px;
  animation: float 25s infinite ease-in-out reverse;
}
.p3 {
  width: 400px;
  height: 400px;
  background: #764ba2;
  top: 30%;
  left: 30%;
  opacity: 0.2;
  animation: float 30s infinite ease-in-out;
}

@keyframes float {
  0% { transform: translate(0, 0); }
  50% { transform: translate(30px, 50px); }
  100% { transform: translate(0, 0); }
}

.main-header {
  height: 60px;
  background-color: rgba(255, 255, 255, 0.9); /* Slight transparency */
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0,0,0,0.05);
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05); /* Softer shadow */
  padding: 0 40px; /* Align with body padding */
  box-sizing: border-box;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  width: 100%;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 30px;
}

.logo .blog-logo {
  font-size: 24px;
  font-weight: bold;
  color: #fa7d3c;
  font-family: 'Georgia', serif;
}

.search-bar {
  display: flex;
  width: 300px;
  background: #f2f2f5;
  border-radius: 4px;
  padding: 5px;
}

.search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0 10px;
  outline: none;
}

.search-bar button {
  background: #fa7d3c;
  color: #fff;
  border: none;
  padding: 5px 15px;
  border-radius: 2px;
  cursor: pointer;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 15px;
}

.date-weather-wrapper {
    position: relative;
    cursor: pointer;
    height: 100%;
    display: flex;
    align-items: center;
}

.calendar-popover {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 2000;
    padding-top: 10px;
}

.weather-info {
    font-size: 14px;
    color: #666;
    margin-right: 10px;
    font-variant-numeric: tabular-nums;
}

.nav-links a:hover {
  color: #fa7d3c;
}

.nav-links a:hover {
  color: #fa7d3c;
}

/* User Dropdown */
.user-dropdown {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-left: 10px;
}

.dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0; /* Increase hover area vertically */
}

.header-username {
    font-weight: 500;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.header-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f0f2f5;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    border: 1px solid #e1e4e8;
    transition: all 0.3s;
    background-size: cover;
    background-position: center;
}

.user-dropdown:hover .header-avatar {
    background: #fa7d3c;
    color: #fff;
    border-color: #fa7d3c;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0; /* Align to right */
    background: #fff;
    border: 1px solid #eee;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-radius: 8px;
    width: 120px;
    display: none;
    flex-direction: column;
    padding: 8px 0;
    z-index: 2000;
    margin-top: -5px; /* Pull up slightly to overlap header padding if needed, or closer to trigger */
}

.user-dropdown:hover .dropdown-menu {
    display: flex;
    animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
    padding: 10px 0;
    font-size: 14px;
    color: #333;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
    transition: background 0.2s, color 0.2s;
    display: block;
}

.dropdown-item:hover {
    background: #fdfdfd;
    color: #fa7d3c;
}

/* Layout Body */
.main-body {
    display: grid;
    grid-template-columns: 200px 1fr 280px; /* Left Sidebar, Content, Right Sidebar */
    column-gap: 20px; /* Increase gap to prevent visual cramping */
    padding-top: 80px;
    padding-left: 20px; /* Symmetrical padding */
    padding-right: 20px;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    z-index: 1; /* Ensure content sits above the fixed background pattern */
}

/* Sidebar Styles */
.left-sidebar {
    grid-column: 1; /* Explicit placement */
    position: sticky;
    top: 80px;
    height: fit-content;
}

.left-sidebar .menu-group {
  margin-bottom: 30px;
}
.left-sidebar h3 {
  font-size: 16px;
  color: #333;
  font-weight: bold;
  margin-bottom: 15px;
  padding-left: 10px;
}
.left-sidebar ul li a {
  display: block;
  padding: 12px 15px;
  color: #333;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 5px;
  transition: background-color 0.2s;
}
.left-sidebar ul li a:hover, .left-sidebar ul li.active a, .left-sidebar ul li a.active {
  background-color: #fceceb;
  color: #fa7d3c;
  font-weight: bold;
}

.content-area {
    grid-column: 2; /* Explicit placement */
    min-width: 0;
    max-width: 800px; /* Prevent feed from getting ridiculously wide on 4k screens, but align it nicely */
    margin: 0; /* Align left within its cell */
}

.content-area.full-width {
    max-width: 100%;
}

/* Right Sidebar Styles */
.right-sidebar {
    grid-column: 3; /* Explicit placement */
    position: sticky;
    top: 80px;
    height: fit-content;
}

.right-sidebar > div {
  background: #fff;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
  border: 1px solid #eee;
}

.login-widget .slogan {
  color: #333;
  margin-bottom: 15px;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  display: block;
  text-align: center;
  padding: 8px 0;
  border-radius: 4px;
  font-size: 14px;
}
.btn-login {
  background: #fa7d3c; /* Orange */
  color: #fff;
}
.btn-register {
  background: #fff;
  border: 1px solid #d9d9d9;
  color: #333;
}

.trending-widget h3 {
  font-size: 14px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.trending-widget ul li {
  padding: 8px 0;
  font-size: 13px;
  display: flex;
  align-items: center;
}
.trending-widget .rank {
  display: inline-block;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  background: #ddd;
  color: #fff;
  font-size: 12px;
  margin-right: 10px;
  border-radius: 2px;
}
.trending-widget .rank.top {
  background: #fa7d3c;
}
.user-widget .big-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #eee;
  margin: 0 auto 10px auto;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  color: #888;
  background-size: cover;
  background-position: center;
}
.user-widget .user-name {
  text-align: center;
  font-weight: bold;
  margin-bottom: 15px;
}
.user-widget .stats {
  display: flex;
  justify-content: space-around;
  border-top: 1px solid #eee;
  padding-top: 15px;
}
.user-widget .stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: #939393;
  cursor: pointer;
  transition: all 0.2s;
}
.user-widget .stat:hover {
    color: #fa7d3c;
}
.user-widget .stat:hover strong {
    color: #fa7d3c;
}
.user-widget .stat strong {
  font-size: 16px;
  color: #333;
  margin-bottom: 3px;
}
</style>
