import axios from "axios"
import { ACCESS_TOKEN } from "./constants"

const url = import.meta.env.VITE_API_URL

const api = axios.create({
    baseURL: url
//     headers: {
//         "Content-Type": "application/json",
//   },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)


export default api