"""Transparent scoring engine for the synthetic multilingual ecommerce benchmark."""


def _matches(product, constraints):
    if product.get("category") != constraints.get("category"):
        return False
    if product.get("price_inr", 10**18) > constraints.get("max_price_inr", 10**18):
        return False
    if product.get("ram_gb", 0) < constraints.get("min_ram_gb", 0):
        return False
    if "storage_gb_exact" in constraints and product.get("storage_gb") != constraints["storage_gb_exact"]:
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
    if not candidates:
        raise ValueError(f"No valid products for {task['task_id']}")
    objective = task["constraints"].get("objective", "cheapest")
    if objective == "max_battery_wh":
        return max(candidates, key=lambda p: p.get("battery_wh", 0))
    if objective == "max_battery_mah":
        return max(candidates, key=lambda p: p.get("battery_mah", 0))
    return min(candidates, key=lambda p: p.get("price_inr", 10**18))


def _has_action(actions, action_name, target=None, value=None):
    return any(
        a.get("action") == action_name
        and (target is None or a.get("target") == target)
        and (value is None or a.get("value") == value)
        for a in actions
    )


def classify_failures(task, products, trajectory, selected):
    """Infer observable failure labels from the submitted trajectory."""
    failures = []
    actions = trajectory.get("actions", [])
    expected = expected_product(products, task)
    constraints = task["constraints"]

    if not selected:
        failures.append("incomplete_task")
        return failures

    if not _matches(selected, constraints):
        failures.extend(["ignored_constraint", "wrong_product"])
    elif selected["id"] != expected["id"]:
        failures.append("wrong_product")
        if constraints.get("objective") in {"max_battery_wh", "max_battery_mah", "cheapest"}:
            failures.append("incorrect_comparison")

    if constraints.get("requires_verification") and not trajectory.get("verified"):
        failures.append("failure_to_verify")

    if constraints.get("required_sort") and not _has_action(actions, "sort", "price", constraints["required_sort"]):
        failures.append("wrong_sort_order")

    seen = set()
    for action in actions:
        key = (action.get("action"), action.get("target"), action.get("value"))
        if key in seen:
            failures.append("repeated_action")
            break
        seen.add(key)

    selection_index = next((i for i, a in enumerate(actions) if a.get("action") == "select_product"), None)
    if selection_index is not None and selection_index == 0 and len(actions) > 1:
        failures.append("premature_selection")

    if len(actions) > 10:
        failures.append("unnecessary_action")

    # Detect explicitly contradictory search/filter values when they are submitted.
    for action in actions:
        if action.get("action") == "filter_price":
            try:
                if float(action.get("value")) > constraints.get("max_price_inr", 10**18):
                    failures.append("wrong_filter")
            except (TypeError, ValueError):
                failures.append("wrong_filter")
        if action.get("action") == "filter_category" and action.get("value") != constraints.get("category"):
            failures.append("wrong_filter")

    # Preserve order while removing duplicate labels.
    return list(dict.fromkeys(failures))


def evaluate_task(task, products, trajectory):
    """Return a transparent 0-100 score for one agent attempt."""
    expected = expected_product(products, task)
    selected_id = trajectory.get("selected_product_id")
    actions = trajectory.get("actions", [])
    selected = next((p for p in products if p.get("id") == selected_id), None)

    success = 40 if selected_id == expected["id"] else 0
    constraints = 20 if selected and _matches(selected, task["constraints"]) else 0
    final_answer = 15 if selected else 0

    action_count = len(actions)
    efficiency = 15 if action_count <= 6 else max(0, 15 - (action_count - 6) * 2)
    verification_required = task["constraints"].get("requires_verification", False)
    verification = 10 if (trajectory.get("verified") or not verification_required) else 0

    total = success + constraints + final_answer + efficiency + verification
    failures = classify_failures(task, products, trajectory, selected)
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
        "candidate_count": len(valid_products(products, task["constraints"])),
        "failure_modes": failures,
        "passed": total >= 80,
    }
