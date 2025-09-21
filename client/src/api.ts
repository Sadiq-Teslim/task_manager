// client/src/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // This is crucial for sending the JWT cookie
});

export default api;