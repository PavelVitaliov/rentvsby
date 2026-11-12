"""Тесты правил данных на синтетических строках. Запуск из корня: python3 -I -B data/test_build_data.py"""
import contextlib
import csv
import io
import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_data as bd


def sale(**over):
    """Продажа, проходящая все правила: 70 м², 14 000 AED/м²."""
    row = {"TRANSACTION_NUMBER": "T1", "INSTANCE_DATE": "2026-10-05 16:14:21", "GROUP_EN": "Sales", "IS_OFFPLAN_EN": "Ready",
           "USAGE_EN": "Residential", "PROCEDURE_EN": "Sale", "PROP_SB_TYPE_EN": "Flat", "AREA_EN": "Dubai Marina",
           "PROJECT_EN": "Tower", "TRANS_VALUE": "980000", "ACTUAL_AREA": "70"}
    return {**row, "PROCEDURE_AREA": over.get("ACTUAL_AREA", "70"), **over}


def rent(**over):
    """Договор, проходящий все правила: 70 м², 1 000 AED/м² в год."""
    row = {"REGISTRATION_DATE": "2026-10-01 01:41:17", "START_DATE": "2026-10-01 00:00:00", "END_DATE": "2027-09-30 00:00:00",
           "VERSION_EN": "New", "USAGE_EN": "Residential", "PROP_SUB_TYPE_EN": "Flat", "TOTAL_PROPERTIES": "1",
           "AREA_EN": "Marsa Dubai", "PROJECT_EN": "Tower", "ANNUAL_AMOUNT": "70000", "ACTUAL_AREA": "70"}
    return {**row, **over}


def spread(i):
    """Дата по кругу через все месяцы окна май–октябрь 2026."""
    return f"2026-{5 + i % 6:02d}-01 10:00:00"


def deal(area, per_sqm=1000, size=70, project="", day=date(2026, 10, 1)):
    """Очищенная строка."""
    return {"date": day, "area": area, "project": project, "size": size, "per_sqm": per_sqm}


class ReadRowsTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = Path(tmp.name)

    def write(self, name, *lines):
        path = self.dir / name
        path.write_text("\n".join(("A,B",) + lines) + "\n", encoding="utf-8-sig")
        return path

    def test_row_from_earlier_file_is_dropped_and_bom_is_stripped(self):
        rows, stats = bd.read_rows([self.write("x (1).csv", "1,a", "2,b"), self.write("y.csv", "2,b", "3,c")])
        self.assertEqual(rows, [{"A": "1", "B": "a"}, {"A": "2", "B": "b"}, {"A": "3", "B": "c"}])
        self.assertEqual(stats, [("x (1).csv", 2, 0), ("y.csv", 2, 1)])

    def test_repeats_inside_one_file_are_kept(self):
        rows, _ = bd.read_rows([self.write("x.csv", "1,a", "1,a")])
        self.assertEqual(len(rows), 2)

    def test_every_copy_in_later_file_is_dropped(self):
        rows, _ = bd.read_rows([self.write("x.csv", "1,a"), self.write("y.csv", "1,a", "1,a")])
        self.assertEqual(len(rows), 1)

    def test_partly_matching_row_is_not_an_overlap(self):
        rows, _ = bd.read_rows([self.write("x.csv", "1,a"), self.write("y.csv", "1,b")])
        self.assertEqual(len(rows), 2)

    def test_short_and_long_rows_do_not_crash(self):
        rows, _ = bd.read_rows([self.write("x.csv", "1", "2,b,extra"), self.write("y.csv", "2,b,extra")])
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["B"], "")

    def test_other_columns_in_later_file_stop_and_name_it(self):
        for header in ("B,A", "A,B,C", "A"):
            with self.subTest(header):
                (self.dir / "y.csv").write_text(f"{header}\n1,a\n", encoding="utf-8-sig")
                with self.assertRaisesRegex(SystemExit, "y.csv"):
                    bd.read_rows([self.write("x.csv", "1,a"), self.dir / "y.csv"])

    def test_empty_file_is_not_a_column_mismatch(self):
        (self.dir / "empty.csv").write_text("", encoding="utf-8")
        rows, _ = bd.read_rows([self.dir / "empty.csv", self.write("x.csv", "1,a"), self.dir / "empty.csv"])
        self.assertEqual(rows, [{"A": "1", "B": "a"}])

    def test_unreadable_file_stops_and_names_it(self):
        for encoding in ("utf-16", "utf-16-le"):
            with self.subTest(encoding):
                (self.dir / "bad.csv").write_text("A,B\n1,a\n", encoding=encoding)
                with self.assertRaisesRegex(SystemExit, "bad.csv"):
                    bd.read_rows([self.dir / "bad.csv"])


