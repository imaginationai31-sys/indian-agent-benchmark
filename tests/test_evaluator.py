import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from evaluator import evaluate_task, expected_product  # noqa: E402

PRODUCTS = json.loads((ROOT / "data/products.json").read_text(encoding="utf-8"))
TASKS = json.loads((ROOT / "data/ecommerce_tasks.json").read_text(encoding="utf-8"))


def test_expected_products_are_valid():
    for task in TASKS:
        product = expected_product(PRODUCTS, task)
        assert product["id"] == task["expected_product_id"]


def test_correct_selection_scores_at_least_90_when_verified():
    task = next(t for t in TASKS if t["task_id"] == "ECOM_000010")
    result = evaluate_task(task, PRODUCTS, {
        "actions": [{"action": "search", "target": "laptop"}, {"action": "select_product", "target": "LAP-001"}],
        "selected_product_id": "LAP-001",
        "verified": True,
    })
    assert result["score"] >= 90
    assert result["passed"] is True


def test_wrong_product_fails_task_success():
    task = TASKS[0]
    result = evaluate_task(task, PRODUCTS, {"actions": [], "selected_product_id": "LAP-004", "verified": False})
    assert result["task_id"] == task["task_id"]
    assert result["breakdown"]["task_success"] == 0
    assert result["passed"] is False
