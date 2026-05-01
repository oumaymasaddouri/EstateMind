from flask import Flask, render_template, jsonify, request, session
import pandas as pd, numpy as np
import requests, math, random, warnings, json
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors
from pathlib import Path
from collections import defaultdict

warnings.filterwarnings("ignore")
app = Flask(__name__, template_folder="templates")
app.secret_key = "tunisia-platform-secret"
BASE = Path(__file__).parent

# ════════════════════════════════════════════════════════
# CITIES & RISK DATA
# ════════════════════════════════════════════════════════
CITIES = {
    "Tunis":       {"lat":36.82,"lon":10.17,"region":"North","coastal":True},
    "Sfax":        {"lat":34.74,"lon":10.76,"region":"Center-East","coastal":True},
    "Sousse":      {"lat":35.83,"lon":10.64,"region":"Center-East","coastal":True},
    "Kairouan":    {"lat":35.68,"lon":9.11, "region":"Center","coastal":False},
    "Bizerte":     {"lat":37.27,"lon":9.87, "region":"North","coastal":True},
    "Gabès":       {"lat":33.88,"lon":9.90, "region":"South-East","coastal":True},
    "Ariana":      {"lat":36.86,"lon":10.19,"region":"North","coastal":False},
    "Gafsa":       {"lat":34.43,"lon":8.78, "region":"South-West","coastal":False},
    "Monastir":    {"lat":35.77,"lon":10.83,"region":"Center-East","coastal":True},
    "Nabeul":      {"lat":36.45,"lon":10.73,"region":"North-East","coastal":True},
    "Béja":        {"lat":36.73,"lon":9.18, "region":"North-West","coastal":False},
    "Jendouba":    {"lat":36.50,"lon":8.78, "region":"North-West","coastal":False},
    "Tozeur":      {"lat":33.92,"lon":8.13, "region":"South-West","coastal":False},
    "Médenine":    {"lat":33.35,"lon":10.50,"region":"South","coastal":False},
    "Tataouine":   {"lat":32.93,"lon":10.45,"region":"South","coastal":False},
    "Kasserine":   {"lat":35.17,"lon":8.83, "region":"Center-West","coastal":False},
    "Sidi Bouzid": {"lat":35.04,"lon":9.49, "region":"Center","coastal":False},
    "Mahdia":      {"lat":35.50,"lon":11.06,"region":"Center-East","coastal":True},
    "Zaghouan":    {"lat":36.40,"lon":10.14,"region":"North","coastal":False},
    "Kebili":      {"lat":33.70,"lon":8.97, "region":"South","coastal":False},
    "Ben Arous":   {"lat":36.75,"lon":10.22,"region":"North","coastal":False},
    "Siliana":     {"lat":36.08,"lon":9.37, "region":"North-West","coastal":False},
    "Le Kef":      {"lat":36.18,"lon":8.71, "region":"North-West","coastal":False},
    "Hammamet":    {"lat":36.40,"lon":10.62,"region":"North-East","coastal":True},
}

# Calibrated from World Bank Tunisia Climate Risk Profile 2025
CITY_RISK = {
    "Tunis":      {"flood":"High",     "heat":"High",     "earthquake":"Low",   "drought":"Medium"},
    "Sfax":       {"flood":"Medium",   "heat":"High",     "earthquake":"Low",   "drought":"High"},
    "Sousse":     {"flood":"Medium",   "heat":"High",     "earthquake":"Low",   "drought":"Medium"},
    "Kairouan":   {"flood":"Medium",   "heat":"Very High","earthquake":"Low",   "drought":"High"},
    "Bizerte":    {"flood":"High",     "heat":"Low",      "earthquake":"Low",   "drought":"Low"},
    "Gabès":      {"flood":"Medium",   "heat":"Very High","earthquake":"Low",   "drought":"Very High"},
    "Ariana":     {"flood":"High",     "heat":"High",     "earthquake":"Low",   "drought":"Medium"},
    "Gafsa":      {"flood":"Low",      "heat":"Very High","earthquake":"Medium","drought":"Very High"},
    "Monastir":   {"flood":"Medium",   "heat":"High",     "earthquake":"Low",   "drought":"High"},
    "Nabeul":     {"flood":"Low",      "heat":"Medium",   "earthquake":"Low",   "drought":"Low"},
    "Béja":       {"flood":"High",     "heat":"Low",      "earthquake":"Low",   "drought":"Low"},
    "Jendouba":   {"flood":"Very High","heat":"Low",      "earthquake":"Low",   "drought":"Low"},
    "Tozeur":     {"flood":"Low",      "heat":"Very High","earthquake":"Low",   "drought":"Very High"},
    "Médenine":   {"flood":"Low",      "heat":"Very High","earthquake":"Low",   "drought":"Very High"},
    "Tataouine":  {"flood":"Low",      "heat":"Very High","earthquake":"Low",   "drought":"Very High"},
    "Kasserine":  {"flood":"Low",      "heat":"High",     "earthquake":"Medium","drought":"High"},
    "Sidi Bouzid":{"flood":"Low",      "heat":"Very High","earthquake":"Low",   "drought":"Very High"},
    "Mahdia":     {"flood":"Medium",   "heat":"High",     "earthquake":"Low",   "drought":"High"},
    "Zaghouan":   {"flood":"Low",      "heat":"Medium",   "earthquake":"Low",   "drought":"Low"},
    "Kebili":     {"flood":"Low",      "heat":"Very High","earthquake":"Low",   "drought":"Very High"},
    "Ben Arous":  {"flood":"High",     "heat":"High",     "earthquake":"Low",   "drought":"Medium"},
    "Siliana":    {"flood":"Low",      "heat":"Medium",   "earthquake":"Low",   "drought":"Low"},
    "Le Kef":     {"flood":"High",     "heat":"Low",      "earthquake":"Low",   "drought":"Low"},
    "Hammamet":   {"flood":"Low",      "heat":"Medium",   "earthquake":"Low",   "drought":"Low"},
}

