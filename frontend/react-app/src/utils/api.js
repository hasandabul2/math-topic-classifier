import axios from 'axios'

// In Docker production: Nginx proxies /api, /predict, etc. to the backend.
// In local dev: Vite proxy (vite.config.js) does the same thing.
// So we use an empty baseURL (same-origin requests) in both cases.
const api = axios.create({
    baseURL: '',
    withCredentials: true,
})

export default api
