let products = [];
let tasks = [];
let selectedProduct = null;
let actions = [];

const $ = (id) => document.getElementById(id);

async function init() {
  products = await fetch('/api/products').then(r => r.json());
  tasks = await fetch('/api/tasks').then(r => r.json());
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

function evaluate() {
  if (!selectedProduct) return alert('Select a product first.');
  fetch('/api/evaluate', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({task_id: currentTask().task_id, trajectory:{actions, selected_product_id:selectedProduct.id, verified:$('verified').checked}})})
    .then(r => r.json()).then(result => {
      const failures = result.failure_modes?.length ? `<p><b>Failure modes:</b> ${result.failure_modes.join(', ')}</p>` : '<p><b>Failure modes:</b> none</p>';
      $('score').innerHTML = `<h3>Score: ${result.score}/100 ${result.passed ? '✓ Passed' : '✗ Needs improvement'}</h3>${failures}<pre>${JSON.stringify(result.breakdown, null, 2)}</pre>`;
    });
}

init().catch(err => { document.body.insertAdjacentHTML('beforeend', `<p class="error">Simulator error: ${err}</p>`); });
