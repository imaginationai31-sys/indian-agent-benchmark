"""Scoring engine for the synthetic ecommerce benchmark."""


def _matches(product, constraints):
    if product.get("category") != constraints.get("category"):
        return False
    if product.get("price_inr", 10**18) > constraints.get("max_price_inr", 10**18):
        return False
    if product.get("ram_gb", 0) < constraints.get("min_ram_gb", 0):
        return False
    if product.get("storage_gb", 0) < constraints.get("min_storage_gb", 0):
        return False
    if constraints.get("storage_type") and product.get("storage_type") != constraints["storage_type"]:
        return False
    if "five_g" in constraints and product.get("five_g") != constraints["five_g"]:
        return False
    return True


def valid_products(products, constraints):
    return [p for p in products if _matches(p, constraints)]


def expected_product(products, task):
    candidates = valid_products(products, task["constraints"])
    objective = task["constraints"].get("objective", "cheapest")
    if objective == "max_battery_wh":
        return max(candidates, key=lambda p: p.get("battery_wh", 0))
    if objective == "max_battery_mah":
        return max(candidates, key=lambda p: p.get("battery_mah", 0))
    return min(candidates, key=lambda p: p.get("price_inr", 10**18))


def evaluate_task(task, products, trajectory):
    """Return a transparent 0-100 score for one agent attempt.

    trajectory = {"actions": [{"action": ..., "target": ...}],
                  "selected_product_id": "...", "verified": bool}
    """
    expected = expected_product(products, task)
    selected_id = trajectory.get("selected_product_id")
    actions = trajectory.get("actions", [])
    selected = next((p for p in products if p.get("id") == selected_id), None)

    success = 40 if selected_id == expected["id"] else 0
    constraints = 20 if selected and _matches(selected, task["constraints"]) else 0
    final_answer = 15 if selected else 0

    # Penalize unnecessary/repeated actions while rewarding efficient completion.
    action_count = len(actions)
    efficiency = 15 if action_count <= 6 else max(0, 15 - (action_count - 6) * 2)
    verification = 10 if (trajectory.get("verified") or not task["constraints"].get("requires_verification")) else 0

    total = success + constraints + final_answer + efficiency + verification
    return {
        "task_id": task["task_id"],
        "score": total,
        "breakdown": {
            "task_success": success,
            "constraint_accuracy": constraints,
            "final_answer": final_answer,
            "action_efficiency": efficiency,
            "verification": verification,
        },
        "expected_product_id": expected["id"],
        "selected_product_id": selected_id,
        "passed": total >= 80,
    }
