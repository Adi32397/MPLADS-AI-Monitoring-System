import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const api = {
  // Projects
  getProjects: () => axios.get(`${API_URL}/projects`).then(res => res.data),
  getProjectById: (id) => axios.get(`${API_URL}/projects/${id}`).then(res => res.data),
  getHighRiskProjects: () => axios.get(`${API_URL}/projects/high-risk`).then(res => res.data),
  
  // Analytics
  getDashboardStats: () => axios.get(`${API_URL}/projects/dashboard`).then(res => res.data),
  getDistrictRisk: () => axios.get(`${API_URL}/analytics/districts/risk`).then(res => res.data),
  getCategoryStats: () => axios.get(`${API_URL}/analytics/categories`).then(res => res.data),
  getDuplicates: () => axios.get(`${API_URL}/analytics/duplicates`).then(res => res.data),

  // Alerts
  getAlerts: () => axios.get(`${API_URL}/alerts`).then(res => res.data),
  createVerificationRequest: (data) => axios.post(`${API_URL}/alerts/verification`, data).then(res => res.data),
};
