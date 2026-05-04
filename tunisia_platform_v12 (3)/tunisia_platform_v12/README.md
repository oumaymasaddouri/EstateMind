# Tunisia Platform v4

Tunisia Platform v4 combines:

- `MatchDar`: climate-aware property recommendations from Tunisia sale listings
- `ClimaTN`: city climate risk, live weather fallback, and regional heat signals

## Run

Use one of these from `C:\Users\QscUser\Documents\New project\v8\proj`:

```powershell
pip install -r requirements.txt
python app.py
```

If `python` is not on PATH, use the helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\run_app.ps1
```

Then open:

```text
http://localhost:5000
```

## Files

- `app.py` - Flask backend and API routes
- `templates/index.html` - frontend UI
- `final_listings_wrangled.csv` - property listings
- `listing_images.csv` - listing photos
- `tunisia_climate_risk_dataset.csv` - climate dataset

## API

- `/api/climate/cities`
- `/api/climate/weather/<city>`
- `/api/climate/compare`
- `/api/climate/dashboard`
- `/api/climate/regional_heatmap`
- `/api/match/config`
- `/api/match/price_hint`
- `/api/match/recommend`
- `/api/match/listing/<listing_id>`
- `/api/match/stats`
- `/api/match/search_similar`