class CleanSalesTest(unittest.TestCase):
    def kept(self, *rows):
        return bd.clean_sales(list(rows))[0]

    def test_clean_row_fields(self):
        self.assertEqual(self.kept(sale()), [{"date": date(2026, 10, 5), "area": "DUBAI MARINA", "project": "TOWER",
                                              "size": 70.0, "per_sqm": 14000.0}])

    def test_names_are_normalised(self):
        row = self.kept(sale(AREA_EN="  dubai \t marina ", PROJECT_EN=" my   tower "))[0]
        self.assertEqual((row["area"], row["project"]), ("DUBAI MARINA", "MY TOWER"))

    def test_each_filter_drops_row(self):
        for field, value in [("GROUP_EN", "Gifts"), ("IS_OFFPLAN_EN", "Off-Plan"), ("USAGE_EN", "Commercial"),
                             ("PROCEDURE_EN", "Delayed Sell"), ("PROP_SB_TYPE_EN", "Villa")]:
            with self.subTest(field):
                self.assertEqual(self.kept(sale(**{field: value})), [])

    def test_last_row_of_transaction_number_wins(self):
        rows = self.kept(sale(TRANS_VALUE="700000"), sale(TRANS_VALUE="1400000"))
        self.assertEqual([r["per_sqm"] for r in rows], [20000.0])

    def test_blank_transaction_numbers_are_not_duplicates(self):
        self.assertEqual(len(self.kept(sale(TRANSACTION_NUMBER=""), sale(TRANSACTION_NUMBER=""))), 2)

    def test_duplicates_are_removed_after_filters(self):
        rows = self.kept(sale(TRANS_VALUE="700000"), sale(TRANS_VALUE="1400000", PROP_SB_TYPE_EN="Villa"))
        self.assertEqual([r["per_sqm"] for r in rows], [10000.0])

    def test_duplicates_are_removed_before_limits(self):
        self.assertEqual(self.kept(sale(), sale(ACTUAL_AREA="5")), [])

    def test_size_bounds(self):
        for size, expected in [(14.99, 0), (15, 1), (999.99, 1), (1000, 0)]:
            with self.subTest(size):
                row = sale(ACTUAL_AREA=str(size), TRANS_VALUE=str(size * 10000))
                self.assertEqual(len(self.kept(row)), expected)

    def test_price_bounds(self):
        for value, expected in [("299999", 0), ("300000", 1), ("10000000", 1), ("10000001", 0)]:
            with self.subTest(value):
                self.assertEqual(len(self.kept(sale(ACTUAL_AREA="100", TRANS_VALUE=value))), expected)

    def test_unreadable_numbers_are_dropped(self):
        for over in [{"TRANS_VALUE": "n/a"}, {"TRANS_VALUE": ""}, {"ACTUAL_AREA": ""}, {"ACTUAL_AREA": "n/a"}, {"ACTUAL_AREA": "0"}]:
            with self.subTest(over):
                self.assertEqual(self.kept(sale(**over)), [])

    def test_unreadable_date_is_dropped(self):
        self.assertEqual(self.kept(sale(INSTANCE_DATE="unknown")), [])

    def test_sale_of_a_share_is_dropped(self):
        for procedure_area, expected in [("35", 0), ("66", 0), ("66.5", 1), ("70.12", 1), ("73.5", 1), ("74", 0), ("", 0)]:
            with self.subTest(procedure_area):
                self.assertEqual(len(self.kept(sale(PROCEDURE_AREA=procedure_area))), expected)

    def test_stage_counts(self):
        rows = [sale(TRANSACTION_NUMBER="ok"),
                sale(TRANSACTION_NUMBER="villa", PROP_SB_TYPE_EN="Villa"),
                sale(TRANSACTION_NUMBER="twin"), sale(TRANSACTION_NUMBER="twin"),
                sale(TRANSACTION_NUMBER="share", PROCEDURE_AREA="35"),
                sale(TRANSACTION_NUMBER="small", ACTUAL_AREA="10", TRANS_VALUE="100000"),
                sale(TRANSACTION_NUMBER="cheap", TRANS_VALUE="1000"),
                sale(TRANSACTION_NUMBER="undated", INSTANCE_DATE="unknown")]
        clean, dropped = bd.clean_sales(rows)
        self.assertEqual(len(clean), 2)
        self.assertEqual(dropped, {"фильтры": 1, "дубли номера сделки": 1, "доли": 1, "площадь": 1, "сумма за м²": 1, "дата": 1})