# Climate variables per city for detailed view
CITY_CLIMATE_VARS = {
    "Tunis":       {"avg_temp":18.1,"max_summer":38,"rain_mm":521,"hot_days":77},
    "Sfax":        {"avg_temp":19.7,"max_summer":40,"rain_mm":298,"hot_days":74},
    "Sousse":      {"avg_temp":19.2,"max_summer":39,"rain_mm":310,"hot_days":72},
    "Kairouan":    {"avg_temp":20.0,"max_summer":44,"rain_mm":280,"hot_days":95},
    "Bizerte":     {"avg_temp":18.2,"max_summer":34,"rain_mm":590,"hot_days":45},
    "Gabès":       {"avg_temp":21.5,"max_summer":44,"rain_mm":182,"hot_days":125},
    "Ariana":      {"avg_temp":18.3,"max_summer":38,"rain_mm":510,"hot_days":75},
    "Gafsa":       {"avg_temp":21.8,"max_summer":47,"rain_mm":178,"hot_days":130},
    "Monastir":    {"avg_temp":19.0,"max_summer":39,"rain_mm":300,"hot_days":70},
    "Nabeul":      {"avg_temp":18.8,"max_summer":36,"rain_mm":430,"hot_days":60},
    "Béja":        {"avg_temp":17.5,"max_summer":36,"rain_mm":610,"hot_days":50},
    "Jendouba":    {"avg_temp":18.2,"max_summer":37,"rain_mm":640,"hot_days":55},
    "Tozeur":      {"avg_temp":22.5,"max_summer":48,"rain_mm":82, "hot_days":142},
    "Médenine":    {"avg_temp":21.8,"max_summer":46,"rain_mm":175,"hot_days":128},
    "Tataouine":   {"avg_temp":22.0,"max_summer":47,"rain_mm":140,"hot_days":135},
    "Kasserine":   {"avg_temp":17.8,"max_summer":42,"rain_mm":265,"hot_days":98},
    "Sidi Bouzid": {"avg_temp":20.5,"max_summer":45,"rain_mm":230,"hot_days":110},
    "Mahdia":      {"avg_temp":19.2,"max_summer":39,"rain_mm":295,"hot_days":68},
    "Zaghouan":    {"avg_temp":16.5,"max_summer":37,"rain_mm":450,"hot_days":58},
    "Kebili":      {"avg_temp":23.0,"max_summer":48,"rain_mm":90, "hot_days":145},
    "Ben Arous":   {"avg_temp":18.5,"max_summer":38,"rain_mm":490,"hot_days":76},
    "Siliana":     {"avg_temp":16.8,"max_summer":37,"rain_mm":480,"hot_days":55},
    "Le Kef":      {"avg_temp":16.0,"max_summer":36,"rain_mm":550,"hot_days":50},
    "Hammamet":    {"avg_temp":18.9,"max_summer":35,"rain_mm":410,"hot_days":58},
}

REGION_CLIMATE = {
    "North":       {"temp_base":18,"temp_summer":35,"rain":550,"humidity":65},
    "North-East":  {"temp_base":19,"temp_summer":34,"rain":430,"humidity":68},
    "North-West":  {"temp_base":17,"temp_summer":36,"rain":620,"humidity":62},
    "Center":      {"temp_base":20,"temp_summer":42,"rain":260,"humidity":45},
    "Center-East": {"temp_base":20,"temp_summer":40,"rain":300,"humidity":55},
    "Center-West": {"temp_base":19,"temp_summer":41,"rain":250,"humidity":42},
    "South":       {"temp_base":22,"temp_summer":45,"rain":90, "humidity":30},
    "South-East":  {"temp_base":23,"temp_summer":45,"rain":110,"humidity":35},
    "South-West":  {"temp_base":24,"temp_summer":46,"rain":70, "humidity":25},
}

RISK_NUM   = {"Low":1,"Medium":3,"Moderate":3,"High":7,"Very High":10}
RISK_ORDER = {"Low":1,"Moderate":2,"Medium":2,"High":3,"Very High":4,"Any":99}
RISK_COLOR = {"Low":"#2d7a3e","Medium":"#c47a18","Moderate":"#c47a18","High":"#c85020","Very High":"#9e1e1e"}

WEATHER_CODES = {
    0:"Clear Sky",1:"Mainly Clear",2:"Partly Cloudy",3:"Overcast",
    45:"Foggy",51:"Light Drizzle",53:"Drizzle",61:"Slight Rain",
    63:"Rain",65:"Heavy Rain",80:"Rain Showers",95:"Thunderstorm",
}

# ════════════════════════════════════════════════════════
# CITY GROUPINGS
# ════════════════════════════════════════════════════════
GRAND_TUNIS = {
    "Tunis","Ariana","Ben Arous","La Manouba","Grand Tunis","La Marsa","La Soukra",
    "L Aouina","Jardins De Carthage","Cit Ennasr 2","Ennasr","Le Bardo","Ezzouhour",
    "Lac 1","Lac 2","Ain Zaghouen","Ain Zaghouan Nord","Ain Zaghouan Sud","Medina Jedida",
    "El Menzah","El Menzah 1","El Menzah 4","El Menzah 5","El Menzah 6","El Menzah 7",
    "El Menzah 8","El Menzah 9","Jardins El Menzah","Les Jardins El Menzah 1",
    "Les Jardins El Menzah 2","Centre Ville Lafayette","Mutuelleville","El Omrane",
    "El Omrane Suprieur","El Ouardia","Bab Bhar","Bab Souika","Sidi El Bchir",
    "El Manar 1","El Manar 2","Chotrana","Chotrana 1","Chotrana 2","Chotrana 3",
    "Ghazela","Raoued","Mnihla","Denden","Mornaguia","Borj Louzir","Charguia 2",
    "Centre Urbain Nord","Cit El Khadra","Cit Jardin","Cit Olympique","Cit Hedi Nouira",
    "Nouvelle Ariana","Ariana Essoughra","Ariana Ville","Route Sokra","Route Soukra",
    "Ksar Said","Sidi Daoud","Carthage","Gammarth","Sidi Bou Said","La Goulette",
    "Le Kram","Boumhel","Boumhel Bassatine","Hammam Lif","Hammam Chott","Borj Cedria",
    "Ezzahra","Rades","Rads","Fouchana","Mornag","El Mourouj","El Mourouj 1",
    "El Mourouj 3","El Mourouj 4","El Mourouj 5","El Mourouj 6","Mohamadia","Mohamedia",
    "Monfleury","Ettahrir","Manouba Ville","Douar Hicher","Djedeida","Mezzraya",
    "Nouvelle Medina","Hraria","Khaznadar","Route De Laroport","Route Tunis","Dar Fadhal",
    "Manar","Agba","Ksar Hellal","Borj Louzir","Cite Ennkhilet","Cite Hedi Nouira",
}

