/* ==========================================================================
   IMPRE SaaS - Print History & Audit Log Controller
   ========================================================================== */

class HistoryManager {
  constructor() {
    this.filterText = "";
  }

  loadHistoryTable() {
    const tenantId = auth.getTenantId();
    if (!tenantId) return;

    let history = storage.getTenantHistory(tenantId);

    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      history = history.filter(h => 
        h.productName.toLowerCase().includes(q) ||
        (h.barcode && h.barcode.toLowerCase().includes(q))
      );
    }

    const tbody = document.getElementById("history-table-body");
    if (!tbody) return;

    if (history.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">
            Nenhum histórico de impressão registrado.
          </td>
        </tr>
      `;
      return;
    }

    let html = "";
    history.forEach(h => {
      const dateObj = new Date(h.printedAt);
      const dateStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      html += `
        <tr>
          <td>${dateStr}</td>
          <td><strong>${h.productName}</strong></td>
          <td><code>${h.barcode || '-'}</code></td>
          <td><span class="badge badge-info">${h.quantity} un</span></td>
          <td><span class="badge badge-success">${h.templateName || 'Padrão'}</span></td>
          <td><span class="badge badge-success">Concluído</span></td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  exportHistoryCSV() {
    const tenantId = auth.getTenantId();
    const history = storage.getTenantHistory(tenantId);
    
    if (history.length === 0) {
      app.showToast("Sem histórico para exportar.", "warning");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Data,Produto,Codigo_Barras,Quantidade,Modelo\n";
    history.forEach(h => {
      const dateStr = new Date(h.printedAt).toISOString();
      csvContent += `"${dateStr}","${h.productName}","${h.barcode}",${h.quantity},"${h.templateName}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historico_impressao_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

const historyManager = new HistoryManager();