class CleanRentsTest(unittest.TestCase):
    def kept(self, *rows):
        return bd.clean_rents(list(rows))[0]

    def test_clean_row_fields(self):
        row = rent(REGISTRATION_DATE="2026-10-07 01:41:17", START_DATE="2026-11-01 00:00:00")
        self.assertEqual(self.kept(row), [{"date": date(2026, 10, 7), "area": "MARSA DUBAI", "project": "TOWER",
                                           "size": 70.0, "per_sqm": 1000.0}])

    def test_each_filter_drops_row(self):
        for field, value in [("VERSION_EN", "Renewal"), ("USAGE_EN", "Commercial"), ("PROP_SUB_TYPE_EN", "Villa"),
                             ("TOTAL_PROPERTIES", "2")]:
            with self.subTest(field):
                self.assertEqual(self.kept(rent(**{field: value})), [])

    def test_spaces_around_type_and_count_are_ignored(self):
        self.assertEqual(len(self.kept(rent(PROP_SUB_TYPE_EN=" Flat ", TOTAL_PROPERTIES=" 1 "))), 1)

    def test_group_with_different_sizes_is_removed_but_other_rows_stay(self):
        rows = self.kept(rent(ACTUAL_AREA="70"), rent(ACTUAL_AREA="71"), rent(ACTUAL_AREA="72"), rent(START_DATE="other"))
        self.assertEqual(len(rows), 1)

    def test_contract_repeated_for_each_project_counts_once(self):
        self.assertEqual(len(self.kept(rent(PROJECT_EN="A"), rent(PROJECT_EN="B"), rent(PROJECT_EN="C"))), 1)

    def test_each_group_field_matters(self):
        for field, value in [("REGISTRATION_DATE", "2026-10-02 00:00:00"), ("START_DATE", "other"), ("END_DATE", "other"),
                             ("ANNUAL_AMOUNT", "71000"), ("AREA_EN", "Business Bay")]:
            with self.subTest(field):
                self.assertEqual(len(self.kept(rent(), rent(**{field: value}))), 2)

    def test_group_compares_normalised_area(self):
        self.assertEqual(len(self.kept(rent(AREA_EN="Marsa Dubai"), rent(AREA_EN=" MARSA  DUBAI"))), 1)

    def test_group_counts_only_rows_that_passed_filters(self):
        self.assertEqual(len(self.kept(rent(), rent(PROP_SUB_TYPE_EN="Villa"))), 1)

    def test_group_is_removed_before_limits(self):
        self.assertEqual(self.kept(rent(), rent(ACTUAL_AREA="5")), [])

    def test_size_bounds(self):
        for size, expected in [(14.99, 0), (15, 1), (999.99, 1), (1000, 0)]:
            with self.subTest(size):
                self.assertEqual(len(self.kept(rent(ACTUAL_AREA=str(size), ANNUAL_AMOUNT=str(size * 1000)))), expected)

    def test_rent_bounds(self):
        for value, expected in [("14999", 0), ("15000", 1), ("600000", 1), ("600001", 0)]:
            with self.subTest(value):
                self.assertEqual(len(self.kept(rent(ACTUAL_AREA="100", ANNUAL_AMOUNT=value))), expected)

    def test_unreadable_numbers_are_dropped(self):
        for over in [{"ANNUAL_AMOUNT": "n/a"}, {"ACTUAL_AREA": ""}]:
            with self.subTest(over):
                self.assertEqual(self.kept(rent(**over)), [])

    def test_stage_counts(self):
        rows = [rent(START_DATE="ok"),
                rent(START_DATE="villa", PROP_SUB_TYPE_EN="Villa"),
                rent(START_DATE="twin"), rent(START_DATE="twin"),
                rent(START_DATE="small", ACTUAL_AREA="10", ANNUAL_AMOUNT="10000"),
                rent(START_DATE="cheap", ANNUAL_AMOUNT="1000"),
                rent(START_DATE="undated", REGISTRATION_DATE="unknown")]
        clean, dropped = bd.clean_rents(rows)
        self.assertEqual(len(clean), 2)
        self.assertEqual(list(dropped.values()), [1, 1, 1, 1, 1])


class BandTest(unittest.TestCase):
    def test_bounds(self):
        for size, expected in [(14.99, None), (15, "15-50"), (49.99, "15-50"), (50, "50-90"), (89.99, "50-90"), (90, "90-140"),
                               (139.99, "90-140"), (140, "140+"), (999.99, "140+"), (1000, None)]:
            with self.subTest(size):
                self.assertEqual(bd.band_of(size), expected)