REGION_GROUPS = {
    "Grand Tunis":   GRAND_TUNIS,
    "Grand Sousse":  {"Sousse","Hammam Sousse","Sahloul","Akouda","Kala Kebira","Khzema",
                      "Sousse Corniche","Sousse Jawhara","Sousse Jaouhara","Sousse Mdina",
                      "Sousse Riadh","Sousse Ville","Kantaoui","Chatt Mariem","Hergla"},
    "Grand Sfax":    {"Sfax","Sfax Mdina","Sfax Ville","Thyna","Route Gremda",
                      "Route Manzel Chaker","Route Mharza","Route El Afrane","Sakiet Ezzit","Mgrine"},
    "Cap Bon":       {"Nabeul","Hammamet","Hammamet Centre","Yasmine Hammamet","Klibia",
                      "Kelibia","Kélibia","Mrezga","Grombalia","Soliman","Menzel Jemil",
                      "Kef Est","Ras Jebel","Hammam Ghezze"},
    "Monastir-Mahdia":{"Monastir","Mahdia","Moknine","Kala Kebira"},
    "Nord-Ouest":    {"Béja","Jendouba","Siliana","Le Kef","Kef Est"},
    "Centre":        {"Kairouan","Kairouan Ville","Sidi Bouzid","Kasserine"},
    "Sud":           {"Gabès","Gafsa","Tozeur","Médenine","Tataouine","Kebili","Kébili",
                      "Djerba","Djerba Midoun","Mdenine Sud","Mdina","Zarzis"},
    "Bizerte":       {"Bizerte","Bizerte Nord","Ras Jebel","Menzel Jemil","Ghar El Melh"},
    "Zaghouan":      {"Zaghouan","Ain Zaghouen","Ain Zaghouan Nord","Ain Zaghouan Sud"},
}

def resolve_cities(city_filter, accept_other):
    if not city_filter or city_filter == "Any": return None
    if city_filter in REGION_GROUPS: return REGION_GROUPS[city_filter]
    if accept_other == "Yes":
        for grp, cities in REGION_GROUPS.items():
            if city_filter in cities: return cities
    return {city_filter}

# ════════════════════════════════════════════════════════
# LOAD DATA
# ════════════════════════════════════════════════════════
def load_listings():
    df = pd.read_csv(BASE / "final_listings_wrangled.csv")
    df['price_tnd'] = pd.to_numeric(df['price_tnd'], errors='coerce')
    df = df[(df['price_tnd'] >= 10_000) & (df['price_tnd'] <= 5_000_000)].copy()
    df = df[df['transaction_type'].isin(['sale']) | df['transaction_type'].isna()].copy()

    for col in ['surface_m2','rooms','bedrooms','bathrooms']:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    TYPE_MAP = {'Appartement':'Apartment','Maison':'House','Terrain':'Land','Villa':'House'}
    df['property_type'] = df['property_type'].map(
        lambda x: TYPE_MAP.get(x, str(x)) if pd.notna(x) else 'Unknown'
    )
    df['city'] = df['city'].str.strip().str.title().fillna('Unknown')
    df['governorate'] = df['governorate'].fillna(df['city'])

    # Amenity detection
    text = (df['title'].fillna('') + ' ' + df['description'].fillna('')).str.lower()
    df['has_parking']  = text.str.contains(r'parking|garage', regex=True).astype(int)
    df['has_elevator'] = text.str.contains(r'ascenseur|elevator', regex=True).astype(int)
    df['has_pool']     = text.str.contains(r'piscine|pool', regex=True).astype(int)
    df['has_garden']   = text.str.contains(r'jardin|garden', regex=True).astype(int)
    df['has_security'] = text.str.contains(r'gardé|gardien|sécurité|securite', regex=True).astype(int)
    df['has_fiber']    = text.str.contains(r'fibre|fiber|adsl', regex=True).astype(int)
    df['has_sea_view'] = text.str.contains(r'vue mer|sea view|vue sur la mer', regex=True).astype(int)
    df['furnished']    = text.str.contains(r'meublé|furnished|meuble', regex=True).astype(int)

    # Load real photos from listing_images.csv
    try:
        imgs = pd.read_csv(BASE / "listing_images.csv")
        img_map = imgs.groupby('listing_url')['image_url'].apply(list).to_dict()
        df['images'] = [img_map.get(u, []) if pd.notna(u) else [] for u in df['listing_url']]
        df['has_images'] = [len(imgs) > 0 for imgs in df['images']]
        df['primary_image'] = [imgs[0] if imgs else '' for imgs in df['images']]
        print(f"  ✅ Photos loaded: {df['has_images'].sum()} listings with images")
    except Exception as e:
        print(f"  Images not loaded: {e}")
        df['images']        = [[] for _ in range(len(df))]
        df['has_images']    = False
        df['primary_image'] = ''

    # Region grouping
    def get_region_group(city):
        for grp, cities in REGION_GROUPS.items():
            if city in cities: return grp
        return city
    df['region_group'] = df['city'].map(get_region_group)

    # Climate enrichment with correct risk levels
    def get_climate_info(city):
        city_lo = city.lower()
        # Direct match
        for k, v in CITY_RISK.items():
            if k.lower() == city_lo:
                return _compute_risk(v), v
        # Grand Tunis suburbs → Tunis
        if city in GRAND_TUNIS:
            v = CITY_RISK['Tunis']
            return _compute_risk(v), v
        # Sousse suburbs
        if city in REGION_GROUPS.get('Grand Sousse',set()):
            v = CITY_RISK['Sousse']
            return _compute_risk(v), v
        # Sfax suburbs
        if city in REGION_GROUPS.get('Grand Sfax',set()):
            v = CITY_RISK['Sfax']
            return _compute_risk(v), v
        # Nabeul/Cap Bon
        if city in REGION_GROUPS.get('Cap Bon',set()):
            v = CITY_RISK['Nabeul']
            return _compute_risk(v), v
        # Partial match
        for k, v in CITY_RISK.items():
            if k.lower() in city_lo or city_lo in k.lower():
                return _compute_risk(v), v
        return ('Moderate', 3.9), {"flood":"Medium","heat":"High","earthquake":"Low","drought":"Medium"}

    def _compute_risk(r):
        score = round(RISK_NUM.get(r['flood'],3)*0.3 + RISK_NUM.get(r['heat'],3)*0.3 +
                      RISK_NUM.get(r['drought'],3)*0.25 + RISK_NUM.get(r['earthquake'],1)*0.15, 1)
        cat = 'Low' if score<=3 else 'Moderate' if score<=5 else 'High' if score<=7.5 else 'Very High'
        return cat, score

    climate_info = df['city'].map(get_climate_info)
    df['climate_risk_category'] = climate_info.map(lambda x: x[0][0] if pd.notna(x) else 'Moderate')
    df['climate_score']         = climate_info.map(lambda x: x[0][1] if pd.notna(x) else 3.9)
    df['flood_risk']            = climate_info.map(lambda x: x[1].get('flood','Medium') if pd.notna(x) else 'Medium')
    df['heat_risk']             = climate_info.map(lambda x: x[1].get('heat','High') if pd.notna(x) else 'High')

    SOURCE_TRUST = {'Tecnocasa':1.0,'Mubawab':0.9,'Property Prices In Tunisia':0.8,'Tayara':0.7,'Bigdatis':0.6}
    df['source_trust_val'] = df['source'].map(SOURCE_TRUST).fillna(0.65)

    # Affordability score (price per m² vs city average)
    city_avg_price_m2 = df[df['surface_m2']>0].groupby('city').apply(
        lambda x: (x['price_tnd'] / x['surface_m2']).mean()
    ).to_dict()
    df['price_per_m2'] = df.apply(
        lambda r: r['price_tnd']/r['surface_m2'] if r['surface_m2']>0 else np.nan, axis=1
    )
    df['city_avg_m2'] = df['city'].map(city_avg_price_m2)
    df['affordability_score'] = df.apply(
        lambda r: round(max(0, 100 - (r['price_per_m2'] / max(r['city_avg_m2'],1)) * 50), 1)
        if pd.notna(r['price_per_m2']) and pd.notna(r['city_avg_m2']) else 50.0, axis=1
    )

    df['listing_id'] = df['record_id']
    return df.reset_index(drop=True)

