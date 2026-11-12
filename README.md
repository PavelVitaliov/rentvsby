# Rent vs Buy

Калькулятор «снимать или покупать» для Дубая. Человек выбирает район и площадь квартиры, а калькулятор показывает рядом аренду в месяц и платёж по ипотеке, разницу между ними, цену жилья и деньги на старте. Работает на странице https://mortix.ae/rent-vs-buy/.

Цены и аренда — типичные значения (медианы) по сделкам и договорам аренды, зарегистрированным в Dubai Land Department (DLD) за последние 6 месяцев. Данные обновляются раз в месяц.

## Обновить данные

- Страница-конвертер: https://pavelvitaliov.github.io/rentvsby/data/rvb-converter.html
- Пошаговая инструкция: [docs/data-update-worker.md](docs/data-update-worker.md)

## Как это работает

```
CSV с сайта DLD  →  страница-конвертер в браузере  →  data.json  →  сервер сайта  →  калькулятор на странице
```

1. Раз в месяц с сайта DLD скачиваются CSV продаж (`transactions-….csv`) и аренды (`rents-….csv`).
2. Страница-конвертер загружает в браузер Pyodide — Python, собранный для браузера, — и запускает на этих CSV скрипт `data/build_data.py`. Тот же скрипт можно запустить и в Терминале, результат побайтно одинаковый. CSV никуда не отправляются: всё считается во вкладке.
3. Скрипт отбирает готовые квартиры и новые договоры аренды и связывает районы продаж с районами аренды. Затем он считает типичную цену и аренду за м² по районам, диапазонам площади и проектам и пишет один файл `data.json` с настройками кредита и сборов.
4. `data.json` вручную загружается на сервер рядом с `rent-vs-buy.js`. Калькулятор читает его при открытии страницы.

## Состав

| Путь | Что это |
| --- | --- |
| `widget/` | Калькулятор: Lit и TypeScript, расчёт в `src/calc.ts`, подсказки из данных в `src/hints.ts`, экран в `src/rent-vs-buy.ts` |
| `deploy/wp-content/rvb-test/rent-vs-buy.js` | Собранный калькулятор, этот файл лежит на сервере |
| `deploy/wp-content/themes/docode_theme/page-rent-vs-buy.php` | Шаблон WordPress для страницы `/rent-vs-buy/` |
| `deploy/wp-content/mu-plugins/rvb-test.php` | Плавающая кнопка калькулятора по адресу `?rvb=test` |
| `data/build_data.py`, `data/test_build_data.py` | Расчёт `data.json` из CSV и его тесты |
| `data/settings.json` | Ставка, взнос, срок, сборы и страховки по умолчанию |
| `data/area-overrides.csv` | Ручные правки районов: пустой `rent_area` скрывает район |
| `data/converter.template.html`, `data/build_converter.py` | Шаблон страницы-конвертера и её сборка |
| `data/rvb-converter.html` | Готовая страница-конвертер |
| `data/check_converter.mjs` | Проверка, что конвертер считает так же, как скрипт в Терминале |

CSV от DLD и `data.json` в репозиторий не входят.

## Для разработчика

Нужны Python 3.8+ и Node 24: тесты калькулятора запускаются на `.ts` напрямую.

```bash
python3 -I -B data/test_build_data.py      # тесты расчёта данных
python3 -I data/build_data.py              # data.json из CSV, лежащих в корне репозитория
python3 -I data/build_converter.py         # пересобрать страницу-конвертер
node data/check_converter.mjs data/rvb-converter.html deploy/wp-content/rvb-test/data.json transactions-*.csv rents-*.csv
```

Страницу-конвертер нужно пересобирать после любой правки `build_data.py`, `settings.json` или `area-overrides.csv`. Для проверки нужен Google Chrome. Ожидаемый `data.json` должен быть посчитан скриптом в Терминале на тех же CSV.

```bash
cd widget
npm ci
npm test          # тесты расчёта и подсказок
npm run check     # проверка типов
npm run build     # собирает deploy/wp-content/rvb-test/rent-vs-buy.js
```

Демо-страница: из корня репозитория запустить `python3 -m http.server 8765 --bind 127.0.0.1` и открыть http://127.0.0.1:8765/widget/demo.html. Без `deploy/wp-content/rvb-test/data.json` калькулятор работает в режиме ручного ввода.

## Встраивание

```html
<rent-vs-buy data-url="https://example.com/data.json"></rent-vs-buy>
<script src="https://example.com/rent-vs-buy.js"></script>
```

`mode="floating"` показывает калькулятор плавающей кнопкой в левом нижнем углу. Без `data-url` или если файл не загрузился, калькулятор работает на ручном вводе.

Расчёт ориентировочный и не является предложением или оценкой конкретной квартиры.
