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
  
  // Financial Monitoring (CSV Backed)
  getFinancialProjects: (state, district) => axios.get(`${API_URL}/financial/projects`, { params: { state, district } }).then(res => res.data),
  getFinancialSummary: (state, district) => axios.get(`${API_URL}/financial/summary`, { params: { state, district } }).then(res => res.data),
  getFinancialAlerts: (state, district) => axios.get(`${API_URL}/financial/alerts`, { params: { state, district } }).then(res => res.data),
  getFinancialAnalytics: (state, district) => axios.get(`${API_URL}/financial/analytics`, { params: { state, district } }).then(res => res.data),
  
  // Verification Queue
  getVerificationQueue: (state, district) => axios.get(`${API_URL}/verification-queue`, { params: { state, district } }).then(res => res.data),
  getVerificationProject: (projectId) => axios.get(`${API_URL}/verification-queue/${projectId}`).then(res => res.data),
  assignVerification: (projectId, data) => axios.patch(`${API_URL}/verification-queue/${projectId}/assign`, data).then(res => res.data),
  updateVerificationStatus: (projectId, status) => axios.patch(`${API_URL}/verification-queue/${projectId}/status`, { status }).then(res => res.data),
  submitVerificationFindings: (projectId, data) => axios.post(`${API_URL}/verification-queue/${projectId}/findings`, data).then(res => res.data),
  
  // Geographic Risk
  getGeographicOverview: () => axios.get(`${API_URL}/geographic/overview`).then(res => res.data),
  getAllDistrictsOverview: () => axios.get(`${API_URL}/geographic/all-districts`).then(res => res.data),
  getStateOverview: (state) => axios.get(`${API_URL}/geographic/state/${state}`).then(res => res.data),
  getDistrictProjects: (district) => axios.get(`${API_URL}/geographic/district/${district}`).then(res => res.data),
  getGeographicRiskRanking: () => axios.get(`${API_URL}/geographic/risk-ranking`).then(res => res.data),
  getCategoryRisk: () => axios.get(`${API_URL}/geographic/category-risk`).then(res => res.data),
  getAgencyRisk: () => axios.get(`${API_URL}/geographic/agency-risk`).then(res => res.data),
  getFinancialRisk: () => axios.get(`${API_URL}/geographic/financial-risk`).then(res => res.data),
  getDelayRisk: () => axios.get(`${API_URL}/geographic/delay-risk`).then(res => res.data),
};
