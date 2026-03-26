# Coffee Brew Dashboard

A pour-over coffee brew analysis dashboard built with **FastAPI** + **React** + **Recharts**.

Upload Excel brew-curve exports from your scale, enter taste feedback, and get
rule-based analysis with suggestions for improving your next brew.

## Features

- **Brew Logger** — input bean, grinder, dose, yield, taste tags, and upload `.xlsx` curve export
- **Brew Curve Visualizer** — flow rate, weight accumulation, temperature, with pour phases highlighted
- **Analysis Panel** — summary stats, detected issues, concrete suggestions, grinder guidance, auto-scored
- **Brew History** — persistent SQLite-backed log; click any row to reload its full analysis

## Architecture

```
coffee-dashboard/
  backend/            FastAPI (Python 3.12)
    main.py           App + endpoints
    models.py         SQLAlchemy + SQLite
    parser.py         xlsx parsing, phase detection
    analysis.py       Rule-based analysis engine
  frontend/           React + Vite + Tailwind CSS
    src/
      App.jsx
      components/
        BrewLogger.jsx
        BrewCurveChart.jsx
        AnalysisPanel.jsx
        BrewHistory.jsx
  docker-compose.yml
  nginx.conf
```

## Quick Start (local)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
# API on http://localhost:8095
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI on http://localhost:5173 (proxies /api → :8095)
```

## Docker

```bash
docker compose up --build
# App on http://localhost:8080 (nginx proxies API + frontend)
# Backend direct: http://localhost:8095
# Frontend direct: http://localhost:5173
```

Data is persisted in `./data/brews.db`.

## API Endpoints

| Method | Path              | Description                     |
|--------|-------------------|---------------------------------|
| POST   | `/api/brews`      | Upload brew + xlsx, get analysis|
| GET    | `/api/brews`      | List all brews (summary)        |
| GET    | `/api/brews/{id}` | Full detail for one brew        |
| GET    | `/api/healthz`    | Health check                    |

### POST `/api/brews` (multipart form)

| Field            | Type     | Required |
|------------------|----------|----------|
| `bean_name`      | string   | yes      |
| `roast_level`    | string   | yes      |
| `grinder_brand`  | string   | yes      |
| `grinder_setting`| number   | yes      |
| `dose_weight`    | number   | yes      |
| `target_yield`   | number   | yes      |
| `taste_tags`     | JSON str | no       |
| `taste_notes`    | string   | no       |
| `file`           | .xlsx    | yes      |

### Expected Excel columns

`elapsed`, `pressure`, `current_total_shot_weight`, `flow_in`, `flow_out`,
`water_temperature_boiler`, `water_temperature_in`, `water_temperature_basket`

## Analysis Rules

- Bloom pour avg flow > 3 ml/s → "Bloom too aggressive"
- Rest between pours < 25s → "Insufficient rest"
- Final pour peak flow > main pour peak flow → "Final pour too fast"
- Yield deviation from target > 10% → "Yield off target"
- Bitter → grind coarser; Sour → grind finer
- Flat/Weak → higher dose; Strong → lower dose

Score: starts at 100, deducts 7–12 per issue, clamped 0–100.

## Service Registration

After deployment, register this app in the homelab service directory at
`http://192.168.0.100:8888/services-directory.html`.

This repository does not automate that step.

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, openpyxl
- **Frontend:** React 18, Vite, Tailwind CSS 3, Recharts 2
- **Database:** SQLite
- **Deployment:** Docker Compose + nginx reverse proxy
