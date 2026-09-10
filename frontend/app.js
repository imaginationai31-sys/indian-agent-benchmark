const API_BASE = 'https://indian-agent-benchmark-api.imaginationai31.workers.dev';

let products = [];
let tasks = [];
let selectedProduct = null;
let actions = [];

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
  return response.json();
}

async function init() {
  [products, tasks] = await Promise.all([
    api('/api/products'),
    api('/api/tasks')
  ]);
  $('taskSelect').innerHTML = tasks.map(t => `<option value="${t.task_id}">${t.task_id} — ${t.language} / ${t.difficulty}</option>`).join('');
  $('taskSelect').addEventListener('change', resetTask);
  $('search').addEventListener('input', render);
  $('search').addEventListener('change', () => log('search', 'query', $('search').value.trim()));
  $('search').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); log('search', 'query', $('search').value.trim()); } });
  $('category').addEventListener('input', () => { log('filter_category', 'category', $('category').value || 'all'); render(); });
  $('maxPrice').addEventListener('change', () => { log('filter_price', 'max_price_inr', $('maxPrice').value); render(); });
  $('sort').addEventListener('change', () => { log('sort', 'price', $('sort').value); render(); });
  $('resetBtn').addEventListener('click', resetTask);
  $('evaluate').addEventListener('click', evaluate);
  resetTask();
}

function currentTask() { return tasks.find(t => t.task_id === $('taskSelect').value); }

function log(action, target, value='') {
  if (!action || (action !== 'select_product' && !value)) return;
  actions.push({action, target, value});
  $('actions').innerHTML = actions.map(a => `<li><b>${a.action}</b> ${a.target}${a.value ? ` = ${a.value}` : ''}</li>`).join('');
}

function resetTask() {
  selectedProduct = null;
  actions = [];
  $('search').value = '';
  $('category').value = '';
  $('maxPrice').value = '';
  $('sort').value = '';
  $('verified').checked = false;
  $('score').innerHTML = '';
  $('selected').textContent = 'No product selected';
  $('actions').innerHTML = '';
  $('taskText').textContent = currentTask()?.user_request || '';
  render();
}

function filtered() {
  const q = $('search').value.toLowerCase().trim();
  const category = $('category').value;
  const max = Number($('maxPrice').value) || Infinity;
  let list = products.filter(p => (!q || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q)) && (!category || p.category === category) && p.price_inr <= max);
  const sort = $('sort').value;
  if (sort === 'price_asc') list.sort((a,b) => a.price_inr-b.price_inr);
  if (sort === 'price_desc') list.sort((a,b) => b.price_inr-a.price_inr);
  return list;
}

function render() {
  $('products').innerHTML = filtered().map(p => `
    <article class="card">
      <div class="badge">${p.category}</div><h3>${p.name}</h3><p>${p.brand}</p>
      <strong>₹${p.price_inr.toLocaleString('en-IN')}</strong>
      <small>${p.ram_gb ? `${p.ram_gb}GB RAM · ${p.storage_gb}GB ${p.storage_type}` : 'Synthetic catalog item'}${p.five_g ? ' · 5G' : ''}${p.battery_mah ? ` · ${p.battery_mah}mAh` : ''}${p.battery_wh ? ` · ${p.battery_wh}Wh` : ''}</small>
      <button data-id="${p.id}">Select</button>
    </article>`).join('');
  document.querySelectorAll('.card button').forEach(btn => btn.addEventListener('click', () => select(btn.dataset.id)));
}

function select(id) {
  selectedProduct = products.find(p => p.id === id);
  log('select_product', id);
  $('selected').textContent = `${selectedProduct.name} — ₹${selectedProduct.price_inr.toLocaleString('en-IN')}`;
}

async function evaluate() {
  if (!selectedProduct) return alert('Select a product first.');
  try {
    const result = await api('/api/evaluate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({task_id: currentTask().task_id, trajectory:{actions, selected_product_id:selectedProduct.id, verified:$('verified').checked}})
    });
    const failures = result.failure_modes?.length ? `<p><b>Failure modes:</b> ${result.failure_modes.join(', ')}</p>` : '<p><b>Failure modes:</b> none</p>';
    $('score').innerHTML = `<h3>Score: ${result.score}/100 ${result.passed ? '✓ Passed' : '✗ Needs improvement'}</h3>${failures}<pre>${JSON.stringify(result.breakdown, null, 2)}</pre>`;
  } catch (err) {
    $('score').innerHTML = `<p class="error">Evaluation error: ${err.message}</p>`;
  }
}

init().catch(err => { document.body.insertAdjacentHTML('beforeend', `<p class="error">Simulator error: ${err}</p>`); });
