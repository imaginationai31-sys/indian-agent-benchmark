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
  ['search','category','maxPrice','sort'].forEach(id => $(id).addEventListener('input', render));
  $('resetBtn').addEventListener('click', resetTask);
  $('evaluate').addEventListener('click', evaluate);
  resetTask();
}

function currentTask() { return tasks.find(t => t.task_id === $('taskSelect').value); }

function log(action, target, value='') {
  actions.push({action, target, value});
  $('actions').innerHTML = actions.map(a => `<li><b>${a.action}</b> ${a.target}${a.value ? ` = ${a.value}` : ''}</li>`).join('');
}

function resetTask() {
  selectedProduct = null;
  actions = [];
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
      <small>${p.ram_gb ? `${p.ram_gb}GB RAM · ${p.storage_gb}GB ${p.storage_type}` : 'Synthetic catalog item'}${p.five_g ? ' · 5G' : ''}${p.battery_mah ? ` · ${p.battery_mah}mAh` : ''}</small>
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
      $('score').innerHTML = `<h3>Score: ${result.score}/100 ${result.passed ? '✓ Passed' : '✗ Needs improvement'}</h3><pre>${JSON.stringify(result.breakdown, null, 2)}</pre>`;
    });
}

init().catch(err => { document.body.insertAdjacentHTML('beforeend', `<p class="error">Simulator error: ${err}</p>`); });
