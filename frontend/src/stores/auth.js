import { defineStore } from 'pinia';
import api from '@/utils/http';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
    }),
    actions: {
        async login({ username, password }) {
            // First, try to login using the custom endpoint
            try {
                const response = await api.post('/auth/login', { username, password });
                this.user = response.data;
                // Store password locally for Basic Auth in http.js (Demo purposes only)
                this.user.password = password;

                localStorage.setItem('user', JSON.stringify(this.user));
                return true;
            } catch (error) {
                console.error("Login failed", error);
                throw error;
            }
        },
        async register(user) {
            try {
                await api.post('/auth/register', user);
                return true;
            } catch (error) {
                throw error;
            }
        },
        logout() {
            this.user = null;
            localStorage.removeItem('user');
        }
    }
});
