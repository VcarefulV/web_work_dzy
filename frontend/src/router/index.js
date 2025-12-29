import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/Home.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { hideLayout: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/Register.vue'),
      meta: { hideLayout: true }
    },
    {
      path: '/create',
      name: 'create-post',
      component: () => import('../views/CreatePost.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/posts/:id',
      name: 'post-detail',
      component: () => import('../views/PostDetail.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login');
  } else {
    next();
  }
});

export default router
