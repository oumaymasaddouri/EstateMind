# EstateMind – AI-Powered Real Estate Valuation Platform for Tunisia

**EstateMind** is a comprehensive real estate intelligence platform that combines machine learning, computer vision, and market analysis to provide accurate property valuations, price drivers analysis, and investment insights across Tunisia.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Setup & Installation](#setup--installation)
7. [Running the Application](#running-the-application)
8. [Configuration](#configuration)
9. [API Endpoints](#api-endpoints)
10. [Frontend Usage](#frontend-usage)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [Contributing](#contributing)

---

## Overview

EstateMind transforms Tunisia's real estate market with AI-powered valuations and community-driven market intelligence. The platform uses:

- **CatBoost regression models** trained on Tunisian market data for property-specific predictions
- **Computer Vision (CV) analysis** to assess property condition and calculate quality/coverage scores
- **Sentiment analysis** of property descriptions to improve valuation accuracy
- **SHAP (SHapley Additive exPlanations)** for transparent, feature-level price drivers visualization
- **Market comparables** sourced from live property databases and historical CSV datasets
- **Confidence scoring** with uncertainty quantification and scenario simulation

**End-to-end workflow:**
```
Input (property data, images, description)
  ↓
CV analysis + Sentiment analysis (signals pre-extraction)
  ↓
CatBoost model prediction (with signal multipliers applied)
  ↓
Market comparables & confidence scoring
  ↓
SHAP explanation & price drivers visualization
  ↓
Final valuation response with scenarios & recommendations
```

---

## Key Features

### Property Valuation Engine
- **Dual-mode predictions:** Primary CatBoost bundle (by-type or global) with graceful fallback to heuristic tabular model
- **Signal integration:** Computer vision (quality + coverage) and sentiment analysis multipliers applied to final price
- **Confidence quantification:** Dynamic confidence scores based on market data density, model agreement, and signal quality
- **Price uncertainty:** Confidence bands (lower/upper bounds) with uncertainty ratio and reasoning

### Market Analysis
- **Comparable listings:** Up to 4 similar properties from live database or CSV market dataset (sales-only by default)
- **Market positioning:** "Above market," "at market," or "below market" classification relative to neighborhood averages
- **Neighborhood intelligence:** Price per m² calibrated at governorate and delegation levels using real market data across 278 areas

### Explainability & Visualization
- **SHAP price drivers:** Horizontal barplot showing each feature's contribution to the estimated price
- **AI explanations:** Concise, human-readable sentences explaining which model was used and what signals were applied
- **Model metadata:** Transparency on prediction source, CV/text signals applied, and uncertainty reasoning
- **No internal telemetry:** User-facing warnings filtered; operators see internal diagnostic logs only

### Scenario Simulation & Investment Intelligence
- **What-if scenarios:** Simulated property upgrades (renovations, additions) ranked by potential price impact
- **Deal evaluation:** Compare property asking price vs. model estimate to identify investment opportunities
- **Investment portfolio tracking:** Monitor acquisition prices, current valuations, and market trends across properties
- **Market scanner:** Bulk analysis of new listings with automated deal alerts and scoring

### User & Billing System
- **Role-based access:** Free tier, Pro, and Investor plans with feature-gated endpoints
- **Stripe integration:** Credit card payments with secure server-side intent confirmation
- **Subscription management:** Plan upgrades, billing history, and recurring charges

---

## Tech Stack

### Backend (Django REST Framework)
- **Framework:** Django 4.x + Django REST Framework
- **Python:** 3.12 (local installation at `python-local/`)
- **ML Models:**
  - CatBoost for property-price regression
  - scikit-learn for fallback heuristic
  - SHAP for feature attribution
  - TensorFlow/Keras for CV and sentiment deep learning
- **Data:** SQLite (local) / PostgreSQL (production)
- **Task Queue:** Celery (optional)
- **API Auth:** Token-based + role-based permissions

### Frontend (React 18)
- **Framework:** React 18.3 + React Router 6
- **Build:** Create React App (CRA) with Tailwind CSS
- **UI Components:** Lucide React icons, Recharts for graphs
- **Payments:** Stripe React SDK
- **HTTP:** Axios with interceptors for auth & error handling
- **Animations:** Framer Motion

### Infrastructure
- **Local Dev:** npm + Django development servers
- **Environment:** .env files (Git-ignored for secrets)
- **Deployment:** Vercel (frontend) / Heroku/custom VPS (backend)

---

## Architecture

```
┌─────────────────────────────────────┐
│      React Frontend (Port 3000)      │
│  ├─ Pages: Valuate, Analyze, Account
│  ├─ Components: PaymentModal, Charts
│  └─ Services: API client, Auth
└────────────────┬────────────────────┘
                 │ HTTPS/API calls
┌────────────────▼────────────────────┐
│    Django REST API (Port 8000)      │
│  ├─ /valuations/estimate/          │
│  ├─ /valuations/locations/         │
│  ├─ /billing/plans/                │
│  ├─ /users/profile/                │
│  └─ Admin: /admin/                 │
└────────────────┬────────────────────┘
                 │
        ┌────────┼────────┬──────────┐
        │        │        │          │
    ┌───▼──┐ ┌──▼──┐ ┌───▼──┐  ┌──▼────┐
    │ ML   │ │Data │ │Stripe│  │SQLite │
    │Models│ │Pipe │ │API   │  │DB     │
    └──────┘ └─────┘ └──────┘  └───────┘
```

**Request Flow (Valuation):**
1. User submits property data + images on frontend
2. Frontend uploads to `/valuations/estimate/` (Django)
3. Backend orchestrates:
   - Step 0a: CV analysis (image quality, coverage)
   - Step 0b: Sentiment analysis (description quality)
   - Step 1: CatBoost prediction with signal multipliers
   - Step 1b: Fallback to heuristic if bundle unavailable
   - Step 2: Market comparables lookup
   - Step 3: Confidence scoring
   - Step 4: SHAP explanation & scenarios
   - Step 5: Final response assembly (warnings filtered, user notifications added)
4. Frontend displays results with tabs: Overview, Price Drivers, Market, Scenarios

---

## Project Structure

```
EstateMind/
├── backend/
│   ├── manage.py                    # Django CLI
│   ├── requirements.txt             # Python dependencies
│   ├── db.sqlite3                   # Local development database
│   ├── Procfile                     # Heroku deployment config
│   ├── config/
│   │   ├── settings.py              # Django settings
│   │   ├── urls.py                  # URL routing
│   │   ├── wsgi.py / asgi.py        # WSGI/ASGI apps
│   │   └── admin_site.py            # Custom admin site
│   ├── valuation/                   # Core valuation engine
│   │   ├── models.py                # DB models (Valuation, Scenario, etc.)
│   │   ├── views.py                 # API endpoints
│   │   ├── serializers.py           # Request/response serialization
│   │   ├── services/
│   │   │   ├── valuation_service.py # End-to-end orchestrator
│   │   │   ├── response_builder.py  # API response assembly
│   │   │   ├── shap_service.py      # SHAP explanation & viz
│   │   │   ├── explanation.py       # AI explanation generation
│   │   │   ├── comparables.py       # Market comparables lookup
│   │   │   ├── confidence.py        # Confidence scoring
│   │   │   ├── scenario_service.py  # What-if scenarios
│   │   │   ├── csv_engine.py        # CSV market data lookup
│   │   │   └── forecast_service.py  # Price forecasting
│   │   ├── inference/
│   │   │   ├── inference_bundle.py  # CatBoost serving bundle (optional processor)
│   │   │   ├── model_registry.py    # Model discovery & loading
│   │   │   ├── fallback_model.py    # Heuristic tabular model
│   │   │   ├── cv_model.py          # Computer vision service
│   │   │   ├── sentiment_model.py   # Sentiment analysis service
│   │   │   └── request_mapper.py    # Request → ML feature mapping
│   │   ├── artifacts/
│   │   │   ├── models/              # Trained CatBoost models (.joblib)
│   │   │   │   └── models_estateprocessor/
│   │   │   │       ├── bytype__appartement__catboost.joblib
│   │   │   │       ├── bytype__maison__catboost.joblib
│   │   │   │       ├── bytype__terrain__catboost.joblib
│   │   │   │       ├── global__catboost.joblib
│   │   │   │       └── ...
│   │   │   ├── reference_data/      # Market reference datasets
│   │   │   └── cv_models/           # Pre-trained vision models
│   │   └── migrations/              # Database schema migrations
│   ├── users/                       # User management & auth
│   │   ├── models.py                # User, Profile, Role models
│   │   ├── views.py                 # Auth endpoints
│   │   └── permissions.py           # Custom DRF permissions
│   ├── billing/                     # Stripe billing integration
│   │   ├── models.py                # Plan, Subscription, Payment models
│   │   ├── views.py                 # Billing endpoints
│   │   └── services/
│   ├── features/                    # Feature flags & user capabilities
│   ├── core/                        # Shared utilities, data pipelines
│   ├── legal/                       # Legal/compliance data (Chroma embeddings)
│   ├── scraper/                     # Property web scraping
│   ├── campaign/                    # Marketing & email campaigns
│   ├── simulation/                  # Property market simulations
│   ├── forecast/                    # Price forecasting models
│   └── templates/
│       └── emails/                  # Transactional email templates
│
├── frontend/
│   ├── package.json                 # NPM dependencies
│   ├── .env                         # Environment variables (Git-ignored)
│   ├── public/
│   │   └── index.html               # HTML entry point
│   ├── src/
│   │   ├── App.js                   # Root component
│   │   ├── index.js                 # React DOM render
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global auth state
│   │   ├── pages/
│   │   │   ├── ValuatePage.jsx      # Property valuation UI (tabs: Overview, Price Drivers, Market, Scenarios)
│   │   │   ├── AccountDashboardPage.jsx # User account & billing
│   │   │   ├── AnalyzePage.jsx      # Market intelligence hub
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── SignupPage.jsx
│   │   │   └── invest/
│   │   │       └── InvestLayout.jsx # Investment portfolio
│   │   ├── components/
│   │   │   ├── PaymentModal.jsx     # Stripe payment form
│   │   │   ├── Charts/
│   │   │   │   ├── ShapChart.jsx    # Price drivers barplot
│   │   │   │   └── ...
│   │   │   ├── Navigation/
│   │   │   ├── Forms/
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.js               # Axios API client with auth
│   │   └── styles/                  # Tailwind CSS config
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── build/                       # Production build output
│
├── python-local/                    # Local Python 3.12 installation
├── start-backend.ps1                # PowerShell script to run Django dev server
├── start-frontend.ps1               # PowerShell script to run React dev server
├── get-pip.py                       # pip bootstrap installer
├── README.md                        # This file
└── .gitignore                       # Git ignore rules

```

---

## Setup & Installation

### Prerequisites

- **Python 3.12** (included in `python-local/`)
- **Node.js 16+** (npm for frontend build)
- **Git** for version control
- **Stripe account** (test keys for development)

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/oumaymasaddouri/EstateMind.git
   cd EstateMind/backend
   ```

2. **Create virtual environment (optional, or use local Python):**
   ```bash
   # Using local Python installation:
   cd ..
   python-local\python.exe -m venv venv
   venv\Scripts\activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

5. **Create superuser (admin):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Load initial data (optional):**
   ```bash
   python manage.py import_price_forecasts  # Or other management commands
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file with configuration:**
   ```bash
   # frontend/.env
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_KEY_HERE
   REACT_APP_API_URL=http://localhost:8000/api
   REACT_APP_DEBUG=false
   ```

---

## Running the Application

### Local Development

**Option 1: Using PowerShell scripts (Windows)**

```powershell
# From repository root:
# Terminal 1 - Backend
.\start-backend.ps1

# Terminal 2 - Frontend
.\start-frontend.ps1
```

**Option 2: Manual start**

```bash
# Terminal 1 - Backend (from backend/ directory)
python manage.py runserver

# Terminal 2 - Frontend (from frontend/ directory)
npm start
```

### Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api
- **Admin Dashboard:** http://localhost:8000/admin
- **API Documentation:** http://localhost:8000/api/swagger/ (if drf-spectacular installed)

---

## Configuration

### Environment Variables

**Backend (backend/.env or settings.py):**
```python
DEBUG=True  # Set to False in production
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3  # Or PostgreSQL URL
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret
```

**Frontend (frontend/.env):**
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLIC_KEY
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_DEBUG=false
```

### Stripe Configuration

1. **Get test keys** from https://dashboard.stripe.com/apikeys
2. **Copy Publishable Key** to `REACT_APP_STRIPE_PUBLISHABLE_KEY`
3. **Copy Secret Key** to backend env vars
4. **Create webhook endpoint** pointing to `http://localhost:8000/api/billing/webhook/stripe/` for local testing (use Stripe CLI)

### Model Configuration

**CatBoost models** are loaded from `backend/valuation/artifacts/models/models_estateprocessor/`:
- `bytype__[property_type]__catboost.joblib` (property-type-specific models)
- `global__catboost.joblib` (fallback global model)

Models are loaded lazily on first valuation request. Reference dataset is optional; model creates engineered features if dataset unavailable.

---

## API Endpoints

### Valuation Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/valuations/estimate/` | Token | Submit property data & images for valuation |
| GET | `/valuations/locations/` | None | Fetch governorates and delegations |
| GET | `/valuations/scenarios/{id}/` | Token | Retrieve scenarios for a valuation |

### Billing Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/billing/plans/` | None | List subscription plans |
| POST | `/billing/create-payment-intent/` | Token | Create Stripe payment intent |
| POST | `/billing/confirm-payment/` | Token | Confirm payment after Stripe transaction |
| GET | `/billing/subscription/` | Token | Get user's current subscription |

### User Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users/register/` | None | Create new user account |
| POST | `/users/login/` | None | Authenticate & return token |
| GET | `/users/profile/` | Token | Fetch user profile & permissions |
| PUT | `/users/profile/` | Token | Update user profile |

**Request example (Valuation):**
```bash
curl -X POST http://localhost:8000/api/valuations/estimate/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "property_type": "apartment",
    "governorate": "Tunis",
    "delegation": "Tunis",
    "size_m2": 120,
    "bedrooms": 3,
    "bathrooms": 2,
    "description": "Modern apartment near downtown"
  }'
```

---

## Frontend Usage

### Pages Overview

**ValuatePage** (`/valuate`)
- Property input form with file upload for images
- Result tabs: Overview (AI explanation), Price Drivers (SHAP), Market (comparables), Scenarios (what-if)
- Confidence gauge and signal breakdown

**AccountDashboardPage** (`/account/dashboard`)
- User profile management
- Billing & subscription status
- Payment modal for plan upgrades
- Valuation history

**AnalyzePage** (`/analyze`)
- Market intelligence hub
- Governorate-level price trends
- Climate risk analysis
- Market opportunity scanner

### Feature Flags

Users with different plans have access to different features:
- **Free:** Basic valuation only
- **Pro:** +Market comparables, scenarios, investment portfolio
- **Investor:** +Advanced analytics, portfolio tracking, market scanner, deal alerts

---

## Deployment

### Frontend (Vercel)

1. **Connect GitHub repo to Vercel:**
   - Go to https://vercel.com/new
   - Import from GitHub repository
   - Set environment variables:
     ```
     REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
     REACT_APP_API_URL=https://api.estatemind.tn/api
     ```

2. **Deploy:**
   ```bash
   npm run build  # Local testing
   # Push to GitHub, Vercel auto-deploys
   ```

### Backend (Heroku / Custom VPS)

1. **Heroku deployment:**
   ```bash
   heroku create your-app-name
   git push heroku main
   heroku config:set STRIPE_SECRET_KEY=sk_live_...
   heroku run python manage.py migrate
   ```

2. **Custom VPS (e.g., DigitalOcean):**
   - SSH into server
   - Clone repo, set up Python venv
   - Configure Gunicorn + Nginx reverse proxy
   - Set environment variables in `.env` or systemd service
   - Use systemd service file to manage Django app

3. **Database:**
   - Migrate from SQLite to PostgreSQL for production
   - Update `DATABASE_URL` in backend settings

4. **Static files & media:**
   ```bash
   python manage.py collectstatic
   ```

---

## Troubleshooting

### Stripe "Expected publishable key ... got undefined"
- **Solution:** Ensure `REACT_APP_STRIPE_PUBLISHABLE_KEY` is set in `frontend/.env` and restart dev server (`npm start`)
- **Check:** Open DevTools Console and run `console.log(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)`

### CatBoost models fail to load
- **Check:** Verify `.joblib` files exist in `backend/valuation/artifacts/models/models_estateprocessor/`
- **Solution:** If missing, train models or use fallback heuristic (app will auto-fallback)

### MetaMask browser extension error
- **Cause:** MetaMask extension attempting to probe page (not project code)
- **Solution:** Disable MetaMask extension locally or use Incognito mode

### CORS errors when calling backend API
- **Solution:** Add frontend origin to `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py`
  ```python
  CORS_ALLOWED_ORIGINS = [
      "http://localhost:3000",
      "https://yourdomain.com",
  ]
  ```

### Port 8000 or 3000 already in use
- **Solution:** Use alternate ports or kill existing processes:
  ```bash
  # Windows PowerShell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
  ```

---

## Contributing

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat: description of your feature"
   ```

3. **Push and create pull request:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Code standards:**
   - Backend: Follow Django conventions, use type hints (Python 3.10+)
   - Frontend: Use React best practices, component-based architecture, Tailwind CSS
   - Tests: Write unit tests for critical services (see `backend/valuation/tests.py`)

---

## License

[Add your license here, e.g., MIT, GPL, etc.]

---

## Support & Contact

For issues, feature requests, or questions:
- **GitHub Issues:** https://github.com/oumaymasaddouri/EstateMind/issues
- **Email:** support@estatemind.tn

---

**Last Updated:** May 2026  
**Version:** 2.0.0 (CatBoost + SHAP + Signals)
