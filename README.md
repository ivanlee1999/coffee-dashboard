# ☕ Coffee Dashboard

A pour-over coffee brew tracker with flow curve visualization and rule-based brew analysis.

**Features:**
- Upload `.xlsx` brew curve exports from your scale
- Visualize flow rate + weight over time with pour phases highlighted
- Rule-based analysis: flags bloom too fast, insufficient rest between pours, yield deviation
- Grinder suggestions based on taste feedback (bitter/sour/flat/etc.)
- SQLite-backed brew history

## Quick Start (Docker Compose)

```bash
git clone https://github.com/ivanlee1999/coffee-dashboard.git
cd coffee-dashboard
docker compose up -d --build
```

- Dashboard: **http://localhost:8092**
- Backend API: **http://localhost:8095**

## Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 8092 | Reverse proxy + frontend |
| backend | 8095 | FastAPI + SQLite |
| frontend | 5173 | React + Vite (internal) |

## Data

Brew data is stored in `./data/brews.db` (SQLite). The `data/` directory is mounted as a volume so it persists across container restarts.

## Scale Export Format

The dashboard accepts `.xlsx` files with these columns:

```
information_type, elapsed, pressure, current_total_shot_weight,
flow_in, flow_out, water_temperature_boiler, water_temperature_in,
water_temperature_basket, metatype, metadata, comment
```

Rows with `information_type = "moment"` are parsed as data points. Metadata rows are ignored.

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, SQLite, openpyxl
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts
- **Proxy:** nginx
