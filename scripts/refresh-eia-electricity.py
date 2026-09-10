from __future__ import annotations

import io
import json
import math
import re
import sys
import urllib.request
from pathlib import Path

from openpyxl import load_workbook

COST_DATA_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "sourcedCosts.json"
EIA_BILL_URL = "https://www.eia.gov/electricity/sales_revenue_price/xls/table_5A.xlsx"

STATE_CODES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY",
}


def normalize(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def download(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "take-home-savings-calculator data refresh"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"EIA download returned HTTP {response.status}")
        return response.read()


def find_bill_column(rows: list[list[object]]) -> int:
    # EIA's workbook has multi-row/merged headers. Search the first 25 rows for
    # any cell that explicitly names the monthly-bill column.
    for row in rows[:25]:
        for index, value in enumerate(row):
            text = normalize(value).lower()
            if "monthly bill" in text or ("bill" in text and "dollar" in text):
                return index
    raise RuntimeError("Could not locate EIA average-monthly-bill column")


def find_state_column(rows: list[list[object]], bill_col: int) -> int:
    # Prefer an explicit state header. If merged headers hide it, choose the
    # column containing the most exact U.S. state names.
    for row in rows[:25]:
        for index, value in enumerate(row):
            text = normalize(value).lower()
            if text in {"state", "census division and state", "census division/state"}:
                return index

    best_index = -1
    best_count = 0
    width = max((len(row) for row in rows), default=0)
    for index in range(width):
        if index == bill_col:
            continue
        count = sum(
            1
            for row in rows
            if index < len(row) and normalize(row[index]).rstrip("*") in STATE_CODES
        )
        if count > best_count:
            best_count = count
            best_index = index
    if best_count < 20:
        raise RuntimeError("Could not reliably identify EIA state-name column")
    return best_index


def workbook_year(rows: list[list[object]]) -> int | None:
    for row in rows[:20]:
        for value in row:
            text = normalize(value)
            match = re.search(r"\b(20\d{2})\b", text)
            if match:
                year = int(match.group(1))
                if 2000 <= year <= 2100:
                    return year
    return None


def main() -> None:
    raw = download(EIA_BILL_URL)
    workbook = load_workbook(io.BytesIO(raw), data_only=True, read_only=True)
    sheet = workbook.active
    rows = [list(row) for row in sheet.iter_rows(values_only=True)]

    bill_col = find_bill_column(rows)
    state_col = find_state_column(rows, bill_col)
    bills: dict[str, float] = {}

    for row in rows:
        if state_col >= len(row) or bill_col >= len(row):
            continue
        state_name = normalize(row[state_col]).rstrip("*")
        code = STATE_CODES.get(state_name)
        if not code:
            continue
        try:
            bill = float(row[bill_col])
        except (TypeError, ValueError):
            continue
        if not math.isfinite(bill) or bill < 30 or bill > 600:
            continue
        bills[code] = round(bill, 2)

    if len(bills) < 45:
        raise RuntimeError(f"EIA workbook yielded only {len(bills)} state/DC bill values")

    year = workbook_year(rows)
    existing = json.loads(COST_DATA_PATH.read_text())
    electricity = dict(existing.get("electricity", {}))
    electricity.update(
        {
            "stateAverageMonthlyBill": bills,
            "billPeriod": str(year) if year else electricity.get("billPeriod", "latest annual"),
            "source": "U.S. EIA residential average monthly bill by state",
            "sourceUrl": EIA_BILL_URL,
            # The EIA figure is for an average residential customer, while this
            # app models one renter. The factor is intentionally explicit and
            # editable in the generated data rather than hidden in application code.
            "singleRenterFactor": electricity.get("singleRenterFactor", 0.60),
            # The remainder of the utilities basket (water, trash, gas and home
            # internet) stays anchored to the metro-specific modeled benchmark.
            "modeledNonElectricShare": electricity.get("modeledNonElectricShare", 0.45),
        }
    )
    existing["electricity"] = electricity
    existing.setdefault("sources", {})["utilities"] = (
        "Electricity: U.S. EIA residential average monthly bill by state, scaled to a single-renter apartment; "
        "water, gas, trash and home internet remain modeled from the metro benchmark and are inflation-indexed."
    )

    COST_DATA_PATH.write_text(json.dumps(existing, indent=2) + "\n")
    print(f"Updated EIA residential electricity bills for {len(bills)} states/DC ({electricity['billPeriod']}).")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[EIA electricity] refresh skipped; keeping last-known-good data: {exc}", file=sys.stderr)
        # A source failure must never erase or corrupt the existing generated file.
        # Exit zero so other independent public sources can still refresh.
        sys.exit(0)
