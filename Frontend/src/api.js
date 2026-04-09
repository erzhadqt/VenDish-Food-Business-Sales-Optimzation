import axios from 'axios'
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants'
import { isTokenExpired } from './utils/tokenUtils'

const url = import.meta.env.VITE_API_URL

const api = axios.create({
    baseURL: url
})

const AUTH_TOKEN_PATHS = [
    '/firstapp/token/',
    '/firstapp/token/refresh/',
    '/users/token/',
    '/users/token/refresh/',
];

const PUBLIC_AUTH_PATHS = [
    '/kuyavincekarinderya',
    '/kuyavincekarinderya-signup',
    '/verify-staff',
    '/login',
    '/forgotPassword',
    '/setAccount',
];

const isAuthTokenRequest = (requestUrl = '') => {
    return AUTH_TOKEN_PATHS.some(path => requestUrl.includes(path));
}

const shouldSkipAuthHandling = (config) => {
    return Boolean(config?.skipAuthRefresh) || isAuthTokenRequest(config?.url || '');
}

const isOnPublicAuthPage = () => {
    if (typeof window === 'undefined') return false;
    const currentPath = window.location?.pathname || '';
    return PUBLIC_AUTH_PATHS.some(path => currentPath.startsWith(path));
}

api.interceptors.request.use(
    async (config) => {
        // 🔴 FIX: Prevent Double-Slash URL Redirects that drop POST bodies in Production
        if (config.url) {
            config.url = config.url.replace(/([^:]\/)\/+/g, "$1");
        }

        if (shouldSkipAuthHandling(config)) {
            return config;
        }

        let token = localStorage.getItem(ACCESS_TOKEN)

        // Refresh slightly before expiry so requests don't fail once with 401.
        if (token && isTokenExpired(token, 15)) {
            try {
                token = await refreshAccessToken();
            } catch {
                token = null;
            }
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
)

let isRefreshing = false;
let pendingQueue = [];

const processPendingQueue = (error, newToken = null) => {
    pendingQueue.forEach(({resolve, reject}) => {
        if (error) reject(error);
        else resolve(newToken);
    })

    pendingQueue = [];
}

const refreshAccessToken = async () => {
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            pendingQueue.push({ resolve, reject });
        });
    }

    const refresh = localStorage.getItem(REFRESH_TOKEN)

    if (!refresh || isTokenExpired(refresh, 0)) {
        localStorage.removeItem(ACCESS_TOKEN)
        localStorage.removeItem(REFRESH_TOKEN)
        if (!isOnPublicAuthPage()) {
            window.dispatchEvent(new CustomEvent('auth:logout'))
        }
        throw new Error('Refresh token expired or missing');
    }

    isRefreshing = true;

    try {
        const res = await axios.post(`${url}/firstapp/token/refresh/`, { refresh });
        const access = res.data.access;

        localStorage.setItem(ACCESS_TOKEN, access)

        if (res.data.refresh) {
            localStorage.setItem(REFRESH_TOKEN, res.data.refresh)
        }

        processPendingQueue(null, access);
        return access;
    } catch (error) {
        processPendingQueue(error, null);
        localStorage.removeItem(ACCESS_TOKEN)
        localStorage.removeItem(REFRESH_TOKEN)
        if (!isOnPublicAuthPage()) {
            window.dispatchEvent(new CustomEvent('auth:logout'))
        }
        throw error;
    } finally {
        isRefreshing = false;
    }
}

api.interceptors.response.use(
    response => response,
    async error => {
        const request = error.config;

        if (
            error.response?.status === 401 &&
            request &&
            !request._retry &&
            !shouldSkipAuthHandling(request)
        ) {
            request._retry = true;

            try {
                const access = await refreshAccessToken();
                request.headers.Authorization = `Bearer ${access}`
                return api(request)
            } catch (error) {
                return Promise.reject(error)
            }
        }

        return Promise.reject(error)
    }
)

export default api;
