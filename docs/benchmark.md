# Benchmark v0.1

## Scope
The first runnable environment is a synthetic e-commerce catalog. It tests search, filtering, comparison, constraint following, product selection, verification, and action efficiency.

## Score
Each attempt receives 0–100 points:

| Dimension | Points |
|---|---:|
| Task success | 40 |
| Constraint accuracy | 20 |
| Final answer | 15 |
| Action efficiency | 15 |
| Verification | 10 |

A score of 80+ is considered a pass in v0.1.

## Failure cases
The dataset should deliberately include wrong filters, ignored constraints, premature selection, incorrect comparison, wrong product, repeated actions, unnecessary actions, action-order errors, incomplete tasks, incorrect final answers, and failure to verify.

## Scaling plan
- v0.1: 10 runnable ecommerce tasks
- v0.2: 50 tasks with adversarial variants
- v0.3: 100 tasks across ecommerce and travel
- v1.0: 1,000+ tasks across the full taxonomy
- Commercial release: 5,000 verified tasks plus a private hidden evaluation set

All environments and records should remain synthetic unless a separate licensing review establishes rights to external data.
