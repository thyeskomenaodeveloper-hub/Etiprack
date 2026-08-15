/* ==========================================================================
   IMPRE SaaS - Bulk CSV / Excel Product Importer with Validation Engine
   ========================================================================== */

class ProductImporter {
  constructor() {
    this.parsedItems = [];
  }

  handleFileUpload(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      this.parseCSV(content);
    };
    reader.readAsText(file);
  }

  parseCSV(text) {
    const lines = text.split(/\r\n|\n/);
    if (lines.length < 2) {
      app.showToast("Arquivo CSV vazio ou inválido.", "error");
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const items = [];
    let errorsCount = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const obj = {};
      
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || "";
      });

      const internalCode = obj["codigo"] || obj["code"] || obj["cod"] || `IMP_${i}`;
      const name = obj["nome"] || obj["name"] || obj["produto"] || `Produto ${i}`;
      const price = parseFloat(obj["preco"] || obj["price"] || "0");
      const barcode = obj["cod_barras"] || obj["barcode"] || internalCode;
      const category = obj["categoria"] || obj["category"] || "Geral";
      const unit = obj["unidade"] || obj["unit"] || "un";

      // Validation check
      let status = "Válido";
      let errorMsg = "";

      if (!name || isNaN(price)) {
        status = "Erro";
        errorMsg = "Preço ou nome ausente";
        errorsCount++;
      } else if (barcode && barcode.length === 13) {
        const val = barcodeEngine.validateBarcode(barcode, "EAN13");
        if (!val.valid) {
          status = "Erro";
          errorMsg = val.error;
          errorsCount++;
        }
      }

      items.push({
        internalCode,
        name,
        price,
        barcode,
        category,
        unit,
        status,
        errorMsg
      });
    }

    this.parsedItems = items;
    this.renderImportPreview(items, errorsCount);
  }

  renderImportPreview(items, errorsCount) {
    const container = document.getElementById("import-preview-container");
    if (!container) return;

    let html = `
      <div style="margin-top: 20px; background: var(--bg-card); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h4>Pré-visualização da Importação (${items.length} itens encontrados)</h4>
          <div>
            ${errorsCount > 0 ? `<span class="badge badge-danger">${errorsCount} erros detectados</span>` : '<span class="badge badge-success">Pronto para importar</span>'}
            <button class="btn btn-primary btn-sm" onclick="importer.confirmBatchImport()" ${errorsCount > 0 && items.filter(i => i.status === 'Válido').length === 0 ? 'disabled' : ''}>
              <i class="ri-check-line"></i> Confirmar Importação (${items.filter(i => i.status === 'Válido').length} válidos)
            </button>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Código</th>
              <th>Nome</th>
              <th>Código de Barras</th>
              <th>Preço</th>
              <th>Detalhes / Erro</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach(item => {
      html += `
        <tr>
          <td>
            ${item.status === 'Válido' ? '<span class="badge badge-success">Válido</span>' : '<span class="badge badge-danger">Inválido</span>'}
          </td>
          <td><strong>${item.internalCode}</strong></td>
          <td>${item.name}</td>
          <td><code>${item.barcode}</code></td>
          <td>R$ ${item.price.toFixed(2)}</td>
          <td style="color: ${item.status === 'Válido' ? 'var(--text-muted)' : 'var(--accent-danger)'}">${item.errorMsg || 'OK'}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  confirmBatchImport() {
    const validItems = this.parsedItems.filter(i => i.status === 'Válido');
    if (validItems.length === 0) {
      app.showToast("Nenhum item válido para importar.", "warning");
      return;
    }

    const tenantId = auth.getTenantId();
    validItems.forEach(item => {
      storage.saveTenantProduct(tenantId, {
        internalCode: item.internalCode,
        barcode: item.barcode,
        barcodeType: "EAN13",
        name: item.name,
        category: item.category,
        price: item.price,
        unit: item.unit,
        isWeighable: false
      });
    });

    app.showToast(`${validItems.length} produtos importados com sucesso!`, "success");
    document.getElementById("import-preview-container").innerHTML = "";
    app.navigateTo('products');
  }
}

const importer = new ProductImporter();