PROPS = load_listings()
print(f"✅ Loaded {len(PROPS)} listings | Images: {PROPS['has_images'].sum()} with photos")
print(f"   Risk distribution: {PROPS['climate_risk_category'].value_counts().to_dict()}")

# ════════════════════════════════════════════════════════
# CLIMATE ENGINE
# ════════════════════════════════════════════════════════
def fetch_weather(city):
    info = CITIES.get(city)
    if not info: return simulate_weather(city)
    try:
        r = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude":info['lat'],"longitude":info['lon'],
            "current":"temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code,cloud_cover,surface_pressure",
            "daily":"temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,precipitation_probability_max,uv_index_max",
            "timezone":"Africa/Tunis","forecast_days":7
        }, timeout=8)
        r.raise_for_status()
        d = r.json(); c = d["current"]; dl = d["daily"]
        return {
            "source":"live","lat":info['lat'],"lon":info['lon'],
            "current":{
                "temperature":c["temperature_2m"],"feels_like":c["apparent_temperature"],
                "humidity":c["relative_humidity_2m"],"precipitation":c["precipitation"],
                "wind_speed":c["wind_speed_10m"],"cloud_cover":c["cloud_cover"],
                "pressure":c.get("surface_pressure",1013),
                "condition":WEATHER_CODES.get(c["weather_code"],"Clear Sky"),
                "weather_code":c["weather_code"]
            },
            "forecast_7d":[{"date":dl["time"][i],"temp_max":dl["temperature_2m_max"][i],
                "temp_min":dl["temperature_2m_min"][i],"precip":dl["precipitation_sum"][i],
                "wind_max":dl["wind_speed_10m_max"][i],
                "rain_prob":(dl.get("precipitation_probability_max") or [0]*7)[i],
                "uv":(dl.get("uv_index_max") or [0]*7)[i]} for i in range(7)]
        }
    except Exception as e:
        return simulate_weather(city)

def fetch_historical(city):
    info = CITIES.get(city)
    if not info: return simulate_historical(city)
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now()-timedelta(days=30)).strftime("%Y-%m-%d")
    try:
        r = requests.get("https://archive-api.open-meteo.com/v1/archive", params={
            "latitude":info['lat'],"longitude":info['lon'],
            "start_date":start,"end_date":end,
            "daily":"temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration",
            "timezone":"Africa/Tunis"
        }, timeout=10)
        r.raise_for_status()
        return {"source":"live","data":r.json()["daily"]}
    except:
        return simulate_historical(city)

def simulate_weather(city):
    info = CITIES.get(city, CITIES["Tunis"])
    rc = REGION_CLIMATE.get(info['region'], REGION_CLIMATE['North'])
    cv = CITY_CLIMATE_VARS.get(city, {"avg_temp":20,"max_summer":38,"rain_mm":300,"hot_days":80})
    m = datetime.now().month
    sf = math.sin((m-1)*math.pi/6)
    bt = cv["avg_temp"] + sf*(cv["max_summer"]-cv["avg_temp"])/2
    temp = round(bt + random.uniform(-2,2),1)
    wcode = random.choices([0,1,2,3,61,80], weights=[30,20,15,10,10,15])[0]
    today = datetime.now()
    return {
        "source":"simulated","lat":info['lat'],"lon":info['lon'],
        "current":{
            "temperature":temp,"feels_like":round(temp-random.uniform(0,3),1),
            "humidity":max(20,min(90,rc["humidity"]+random.randint(-10,10))),
            "precipitation":round(max(0,random.gauss(cv["rain_mm"]/365,1)),1),
            "wind_speed":round(random.uniform(5,30),1),
            "cloud_cover":random.randint(0,80),
            "pressure":round(random.uniform(1005,1025),1),
            "condition":WEATHER_CODES.get(wcode,"Clear Sky"),
            "weather_code":wcode
        },
        "forecast_7d":[{"date":(today+timedelta(days=i)).strftime("%Y-%m-%d"),
            "temp_max":round(bt+random.uniform(3,8),1),
            "temp_min":round(bt-random.uniform(3,7),1),
            "precip":round(max(0,random.gauss(cv["rain_mm"]/365,1.5)),1),
            "wind_max":round(random.uniform(8,40),1),
            "rain_prob":random.randint(0,60) if m in [10,11,12,1,2,3] else random.randint(0,20),
            "uv":round(random.uniform(3,11),1)} for i in range(7)]
    }

