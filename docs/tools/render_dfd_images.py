from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1]
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")

NAVY = "#182338"
SLATE = "#475569"
LINE = "#34445B"
BLUE = "#EDF3FA"
BLUE_EDGE = "#425D7A"
AMBER = "#FFF2DC"
AMBER_EDGE = "#A7600B"
GREEN = "#EEF7F2"
GREEN_EDGE = "#32704E"
WHITE = "#FFFFFF"


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT), size)


def centered(draw, xy, text, ft, fill=NAVY):
    draw.text(xy, text, font=ft, fill=fill, anchor="mm")


def arrow(draw, points, color=LINE, width=5, head=16):
    draw.line(points, fill=color, width=width, joint="curve")
    x1, y1 = points[-2]
    x2, y2 = points[-1]
    import math
    a = math.atan2(y2 - y1, x2 - x1)
    left = (x2 - head * math.cos(a - math.pi / 6), y2 - head * math.sin(a - math.pi / 6))
    right = (x2 - head * math.cos(a + math.pi / 6), y2 - head * math.sin(a + math.pi / 6))
    draw.polygon([(x2, y2), left, right], fill=color)


def label(draw, xy, text, size=21):
    ft = font(size, True)
    box = draw.textbbox((0, 0), text, font=ft)
    w, h = box[2] - box[0], box[3] - box[1]
    x, y = xy
    draw.rounded_rectangle((x - w / 2 - 12, y - h / 2 - 7, x + w / 2 + 12, y + h / 2 + 7), radius=8, fill=WHITE)
    draw.text((x, y), text, font=ft, fill=SLATE, anchor="mm")


def entity(draw, rect, title, lines):
    x1, y1, x2, y2 = rect
    draw.rounded_rectangle(rect, radius=22, fill=BLUE, outline=BLUE_EDGE, width=5)
    centered(draw, ((x1 + x2) / 2, y1 + 48), title, font(34, True))
    for i, line in enumerate(lines):
        centered(draw, ((x1 + x2) / 2, y1 + 93 + i * 34), line, font(24), SLATE)


def process(draw, rect, number, title, lines=()):
    x1, y1, x2, y2 = rect
    draw.ellipse(rect, fill=AMBER, outline=AMBER_EDGE, width=6)
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    centered(draw, (cx, cy - 55), number, font(27, True), AMBER_EDGE)
    centered(draw, (cx, cy - 12), title, font(31, True))
    for i, line in enumerate(lines):
        centered(draw, (cx, cy + 30 + i * 30), line, font(21), SLATE)


def store(draw, rect, code, title, detail):
    x1, y1, x2, y2 = rect
    draw.rectangle(rect, fill=GREEN, outline=GREEN_EDGE, width=5)
    draw.rectangle((x1 + 23, y1, x1 + 23 + 5, y2), fill=GREEN_EDGE)
    centered(draw, ((x1 + x2) / 2 + 8, y1 + 42), f"{code}  {title}", font(25, True))
    centered(draw, ((x1 + x2) / 2 + 8, y1 + 82), detail, font(19), SLATE)


def context_diagram():
    scale = 2
    img = Image.new("RGB", (1800 * scale, 720 * scale), WHITE)
    d = ImageDraw.Draw(img)
    d.text((900 * scale, 55 * scale), "DATA FLOW DIAGRAM — LEVEL 0", font=font(38 * scale, True), fill=NAVY, anchor="mm")
    d.text((900 * scale, 96 * scale), "Context diagram for DecoStone Material Management System", font=font(21 * scale), fill=SLATE, anchor="mm")
    entity(d, (90 * scale, 255 * scale, 550 * scale, 465 * scale), "SYSTEM USERS", ["Admin · Manager · Supervisor", "Supervisor works in assigned godowns"])
    process(d, (1050 * scale, 220 * scale, 1630 * scale, 500 * scale), "0", "DecoStone MMS", ["Validates access and permissions", "Processes inventory activity", "Provides balances, alerts and reports"])
    arrow(d, [(550 * scale, 300 * scale), (770 * scale, 215 * scale), (1050 * scale, 275 * scale)], width=5 * scale, head=18 * scale)
    label(d, (800 * scale, 205 * scale), "Credentials, stock actions and information requests", 20 * scale)
    arrow(d, [(1050 * scale, 445 * scale), (780 * scale, 520 * scale), (550 * scale, 425 * scale)], width=5 * scale, head=18 * scale)
    label(d, (800 * scale, 540 * scale), "Access results, balances, alerts and reports", 20 * scale)
    d.text((900 * scale, 650 * scale), "Level 1 expands the system into processes and database stores.", font=font(19 * scale), fill=SLATE, anchor="mm")
    img.resize((1800, 720), Image.Resampling.LANCZOS).save(OUT / "DecoStone-DFD-Level-0.png", dpi=(200, 200))


