"""Считает data.json для калькулятора «аренда или ипотека» из CSV в корне проекта.

Запуск из корня: python3 -I data/build_data.py
Пишет deploy/wp-content/rvb-test/data.json и data/area-map.csv, печатает отчёт.
"""
import csv
import json
import re
import string
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path
from statistics import median

BANDS = (("15-50", 15, 50), ("50-90", 50, 90), ("90-140", 90, 140), ("140+", 140, 1000))
NAME_FIXES = {"Mbr": "MBR", "Ph": "Phase", "Of": "of", "Damac": "DAMAC", "Tecom": "TECOM", "Heartland": "Hartland", "Barshaa": "Barsha", "By": "by", "At": "at"}


def norm(value):
    return re.sub(r"\s+", " ", value.strip().upper())


def number(value):
    try:
        return float(value)
    except ValueError:
        return 0.0


def parse_date(value):
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def read_rows(paths):
    """Строка, уже встреченная в другом файле, отбрасывается: файлы могут пересекаться. Повторы внутри файла остаются."""
    seen, rows, stats, columns = set(), [], [], None
    for path in paths:
        try:
            with open(path, encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f, restval="")
                file_rows = list(reader)
                header = reader.fieldnames
        except (UnicodeError, csv.Error) as error:
            raise SystemExit(f"{path.name}: не читается как CSV в UTF-8 ({error}). Файлы не изменены.")
        columns = columns or header
        if header not in (None, columns):  # иначе одинаковые строки не распознаются как пересечение
            raise SystemExit(f"{path.name}: столбцы отличаются от других файлов этого типа. Файлы не изменены.")
        keys = [tuple(map(str, row.values())) for row in file_rows]
        kept = [row for row, key in zip(file_rows, keys) if key not in seen]
        seen.update(keys)
        rows += kept
        stats.append((path.name, len(file_rows), len(file_rows) - len(kept)))
    return rows, stats


def apply_limits(rows, date_col, amount_col, low, high):
    """Общие этапы продаж и аренды: площадь, сумма за м², дата."""
    clean = []
    for row in rows:
        size = number(row["ACTUAL_AREA"])
        clean.append({"date": parse_date(row[date_col]), "area": norm(row["AREA_EN"]), "project": norm(row["PROJECT_EN"]),
                      "size": size, "per_sqm": number(row[amount_col]) / size if size else 0.0})
    sized = [r for r in clean if 15 <= r["size"] < 1000]
    priced = [r for r in sized if low <= r["per_sqm"] <= high]
    dated = [r for r in priced if r["date"]]
    return dated, {"площадь": len(clean) - len(sized), "сумма за м²": len(sized) - len(priced), "дата": len(priced) - len(dated)}


def clean_sales(rows):
    passed = [r for r in rows if r["GROUP_EN"] == "Sales" and r["IS_OFFPLAN_EN"] == "Ready" and r["USAGE_EN"] == "Residential"
              and r["PROCEDURE_EN"] == "Sale" and r["PROP_SB_TYPE_EN"] == "Flat"]
    unique = {r["TRANSACTION_NUMBER"] or id(r): r for r in passed}  # остаётся последняя строка номера; пустой номер не дубль
    # Продажа доли: сумма за долю, а ACTUAL_AREA вся квартира, поэтому цена за м² занижена. До 5% это округление площади.
    whole = [r for r in unique.values() if abs(number(r["PROCEDURE_AREA"]) - number(r["ACTUAL_AREA"])) <= 0.05 * number(r["ACTUAL_AREA"])]
    clean, dropped = apply_limits(whole, "INSTANCE_DATE", "TRANS_VALUE", 3000, 100000)
    return clean, {"фильтры": len(rows) - len(passed), "дубли номера сделки": len(passed) - len(unique), "доли": len(unique) - len(whole), **dropped}