def simulate_historical(city):
    info = CITIES.get(city, CITIES["Tunis"])
    rc = REGION_CLIMATE.get(info['region'], REGION_CLIMATE['North'])
    cv = CITY_CLIMATE_VARS.get(city, {"avg_temp":20,"max_summer":38,"rain_mm":300})
    dates,tmax,tmin,precip,evap=[],[],[],[],[]
    for i in range(30,0,-1):
        d = datetime.now()-timedelta(days=i)
        sf = math.sin((d.month-1)*math.pi/6)
        bt = cv["avg_temp"] + sf*(cv["max_summer"]-cv["avg_temp"])/2
        dates.append(d.strftime("%Y-%m-%d"))
        tmax.append(round(bt+random.uniform(2,8),1))
        tmin.append(round(bt-random.uniform(3,7),1))
        precip.append(round(max(0,random.gauss(cv["rain_mm"]/365,1.5)),1))
        evap.append(round(random.uniform(2,8),1))
    return {"source":"simulated","data":{"time":dates,"temperature_2m_max":tmax,
        "temperature_2m_min":tmin,"precipitation_sum":precip,"et0_fao_evapotranspiration":evap}}

def compute_heat_index(T, RH):
    if T >= 27:
        hi = (-42.379+2.049*T+10.143*RH-0.225*T*RH-0.00684*T**2
              -0.0548*RH**2+0.00123*T**2*RH+0.000853*T*RH**2-0.00000199*T**2*RH**2)
    else:
        hi = 0.5*(T+61+(T-68)*1.2+RH*0.094)
    lvl = "Extreme" if hi>54 else "Danger" if hi>41 else "Caution" if hi>32 else "Safe"
    return round(hi,1), lvl

def compute_flood_index(weather, flood_level):
    base = RISK_NUM.get(flood_level,3)/10
    precip = weather["current"].get("precipitation",0)
    idx = round(base*0.6 + min(precip/20,1)*0.4, 3)
    lvl = "Critical" if idx>0.75 else "High" if idx>0.5 else "Moderate" if idx>0.25 else "Low"
    return idx, lvl

def compute_drought_spi(hist, city):
    data = hist.get("data",{})
    precip = data.get("precipitation_sum",[])
    evap = data.get("et0_fao_evapotranspiration",[])
    if not precip: return 0.0,"Unknown",0
    cv = CITY_CLIMATE_VARS.get(city, {"rain_mm":300})
    expected = cv["rain_mm"]/365*len(precip)
    total = sum(precip)
    sigma = max(expected*0.3, 1)
    spi = round(float(np.clip((total-expected)/sigma,-3,3)),3)
    lvl = "Extreme Drought" if spi<=-2 else "Moderate Drought" if spi<=-1 else "Mildly Dry" if spi<0 else "Normal" if spi<=1 else "Wet"
    return spi, lvl, round(total,1)

def compute_risk_score(city):
    r = CITY_RISK.get(city, {"flood":"Medium","heat":"High","earthquake":"Low","drought":"Medium"})
    score = round(RISK_NUM.get(r['flood'],3)*0.3+RISK_NUM.get(r['heat'],3)*0.3+
                  RISK_NUM.get(r['drought'],3)*0.25+RISK_NUM.get(r['earthquake'],1)*0.15, 2)
    cat = "Low" if score<=3 else "Moderate" if score<=5 else "High" if score<=7.5 else "Very High"
    return score, cat

def compute_sustainability(city):
    info = CITIES.get(city, {})
    cv = CITY_CLIMATE_VARS.get(city, {"rain_mm":300,"hot_days":80})
    rs, _ = compute_risk_score(city)
    r = CITY_RISK.get(city,{})
    stability = (10-rs)/10
    water = min(cv["rain_mm"]/600, 1)
    thermal = max(0, 1-cv["hot_days"]/150)
    sea_pen = {"High":0.4,"Medium":0.65,"Low":0.9}.get(r.get('flood','Medium'), 0.7)
    coastal = sea_pen if info.get('coastal',False) else 0.85
    raw = stability*0.40 + water*0.25 + thermal*0.20 + coastal*0.15
    score = round(raw*100, 1)
    grade = "A" if score>=75 else "B" if score>=60 else "C" if score>=45 else "D" if score>=30 else "F"
    return score, grade

# ════════════════════════════════════════════════════════
# MATCH ENGINE
# ════════════════════════════════════════════════════════
WEIGHTS = {"price_fit":0.28,"area_fit":0.12,"location_fit":0.20,"climate_fit":0.14,
           "rooms_fit":0.10,"amenity_fit":0.10,"source_trust":0.04,"afford_fit":0.02}
NUM_COLS = ["price_tnd","surface_m2","rooms","bedrooms","bathrooms","climate_score","affordability_score"]
BIN_COLS = ["has_parking","has_elevator","has_pool","has_garden","has_security","has_fiber","has_sea_view"]

def hard_filter(user):
    df = PROPS.copy()
    ptype = str(user.get("preferred_property_type","Any")).strip()
    if ptype not in ("Any",""): df = df[df["property_type"]==ptype]
    bmin = float(user.get("budget_min_tnd") or 0)
    bmax = float(user.get("budget_max_tnd") or 0)
    if bmax <= 0: bmax = 9_999_999
    df = df[(df["price_tnd"]>=bmin)&(df["price_tnd"]<=bmax)]
    city_filter = str(user.get("preferred_city","Any")).strip()
    accept_other = str(user.get("accept_other_cities","No"))
    allowed = resolve_cities(city_filter, accept_other)
    if allowed is not None: df = df[df["city"].isin(allowed)]
    amin = float(user.get("min_area_sqm") or 0)
    amax = float(user.get("max_area_sqm") or 0)
    if amin>0: df = df[(df["surface_m2"]==0)|(df["surface_m2"]>=amin)]
    if amax>0: df = df[(df["surface_m2"]==0)|(df["surface_m2"]<=amax)]
    min_r = float(user.get("min_rooms") or 0)
    max_r = float(user.get("max_rooms") or 0)
    if ptype!="Land":
        if min_r>0: df = df[(df["rooms"]==0)|(df["rooms"]>=min_r)]
        if max_r>0: df = df[(df["rooms"]==0)|(df["rooms"]<=max_r)]
    clim = str(user.get("acceptable_climate_risk","Any")).strip()
    if clim not in ("Any",""):
        tol = RISK_ORDER.get(clim,99)
        df = df[df["climate_risk_category"].map(lambda x: RISK_ORDER.get(str(x).strip(),99))<=tol]
    return df.reset_index(drop=True)

