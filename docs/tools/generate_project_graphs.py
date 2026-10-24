"""Generate report-ready PNG charts from the local DecoStone SQLite database.

The database is opened read-only. Charts represent the database snapshot at the
time this script runs; no application or database records are changed.
"""

from __future__ import annotations

import math
import sqlite3
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "backend" / "data" / "decostone.db"
OUT_DIR = ROOT / "docs" / "graphs"
SCALE = 2
W, H = 1440, 900
COLORS = {
    "ink": "#17283A",
    "muted": "#64748B",
    "grid": "#E2E8F0",
    "panel": "#FFFFFF",
    "bg": "#F5F7FA",
    "gold": "#D97706",
    "blue": "#2563EB",
    "teal": "#0F9D8A",
    "coral": "#E45858",
    "violet": "#7C5CE7",
    "slate": "#94A3B8",
    "pale": "#FFF7E8",
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = [
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for path in paths:
        if path.exists():
            return ImageFont.truetype(str(path), size * SCALE)
    return ImageFont.load_default()


def db_connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database file not found: {DB_PATH}")
    return sqlite3.connect(f"file:{quote(str(DB_PATH))}?mode=ro", uri=True)


def load_data(conn: sqlite3.Connection) -> dict:
    categories = conn.execute(
        """SELECT c.name, COALESCE(SUM(CASE WHEN g.is_active=1 THEN s.quantity ELSE 0 END),0) qty
           FROM categories c
           LEFT JOIN materials m ON m.category_id=c.id AND m.is_deleted=0
           LEFT JOIN stock s ON s.material_id=m.id
           LEFT JOIN godowns g ON g.id=s.godown_id
           WHERE COALESCE(c.is_deleted,0)=0
           GROUP BY c.id ORDER BY qty DESC, c.name"""
    ).fetchall()
    godowns = conn.execute(
        """SELECT g.name, COALESCE(SUM(CASE WHEN m.is_deleted=0 THEN s.quantity ELSE 0 END),0) qty
           FROM godowns g LEFT JOIN stock s ON s.godown_id=g.id
           LEFT JOIN materials m ON m.id=s.material_id
           WHERE g.is_active=1 GROUP BY g.id ORDER BY g.name"""
    ).fetchall()
    materials = conn.execute(
        """SELECT m.name, m.sku, m.unit, c.name,
                  COALESCE(SUM(CASE WHEN g.is_active=1 THEN s.quantity ELSE 0 END),0) qty
           FROM materials m JOIN categories c ON c.id=m.category_id
           LEFT JOIN stock s ON s.material_id=m.id
           LEFT JOIN godowns g ON g.id=s.godown_id
           WHERE m.is_deleted=0 GROUP BY m.id ORDER BY qty DESC, m.name"""
    ).fetchall()
    transactions = conn.execute(
        """SELECT st.created_at, st.transaction_type, st.quantity, m.unit
           FROM stock_transactions st
           JOIN materials m ON m.id=st.material_id AND m.is_deleted=0
           JOIN godowns g ON g.id=st.godown_id AND g.is_active=1
           ORDER BY st.created_at, st.id"""
    ).fetchall()
    return {"categories": categories, "godowns": godowns, "materials": materials, "transactions": transactions}


def canvas(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (W * SCALE, H * SCALE), COLORS["bg"])
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((24*SCALE, 24*SCALE, (W-24)*SCALE, (H-24)*SCALE), radius=22*SCALE, fill=COLORS["panel"], outline=COLORS["grid"], width=2*SCALE)
    d.text((64*SCALE, 56*SCALE), title, font=font(30, True), fill=COLORS["ink"])
    d.text((66*SCALE, 104*SCALE), subtitle, font=font(16), fill=COLORS["muted"])
    return im, d


def txt(d: ImageDraw.ImageDraw, xy: tuple[float, float], value: str, size: int = 15, color: str | None = None, bold: bool = False, anchor: str | None = None) -> None:
    d.text((int(xy[0]*SCALE), int(xy[1]*SCALE)), str(value), font=font(size, bold), fill=color or COLORS["ink"], anchor=anchor)


def line(d: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: str, width: int = 2) -> None:
    d.line([(int(x*SCALE), int(y*SCALE)) for x, y in points], fill=fill, width=width*SCALE, joint="curve")


def save(im: Image.Image, filename: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    im.save(OUT_DIR / filename, format="PNG", dpi=(300, 300), optimize=True)


def chart_pie(rows: list[tuple[str, float]], stamp: str) -> None:
    im, d = canvas("Current stock by category", f"Active materials across active godowns  •  Database snapshot: {stamp}  •  Quantities retain the project’s recorded units")
    positive = [(name, max(0.0, float(qty))) for name, qty in rows if float(qty) > 0]
    total = sum(qty for _, qty in positive)
    cx, cy, r = 440, 505, 250
    if total <= 0:
        txt(d, (cx, cy), "No current stock recorded", 20, COLORS["muted"], anchor="mm")
    else:
        palette = [COLORS["gold"], COLORS["blue"], COLORS["teal"], COLORS["violet"], COLORS["coral"], COLORS["slate"]]
        start = -90.0
        for i, (name, qty) in enumerate(positive):
            end = start + qty / total * 360
            d.pieslice(((cx-r)*SCALE, (cy-r)*SCALE, (cx+r)*SCALE, (cy+r)*SCALE), start=start, end=end, fill=palette[i % len(palette)], outline=COLORS["panel"], width=3*SCALE)
            mid = math.radians((start+end)/2)
            px, py = cx + math.cos(mid)*r*0.64, cy + math.sin(mid)*r*0.64
            if qty / total >= 0.075:
                txt(d, (px, py), f"{qty:g}\n{qty/total:.0%}", 15, "#FFFFFF", True, "mm")
            start = end
        txt(d, (cx, cy-9), f"{total:g}", 28, COLORS["ink"], True, "mm")
        txt(d, (cx, cy+23), "total units", 13, COLORS["muted"], anchor="mm")
    legend_x, legend_y = 820, 300
    palette = [COLORS["gold"], COLORS["blue"], COLORS["teal"], COLORS["violet"], COLORS["coral"], COLORS["slate"]]
    for i, (name, qty) in enumerate(rows):
        y = legend_y + i*62
        d.rounded_rectangle((legend_x*SCALE, (y+2)*SCALE, (legend_x+18)*SCALE, (y+20)*SCALE), radius=5*SCALE, fill=palette[i % len(palette)])
        txt(d, (legend_x+32, y), name, 17, COLORS["ink"], True)
        pct = qty / total if total else 0
        txt(d, (legend_x+32, y+27), f"{float(qty):g} units  •  {pct:.1%}" if qty else "0 units  •  no current stock", 14, COLORS["muted"])
    save(im, "category-stock-distribution.png")


def chart_godowns(rows: list[tuple[str, float]], stamp: str, common_unit: str | None) -> None:
    unit_suffix = common_unit or "mixed-unit quantity"
    im, d = canvas("Stock by godown", f"Current stock in active godowns  •  Snapshot: {stamp}  •  Unit: {unit_suffix}")
    x0, y0, x1, y1 = 155, 205, 1330, 700
    maxv = max([float(q) for _, q in rows] + [1])
    top = math.ceil(maxv / 10) * 10 if maxv > 10 else maxv
    for i in range(6):
        val = top * i / 5
        y = y1 - (y1-y0)*i/5
        line(d, [(x0, y), (x1, y)], COLORS["grid"], 1)
        txt(d, (x0-18, y), f"{val:g}", 13, COLORS["muted"], anchor="rm")
    slot = (x1-x0)/max(1, len(rows))
    palette = [COLORS["gold"], COLORS["blue"], COLORS["teal"], COLORS["violet"], COLORS["coral"]]
    for i, (name, value) in enumerate(rows):
        value = float(value)
        bw = min(116, slot*0.52)
        cx = x0 + slot*(i+0.5)
        bh = (y1-y0)*value/top if top else 0
        left, right, topy = cx-bw/2, cx+bw/2, y1-bh
        d.rounded_rectangle((int(left*SCALE), int(topy*SCALE), int(right*SCALE), int(y1*SCALE)), radius=9*SCALE, fill=palette[i%len(palette)]) if bh > 8 else d.rectangle((int(left*SCALE), int(y1-4*SCALE), int(right*SCALE), int(y1*SCALE)), fill=palette[i%len(palette)])
        txt(d, (cx, max(y0+8, topy-26)), f"{value:g}", 16, COLORS["ink"], True, "mm")
        txt(d, (cx, y1+32), name, 15, COLORS["muted"], anchor="mm")
    save(im, "godown-stock-column-chart.png")


def chart_materials(rows: list[tuple], stamp: str) -> None:
    rows = sorted(rows, key=lambda r: float(r[4]), reverse=True)
    im, d = canvas("Material stock levels", f"Active materials in active godowns  •  Snapshot: {stamp}  •  Labels include SKU and unit")
    rows = rows[:12]
    x0, x1 = 390, 1300
    y0, row_h = 210, min(52, 480/max(1, len(rows)))
    maxv = max([float(r[4]) for r in rows] + [1])
    for idx, (name, sku, unit, category, quantity) in enumerate(rows):
        y = y0 + idx*row_h
        txt(d, (72, y+2), str(name)[:30], 15, COLORS["ink"], True)
        txt(d, (72, y+24), f"{sku}  •  {unit}  •  {category}", 12, COLORS["muted"])
        d.rounded_rectangle((x0*SCALE, (y+5)*SCALE, x1*SCALE, (y+27)*SCALE), radius=8*SCALE, fill="#EEF2F7")
        amount = (x1-x0) * max(0.0, float(quantity))/maxv if maxv else 0
        if amount > 1:
            d.rounded_rectangle((x0*SCALE, (y+5)*SCALE, int((x0+amount)*SCALE), (y+27)*SCALE), radius=8*SCALE, fill=COLORS["blue"])
        txt(d, (x1+18, y+16), f"{float(quantity):g}", 15, COLORS["ink"], True, "lm")
    if not rows:
        txt(d, (W/2, H/2), "No active materials recorded", 20, COLORS["muted"], anchor="mm")
    save(im, "material-stock-bar-chart.png")


def chart_timeline(rows: list[tuple], stamp: str, common_unit: str | None) -> None:
    dates = sorted({str(row[0])[:10] for row in rows})
    date_label = dates[0] if len(dates) == 1 else (f"{dates[0]} – {dates[-1]}" if dates else "no activity date")
    im, d = canvas("Stock movement timeline", f"Activity date: {date_label}  •  Cumulative recorded movement by transaction time  •  Snapshot: {stamp}")
    types = ["in", "out", "transfer"]
    colors = {"in": COLORS["teal"], "out": COLORS["coral"], "transfer": COLORS["blue"]}
    labels = {"in": "Stock in / opening", "out": "Stock out", "transfer": "Transfer movement"}
    is_quantity = common_unit is not None
    series = {key: [] for key in types}
    cumul = {key: 0.0 for key in types}
    timeline = []
    active = []
    for created, transaction_type, quantity, unit in rows:
        t = transaction_type.upper()
        key = "in" if t in ("STOCK_IN", "OPENING_STOCK") else "out" if t == "STOCK_OUT" else "transfer" if t in ("TRANSFER_IN", "TRANSFER_OUT") else None
        if not key:
            continue
        increment = float(quantity) if is_quantity else 1.0
        cumul[key] += increment
        timeline.append(created)
        for k in types:
            series[k].append(cumul[k])
    if not timeline:
        txt(d, (W/2, H/2), "No activity available for active materials", 20, COLORS["muted"], anchor="mm")
        save(im, "stock-movement-line-chart.png")
        return
    # Start each line at zero, before the first transaction event.
    series = {k: [0.0] + v for k, v in series.items()}
    total_steps = len(timeline)
    px0, py0, px1, py1 = 120, 235, 1320, 680
    maxv = max([v for vals in series.values() for v in vals] + [1])
    maxv = maxv * 1.12
    for i in range(6):
        value = maxv*i/5
        y = py1-(py1-py0)*i/5
        line(d, [(px0, y), (px1, y)], COLORS["grid"], 1)
        txt(d, (px0-15, y), f"{value:.0f}", 13, COLORS["muted"], anchor="rm")
    for idx, key in enumerate(types):
        vals = series[key]
        points = []
        for i, val in enumerate(vals):
            x = px0+(px1-px0)*i/max(1, total_steps)
            y = py1-(py1-py0)*val/maxv
            points.append((x, y))
        line(d, points, colors[key], 3)
        for x, y in points[::max(1, len(points)//18)]:
            d.ellipse(((x-3)*SCALE, (y-3)*SCALE, (x+3)*SCALE, (y+3)*SCALE), fill=colors[key])
    for i in range(6):
        ix = round(total_steps*i/5)
        if ix >= len(timeline):
            ix = len(timeline)-1
        try:
            label = datetime.fromisoformat(timeline[ix]).strftime("%H:%M")
        except (TypeError, ValueError):
            label = str(timeline[ix])[-8:-3]
        x = px0+(px1-px0)*i/5
        txt(d, (x, py1+29), label, 13, COLORS["muted"], anchor="mm")
    ly = 770
    legend_items = [(k, labels[k]) for k in types]
    total_width = 0
    widths = [len(label)*9+48 for _, label in legend_items]
    startx = (W-sum(widths)-32*2)/2
    for (key, label), width in zip(legend_items, widths):
        x = startx+total_width
        line(d, [(x, ly), (x+24, ly)], colors[key], 3)
        txt(d, (x+34, ly), label, 14, COLORS["muted"], anchor="lm")
        total_width += width
    yunit = common_unit if is_quantity else "event count (mixed units)"
    txt(d, (72, 180), f"Vertical axis: cumulative {yunit}  •  {len(rows)} recorded activity rows", 14, COLORS["muted"])
    save(im, "stock-movement-line-chart.png")


def write_readme(data: dict, stamp: str, unit: str | None) -> None:
    rows = data["transactions"]
    days = sorted({str(row[0])[:10] for row in rows})
    day_text = f"{days[0]} to {days[-1]}" if days else "No activity dates recorded"
    lines = [
        "# DecoStone project charts",
        "",
        "High-resolution (300 DPI) PNG charts generated from the local SQLite database in read-only mode.",
        "",
        f"- Generated: {stamp}",
        f"- Database activity represented: {day_text}",
        f"- Current stock unit: {unit or 'mixed units; movement line uses event counts'}",
        "- Scope: active materials and active godowns; soft-deleted records are excluded.",
        "- The charts show a snapshot of the local database at generation time. Regenerate after data changes with `python docs/tools/generate_project_graphs.py`.",
        "",
        "## Files",
        "",
        "- `category-stock-distribution.png` — pie chart of current stock by category.",
        "- `godown-stock-column-chart.png` — column chart of current stock by godown.",
        "- `material-stock-bar-chart.png` — horizontal bar chart of current stock by material.",
        "- `stock-movement-line-chart.png` — cumulative movement by transaction time.",
        "",
        "Movement timeline aggregates stock-in and opening stock, stock-out, and both transfer directions separately. If active materials use different units, it switches to counting transaction events rather than summing incomparable quantities.",
        "",
    ]
    (OUT_DIR / "README.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    with db_connect() as conn:
        data = load_data(conn)
    units = {str(row[2]) for row in data["materials"] if row[2]}
    common_unit = next(iter(units)) if len(units) == 1 else None
    stamp = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %Z")
    chart_pie(data["categories"], stamp)
    chart_godowns(data["godowns"], stamp, common_unit)
    chart_materials(data["materials"], stamp)
    chart_timeline(data["transactions"], stamp, common_unit)
    write_readme(data, stamp, common_unit)
    print(f"Created 4 charts from {DB_PATH} in {OUT_DIR}")
    print(f"Active categories: {len(data['categories'])}; active godowns: {len(data['godowns'])}; active materials: {len(data['materials'])}; movement rows: {len(data['transactions'])}")
    print(f"Movement date range: {min((str(row[0])[:10] for row in data['transactions']), default='none')} – {max((str(row[0])[:10] for row in data['transactions']), default='none')}")


if __name__ == "__main__":
    main()
