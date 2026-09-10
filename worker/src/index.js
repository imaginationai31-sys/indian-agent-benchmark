import products from '../../data/products.json';
import ecommerceTasks from '../../data/ecommerce_tasks.json';
import adversarialTasks from '../../data/adversarial_tasks.json';
import v02Tasks from '../../data/v02_tasks.json';

const TASKS = [...ecommerceTasks, ...adversarialTasks, ...v02Tasks];

function matches(product, constraints) {
  if (constraints.category && product.category !== constraints.category) return false;
  if (product.price_inr > (constraints.max_price_inr ?? Infinity)) return false;
  if (product.ram_gb < (constraints.min_ram_gb ?? 0)) return false;
  if (constraints.storage_gb_exact != null && product.storage_gb !== constraints.storage_gb_exact) return false;
  if (product.storage_gb < (constraints.min_storage_gb ?? 0)) return false;
  if (constraints.storage_type && product.storage_type !== constraints.storage_type) return false;
  if (constraints.five_g != null && product.five_g !== constraints.five_g) return false;
  return true;
}

function expectedProduct(task) {
  const candidates = products.filter(p => matches(p, task.constraints));
  if (!candidates.length) return null;
  const objective = task.constraints.objective || 'cheapest';
  if (objective === 'max_battery_wh') return candidates.reduce((a,b) => (b.battery_wh || 0) > (a.battery_wh || 0) ? b : a);
  if (objective === 'max_battery_mah') return candidates.reduce((a,b) => (b.battery_mah || 0) > (a.battery_mah || 0) ? b : a);
  return candidates.reduce((a,b) => b.price_inr < a.price_inr ? b : a);
}

function classify(task, trajectory, selected, expected) {
  const failures = [];
  const actions = trajectory.actions || [];
  const seen = new Set();
  for (const a of actions) {
    const key = JSON.stringify(a);
    if (seen.has(key)) failures.push('repeated_action');
    seen.add(key);
  }
  const sort = task.constraints.required_sort;
  if (sort && !actions.some(a => a.action === 'sort' && a.value === sort)) failures.push('wrong_sort_order');
  const selectIndex = actions.findIndex(a => a.action === 'select_product');
  const hasDiscovery = actions.some(a => ['search','filter_category','filter_price'].includes(a.action));
  if (selectIndex >= 0 && !hasDiscovery && task.constraints.category) failures.push('premature_selection');
  if (!selected) failures.push('incomplete_task');
  else if (!matches(selected, task.constraints)) failures.push('ignored_constraint');
  if (selected && expected && selected.id !== expected.id) {
    failures.push('wrong_product');
    if (['max_battery_wh','max_battery_mah'].includes(task.constraints.objective)) failures.push('incorrect_comparison');
  }
  if (task.constraints.requires_verification && !trajectory.verified) failures.push('failure_to_verify');
  if (actions.length > 10) failures.push('unnecessary_action');
  return [...new Set(failures)];
}

function evaluate(task, trajectory = {}) {
  const expected = expectedProduct(task);
  const selected = products.find(p => p.id === trajectory.selected_product_id);
  const success = selected && expected && selected.id === expected.id ? 40 : 0;
  const constraintAccuracy = selected && matches(selected, task.constraints) ? 20 : 0;
  const finalAnswer = selected ? 15 : 0;
  const count = (trajectory.actions || []).length;
  const efficiency = count <= 6 ? 15 : Math.max(0, 15 - (count - 6) * 2);
  const verification = trajectory.verified || !task.constraints.requires_verification ? 10 : 0;
  const score = success + constraintAccuracy + finalAnswer + efficiency + verification;
  return {
    task_id: task.task_id,
    score,
    breakdown: { task_success: success, constraint_accuracy: constraintAccuracy, final_answer: finalAnswer, action_efficiency: efficiency, verification },
    expected_product_id: expected?.id || null,
    selected_product_id: trajectory.selected_product_id || null,
    failure_modes: classify(task, trajectory, selected, expected),
    passed: score >= 80
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } });
    if (url.pathname === '/api/health') return json({ ok: true, version: '0.2', tasks: TASKS.length });
    if (url.pathname === '/api/products' && request.method === 'GET') return json(products);
    if (url.pathname === '/api/tasks' && request.method === 'GET') return json(TASKS);
    if (url.pathname === '/api/evaluate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const task = TASKS.find(t => t.task_id === body.task_id);
        if (!task) return json({ error: 'Unknown task' }, 400);
        return json(evaluate(task, body.trajectory));
      } catch (e) { return json({ error: e.message }, 400); }
    }
    return json({ error: 'Not found' }, 404);
  }
};
