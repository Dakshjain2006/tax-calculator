// ── Tax Slab Data (FY 2024-25) ──
const SLABS = {
  new: [
    [0,       300000,   0.00],
    [300000,  700000,   0.05],
    [700000,  1000000,  0.10],
    [1000000, 1200000,  0.15],
    [1200000, 1500000,  0.20],
    [1500000, Infinity, 0.30],
  ],
  old_general: [
    [0,       250000,   0.00],
    [250000,  500000,   0.05],
    [500000,  1000000,  0.20],
    [1000000, Infinity, 0.30],
  ],
  old_senior: [
    [0,       300000,   0.00],
    [300000,  500000,   0.05],
    [500000,  1000000,  0.20],
    [1000000, Infinity, 0.30],
  ],
  old_super: [
    [0,       500000,   0.00],
    [500000,  1000000,  0.20],
    [1000000, Infinity, 0.30],
  ],
};

let regime = 'new';

// ── Regime toggle ──
function setRegime(r) {
  regime = r;
  document.getElementById('new-btn').classList.toggle('active', r === 'new');
  document.getElementById('old-btn').classList.toggle('active', r === 'old');
  document.getElementById('old-fields').classList.toggle('hidden', r === 'new');
  calculate();
}

// ── Helpers ──
function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function getVal(id, fallback = 0) {
  return parseFloat(document.getElementById(id)?.value) || fallback;
}

/**
 * Calculate tax using given slabs.
 * Returns { tax, rows }
 */
function calcTax(taxable, slabs) {
  let tax  = 0;
  const rows = [];
  for (const [low, high, rate] of slabs) {
    if (taxable <= low) break;
    const amount = Math.min(taxable, high) - low;
    const t      = amount * rate;
    rows.push({ low, high, rate, amount, t });
    tax += t;
  }
  return { tax, rows };
}

// ── Main calculation ──
function calculate() {
  const income = getVal('income');
  const age    = document.getElementById('age').value;

  let taxable, deductions, slabs;

  if (regime === 'new') {
    deductions = 75000; // standard deduction FY24-25
    taxable    = Math.max(0, income - deductions);
    slabs      = SLABS.new;
  } else {
    const stdDed = 50000;
    const hra    = Math.min(getVal('hra'),    income * 0.4);
    const s80c   = Math.min(getVal('sec80c'), 150000);
    const s80d   = Math.min(getVal('sec80d'), 75000);
    const other  = getVal('other');
    deductions   = stdDed + hra + s80c + s80d + other;
    taxable      = Math.max(0, income - deductions);
    slabs        = age === 'super' ? SLABS.old_super
                 : age === 'senior' ? SLABS.old_senior
                 : SLABS.old_general;
  }

  let { tax, rows } = calcTax(taxable, slabs);

  // Rebate u/s 87A
  if (regime === 'new' && taxable <= 700000)  tax = 0;
  if (regime === 'old' && taxable <= 500000)  tax = 0;

  const cess     = tax * 0.04;
  const total    = tax + cess;
  const inhand   = (income - total) / 12;
  const effRate  = income > 0 ? (total / income * 100) : 0;

  // Populate result panel
  document.getElementById('r-gross').textContent   = fmt(income);
  document.getElementById('r-ded').textContent     = fmt(deductions);
  document.getElementById('r-taxable').textContent = fmt(taxable);
  document.getElementById('r-tax').textContent     = fmt(tax);
  document.getElementById('r-cess').textContent    = fmt(cess);
  document.getElementById('r-total').textContent   = fmt(total);
  document.getElementById('r-inhand').textContent  = fmt(inhand) + '/mo';

  // Donut chart
  const pct    = Math.min(effRate / 35, 1);
  const offset = 339 - 339 * pct;
  document.getElementById('donut-ring').style.strokeDashoffset = offset;
  document.getElementById('d-pct').textContent = effRate.toFixed(1) + '%';

  // Slab table
  document.getElementById('slab-body').innerHTML = rows.map(r => {
    const active = taxable > r.low;
    const hiStr  = r.high === Infinity ? 'Above' : fmt(r.high);
    return `<tr class="${active ? 'active' : ''}">
      <td>${fmt(r.low)} – ${hiStr}</td>
      <td>${(r.rate * 100).toFixed(0)}%</td>
      <td class="amt">${active ? fmt(r.t) : '—'}</td>
    </tr>`;
  }).join('');
}

// ── Init ──
calculate();