def level1_diagram():
    s = 2
    img = Image.new("RGB", (2200 * s, 1500 * s), WHITE)
    d = ImageDraw.Draw(img)
    d.text((1100 * s, 48 * s), "DATA FLOW DIAGRAM — LEVEL 1", font=font(36 * s, True), fill=NAVY, anchor="mm")
    d.text((1100 * s, 88 * s), "DecoStone Material Management System (MMS)", font=font(20 * s), fill=SLATE, anchor="mm")

    # External user entity and system processes.
    entity(d, (55*s, 565*s, 380*s, 855*s), "USERS", ["Admin", "Manager", "Supervisor", "Role-based access"])
    process(d, (520*s, 165*s, 1030*s, 365*s), "1.0", "Authenticate User", ["Verify credentials, role", "and godown assignments"])
    process(d, (1260*s, 165*s, 1770*s, 365*s), "2.0", "Manage Master Data", ["Godowns · Categories", "Materials"])
    process(d, (520*s, 555*s, 1030*s, 755*s), "3.0", "Process Stock Activity", ["Receive · Dispatch · Transfer", "Adjust and validate stock"])
    process(d, (1260*s, 555*s, 1770*s, 755*s), "4.0", "View Inventory & Reports", ["Balances · Alerts · History", "Summaries and exports"])

    # Data stores.
    store(d, (70*s, 1120*s, 485*s, 1240*s), "D1", "User accounts", "Roles and assignments")
    store(d, (515*s, 1120*s, 930*s, 1240*s), "D2", "Master records", "Godowns, categories, materials")
    store(d, (960*s, 1120*s, 1375*s, 1240*s), "D3", "Stock balances", "Quantity by material and godown")
    store(d, (1405*s, 1120*s, 1815*s, 1240*s), "D4", "Transactions", "Receipts, dispatches, transfers, adjustments")
    store(d, (1845*s, 1120*s, 2160*s, 1240*s), "D5", "Audit log", "User and operation events")

    # User exchanges: separate connectors for requests and results.
    arrow(d, [(380*s, 600*s), (450*s, 600*s), (450*s, 275*s), (520*s, 275*s)], width=4*s, head=15*s)
    label(d, (445*s, 470*s), "Login", 17*s)
    arrow(d, [(520*s, 330*s), (405*s, 330*s), (405*s, 760*s), (380*s, 760*s)], width=4*s, head=15*s)
    label(d, (435*s, 710*s), "Access result", 17*s)

    arrow(d, [(380*s, 645*s), (480*s, 645*s), (480*s, 340*s), (1260*s, 340*s)], width=4*s, head=15*s)
    label(d, (830*s, 322*s), "Admin master-data requests", 18*s)
    arrow(d, [(1260*s, 365*s), (490*s, 365*s), (490*s, 805*s), (380*s, 805*s)], width=4*s, head=15*s)
    label(d, (855*s, 390*s), "Confirmation / validation result", 17*s)

    arrow(d, [(380*s, 700*s), (520*s, 700*s)], width=4*s, head=15*s)
    label(d, (450*s, 682*s), "Stock operation", 17*s)
    arrow(d, [(1030*s, 675*s), (1190*s, 675*s), (1190*s, 810*s), (380*s, 810*s)], width=4*s, head=15*s)
    label(d, (815*s, 835*s), "Operation result", 17*s)
    arrow(d, [(380*s, 740*s), (1260*s, 740*s)], width=4*s, head=15*s)
    label(d, (825*s, 720*s), "Inventory / report request", 17*s)
    arrow(d, [(1260*s, 700*s), (1210*s, 700*s), (1210*s, 860*s), (380*s, 860*s)], width=4*s, head=15*s)
    label(d, (820*s, 885*s), "Stock views, alerts and reports", 17*s)

    # Process and store exchanges.
    arrow(d, [(770*s, 365*s), (770*s, 1120*s)], width=4*s, head=15*s)
    label(d, (770*s, 955*s), "Read / verify account", 17*s)
    arrow(d, [(1515*s, 365*s), (1515*s, 445*s), (722*s, 445*s), (722*s, 555*s)], width=4*s, head=15*s)
    label(d, (1100*s, 428*s), "Validate material and godown", 17*s)
    arrow(d, [(1450*s, 365*s), (1450*s, 405*s), (720*s, 405*s), (720*s, 555*s)], width=4*s, head=15*s)
    label(d, (1050*s, 388*s), "Save / retrieve master records", 17*s)
    arrow(d, [(805*s, 755*s), (805*s, 1120*s)], width=4*s, head=15*s)
    label(d, (805*s, 955*s), "Check / update quantities", 17*s)
    arrow(d, [(930*s, 745*s), (1480*s, 745*s), (1480*s, 1120*s)], width=4*s, head=15*s)
    label(d, (1200*s, 728*s), "Write transaction", 17*s)
    arrow(d, [(1020*s, 735*s), (2015*s, 735*s), (2015*s, 1120*s)], width=4*s, head=15*s)
    label(d, (1640*s, 718*s), "Write audit event", 17*s)

    # Reports read the current master data, balances and history.
    arrow(d, [(930*s, 1150*s), (1150*s, 1150*s), (1150*s, 665*s), (1260*s, 665*s)], width=4*s, head=15*s)
    label(d, (1150*s, 1050*s), "Materials and categories", 17*s)
    arrow(d, [(1375*s, 1180*s), (1525*s, 1180*s), (1525*s, 755*s), (1510*s, 755*s)], width=4*s, head=15*s)
    label(d, (1540*s, 1000*s), "Stock balances", 17*s)
    arrow(d, [(1610*s, 1120*s), (1610*s, 830*s), (1600*s, 755*s)], width=4*s, head=15*s)
    label(d, (1660*s, 925*s), "Movement history", 17*s)

    d.text((1100*s, 1340*s), "D1–D5 represent logical database stores. Each stock operation is validated before balances and transaction history are updated.", font=font(17*s), fill=SLATE, anchor="mm")
    d.text((1100*s, 1375*s), "Supervisor transactions are restricted to assigned godowns.", font=font(17*s), fill=SLATE, anchor="mm")
    img.resize((2200, 1500), Image.Resampling.LANCZOS).save(OUT / "DecoStone-DFD-Level-1.png", dpi=(200, 200))


if __name__ == "__main__":
    context_diagram()
    level1_diagram()
    print(OUT / "DecoStone-DFD-Level-0.png")
    print(OUT / "DecoStone-DFD-Level-1.png")
