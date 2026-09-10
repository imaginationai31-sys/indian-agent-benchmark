# Indian Agent Benchmark

A synthetic, multilingual benchmark for evaluating computer-use AI agents on realistic web tasks.

## v0.1

The first version focuses on a simulated e-commerce environment.

### Goals
- Evaluate multi-step browser-style tasks
- Test constraint following and reasoning
- Capture expected action trajectories
- Measure task success from 0–100
- Support multilingual Indian use cases

### Safety
All initial data and environments are synthetic. No real accounts, payments, private information, or transactions are used.

## Structure

```text
frontend/       Simulated web interface
backend/        Evaluation and server code
data/           Benchmark records
schemas/        JSON schemas
taxonomy/       Categories, languages, difficulty and failures
docs/            Dataset documentation
samples/        Public sample records
tests/           Automated tests
```

## Status

v0.1 foundation — 10 benchmark tasks and schemas.
