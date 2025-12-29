import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 5000
});

api.interceptors.request.use(config => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.username && user.password) {
        const token = btoa(`${user.username}:${user.password}`);
        config.headers.Authorization = `Basic ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

api.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response && error.response.status === 401) {
        // Redirect to login if needed, or handle in component
        // window.location.href = '/login';
    }
    return Promise.reject(error);
});

export default api;
