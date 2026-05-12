import axios from "axios";

const apiUrl = `http://localhost:8000/api`;

const getToken = () => localStorage.getItem("auth-token");
//

const axiosInstance = axios.create({
  baseURL: apiUrl,
  // withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
