<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/http'

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const router = useRouter()

const handleRegister = async () => {
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  try {
    // API endpoint for registration
    await api.post('/auth/register', {
      username: username.value,
      password: password.value,
      email: email.value
    })
    // Redirect to login on success
    router.push('/login')
  } catch (e) {
    if (e.response && e.response.data && e.response.data.message) {
       error.value = e.response.data.message
    } else if (e.response && e.response.data && typeof e.response.data === 'string') {
       error.value = e.response.data
    } else {
       error.value = '注册失败，请稍后重试'
    }
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
          <h2>创建账号</h2>
          <p class="subtitle">加入我们的社区，开始创作</p>
        </div>
        
        <form @submit.prevent="handleRegister" class="auth-form">
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
            <label>邮箱</label>
            <input 
              type="email" 
              v-model="email" 
              required 
              placeholder="请输入邮箱" 
              class="input-field"
            />
          </div>
          
          <div class="form-group-row">
            <div class="form-group">
                <label>密码</label>
                <input 
                type="password" 
                v-model="password" 
                required 
                placeholder="设置密码"
                class="input-field"
                />
            </div>

            <div class="form-group">
                <label>确认密码</label>
                <input 
                type="password" 
                v-model="confirmPassword" 
                required 
                placeholder="确认密码"
                class="input-field"
                />
            </div>
          </div>

          <div class="error-msg" v-if="error">{{ error }}</div>

          <button type="submit" class="submit-btn">立即注册</button>
          
          <div class="form-footer">
            <span>已有账号? <RouterLink to="/login">立即登录</RouterLink></span>
          </div>
        </form>
      </div>

      <!-- Right Side: Decoration -->
      <div class="decor-section">
        <div class="decor-content">
          <h3>欢迎加入</h3>
          <p>Start Your Writing Journey</p>
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
  overflow: hidden;
}

/* Background Patterns */
.bg-pattern {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
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
  z-index: 1;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  width: 900px;
  max-width: 95%;
  height: 600px;
  display: flex;
  overflow: hidden;
}

/* Left Form Section */
.form-section {
  flex: 1;
  padding: 40px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
/* ... Rest of the CSS remains the same as Login but adjusted for Register fields ... */
.header h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}
.header .subtitle {
  color: #999;
  font-size: 14px;
  margin-bottom: 30px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.form-group-row {
  display: flex;
  gap: 15px;
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
  width: 100%;
  box-sizing: border-box;
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
  margin-top: 10px;
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
  margin-top: 15px;
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
