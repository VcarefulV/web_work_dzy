<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const error = ref('')
const authStore = useAuthStore()
const router = useRouter()

const handleLogin = async () => {
  error.value = ''
  try {
    const success = await authStore.login({ username: username.value, password: password.value })
    if (success) {
      router.push('/')
    } else {
      error.value = '用户名或密码错误'
    }
  } catch (e) {
    error.value = '登录失败，请稍后重试'
  }
}
</script>

<template>
  <div class="auth-container">
    <!-- Background Patterns -->
    <div class="bg-pattern p1"></div>
    <div class="bg-pattern p2"></div>
    <div class="bg-pattern p3"></div>

    <div class="auth-card">
      <!-- Left Side: Form -->
      <div class="form-section">
        <div class="header">
          <h2>欢迎回来</h2>
          <p class="subtitle">登录您的博客账号</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <label>账号</label>
            <input 
              type="text" 
              v-model="username" 
              required 
              placeholder="请输入账号" 
              class="input-field"
            />
          </div>
          
          <div class="form-group">
            <label>密码</label>
            <input 
              type="password" 
              v-model="password" 
              required 
              placeholder="请输入密码"
              class="input-field"
            />
          </div>

          <div class="error-msg" v-if="error">{{ error }}</div>

          <button type="submit" class="submit-btn">登录</button>
          
          <div class="form-footer">
            <span>还没有账号? <RouterLink to="/register">立即注册</RouterLink></span>
          </div>
        </form>
      </div>

      <!-- Right Side: Decoration -->
      <div class="decor-section">
        <div class="decor-content">
          <h3>记录生活，分享知识</h3>
          <p>Personal Blog System</p>
          <div class="illustration">
             <div class="circle c1"></div>
             <div class="circle c2"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  width: 100%;
  background: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden; /* Hide overflow from patterns */
}

/* Background Patterns */
.bg-pattern {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px); /* Soft blur effect */
  opacity: 0.6;
  z-index: 0;
}
.p1 {
  width: 500px;
  height: 500px;
  background: #fa7d3c;
  top: -200px;
  left: -200px;
  animation: float 10s infinite ease-in-out;
}
.p2 {
  width: 400px;
  height: 400px;
  background: #667eea;
  bottom: -150px;
  right: -100px;
  animation: float 12s infinite ease-in-out reverse;
}
.p3 {
  width: 300px;
  height: 300px;
  background: #764ba2;
  top: 40%;
  left: 20%;
  opacity: 0.4;
  animation: float 15s infinite ease-in-out;
}

@keyframes float {
  0% { transform: translate(0, 0); }
  50% { transform: translate(20px, 40px); }
  100% { transform: translate(0, 0); }
}

.auth-card {
  position: relative;
  z-index: 1; /* Above background */
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  width: 900px;
  max-width: 95%;
  height: 550px;
  display: flex;
  overflow: hidden;
}

/* Left Form Section */
.form-section {
  flex: 1;
  padding: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
/* ... Rest of the CSS remains the same ... */
.header h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}
.header .subtitle {
  color: #999;
  font-size: 14px;
  margin-bottom: 40px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.input-field {
  padding: 12px 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
  font-size: 14px;
  transition: all 0.3s;
}
.input-field:focus {
  background: #fff;
  border-color: #fa7d3c;
  box-shadow: 0 0 0 3px rgba(250, 125, 60, 0.1);
  outline: none;
}

.submit-btn {
  background: linear-gradient(135deg, #fa7d3c 0%, #ff5c00 100%);
  color: #fff;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(250, 125, 60, 0.3);
}

.error-msg {
  color: #e53e3e;
  font-size: 13px;
  background: #fff5f5;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
}

.form-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
  color: #999;
}
.form-footer a {
  color: #fa7d3c;
  font-weight: 600;
}

/* Right Decor Section */
.decor-section {
  flex: 1;
  background: linear-gradient(135deg, #fa7d3c 0%, #ff9a69 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  color: #fff;
  text-align: center;
}

.decor-content {
  position: relative;
  z-index: 2;
  padding: 40px;
}
.decor-content h3 {
  font-size: 32px;
  margin-bottom: 10px;
  font-weight: bold;
}
.decor-content p {
  font-size: 16px;
  opacity: 0.9;
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* Abstract circles decoration inside card */
.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
}
.c1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -50px;
}
.c2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
}
</style>
