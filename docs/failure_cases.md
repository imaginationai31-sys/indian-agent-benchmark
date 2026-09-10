# Adversarial Failure Cases v0.2

The benchmark should measure *why* an agent failed, not only whether the final product was wrong.

| Failure mode | Example signal |
|---|---|
| wrong_search_query | Search terms omit a required attribute |
| wrong_filter | Filter value does not match the task |
| ignored_constraint | Selected product violates one requirement |
| wrong_sort_order | Agent uses a sort direction contrary to instruction |
| premature_selection | Agent selects before comparing candidates |
| incorrect_comparison | Agent compares incomplete or unrelated attributes |
| wrong_product | Final product is not the expected optimum |
| hallucinated_information | Agent claims an attribute not present in catalog |
| failed_navigation | Agent cannot reach required product/detail state |
| repeated_action | Same action is repeated without new information |
| unnecessary_action | Extra actions add no useful information |
| action_order_error | Verification or selection happens in the wrong order |
| incomplete_task | Agent stops before completing required steps |
| incorrect_final_answer | Final response conflicts with selected/catalog product |
| failure_to_verify | Task explicitly requires verification but agent skips it |

## Adversarial design principles

1. Every task should have one clearly defined gold outcome.
2. Traps should be plausible and detectable from the environment.
3. Multilingual tasks must preserve the same logical constraints as their English counterparts.
4. Do not make a task solvable from product IDs or naming conventions alone.
5. Keep the environment synthetic so the benchmark can be redistributed under an explicit dataset license.
