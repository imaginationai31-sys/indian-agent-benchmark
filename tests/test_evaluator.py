import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from evaluator import evaluate_task, expected_product, valid_products  # noqa: E402

PRODUCTS = json.loads((ROOT / "data/products.json").read_text(encoding="utf-8"))
TASKS = (
    json.loads((ROOT / "data/ecommerce_tasks.json").read_text(encoding="utf-8"))
    + json.loads((ROOT / "data/adversarial_tasks.json").read_text(encoding="utf-8"))
    + json.loads((ROOT / "data/v02_tasks.json").read_text(encoding="utf-8"))
)


def test_benchmark_has_50_unique_tasks():
    ids = [t["task_id"] for t in TASKS]
    assert len(TASKS) == 50
    assert len(ids) == len(set(ids))


def test_expected_products_are_valid():
    for task in TASKS:
        product = expected_product(PRODUCTS, task)
        assert product["id"] == task["expected_product_id"]
        assert product in valid_products(PRODUCTS, task["constraints"])


def test_exact_storage_constraint_excludes_512gb_models():
    task = next(t for t in TASKS if t["task_id"] == "ADV_000018")
    candidates = valid_products(PRODUCTS, task["constraints"])
    assert {p["id"] for p in candidates} == {"PHN-001", "PHN-002", "PHN-003"}
    assert expected_product(PRODUCTS, task)["id"] == "PHN-001"


def test_correct_selection_scores_at_least_90_when_verified():
    task = next(t for t in TASKS if t["task_id"] == "ECOM_000010")
    result = evaluate_task(task, PRODUCTS, {
        "actions": [{"action": "search", "target": "laptop"}, {"action": "select_product", "target": "LAP-001"}],
        "selected_product_id": "LAP-001",
        "verified": True,
    })
    assert result["score"] >= 90
    assert result["passed"] is True
    assert result["failure_modes"] == []


def test_required_sort_and_verification_are_detected():
    task = next(t for t in TASKS if t["task_id"] == "ECOM_000047")
    result = evaluate_task(task, PRODUCTS, {
        "actions": [{"action": "select_product", "target": "LAP-001"}],
        "selected_product_id": "LAP-001",
        "verified": False,
    })
    assert "wrong_sort_order" in result["failure_modes"]
    assert "failure_to_verify" in result["failure_modes"]


def test_wrong_product_reports_failure():
    task = TASKS[0]
    result = evaluate_task(task, PRODUCTS, {"actions": [], "selected_product_id": "LAP-004", "verified": False})
    assert result["task_id"] == task["task_id"]
    assert result["breakdown"]["task_success"] == 0
    assert result["passed"] is False
    assert "ignored_constraint" in result["failure_modes"]
    assert "wrong_product" in result["failure_modes"]
