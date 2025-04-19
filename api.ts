import axios from 'axios';

// Use process.env.API_URL if available (from eas.json), fallback to hardcoded URL
const BASE_URL = process.env.API_URL || 'https://pakhims.com/user-api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set Auth Token
export const setAuthToken = (token: string | null): void => {
  if (token) {
    api.defaults.headers.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.Authorization;
  }
};