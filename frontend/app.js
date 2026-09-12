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
  [products, tasks] = await Promise.all([api('/api/products'), api('/api/tasks')]);
  $('taskCount').textContent = tasks.length;
  $('productCount').textContent = products.length;
  $('taskSelect').innerHTML = tasks.map(t => `<option value="${escapeHtml(t.task_id)}">${escapeHtml(t.task_id)} — ${escapeHtml(t.language)} / ${escapeHtml(t.difficulty)}</option>`).join('');
  $('taskSelect').addEventListener('change', resetTask);
  $('search').addEventListener('input', render);
  $('search').addEventListener('change', () => log('search', 'query', $('search').value.trim()));
  $('search').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); log('search', 'query', $('search').value.trim()); } });
  $('category').addEventListener('change', () => { log('filter_category', 'category', $('category').value || 'all'); render(); });
  $('maxPrice').addEventListener('change', () => { if ($('maxPrice').value) log('filter_price', 'max_price_inr', $('maxPrice').value); render(); });
  $('sort').addEventListener('change', () => { if ($('sort').value) log('sort', 'price', $('sort').value); render(); });
  $('resetBtn').addEventListener('click', resetTask);
  $('evaluate').addEventListener('click', evaluate);
  resetTask();
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c])); }
function currentTask() { return tasks.find(t => t.task_id === $('taskSelect').value); }

function log(action, target, value = '') {
  if (!action || (action !== 'select_product' && !value)) return;
  actions.push({ action, target, value });
  $('actions').innerHTML = `<ol>${actions.map(a => `<li><b>${escapeHtml(a.action)}</b> · ${escapeHtml(a.target)}${a.value ? ` = ${escapeHtml(a.value)}` : ''}</li>`).join('')}</ol>`;
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
  $('selected').innerHTML = '<span class="selected-label">SELECTED PRODUCT</span><strong>No product selected</strong><small>Choose a catalog item to continue</small>';
  $('actions').innerHTML = '<div class="empty-trace">Actions will appear here as you interact with the catalog.</div>';
  const task = currentTask();
  $('taskText').textContent = task?.user_request || '';
  $('taskMeta').innerHTML = task ? `<span class="meta-pill">${escapeHtml(task.task_id)}</span><span class="meta-pill">${escapeHtml(task.language)}</span><span class="meta-pill">${escapeHtml(task.difficulty)}</span><span class="meta-pill">${escapeHtml(task.category)}</span>` : '';
  render();
}

function filtered() {
  const q = $('search').value.toLowerCase().trim();
  const category = $('category').value;
  const max = Number($('maxPrice').value) || Infinity;
  let list = products.filter(p => (!q || `${p.name} ${p.brand} ${p.category} ${p.id}`.toLowerCase().includes(q)) && (!category || p.category === category) && p.price_inr <= max);
  const sort = $('sort').value;
  if (sort === 'price_asc') list.sort((a,b) => a.price_inr - b.price_inr);
  if (sort === 'price_desc') list.sort((a,b) => b.price_inr - a.price_inr);
  return list;
}

function render() {
  const list = filtered();
  $('resultCount').textContent = `${list.length} result${list.length === 1 ? '' : 's'}`;
  $('products').innerHTML = list.length ? list.map(p => `
    <article class="card">
      <div class="badge">${escapeHtml(p.category)}</div>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.brand)} · ${escapeHtml(p.id)}</p>
      <strong>₹${p.price_inr.toLocaleString('en-IN')}</strong>
      <small>${p.ram_gb ? `${p.ram_gb}GB RAM · ${p.storage_gb}GB ${escapeHtml(p.storage_type || 'storage')}` : 'Synthetic catalog item'}${p.five_g ? ' · 5G' : ''}${p.battery_mah ? ` · ${p.battery_mah}mAh` : ''}${p.battery_wh ? ` · ${p.battery_wh}Wh` : ''}</small>
      <button data-id="${escapeHtml(p.id)}">Select product</button>
    </article>`).join('') : '<div class="empty-trace">No products match the current filters.</div>';
  document.querySelectorAll('.card button').forEach(btn => btn.addEventListener('click', () => select(btn.dataset.id)));
}

function select(id) {
  selectedProduct = products.find(p => p.id === id);
  if (!selectedProduct) return;
  log('select_product', id, selectedProduct.name);
  $('selected').innerHTML = `<span class="selected-label">SELECTED PRODUCT</span><strong>${escapeHtml(selectedProduct.name)}</strong><small>₹${selectedProduct.price_inr.toLocaleString('en-IN')} · ${escapeHtml(selectedProduct.id)}</small>`;
}

async function evaluate() {
  if (!selectedProduct) return alert('Select a product first.');
  const button = $('evaluate');
  button.disabled = true;
  button.innerHTML = 'Evaluating…';
  try {
    const result = await api('/api/evaluate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({task_id:currentTask().task_id, trajectory:{actions, selected_product_id:selectedProduct.id, verified:$('verified').checked}}) });
    const passed = result.passed;
    const failures = result.failure_modes?.length ? `<p><b>Failure modes:</b> ${result.failure_modes.map(escapeHtml).join(', ')}</p>` : '<p><b>Failure modes:</b> none</p>';
    $('score').innerHTML = `<div class="score-card"><div class="score-main"><div><div class="section-label">EVALUATION RESULT</div><div class="score-number ${passed ? 'pass' : 'fail'}">${result.score}/100</div></div><strong class="${passed ? 'pass' : 'fail'}">${passed ? '✓ Passed' : '✗ Needs improvement'}</strong></div>${failures}<pre>${escapeHtml(JSON.stringify(result.breakdown, null, 2))}</pre></div>`;
  } catch (err) {
    $('score').innerHTML = `<div class="error">Evaluation error: ${escapeHtml(err.message)}</div>`;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Run evaluation <span>→</span>';
  }
}

init().catch(err => { $('products').innerHTML = `<div class="error">Unable to load benchmark data. ${escapeHtml(err.message)}</div>`; $('taskText').textContent = 'Backend connection unavailable. Please verify the Cloudflare Worker API.'; });
