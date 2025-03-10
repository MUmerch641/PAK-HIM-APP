import axios from 'axios';

// Base URL for the API
const BASE_URL = 'https://pakhims.com/stg_user-api';

// Create an Axios instance
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
//stg_user-api