class AreaMapTest(unittest.TestCase):
    def link(self, sales, rents, overrides={}):
        return bd.build_area_map(sales, rents, overrides)["DUBAI MARINA"]

    def marina(self, *projects):
        return [deal("DUBAI MARINA", project=p) for p in projects]

    def test_linked_through_shared_project(self):
        link = self.link(self.marina("P", "P", "P"), [deal("MARSA DUBAI", project="P")])
        self.assertEqual(link, {"rent_area": "MARSA DUBAI", "how": "project", "shared": 3, "top_share": 1.0})

    def test_project_belongs_to_its_most_frequent_rent_area(self):
        rents = [deal("OTHER", project="P"), deal("MARSA DUBAI", project="P"), deal("MARSA DUBAI", project="P")]
        self.assertEqual(self.link(self.marina("P", "P", "P"), rents)["rent_area"], "MARSA DUBAI")

    def test_rent_rows_without_area_do_not_decide_project_home(self):
        rents = [deal("", project="P"), deal("", project="P"), deal("MARSA DUBAI", project="P")]
        self.assertEqual(self.link(self.marina("P", "P", "P"), rents)["rent_area"], "MARSA DUBAI")

    def test_tie_in_rent_areas_does_not_depend_on_row_order(self):
        rents = [deal("A", project="P"), deal("B", project="P")]
        sales = self.marina("P", "P", "P")
        self.assertEqual(self.link(sales, rents)["rent_area"], self.link(sales, rents[::-1])["rent_area"])

    def test_two_shared_sales_are_not_enough(self):
        link = self.link(self.marina("P", "P"), [deal("MARSA DUBAI", project="P")])
        self.assertEqual((link["rent_area"], link["how"], link["shared"]), ("", "none", 2))

    def test_eighty_percent_is_enough(self):
        rents = [deal("MARSA DUBAI", project="P"), deal("OTHER", project="Q")]
        link = self.link(self.marina("P", "P", "P", "P", "Q"), rents)
        self.assertEqual((link["rent_area"], link["how"], link["top_share"]), ("MARSA DUBAI", "project", 0.8))

    def test_below_eighty_percent_falls_back_to_name(self):
        rents = [deal("MARSA DUBAI", project="P"), deal("OTHER", project="Q"), deal("DUBAI MARINA")]
        link = self.link(self.marina(*["P"] * 79, *["Q"] * 21), rents)
        self.assertEqual((link["rent_area"], link["how"], link["top_share"]), ("DUBAI MARINA", "name", 0.79))

    def test_project_link_wins_over_same_name(self):
        rents = [deal("MARSA DUBAI", project="P"), deal("DUBAI MARINA")]
        self.assertEqual(self.link(self.marina("P", "P", "P"), rents)["how"], "project")

    def test_sales_of_projects_absent_from_rents_do_not_count_in_share(self):
        link = self.link(self.marina("P", "P", "P", "NEW", "NEW"), [deal("MARSA DUBAI", project="P")])
        self.assertEqual((link["how"], link["shared"], link["top_share"]), ("project", 3, 1.0))

    def test_no_project_and_no_name_is_hidden(self):
        link = self.link(self.marina("NEW"), [deal("MARSA DUBAI", project="P")])
        self.assertEqual(link, {"rent_area": "", "how": "none", "shared": 0, "top_share": 0})

    def test_empty_project_is_not_shared(self):
        link = self.link(self.marina("", "", ""), [deal("MARSA DUBAI", project="")])
        self.assertEqual(link["how"], "none")

    def test_override_replaces_link(self):
        link = self.link(self.marina("P", "P", "P"), [deal("MARSA DUBAI", project="P")], {"DUBAI MARINA": "OTHER"})
        self.assertEqual(link, {"rent_area": "OTHER", "how": "override", "shared": 3, "top_share": 1.0})

    def test_empty_override_hides_area(self):
        link = self.link(self.marina("P", "P", "P"), [deal("MARSA DUBAI", project="P")], {"DUBAI MARINA": ""})
        self.assertEqual((link["rent_area"], link["how"]), ("", "override"))

    def test_override_of_unknown_area_adds_nothing(self):
        table = bd.build_area_map(self.marina("P"), [deal("MARSA DUBAI", project="P")], {"NOWHERE": "MARSA DUBAI"})
        self.assertEqual(list(table), ["DUBAI MARINA"])

    def test_read_overrides(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "area-overrides.csv"
            path.write_text("sale_area,rent_area\n dubai  marina ,marsa dubai\nhidden area,\nshort row\n", encoding="utf-8-sig")
            self.assertEqual(bd.read_overrides(path), {"DUBAI MARINA": "MARSA DUBAI", "HIDDEN AREA": "", "SHORT ROW": ""})


class WindowTest(unittest.TestCase):
    def test_latest_date_of_either_set_gives_six_calendar_months(self):
        early, late = [deal("A", day=date(2026, 9, 1))], [deal("A", day=date(2026, 10, 31))]
        self.assertEqual(bd.window(early, late), (date(2026, 10, 31), date(2026, 5, 1)))
        self.assertEqual(bd.window(late, early), (date(2026, 10, 31), date(2026, 5, 1)))

    def test_window_crosses_new_year(self):
        rows = [deal("A", day=date(2026, 3, 15))]
        self.assertEqual(bd.window(rows, rows), (date(2026, 3, 15), date(2025, 10, 1)))

    def test_june_starts_in_january(self):
        rows = [deal("A", day=date(2026, 6, 1))]
        self.assertEqual(bd.window(rows, rows)[1], date(2026, 1, 1))

    def test_may_starts_in_december(self):
        rows = [deal("A", day=date(2026, 5, 20))]
        self.assertEqual(bd.window(rows, rows)[1], date(2025, 12, 1))


class EmptyDaysTest(unittest.TestCase):
    def test_days_without_records_up_to_the_end(self):
        seen = {date(2026, 5, 1), date(2026, 5, 3), date(2026, 5, 9)}
        self.assertEqual(bd.empty_days(seen, date(2026, 5, 1), date(2026, 5, 4)), [date(2026, 5, 2), date(2026, 5, 4)])


class PairsTest(unittest.TestCase):
    LINKED = {"rent_area": "MARSA DUBAI", "how": "project", "shared": 3, "top_share": 1.0}
    MARINA = {"DUBAI MARINA": LINKED}

    def pairs(self, sales, rents, area_map=None):
        return bd.build_pairs(sales, rents, area_map or self.MARINA)

    def test_thirty_on_both_sides_makes_a_pair(self):
        pairs = self.pairs([deal("DUBAI MARINA", 20000)] * 30, [deal("MARSA DUBAI", 1000)] * 30)
        self.assertEqual(pairs, [{"area": "DUBAI MARINA", "rent_area": "MARSA DUBAI", "band": "50-90", "sales": 30, "rents": 30,
                                  "sale": 20000, "rent": 1000, "ratio": 0.05, "sale_size": 70, "rent_size": 70}])

    def test_median_size_is_counted_per_side(self):
        sales = [deal("DUBAI MARINA", 20000, size=60)] * 30 + [deal("DUBAI MARINA", 20000, size=80)] * 31
        rents = [deal("MARSA DUBAI", 1000, size=55)] * 30
        pair = self.pairs(sales, rents)[0]
        self.assertEqual((pair["sale_size"], pair["rent_size"]), (80, 55))

    def test_size_drops_finds_falling_totals_only(self):
        def pair(band, sale, sale_size, rent, rent_size):
            return {"area": "A", "band": band, "sale": sale, "sale_size": sale_size, "rent": rent, "rent_size": rent_size}
        rising = [pair("15-50", 20000, 40, 1200, 40), pair("50-90", 15000, 70, 1000, 70)]
        self.assertEqual(bd.size_drops(rising), [])
        # Порядок строк не важен: 70 × 10000 = 700 000 меньше 40 × 20000 = 800 000
        falling = [pair("50-90", 10000, 70, 1000, 70), pair("15-50", 20000, 40, 1200, 40)]
        self.assertEqual(bd.size_drops(falling), [("A", "15-50", "50-90", "цена")])

    def test_twenty_nine_sales_are_not_enough(self):
        self.assertEqual(self.pairs([deal("DUBAI MARINA", 20000)] * 29, [deal("MARSA DUBAI", 1000)] * 30), [])

    def test_twenty_nine_rents_are_not_enough(self):
        self.assertEqual(self.pairs([deal("DUBAI MARINA", 20000)] * 30, [deal("MARSA DUBAI", 1000)] * 29), [])

    def test_price_by_own_name_and_rent_by_rent_area(self):
        area_map = {"DUBAI MARINA": self.LINKED, "DUBAI HARBOUR": self.LINKED}
        sales = [deal("DUBAI MARINA", 20000)] * 30 + [deal("DUBAI HARBOUR", 30000)] * 40
        rents = [deal("MARSA DUBAI", 1500)] * 50
        result = {p["area"]: (p["sale"], p["sales"], p["rent"], p["rents"]) for p in self.pairs(sales, rents, area_map)}
        self.assertEqual(result, {"DUBAI MARINA": (20000, 30, 1500, 50), "DUBAI HARBOUR": (30000, 40, 1500, 50)})

    def test_rents_under_own_sale_name_are_ignored(self):
        rents = [deal("MARSA DUBAI", 1000)] * 30 + [deal("DUBAI MARINA", 5000)] * 30
        self.assertEqual(self.pairs([deal("DUBAI MARINA", 20000)] * 30, rents)[0]["rent"], 1000)

    def test_bands_are_separate(self):
        sales = [deal("DUBAI MARINA", 20000, size=70)] * 30 + [deal("DUBAI MARINA", 40000, size=100)] * 30
        rents = [deal("MARSA DUBAI", 1000, size=70)] * 30 + [deal("MARSA DUBAI", 3000, size=100)] * 30
        result = {p["band"]: (p["sale"], p["rent"]) for p in self.pairs(sales, rents)}
        self.assertEqual(result, {"50-90": (20000, 1000), "90-140": (40000, 3000)})

    def test_medians_not_means(self):
        sales = [deal("DUBAI MARINA", 10000)] * 29 + [deal("DUBAI MARINA", 90000)]
        rents = [deal("MARSA DUBAI", 800)] * 29 + [deal("MARSA DUBAI", 5000)]
        pair = self.pairs(sales, rents)[0]
        self.assertEqual((pair["sale"], pair["rent"]), (10000, 800))

    def test_unlinked_area_gets_no_pair_even_with_blank_rent_rows(self):
        hidden = {"DUBAI MARINA": {"rent_area": "", "how": "none", "shared": 0, "top_share": 0}}
        self.assertEqual(self.pairs([deal("DUBAI MARINA", 20000)] * 30, [deal("", 1000)] * 30, hidden), [])

    def test_ratio_rule_bounds_without_rounding(self):
        for rent_per_sqm, expected in [(299.9, False), (300, True), (1200, True), (1200.4, False)]:
            with self.subTest(rent_per_sqm):
                pair = self.pairs([deal("DUBAI MARINA", 10000)] * 30, [deal("MARSA DUBAI", rent_per_sqm)] * 30)[0]
                self.assertEqual(bd.ratio_ok(pair), expected)

    def test_coverage_counts_contracts_once_per_rent_area_and_band(self):
        pairs = [{"sales": 10, "rents": 50, "rent_area": "R", "band": "50-90"},
                 {"sales": 20, "rents": 50, "rent_area": "R", "band": "50-90"},
                 {"sales": 30, "rents": 20, "rent_area": "R", "band": "90-140"}]
        self.assertEqual(bd.coverage(pairs, 100, 200), (0.6, 0.35))


class DisplayNameTest(unittest.TestCase):
    def test_names(self):
        for raw, expected in [("DUBAI MARINA", "Dubai Marina"),
                              ("MBR DISTRICT 1", "MBR District 1"),
                              ("INTERNATIONAL CITY PH 2 & 3", "International City Phase 2 & 3"),
                              ("DUBAI HEALTHCARE CITY - PHASE 1", "Dubai Healthcare City - Phase 1"),
                              ("CITY OF ARABIA", "City of Arabia"),
                              ("DAMAC HILLS", "DAMAC Hills"),
                              ("TECOM SITE A", "TECOM Site A"),
                              ("SOBHA HEARTLAND", "Sobha Hartland"),
                              ("AL BARSHAA SOUTH THIRD", "Al Barsha South Third"),
                              ("QASR SABAH I , II ,III", "Qasr Sabah I, II, III"),
                              ("GEMZ BY DANUBE", "Gemz by Danube"),
                              ("ACACIA AT PARK HEIGHTS", "Acacia at Park Heights")]:
            with self.subTest(raw):
                self.assertEqual(bd.display_name(raw), expected)


class BuildProjectsTest(unittest.TestCase):
    MARINA = {"DUBAI MARINA": PairsTest.LINKED}

    def projects(self, sales, rents, shown=("DUBAI MARINA",)):
        return bd.build_projects(sales, rents, self.MARINA, set(shown))

    def test_one_sale_is_enough_and_points_are_band_medians(self):
        sales = [deal("DUBAI MARINA", 30000, size=40, project="TOWER")] + [deal("DUBAI MARINA", v, size=s, project="TOWER")
                                                                            for v, s in ((20000, 60), (21000, 70), (25000, 80))]
        rents = [deal("MARSA DUBAI", 1400, size=70, project="TOWER")] * 2
        self.assertEqual(self.projects(sales, rents), {"DUBAI MARINA": [
            {"name": "Tower", "sales": [[40, 30000, 1], [70, 21000, 3]], "rents": [[70, 1400, 2]]}]})

    def test_rents_only_from_same_project_in_linked_rent_area(self):
        rents = [deal("MARSA DUBAI", 1400, project="OTHER"), deal("DUBAI MARINA", 1400, project="TOWER"), deal("JLT", 1400, project="TOWER")]
        self.assertEqual(self.projects([deal("DUBAI MARINA", 20000, project="TOWER")], rents)["DUBAI MARINA"][0]["rents"], [])

    def test_hidden_areas_blank_projects_and_rent_only_projects_are_not_listed(self):
        sales = [deal("DUBAI MARINA", 20000), deal("DUBAI HARBOUR", 20000, project="TOWER")]
        self.assertEqual(self.projects(sales, [deal("MARSA DUBAI", 1400, project="RENTED")]), {})

    def test_names_merge_by_display_name_and_sort_ignoring_case(self):
        sales = [deal("DUBAI MARINA", 20000, project=name) for name in ("FOO PH 1", "FOO PHASE 1", "ALPHA", "bravo")]
        result = self.projects(sales, [deal("MARSA DUBAI", 1400, project="FOO PHASE 1")])["DUBAI MARINA"]
        self.assertEqual([(p["name"], p["sales"][0][2], len(p["rents"])) for p in result], [("Alpha", 1, 0), ("Bravo", 1, 0), ("Foo Phase 1", 2, 1)])


class BuildJsonTest(unittest.TestCase):
    def test_structure_rounding_and_order(self):
        kept = [{"area": "MBR DISTRICT 1", "rent_area": "HADAEQ SHEIKH MOHAMMED BIN RASHID", "band": "50-90", "sales": 31, "rents": 40,
                 "sale": 15000.4, "rent": 1000.6, "ratio": 0.0667, "sale_size": 72.26, "rent_size": 68.5},
                {"area": "MADINAT HIND 4", "rent_area": "MADINAT HIND 4", "band": "140+", "sales": 30, "rents": 30,
                 "sale": 9000, "rent": 700, "ratio": 0.0778, "sale_size": 170, "rent_size": 165},
                {"area": "MADINAT HIND 4", "rent_area": "MADINAT HIND 4", "band": "15-50", "sales": 35, "rents": 36,
                 "sale": 8000, "rent": 650, "ratio": 0.0812, "sale_size": 40, "rent_size": 38}]
        tower = {"name": "Tower", "sales": [[70, 15000, 1]], "rents": []}
        result = bd.build_json(kept, {"MBR DISTRICT 1": [tower], "ELSEWHERE": [tower]}, date(2026, 10, 31), date(2026, 5, 1), {"ratePct": 5})
        self.assertEqual(result, {
            "asOf": "2026-10-31",
            "periodFrom": "2026-05",
            "periodTo": "2026-10",
            "config": {"ratePct": 5},
            "sizeBands": [{"id": "15-50", "from": 15, "to": 50}, {"id": "50-90", "from": 50, "to": 90},
                          {"id": "90-140", "from": 90, "to": 140}, {"id": "140+", "from": 140, "to": 1000}],
            "areas": [
                {"name": "Madinat Hind 4", "rentArea": "Madinat Hind 4",
                 "bands": {"140+": {"salePerSqm": 9000, "saleSizeSqm": 170, "sales": 30, "rentPerSqmYear": 700, "rentSizeSqm": 165, "rents": 30},
                           "15-50": {"salePerSqm": 8000, "saleSizeSqm": 40, "sales": 35, "rentPerSqmYear": 650, "rentSizeSqm": 38, "rents": 36}},
                 "projects": []},
                {"name": "MBR District 1", "rentArea": "Hadaeq Sheikh Mohammed Bin Rashid",
                 "bands": {"50-90": {"salePerSqm": 15000, "saleSizeSqm": 72.3, "sales": 31, "rentPerSqmYear": 1001, "rentSizeSqm": 68.5, "rents": 40}},
                 "projects": [tower]},
            ],
        })


class MainTest(unittest.TestCase):
    """Весь путь: CSV на диске, data.json, area-map.csv и отчёт."""

    SETTINGS = {"ratePct": 5, "downPaymentPct": 20, "termYears": 25, "fees": {"vatPct": 5}}

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.json_path = self.root / "deploy/wp-content/rvb-test/data.json"
        (self.root / "data").mkdir()
        (self.root / "data/settings.json").write_text(json.dumps(self.SETTINGS), encoding="utf-8")
        (self.root / "data/area-overrides.csv").write_text("sale_area,rent_area\nmanual,\nnot a real area,marsa dubai\n", encoding="utf-8-sig")

    def csv_file(self, name, rows):
        with open(self.root / name, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)

    def sales_of(self, area, project, n, per_sqm, day=None):
        return [sale(TRANSACTION_NUMBER=f"{area}-{project}-{i}", AREA_EN=area, PROJECT_EN=project, TRANS_VALUE=str(per_sqm * 70),
                     INSTANCE_DATE=day or spread(i)) for i in range(n)]

    def rents_of(self, area, project, n, per_sqm, day=None):
        return [rent(START_DATE=f"{area}-{project}-{i}", AREA_EN=area, PROJECT_EN=project, ANNUAL_AMOUNT=str(per_sqm * 70),
                     REGISTRATION_DATE=day or spread(i)) for i in range(n)]

    def write_scenario(self):
        tower_rents = self.rents_of("Marsa Dubai", "Tower", 30, 1400, day="2026-05-01 00:00:00")
        self.csv_file("transactions-2026-10-31 (1).csv",
                      self.sales_of("Dubai Marina", "Tower", 30, 20000, day="2026-05-01 00:00:00")
                      # 30 апреля вне окна, но попадает в таблицу районов
                      + self.sales_of("Dubai Marina", "April", 1, 99000, day="2026-04-30 23:59:59")
                      + self.sales_of("Old Sale", "Old", 3, 10000)
                      + self.sales_of("Hidden Area", "Hidden", 30, 10000)
                      + self.sales_of("Manual", "", 3, 10000)
                      + self.sales_of("Nowhere", "", 40, 10000))
        self.csv_file("transactions-2026-10-31.csv", self.sales_of("Dubai Marina", "Tower", 1, 20000, day="2026-05-01 00:00:00"))
        self.csv_file("rents-2026-10-31 (1).csv",
                      tower_rents
                      + self.rents_of("Marsa Dubai", "April", 1, 5000, day="2026-04-30 12:00:00")
                      + self.rents_of("Old Rent", "Old", 1, 1000, day="2026-04-30 12:00:00")
                      + self.rents_of("Hidden Rent", "Hidden", 30, 2000)
                      + self.rents_of("Manual", "", 1, 1000))
        # Повтор строки из другого файла считается один раз
        self.csv_file("rents-2026-10-31.csv", tower_rents[-1:] + self.rents_of("Late", "", 1, 1000, day="2026-10-31 08:00:00"))

    def run_main(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            bd.main(self.root)
        return out.getvalue()

    def test_data_json(self):
        self.write_scenario()
        self.run_main()
        self.assertEqual(json.loads(self.json_path.read_text(encoding="utf-8")), {
            "asOf": "2026-10-31",
            "periodFrom": "2026-05",
            "periodTo": "2026-10",
            "config": self.SETTINGS,
            "sizeBands": [{"id": "15-50", "from": 15, "to": 50}, {"id": "50-90", "from": 50, "to": 90},
                          {"id": "90-140", "from": 90, "to": 140}, {"id": "140+", "from": 140, "to": 1000}],
            "areas": [{"name": "Dubai Marina", "rentArea": "Marsa Dubai",
                       "bands": {"50-90": {"salePerSqm": 20000, "saleSizeSqm": 70, "sales": 30, "rentPerSqmYear": 1400, "rentSizeSqm": 70, "rents": 30}},
                       # Продажа апреля вне окна, поэтому у проекта April нет точек и его нет в списке
                       "projects": [{"name": "Tower", "sales": [[70, 20000, 30]], "rents": [[70, 1400, 30]]}]}],
        })

    def test_area_map_csv(self):
        self.write_scenario()
        self.run_main()
        with open(self.root / "data/area-map.csv", encoding="utf-8", newline="") as f:
            rows = list(csv.reader(f))
        self.assertEqual(rows, [
            ["sale_area", "display_name", "rent_area", "how", "window_sales", "shared_project_sales", "top_share", "bands_kept"],
            ["NOWHERE", "Nowhere", "", "none", "40", "0", "0.000", ""],
            ["DUBAI MARINA", "Dubai Marina", "MARSA DUBAI", "project", "30", "31", "1.000", "50-90"],
            ["HIDDEN AREA", "Hidden Area", "HIDDEN RENT", "project", "30", "30", "1.000", ""],
            ["MANUAL", "Manual", "", "override", "3", "0", "0.000", ""],
            # Район аренды известен только по договору апреля: таблица строится по всем месяцам
            ["OLD SALE", "Old Sale", "OLD RENT", "project", "3", "3", "1.000", ""],
        ])

    def test_report_names_hidden_pair_and_bad_override(self):
        self.write_scenario()
        report = self.run_main()
        self.assertIn("Hidden Area", report)
        self.assertIn("20.0%", report)
        self.assertIn("NOT A REAL AREA", report)

    def test_report_gives_project_counts_and_shares(self):
        self.write_scenario()
        report = self.run_main()
        self.assertIn("Проекты в показанных районах: 1, с договорами аренды 1; их сделки: 28.3% продаж и 48.4% договоров окна", report)  # 30 из 106 и 30 из 62

    def test_report_gives_linked_share_of_window_and_of_all_sales(self):
        self.write_scenario()
        report = self.run_main()
        self.assertIn("59.4%", report)  # 63 из 106 продаж окна
        self.assertIn("59.8%", report)  # 64 из 107 всех очищенных продаж

    def assert_stops(self, message):
        self.json_path.parent.mkdir(parents=True, exist_ok=True)
        self.json_path.write_text("old", encoding="utf-8")
        with self.assertRaisesRegex(SystemExit, message):
            self.run_main()
        self.assertEqual(self.json_path.read_text(encoding="utf-8"), "old")
        self.assertFalse((self.root / "data/area-map.csv").exists())

    def test_no_csv_stops_before_overwriting_files(self):
        self.assert_stops("Нет очищенных")

    def test_no_pairs_stops_before_overwriting_files(self):
        self.csv_file("transactions-2026-10-31.csv", self.sales_of("Dubai Marina", "Tower", 6, 20000))
        self.csv_file("rents-2026-10-31.csv", self.rents_of("Marsa Dubai", "Tower", 6, 1400))
        self.assert_stops("Ни одна пара")

    def test_broken_number_or_date_format_in_one_file_stops(self):
        self.write_scenario()
        for over in ({"TRANS_VALUE": "1,400,000"}, {"ACTUAL_AREA": "70,5"}, {"PROCEDURE_AREA": "70,5"}, {"INSTANCE_DATE": "05/10/2026"}):
            with self.subTest(over):
                self.csv_file("transactions-z.csv", [sale(TRANSACTION_NUMBER=f"z{i}", **over) for i in range(20)])
                self.assert_stops("формат чисел и дат")
        (self.root / "transactions-z.csv").unlink()
        for over in ({"ANNUAL_AMOUNT": "70,000"}, {"ACTUAL_AREA": "70,5"}, {"REGISTRATION_DATE": "05/10/2026"}):
            with self.subTest(over):
                self.csv_file("rents-z.csv", [rent(START_DATE=f"z{i}", **over) for i in range(20)])
                self.assert_stops("формат чисел и дат")

    def test_few_unreadable_numbers_are_dropped_without_stopping(self):
        self.write_scenario()
        self.csv_file("transactions-z.csv", [sale(TRANSACTION_NUMBER="z", TRANS_VALUE="1,400,000")])
        self.csv_file("rents-z.csv", [rent(START_DATE="z", ANNUAL_AMOUNT="70,000")])
        self.run_main()
        self.assertEqual(json.loads(self.json_path.read_text(encoding="utf-8"))["areas"][0]["bands"]["50-90"]["sales"], 30)

    def test_future_date_stops(self):
        self.write_scenario()
        self.csv_file("rents-z.csv", self.rents_of("Marsa Dubai", "Far", 1, 1000, day="2099-01-01 10:00:00"))
        self.assert_stops("2099-01-01")

    def test_month_of_window_without_rows_stops(self):
        self.csv_file("transactions-a.csv", self.sales_of("Dubai Marina", "Tower", 30, 20000))
        self.csv_file("rents-a.csv", self.rents_of("Marsa Dubai", "Tower", 30, 1400, day="2026-10-01 10:00:00"))
        self.assert_stops("договоров только за 2026-10")
        self.csv_file("transactions-a.csv", self.sales_of("Dubai Marina", "Tower", 30, 20000, day="2026-10-01 10:00:00"))
        self.csv_file("rents-a.csv", self.rents_of("Marsa Dubai", "Tower", 30, 1400))
        self.assert_stops("продаж только за 2026-10")

    def test_names_the_widget_would_reject_stop(self):
        rents = self.rents_of("Marsa Dubai", "Tower", 30, 1400)
        self.csv_file("rents-a.csv", rents)
        for sales in (self.sales_of("", "Tower", 30, 20000),
                      self.sales_of("Foo Ph 1", "Tower", 30, 20000) + self.sales_of("Foo Phase 1", "Tower", 30, 20000)):
            with self.subTest(sales[0]["AREA_EN"]):
                self.csv_file("transactions-a.csv", sales)
                self.assert_stops("название района")
        self.csv_file("transactions-a.csv", self.sales_of("Dubai Marina", "Tower", 30, 20000) + self.sales_of("Dubai Marina", "X" * 101, 1, 20000))
        self.assert_stops("Название проекта длиннее 100 знаков")

    def test_settings_the_widget_would_reject_stop(self):
        self.write_scenario()
        good = {"ratePct": 5, "downPaymentPct": 20, "termYears": 25, "fees": {}}
        for bad in ([], {}, {**good, "ratePct": -1}, {**good, "ratePct": "5"}, {**good, "downPaymentPct": 100}, {**good, "downPaymentPct": None},
                    {**good, "termYears": 0}, {**good, "termYears": 26}, {**good, "termYears": 2.5}, {**good, "fees": []},
                    {**good, "fees": {"vatPct": -1}}, {**good, "fees": {"vatPct": True}}, {k: v for k, v in good.items() if k != "fees"}):
            with self.subTest(bad):
                (self.root / "data/settings.json").write_text(json.dumps(bad), encoding="utf-8")
                self.assert_stops("settings.json")

    def test_missing_column_stops_and_names_it(self):
        self.csv_file("transactions-a.csv", [{k: v for k, v in sale().items() if k != "ACTUAL_AREA"}])
        self.csv_file("rents-a.csv", self.rents_of("Marsa Dubai", "Tower", 6, 1400))
        self.assert_stops("ACTUAL_AREA")


if __name__ == "__main__":
    unittest.main()
