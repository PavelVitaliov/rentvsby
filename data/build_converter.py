"""Собирает страницу-конвертер data/rvb-converter.html: шаблон и вставленные в него build_data.py, settings.json, area-overrides.csv.

Запуск из корня: python3 -I data/build_converter.py
Пересобирать после любой правки этих трёх файлов и заново отправлять страницу тому, кто обновляет данные.
"""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
page = (here / "converter.template.html").read_text(encoding="utf-8")
for name in ("build_data.py", "settings.json", "area-overrides.csv"):
    marker = f'"%%{name}%%"'
    if page.count(marker) != 1:
        raise SystemExit(f"В шаблоне нет метки {marker} или она не одна. Страница не собрана.")
    # Строка JSON — готовая строка JS. "</" экранируем: "</script>" внутри закрыл бы тег
    page = page.replace(marker, json.dumps((here / name).read_text(encoding="utf-8")).replace("</", "<\\/"))
out = here / "rvb-converter.html"
out.write_text(page, encoding="utf-8")
print(f"{out}: {len(page.encode())} байт")
