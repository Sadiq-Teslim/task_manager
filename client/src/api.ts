// client/src/api.ts

import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL;
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // This is crucial for sending the JWT cookie
});

export default api;