def score_props(df, user):
    if df.empty: return df
    s = pd.DataFrame(index=df.index)
    pt = str(user.get("preferred_property_type","Any"))
    bmin = float(user.get("budget_min_tnd") or 0)
    bmax = float(user.get("budget_max_tnd") or bmin*2 or 500000)
    bmid=(bmin+bmax)/2; brange=max(bmax-bmin,1)
    s["price_fit"] = 1-(abs(df["price_tnd"]-bmid)/brange).clip(0,1)
    amin=float(user.get("min_area_sqm") or 0); amax=float(user.get("max_area_sqm") or 0)
    amid=(amin+amax)/2 if amax>0 else max(amin*1.5,100)
    s["area_fit"] = 1-(abs(df["surface_m2"].replace(0,amid)-amid)/max(amax-amin,amid,1)).clip(0,1)
    city_filter=str(user.get("preferred_city","Any")).strip()
    allowed=resolve_cities(city_filter,"Yes")
    if allowed:
        exact = df["city"].isin({city_filter}).astype(float) if city_filter not in REGION_GROUPS else pd.Series(0.0,index=df.index)
        group = df["city"].isin(allowed).astype(float)*0.7
        s["location_fit"] = (exact + group*(1-exact)).clip(0,1)
    else: s["location_fit"]=1.0
    user_tol=RISK_ORDER.get(str(user.get("acceptable_climate_risk","Any")),99)
    prop_risk=df["climate_risk_category"].map(lambda x: RISK_ORDER.get(str(x).strip(),3))
    s["climate_fit"]=(1-((prop_risk-1)/3)).clip(0,1)*(prop_risk<=user_tol).astype(float)
    min_r=float(user.get("min_rooms") or 0); max_r=float(user.get("max_rooms") or 0)
    if pt!="Land" and min_r>0:
        rmid=(min_r+max_r)/2
        s["rooms_fit"]=1-(abs(df["rooms"].replace(0,rmid)-rmid)/max(max_r,1)).clip(0,1)
    else: s["rooms_fit"]=1.0
    hits=pd.Series(0.0,index=df.index); count=0
    for need,col in [("needs_parking","has_parking"),("needs_elevator","has_elevator"),
                      ("needs_pool","has_pool"),("needs_garden","has_garden"),
                      ("needs_security","has_security"),("needs_fiber","has_fiber")]:
        if col in df.columns and str(user.get(need,"No")).lower()=="yes":
            hits+=df[col].astype(float); count+=1
    s["amenity_fit"]=(hits/max(count,1)).clip(0,1)
    s["source_trust"]=df["source_trust_val"].fillna(0.6)
    s["afford_fit"]=(df["affordability_score"]/100).clip(0,1)
    df=df.copy()
    df["match_score"]=round(sum(s[k]*WEIGHTS[k] for k in WEIGHTS)*100, 1)
    return df.sort_values("match_score",ascending=False).reset_index(drop=True)

def cbf(df, user, top_n=15):
    if len(df)<2:
        df=df.copy(); df["cbf_similarity"]=100.0; return df.head(top_n)
    num=df[NUM_COLS].fillna(0).astype(float)
    bin_=df[BIN_COLS].fillna(0).astype(float)
    full=pd.concat([num,bin_],axis=1); cols=list(full.columns)
    matrix=MinMaxScaler().fit_transform(full)
    bmin=float(user.get("budget_min_tnd") or 0); bmax=float(user.get("budget_max_tnd") or bmin*2 or 500000)
    amin=float(user.get("min_area_sqm") or 0); amax=float(user.get("max_area_sqm") or 0)
    uv={"price_tnd":(bmin+bmax)/2,"surface_m2":(amin+amax)/2 if amax>0 else amin,
        "rooms":(float(user.get("min_rooms") or 0)+float(user.get("max_rooms") or 0))/2,
        "bedrooms":0,"bathrooms":0,
        "climate_score":RISK_ORDER.get(str(user.get("acceptable_climate_risk","Moderate")),2),
        "affordability_score":50.0,
        **{c:1 if str(user.get("needs_"+c.replace("has_",""),"No")).lower()=="yes" else 0 for c in BIN_COLS}}
    u_vec=np.array([uv.get(c,0) for c in cols],dtype=float)
    mx=u_vec.max()
    if mx>0: u_vec=u_vec/mx
    sims=cosine_similarity(u_vec.clip(0,1).reshape(1,-1),matrix)[0]
    df=df.copy(); df["cbf_similarity"]=(sims*100).round(1)
    return df.sort_values("cbf_similarity",ascending=False).head(top_n).reset_index(drop=True)

def knn_similar(listing_id, k=6):
    if listing_id not in PROPS["listing_id"].values: return []
    num=PROPS[NUM_COLS].fillna(0).astype(float)
    bin_=PROPS[BIN_COLS].fillna(0).astype(float)
    matrix=MinMaxScaler().fit_transform(pd.concat([num,bin_],axis=1))
    idx=PROPS[PROPS["listing_id"]==listing_id].index[0]
    knn_=NearestNeighbors(n_neighbors=min(k+1,len(PROPS)),metric="euclidean")
    knn_.fit(matrix)
    dists,idxs=knn_.kneighbors(matrix[idx].reshape(1,-1))
    sim_idx=[i for i in idxs[0] if i!=idx][:k]
    out=PROPS.iloc[sim_idx].copy()
    out["knn_distance"]=dists[0][1:k+1].round(4)
    return _clean_listing(out.fillna("").to_dict(orient="records"))

def _clean_listing(records):
    """Remove source URLs, keep only useful fields."""
    skip = {'source_file','description','location_raw','scraped_at','posted_at',
            'currency','record_id','images','has_images',
            'image_url','image_count','listing_url'}
    cleaned = []
    for r in records:
        c = {k:v for k,v in r.items() if k not in skip}
        cleaned.append(c)
    return cleaned

def recommend(user, top_n=15):
    filtered=hard_filter(user); n=len(filtered)
    if filtered.empty: return [],0,0
    scored=score_props(filtered,user).head(80)
    result=cbf(scored,user,top_n=top_n)
    if "match_score" not in result.columns:
        result=result.merge(scored[["listing_id","match_score"]],on="listing_id",how="left")
    result=result.copy()
    result["final_score"]=(result["match_score"].fillna(0)*0.60+result["cbf_similarity"].fillna(0)*0.40).round(1).clip(0,100)
    result=result.sort_values("final_score",ascending=False).head(top_n).reset_index(drop=True)
    result["rank"]=result.index+1
    recs=_clean_listing(result.fillna("").to_dict(orient="records"))
    return recs, n, float(result["final_score"].max()) if not result.empty else 0

