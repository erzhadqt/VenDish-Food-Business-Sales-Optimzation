import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";

export const isTokenExpired = (token, thresholdSeconds = 0) => {
    if (!token) return true;
    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        return decoded.exp < (currentTime + thresholdSeconds);
    } catch (error) {
        return true;
    }
}

export const isSessionValid = () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    return !isTokenExpired(token);
}
