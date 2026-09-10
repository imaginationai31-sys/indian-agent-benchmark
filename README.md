# Indian Agent Benchmark

A synthetic, multilingual benchmark for evaluating computer-use AI agents on realistic web tasks.

## v0.2

The benchmark now includes **50 runnable synthetic e-commerce tasks** covering English, Hindi, Hinglish, Tamil, Bengali, Telugu, and Marathi. The task set combines baseline tasks with adversarial and constraint-heavy variants.

### Goals
- Evaluate multi-step browser-style tasks
- Test constraint following and reasoning
- Capture expected action trajectories
- Measure task success from 0–100
- Detect common agent failure modes automatically
- Support multilingual Indian use cases

### Current coverage
- 50 benchmark tasks
- 20 synthetic catalog products
- Exact storage and minimum-storage constraints
- Cheapest and maximum-battery objectives
- Required sorting and verification checks
- Automatic failure-mode classification
- Browser-style trajectory logging

### Safety
All benchmark data and environments are synthetic. No real accounts, payments, private information, or transactions are used.

## Run locally

```bash
python backend/server.py
```

Then open `http://localhost:8000` in a browser.

Run the test suite with:

```bash
python -m unittest discover -s tests -p 'test_*.py'
```

GitHub Actions runs the same tests automatically on pushes and pull requests.

## Structure

```text
frontend/       Simulated web interface
backend/        Evaluation and server code
data/           Benchmark records and synthetic catalog
taxonomy/       Categories, languages, difficulty and failures
schemas/        JSON schemas
docs/            Dataset documentation
tests/           Automated tests
.github/        Continuous integration workflow
```

## Data packaging roadmap

- v0.2: 50 public runnable tasks
- v0.3: 100+ tasks across additional simulated web domains
- v1.0: 1,000+ benchmark tasks
- Commercial release target: 5,000 verified tasks plus a private hidden evaluation set

The commercial dataset should keep hidden evaluation records and sensitive annotation metadata outside the public repository.