def clean_rents(rows):
    passed = [r for r in rows if r["VERSION_EN"] == "New" and r["USAGE_EN"] == "Residential"
              and r["PROP_SUB_TYPE_EN"].strip() == "Flat" and r["TOTAL_PROPERTIES"].strip() == "1"]

    groups = defaultdict(list)
    for r in passed:
        groups[r["REGISTRATION_DATE"], r["START_DATE"], r["END_DATE"], r["ANNUAL_AMOUNT"], norm(r["AREA_EN"])].append(r)
    # Обычно это один договор, размноженный по проектам участка. Разные площади при одной сумме значат несколько квартир, такие снимаем.
    # ponytail: голос за район проекта даёт только первая строка; на текущих CSV таблица та же, что при голосах всех строк
    single = [group[0] for group in groups.values() if len({r["ACTUAL_AREA"] for r in group}) == 1]
    clean, dropped = apply_limits(single, "REGISTRATION_DATE", "ANNUAL_AMOUNT", 150, 6000)
    return clean, {"фильтры": len(rows) - len(passed), "группы-повторы": len(passed) - len(single), **dropped}


def read_overrides(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return {norm(row["sale_area"]): norm(row["rent_area"]) for row in csv.DictReader(f, restval="")}


def build_area_map(sales, rents, overrides):
    """Связывает названия районов продаж с районами аренды. У скрытых rent_area пуст."""
    by_project = defaultdict(Counter)
    for r in rents:
        if r["project"] and r["area"]:
            by_project[r["project"]][r["area"]] += 1
    # При равенстве берём название по алфавиту: результат не зависит от порядка строк
    home = {project: max(areas, key=lambda a: (areas[a], a)) for project, areas in by_project.items()}

    votes = defaultdict(Counter)
    for s in sales:
        if s["project"] in home:
            votes[s["area"]][home[s["project"]]] += 1

    rent_areas = {r["area"] for r in rents}
    table = {}
    for area in sorted({s["area"] for s in sales}):
        shared = sum(votes[area].values())
        top, top_count = (votes[area].most_common(1) or [("", 0)])[0]
        top_share = top_count / shared if shared else 0
        if shared >= 3 and top_share >= 0.8:
            rent_area, how = top, "project"
        elif area in rent_areas:
            rent_area, how = area, "name"
        else:
            rent_area, how = "", "none"
        table[area] = {"rent_area": rent_area, "how": how, "shared": shared, "top_share": top_share}
    for area, rent_area in overrides.items():
        if area in table:
            table[area].update(rent_area=rent_area, how="override")
    return table


def window(sales, rents):
    """Самая поздняя дата и первый день окна: 6 календарных месяцев, заканчивая её месяцем."""
    latest = max(r["date"] for r in sales + rents)
    months = latest.year * 12 + latest.month - 6
    return latest, date(months // 12, months % 12 + 1, 1)


def empty_days(dates, start, end):
    days = (start + timedelta(i) for i in range((end - start).days + 1))
    return [day for day in days if day not in dates]


def band_of(size):
    return next((band for band, low, high in BANDS if low <= size < high), None)


def build_pairs(sales, rents, area_map):
    """Пары с порогом 30 с обеих сторон. Цена по своему названию, аренда по связанному району."""
    sale_rows, rent_rows = defaultdict(list), defaultdict(list)
    for rows, grouped in ((sales, sale_rows), (rents, rent_rows)):
        for r in rows:
            grouped[r["area"], band_of(r["size"])].append(r)
    pairs = []
    for area, link in area_map.items():
        for band, _, _ in BANDS:
            sale, rent = sale_rows[area, band], rent_rows[link["rent_area"], band]
            if link["rent_area"] and len(sale) >= 30 and len(rent) >= 30:
                sale_price, rent_price = median(r["per_sqm"] for r in sale), median(r["per_sqm"] for r in rent)
                pairs.append({"area": area, "rent_area": link["rent_area"], "band": band, "sales": len(sale), "rents": len(rent),
                              "sale": sale_price, "rent": rent_price, "ratio": rent_price / sale_price,
                              "sale_size": median(r["size"] for r in sale), "rent_size": median(r["size"] for r in rent)})
    return pairs


def ratio_ok(pair):
    return 0.03 <= pair["ratio"] <= 0.12


def size_drops(kept):
    """Соседние диапазоны района, где сумма падает с ростом площади: плавный переход виджета сохранит это падение."""
    order = [band for band, _, _ in BANDS]
    by_area = defaultdict(list)
    for p in kept:
        by_area[p["area"]].append(p)
    drops = []
    for area, pairs in by_area.items():
        pairs = sorted(pairs, key=lambda p: order.index(p["band"]))
        for low, high in zip(pairs, pairs[1:]):
            for title, price, size in (("цена", "sale", "sale_size"), ("аренда", "rent", "rent_size")):
                if high[price] * high[size] < low[price] * low[size]:
                    drops.append((area, low["band"], high["band"], title))
    return drops


def coverage(pairs, total_sales, total_rents):
    """Доли продаж и договоров окна. Договоры считаются один раз на пару «район аренды + диапазон»."""
    rents = {(p["rent_area"], p["band"]): p["rents"] for p in pairs}
    return sum(p["sales"] for p in pairs) / total_sales, sum(rents.values()) / total_rents


def display_name(name):
    text = " ".join(NAME_FIXES.get(word, word) for word in string.capwords(re.sub(r"\s*,\s*", ", ", name)).split())
    return re.sub(r"\b[IVX]+\b", lambda m: m[0].upper(), text, flags=re.I)  # римские номера очередей: Belgravia III


def config_ok(config):
    """Условия parseHintData: при неверных настройках виджет отвергнет весь файл."""
    def amount(value):
        return type(value) in (int, float) and 0 <= value < float("inf")
    return (type(config) is dict and amount(config.get("ratePct"))
            and amount(config.get("downPaymentPct")) and config["downPaymentPct"] <= 99
            and type(config.get("termYears")) is int and 1 <= config["termYears"] <= 25
            and type(config.get("fees")) is dict and all(map(amount, config["fees"].values())))


def points(rows):
    """Точки проекта по диапазонам площади: [медиана площади, медиана суммы за м², сделок]. Медианы даже при одной сделке.
    Массив, а не объект: data.json с проектами вдвое меньше."""
    by_band = defaultdict(list)
    for r in rows:
        by_band[band_of(r["size"])].append(r)
    return [[round(median(r["size"] for r in deals), 1), round(median(r["per_sqm"] for r in deals)), len(deals)]
            for band, _, _ in BANDS if (deals := by_band[band])]


def build_projects(sales, rents, area_map, shown):
    """Проекты показанных районов с хотя бы одной продажей. Цена по своему району, аренда по тому же проекту в связанном районе аренды.
    Порога нет: в обратной проверке даже 1–2 сделки проекта точнее подсказки района. Одинаковые после display_name названия сливаются."""
    sale_rows, rent_rows = defaultdict(list), defaultdict(list)
    for rows, grouped in ((sales, sale_rows), (rents, rent_rows)):
        for r in rows:
            if r["project"]:
                grouped[r["area"], display_name(r["project"])].append(r)
    projects = defaultdict(list)
    for (area, name), rows in sale_rows.items():
        if area in shown:
            projects[area].append({"name": name, "sales": points(rows), "rents": points(rent_rows.get((area_map[area]["rent_area"], name), []))})
    return {area: sorted(items, key=lambda p: p["name"].casefold()) for area, items in projects.items()}


def build_json(kept, projects, as_of, start, config):
    areas = {}
    for p in kept:
        area = areas.setdefault(p["area"], {"name": display_name(p["area"]), "rentArea": display_name(p["rent_area"]), "bands": {},
                                            "projects": projects.get(p["area"], [])})
        area["bands"][p["band"]] = {"salePerSqm": round(p["sale"]), "saleSizeSqm": round(p["sale_size"], 1), "sales": p["sales"],
                                    "rentPerSqmYear": round(p["rent"]), "rentSizeSqm": round(p["rent_size"], 1), "rents": p["rents"]}
    return {
        "asOf": as_of.isoformat(),
        "periodFrom": start.strftime("%Y-%m"),
        "periodTo": as_of.strftime("%Y-%m"),
        "config": config,
        "sizeBands": [{"id": band, "from": low, "to": high} for band, low, high in BANDS],
        "areas": sorted(areas.values(), key=lambda a: a["name"].casefold()),
    }


def area_map_rows(area_map, window_sales, kept):
    counts = Counter(r["area"] for r in window_sales)
    bands = defaultdict(list)
    for p in kept:
        bands[p["area"]].append(p["band"])
    rows = [{"sale_area": area, "display_name": display_name(area), "rent_area": link["rent_area"], "how": link["how"],
             "window_sales": counts[area], "shared_project_sales": link["shared"], "top_share": f"{link['top_share']:.3f}",
             "bands_kept": " ".join(bands[area])} for area, link in area_map.items()]
    return sorted(rows, key=lambda r: -r["window_sales"])


def print_set(title, files, rows, dropped, clean, date_col, start, as_of):
    print(f"\n{title}")
    for name, total, overlap in files:
        print(f"  {name}: строк {total}, повторов из других файлов {overlap}")
    print(f"  после отбрасывания повторов: {len(rows)}")
    print("  отсеяно: " + ", ".join(f"{stage} {count}" for stage, count in dropped.items()))
    months = Counter(r["date"].strftime("%Y-%m") for r in clean)
    print(f"  очищено всего: {len(clean)}; по месяцам: " + ", ".join(f"{m}: {months[m]}" for m in sorted(months)))
    print(f"  очищено за окно: {sum(r['date'] >= start for r in clean)}")
    for label, dates in (("в исходных строках", {parse_date(r[date_col]) for r in rows}), ("в очищенных строках", {r["date"] for r in clean})):
        days = empty_days(dates, start, as_of)
        print(f"  дни окна без единой записи {label} ({len(days)}): " + ", ".join(map(str, days)))


def main(root=Path(__file__).resolve().parent.parent):
    sale_rows, sale_files = read_rows(sorted(root.glob("transactions-*.csv")))
    rent_rows, rent_files = read_rows(sorted(root.glob("rents-*.csv")))
    try:
        sales, sale_dropped = clean_sales(sale_rows)
        rents, rent_dropped = clean_rents(rent_rows)
    except KeyError as error:
        raise SystemExit(f"В CSV нет столбца {error}: проверьте заголовок и разделитель. Файлы не изменены.")
    if not sales or not rents:
        raise SystemExit("Нет очищенных продаж или договоров: проверьте CSV в корне проекта. Файлы не изменены.")
    for title, clean, dropped in (("Продажи", sales, sale_dropped), ("Аренда", rents, rent_dropped)):
        lost = dropped.get("доли", 0) + dropped["площадь"] + dropped["сумма за м²"] + dropped["дата"]
        # Обычно снимается 2–5%: нечитаемое считается нулём, поэтому сломанный формат выглядит как массовый отсев
        # ponytail: порог на весь набор: частично сломанный файл меньше 10% строк пройдёт; считать по файлам, если их накопится много
        if lost > 0.1 * (len(clean) + lost):
            raise SystemExit(f"{title}: правила очистки сняли {lost} строк из {len(clean) + lost}: проверьте формат чисел и дат. Файлы не изменены.")

    overrides = read_overrides(root / "data/area-overrides.csv")
    area_map = build_area_map(sales, rents, overrides)
    as_of, start = window(sales, rents)
    if as_of > date.today():
        raise SystemExit(f"Самая поздняя дата {as_of} ещё не наступила: проверьте CSV. Файлы не изменены.")
    window_sales = [r for r in sales if r["date"] >= start]
    window_rents = [r for r in rents if r["date"] >= start]
    for title, rows in (("продаж", window_sales), ("договоров", window_rents)):
        months = sorted({f"{r['date']:%Y-%m}" for r in rows})
        if len(months) < 6:  # подпись виджета назвала бы период, которого нет в данных
            raise SystemExit(f"В окне {start:%Y-%m} — {as_of:%Y-%m} есть {title} только за {', '.join(months)}: проверьте CSV. Файлы не изменены.")
    pairs = build_pairs(window_sales, window_rents, area_map)
    kept = [p for p in pairs if ratio_ok(p)]
    if not kept:
        raise SystemExit("Ни одна пара не прошла правила: проверьте CSV в корне проекта. Файлы не изменены.")

    config = json.loads((root / "data/settings.json").read_text(encoding="utf-8"))
    if not config_ok(config):
        raise SystemExit("data/settings.json: неверные настройки, виджет отверг бы весь файл. Файлы не изменены.")
    projects = build_projects(window_sales, window_rents, area_map, {p["area"] for p in kept})
    data = build_json(kept, projects, as_of, start, config)
    names = [area["name"] for area in data["areas"]]
    if "" in names or len(set(names)) < len(names):
        raise SystemExit("Пустое или повторяющееся название района: виджет отверг бы весь файл. Файлы не изменены.")
    long = [p["name"] for area in data["areas"] for p in area["projects"] if len(p["name"]) > 100]
    if long:
        raise SystemExit(f"Название проекта длиннее 100 знаков, виджет отверг бы весь файл: {long[0]}. Файлы не изменены.")
    text = json.dumps(data, separators=(",", ":"))  # без отступов: с ними файл с проектами впятеро больше
    json_path = root / "deploy/wp-content/rvb-test/data.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(text, encoding="utf-8")
    table = area_map_rows(area_map, window_sales, kept)
    with open(root / "data/area-map.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(table[0]))
        writer.writeheader()
        writer.writerows(table)

    print(f"Окно: {start:%Y-%m} — {as_of:%Y-%m}, самая поздняя дата {as_of}")
    print_set("Продажи", sale_files, sale_rows, sale_dropped, sales, "INSTANCE_DATE", start, as_of)
    print_set("Аренда", rent_files, rent_rows, rent_dropped, rents, "REGISTRATION_DATE", start, as_of)

    linked = [row for row in table if row["rent_area"]]
    window_share = sum(row["window_sales"] for row in linked) / len(window_sales)
    all_share = sum(bool(area_map[r["area"]]["rent_area"]) for r in sales) / len(sales)
    print(f"\nРайоны продаж: связано {len(linked)} из {len(table)}, это {window_share:.1%} продаж окна и {all_share:.1%} всех очищенных продаж")
    for area, rent_area in overrides.items():
        if area not in area_map or (rent_area and rent_area not in {r["area"] for r in rents}):
            print(f"  ВНИМАНИЕ: правка с неизвестным районом: {area} -> {rent_area or '(скрыть)'}")

    print()
    for title, items in (("Пары до скрытия", pairs), ("Пары после скрытия", kept)):
        sale_share, rent_share = coverage(items, len(window_sales), len(window_rents))
        print(f"{title}: {len(items)} в {len({p['area'] for p in items})} названиях, покрыто {sale_share:.1%} продаж и {rent_share:.1%} договоров")
    hidden = [p for p in pairs if not ratio_ok(p)]
    print(f"Скрыто по отношению аренды к цене ({len(hidden)}):")
    for p in hidden:
        print(f"  {display_name(p['area'])}, {p['band']}: {p['ratio']:.1%}: аренда {p['rent']:.0f} AED/м² в год по {p['rents']} договорам, "
              f"цена {p['sale']:.0f} AED/м² по {p['sales']} продажам")
    for area, low, high, title in size_drops(kept):
        print(f"ВНИМАНИЕ: {display_name(area)}: {title} в {high} ниже, чем в {low}, большая квартира выйдет дешевле меньшей")

    listed = [p for items in projects.values() for p in items]
    deals = lambda side: sum(point[2] for p in listed for point in p[side])
    print(f"\nПроекты в показанных районах: {len(listed)}, с договорами аренды {sum(bool(p['rents']) for p in listed)}; "
          f"их сделки: {deals('sales') / len(window_sales):.1%} продаж и {deals('rents') / len(window_rents):.1%} договоров окна")
    print(f"\n{json_path}: {len(text.encode())} байт, названий {len({p['area'] for p in kept})}")


if __name__ == "__main__":
    main()