# ════════════════════════════════════════════════════════
# ROUTES — SERVE
# ════════════════════════════════════════════════════════
@app.route("/")
def index():
    return render_template("index.html")

# ════════════════════════════════════════════════════════
# ROUTES — CLIMATE
# ════════════════════════════════════════════════════════
@app.route("/api/climate/cities")
def api_cities():
    result = []
    for city, info in CITIES.items():
        rs, cat = compute_risk_score(city)
        ss, grade = compute_sustainability(city)
        r = CITY_RISK.get(city,{})
        cv = CITY_CLIMATE_VARS.get(city,{})
        result.append({
            "city":city,"region":info["region"],"coastal":info["coastal"],
            "lat":info["lat"],"lon":info["lon"],
            "flood":r.get("flood","Medium"),"heat":r.get("heat","High"),
            "earthquake":r.get("earthquake","Low"),"drought":r.get("drought","Medium"),
            "risk_score":rs,"risk_category":cat,"risk_color":RISK_COLOR.get(cat,"#8c7e70"),
            "sustainability_score":ss,"grade":grade,
            "avg_temp":cv.get("avg_temp",20),"hot_days":cv.get("hot_days",80),
            "rain_mm":cv.get("rain_mm",300),
        })
    return jsonify(result)

@app.route("/api/climate/weather/<city>")
def api_weather(city):
    if city not in CITIES:
        return jsonify({"error":"City not found"}), 404
    info = CITIES[city]; r = CITY_RISK.get(city,{})
    w = fetch_weather(city); hist = fetch_historical(city)
    rs, rcat = compute_risk_score(city); ss, grade = compute_sustainability(city)
    T=w["current"]["temperature"]; RH=w["current"]["humidity"]
    hi_val,hi_lvl = compute_heat_index(T,RH)
    fi_val,fi_lvl = compute_flood_index(w, r.get("flood","Medium"))
    spi,spi_lvl,total_p = compute_drought_spi(hist, city)
    cv = CITY_CLIMATE_VARS.get(city,{})
    data = hist.get("data",{})
    return jsonify({
        "city":city,"region":info["region"],"lat":info["lat"],"lon":info["lon"],
        "weather":w,"risks":r,"risk_score":rs,"risk_category":rcat,
        "risk_color":RISK_COLOR.get(rcat,"#8c7e70"),
        "sustainability_score":ss,"sustainability_grade":grade,
        "flood_index":{"index":fi_val,"level":fi_lvl,"precip":w["current"]["precipitation"]},
        "heat_index":{"value":hi_val,"level":hi_lvl,"temp":T,"humidity":RH},
        "drought_spi":{"spi":spi,"level":spi_lvl,"total_precip_mm":total_p},
        "climate_vars":cv,
        "historical":{
            "dates":data.get("time",[]),
            "tmax":data.get("temperature_2m_max",[]),
            "tmin":data.get("temperature_2m_min",[]),
            "precip":data.get("precipitation_sum",[]),
        },
        "source":w["source"]
    })

@app.route("/api/climate/compare")
def api_compare():
    names = request.args.get("cities","Tunis,Sfax,Sousse,Kairouan,Bizerte,Tozeur,Jendouba,Gabès,Monastir,Mahdia,Ariana,Ben Arous,Nabeul,Le Kef,Gafsa,Médenine").split(",")
    result = []
    for city in names:
        city=city.strip()
        if city not in CITIES: continue
        w=fetch_weather(city); r=CITY_RISK.get(city,{})
        rs,rcat=compute_risk_score(city); ss,grade=compute_sustainability(city)
        cv=CITY_CLIMATE_VARS.get(city,{})
        result.append({
            "city":city,"region":CITIES[city]["region"],
            "temp":w["current"]["temperature"],"humidity":w["current"]["humidity"],
            "wind":w["current"]["wind_speed"],"condition":w["current"]["condition"],
            "flood":r.get("flood","Medium"),"heat":r.get("heat","High"),
            "earthquake":r.get("earthquake","Low"),"drought":r.get("drought","Medium"),
            "risk_score":rs,"risk_category":rcat,"sustainability_score":ss,"grade":grade,
            "hot_days":cv.get("hot_days",80),"rain_mm":cv.get("rain_mm",300),
            "source":w["source"]
        })
    return jsonify(result)

@app.route("/api/climate/dashboard")
def api_climate_dashboard():
    all_data=[]
    for city,info in CITIES.items():
        rs,rcat=compute_risk_score(city); ss,grade=compute_sustainability(city)
        r=CITY_RISK.get(city,{}); cv=CITY_CLIMATE_VARS.get(city,{})
        all_data.append({"city":city,"region":info["region"],"coastal":info["coastal"],
                         "risk_score":rs,"risk_category":rcat,"sustainability":ss,"grade":grade,
                         "flood":r.get("flood","Medium"),"heat":r.get("heat","High"),
                         "earthquake":r.get("earthquake","Low"),"drought":r.get("drought","Medium"),
                         "hot_days":cv.get("hot_days",80),"rain_mm":cv.get("rain_mm",300),
                         "avg_temp":cv.get("avg_temp",20)})
    return jsonify({"cities":all_data,"total":len(all_data)})

# ════════════════════════════════════════════════════════
# ROUTES — MATCH
# ════════════════════════════════════════════════════════
@app.route("/api/match/config")
def api_match_config():
    cities_vc = PROPS['city'].value_counts().reset_index()
    cities_vc.columns=['city','count']
    return jsonify({
        "cities": cities_vc.head(60).to_dict(orient='records'),
        "regions": list(REGION_GROUPS.keys()),
        "property_types": sorted(PROPS['property_type'].dropna().unique().tolist()),
        "climate_risks": ["Low","Moderate","High","Very High"],
        "price_range":{"min":int(PROPS.price_tnd.min()),"max":int(PROPS.price_tnd.max())},
        "listings_with_images": int(PROPS['has_images'].sum()),
        "total": len(PROPS),
    })

@app.route("/api/match/price_hint")
def api_price_hint():
    city=request.args.get("city",""); ptype=request.args.get("type","")
    df=PROPS.copy()
    if city and city!="Any":
        allowed=resolve_cities(city,"Yes") or {city}
        df=df[df["city"].isin(allowed)]
    if ptype and ptype!="Any": df=df[df["property_type"]==ptype]
    if df.empty: return jsonify({"min":0,"max":0,"mean":0,"count":0,"median":0})
    return jsonify({"min":int(df.price_tnd.min()),"max":int(df.price_tnd.max()),
                    "mean":int(df.price_tnd.mean()),"median":int(df.price_tnd.median()),
                    "count":int(len(df)),"with_images":int(df['has_images'].sum())})

