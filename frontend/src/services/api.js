import axios from 'axios';

// Runtime global wins (set in public/index.html), then build-time env var, then default.
const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Simulation engine API (Django /api/simulate/ on port 8000) ────────────
export const simGetScenarios    = ()           => api.get('/simulate/scenarios/');
export const simStart           = (data)       => api.post('/simulate/start/', data);
export const simListRuns        = ()           => api.get('/simulate/runs/');
export const simGetRunDetail    = (runId)      => api.get(`/simulate/runs/${runId}/`);
export const simDeleteRun       = (runId)      => api.delete(`/simulate/runs/${runId}/`);
export const simGetTimeseries   = (runId)      => api.get(`/simulate/runs/${runId}/timeseries/`);
export const simGetMetrics      = (runId)      => api.get(`/simulate/runs/${runId}/metrics/`);
export const simGetAgents       = (runId)      => api.get(`/simulate/runs/${runId}/agents/`);
export const simCompare         = (runA, runB) => api.get('/simulate/compare/', { params: { run_a: runA, run_b: runB } });
export const simGetZones        = (runId)      => api.get(`/simulate/runs/${runId}/zones/`);

// Features API calls
export const getListings = (params) => api.get('/listings/', { params });
export const getPropertyDetails = (id) => api.get(`/listings/${id}/`);
export const getValuation = (id) => api.get(`/valuations/${id}/`);
export const getPricePredictor = (data) => api.post('/valuations/predict/', data);
export const getMarketTrends = (params) => api.get('/forecasts/trends/', { params });
export const getClimateRiskMap = () => api.get('/climate/');
export const getClimateDashboard = () => api.get('/climate/dashboard/');
export const getClimateWeather = (governorate) => api.get(`/climate/weather/${encodeURIComponent(governorate)}/`);
export const getClimateCompare = (cities) => api.get('/climate/compare/', { params: { cities: cities.join(',') } });
export const getClimateScenarios = () => api.get('/climate/scenarios/');
export const getClimateRegionalHeatmap = () => api.get('/climate/regional_heatmap/');
export const getPortfolio = () => api.get('/portfolio/');
export const getScope = () => api.get('/scanner/opportunities/');
export const getMarketSimulation = (data) => api.post('/simulations/', data);
export const getCampaignStats = () => api.get('/campaign/stats/');

// Interactive map endpoints (Phase 4)
export const getMapSummary = () => api.get('/map/summary/');
export const getMapDelegations = (params) => api.get('/map/delegations/', { params });
export const getMapListings = (params) => api.get('/map/listings/', { params });
export const getMapPriceHeat = () => api.get('/map/heat/price/');
export const getMapDemandHeat = () => api.get('/map/heat/demand/');
export const getMapOpportunities = (params) => api.get('/map/opportunities/', { params });

// Account dashboard and subscription endpoints
export const getDashboardData = () => api.get('/auth/dashboard/');
export const trackUserActivity = (payload) => api.post('/auth/activity/', payload);
export const createCheckoutSession = (plan) => api.post('/billing/create-checkout-session/', { plan });
export const devUpgradePlan = (plan) => api.post('/billing/dev-upgrade/', { plan });
export const getSavedProperties = () => api.get('/auth/saved-properties/');
export const saveProperty = (payload) => api.post('/auth/saved-properties/', payload);
export const removeSavedProperty = (property_id) => api.post('/auth/saved-properties/remove/', { property_id });
export const getValuationsHistory = () => api.get('/auth/valuations-history/');
export const addValuationHistory = (payload) => api.post('/auth/valuations-history/', payload);
export const getInvestorPortfolio = () => api.get('/auth/portfolio/');
export const addInvestorPortfolioAsset = (payload) => api.post('/auth/portfolio/', payload);

// Price Forecast endpoints — dedicated /api/forecast/ app (public, no auth)
export const getForecastGovernorate = (governorate, property_type = 'apartment') =>
  api.get('/forecast/', { params: { governorate, property_type } });
export const getForecastDelegation = (delegation, property_type = 'apartment') =>
  api.get('/forecast/', { params: { delegation, property_type } });
export const getForecastNational = (property_type = 'apartment') =>
  api.get('/forecast/national/', { params: { property_type } });
export const getForecastDelegationList = (governorate) =>
  api.get('/forecast/delegations/', { params: { governorate } });
export const getForecastGovernorateList = () =>
  api.get('/forecast/');
export const getForecastMarket = (property_type = 'apartment') =>
  api.get('/forecast/market/', { params: { property_type } });

// Legal AI endpoints (RAG over Tunisian law — AllowAny, no auth required)
export const askLegalQuestion = (question) =>
  api.post('/legal/ask/', { question }, { timeout: 90000 });
export const getLegalStatus = () =>
  api.get('/legal/status/');
export const getLegalSampleQuestions = () =>
  api.get('/legal/questions/');

// Investor Intelligence endpoints (Models 1–7, portfolio + scanner)
export const getInvestorDashboard     = ()         => api.get('/investor/dashboard/');
export const getPortfolioAssets       = ()         => api.get('/investor/portfolio/');
export const addPortfolioAsset        = (data)     => api.post('/investor/portfolio/', data);
export const updatePortfolioAsset     = (id, data) => api.put(`/investor/portfolio/${id}/`, data);
export const deletePortfolioAsset     = (id)       => api.delete(`/investor/portfolio/${id}/`);
export const scorePortfolio           = ()         => api.post('/investor/portfolio/score/');
export const scorePortfolioAsset      = (id)       => api.post(`/investor/portfolio/${id}/score/`);
export const scanListing              = (data)     => api.post('/investor/scanner/score/', data, { timeout: 30000 });
export const getScanHistory           = ()         => api.get('/investor/scanner/history/');
export const getInvestorOpportunities = (params)   => api.get('/investor/opportunities/', { params });
export const getInvestorRisk          = ()         => api.get('/investor/risk/');

// AI Chatbot
export const chatSendMessage = (data) => api.post('/chatbot/message/', data, { timeout: 30000 });
export const chatGetSession  = (sessionId) => api.get('/chatbot/session/', { params: { session_id: sessionId } });

export default api;
