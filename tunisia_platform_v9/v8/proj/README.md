# Tunisia Platform — MatchDar + ClimaTN

## Run
```bash
pip install -r requirements.txt
python app.py
# Open: http://localhost:5000
```

## Structure
- `app.py`                          — Flask backend (run this)
- `templates/index.html`            — Full frontend (HTML + CSS + JS)
- `final_listings_wrangled.csv`     — 5,800 real listings
- `tunisia_climate_risk_dataset.csv`— 24-city climate data
- `ClimaTN_Intelligence_Notebook.ipynb` — Fully executed notebook

## Notebook
Open directly in VSCode or Jupyter — all cells already have outputs.
No need to run anything. X_train/X_test/y_train/y_test defined once in Cell 5.

## Architecture
- Backend (app.py): Flask server, ML pipeline, climate engine, all APIs
- Frontend (index.html): browser UI, Leaflet map, property cards, charts
- They communicate via fetch() calls to /api/... endpoints