@app.route("/api/match/recommend", methods=["POST"])
def api_recommend():
    user = request.get_json()
    recs, n_filtered, top_score = recommend(user, top_n=15)
    return jsonify({"recommendations":recs,"n_filtered":n_filtered,
                    "top_score":top_score,"total":len(PROPS)})

@app.route("/api/match/listing/<listing_id>")
def api_listing(listing_id):
    row = PROPS[PROPS["listing_id"]==listing_id]
    if row.empty: return jsonify({"error":"Not found"}), 404
    p = row.iloc[0].fillna("").to_dict()
    # Clean for display - remove source URLs
    for k in ['source_file','description','location_raw','scraped_at','posted_at','currency','record_id']:
        p.pop(k,None)
    return jsonify({"property":p,"similar":knn_similar(listing_id,6)})

@app.route("/api/match/stats")
def api_match_stats():
    bins=[0,100000,200000,400000,600000,float('inf')]
    labels=["<100K","100-200K","200-400K","400-600K",">600K"]
    price_dist={"labels":labels,"values":[
        int(((PROPS.price_tnd>=bins[i])&(PROPS.price_tnd<bins[i+1])).sum()) for i in range(len(labels))]}
    top_cities=PROPS.groupby("city").agg(count=("listing_id","count"),mean_price=("price_tnd","mean")).round(0)
    top_cities=top_cities.sort_values("count",ascending=False).head(15).reset_index()
    region_stats=PROPS.groupby("region_group").agg(count=("listing_id","count"),mean_price=("price_tnd","mean")).round(0).reset_index()
    return jsonify({
        "total":len(PROPS),"with_images":int(PROPS['has_images'].sum()),
        "by_type":PROPS["property_type"].value_counts().to_dict(),
        "by_risk":PROPS["climate_risk_category"].value_counts().to_dict(),
        "by_source":PROPS["source"].value_counts().to_dict(),
        "by_region":PROPS["region_group"].value_counts().head(12).to_dict(),
        "price_distribution":price_dist,
        "top_cities":top_cities.to_dict(orient="records"),
        "region_stats":region_stats.to_dict(orient="records"),
        "price_stats":{"min":int(PROPS.price_tnd.min()),"max":int(PROPS.price_tnd.max()),
                       "mean":int(PROPS.price_tnd.mean()),"median":int(PROPS.price_tnd.median())}
    })

@app.route("/api/match/search_similar", methods=["POST"])
def api_search_similar():
    """Find listings similar to a reference property."""
    listing_id = request.json.get("listing_id")
    similar = knn_similar(listing_id, k=12)
    return jsonify({"similar": similar})


@app.route("/api/climate/regional_heatmap")
def api_regional_heatmap():
    """Regional Heatmap — real-time forecasting + historical analysis.
    Combined risk = historical(70%) + realtime(30%)"""
    realtime = {}
    for city, info in CITIES.items():
        w = fetch_weather(city)
        realtime[city] = w["current"]
    region_map = {}
    for city, info in CITIES.items():
        region = info["region"]
        if region not in region_map: region_map[region] = []
        rs, rcat = compute_risk_score(city); ss, grade = compute_sustainability(city)
        r = CITY_RISK.get(city, {}); rt = realtime.get(city, {})
        precip_now = rt.get("precipitation", 0); temp_now = rt.get("temperature", 25)
        cv = CITY_CLIMATE_VARS.get(city, {"avg_temp": 20})
        rt_fb = min(precip_now/15.0, 0.3); rt_hb = max(0, (temp_now-cv.get("avg_temp",20)-5)/20)
        combined = round((rs/10*0.70+(rt_fb*0.5+rt_hb*0.5)*0.30)*10, 2)
        ccat = "Very High" if combined>=7.5 else "High" if combined>=5 else "Moderate" if combined>=2.5 else "Low"
        region_map[region].append({"city":city,"lat":info["lat"],"lon":info["lon"],"coastal":info["coastal"],
            "historical_risk_score":rs,"historical_risk_cat":rcat,
            "realtime_temp":temp_now,"realtime_precip":precip_now,"realtime_humidity":rt.get("humidity",50),
            "realtime_flood_boost":round(rt_fb,3),"realtime_heat_boost":round(rt_hb,3),
            "combined_risk_score":combined,"combined_risk_cat":ccat,
            "sustainability_score":ss,"sustainability_grade":grade,
            "flood_risk":r.get("flood","Medium"),"heat_risk":r.get("heat","High"),"drought_risk":r.get("drought","Medium")})
    regions_out = {}
    for region, cdata in region_map.items():
        avg_hist=round(sum(c["historical_risk_score"] for c in cdata)/len(cdata),2)
        avg_comb=round(sum(c["combined_risk_score"] for c in cdata)/len(cdata),2)
        avg_sust=round(sum(c["sustainability_score"] for c in cdata)/len(cdata),1)
        avg_temp=round(sum(c["realtime_temp"] for c in cdata)/len(cdata),1)
        max_prec=round(max(c["realtime_precip"] for c in cdata),1)
        rcat="Very High" if avg_comb>=7.5 else "High" if avg_comb>=5 else "Moderate" if avg_comb>=2.5 else "Low"
        regions_out[region]={"cities":cdata,"n_cities":len(cdata),"avg_historical_risk":avg_hist,
            "avg_combined_risk":avg_comb,"avg_sustainability":avg_sust,"avg_realtime_temp":avg_temp,
            "max_realtime_precip":max_prec,"region_risk_category":rcat}
    return jsonify({"timestamp":datetime.now().isoformat(),"methodology":"Combined risk = historical×0.70 + realtime×0.30",
        "regions":regions_out,"n_regions":len(regions_out),"n_cities":len(CITIES)})

if __name__=="__main__":
    print(f"\n{'═'*55}\n  🏠  TUNISIA PLATFORM v4 — Fixed & Improved\n  📊  {len(PROPS)} listings | {PROPS['has_images'].sum()} with photos\n  🌡️  {len(CITIES)} climate cities\n  🌐  http://localhost:5000\n{'═'*55}\n")
    app.run(debug=True, port=5000)
