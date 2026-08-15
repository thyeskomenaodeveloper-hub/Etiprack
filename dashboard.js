/* ==========================================================================
   IMPRE SaaS - Client Dashboard & Metrics Controller
   ========================================================================== */

class DashboardManager {
  loadDashboardView() {
    const tenantId = auth.getTenantId();
    if (!tenantId) return;

    const user = storage.getUserById(tenantId);
    const products = storage.getTenantProducts(tenantId);
    const history = storage.getTenantHistory(tenantId);
    const planSpec = CONFIG.PLANS[user.plan || 'basic'];

    // Update KPI UI Cards
    const totalProdsEl = document.getElementById("dash-stat-products");
    const totalLabelsEl = document.getElementById("dash-stat-labels");
    const todayLabelsEl = document.getElementById("dash-stat-today");
    const planNameEl = document.getElementById("dash-stat-plan");

    if (totalProdsEl) totalProdsEl.innerText = products.length;
    if (totalLabelsEl) totalLabelsEl.innerText = user.labelCount || 0;

    // Filter prints generated today
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPrintsCount = history
      .filter(h => h.printedAt && h.printedAt.startsWith(todayStr))
      .reduce((sum, h) => sum + (h.quantity || 1), 0);

    if (todayLabelsEl) todayLabelsEl.innerText = todayPrintsCount;
    if (planNameEl) planNameEl.innerText = planSpec.name;

    // Update Plan Usage Meter
    const limitPct = Math.min(100, Math.round(((user.labelCount || 0) / planSpec.monthlyLabelLimit) * 100));
    const meterBar = document.getElementById("dash-plan-meter");
    const meterText = document.getElementById("dash-plan-meter-text");

    if (meterBar) meterBar.style.width = `${limitPct}%`;
    if (meterText) meterText.innerText = `${user.labelCount || 0} / ${planSpec.monthlyLabelLimit} etiquetas (${limitPct}%)`;

    // Render Recent Prints Table Feed
    const tbody = document.getElementById("dash-recent-prints-body");
    if (!tbody) return;

    const recent = history.slice(0, 5);

    if (recent.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
            Nenhuma etiqueta gerada recentemente.
          </td>
        </tr>
      `;
      return;
    }

    let html = "";
    recent.forEach(r => {
      const dateStr = new Date(r.printedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      html += `
        <tr>
          <td>${dateStr}</td>
          <td><strong>${r.productName}</strong></td>
          <td><code>${r.barcode}</code></td>
          <td><span class="badge badge-info">${r.quantity} un</span></td>
          <td><span class="badge badge-success">${r.templateName || '40x30mm'}</span></td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }
}

const dashboardManager = new DashboardManager();
