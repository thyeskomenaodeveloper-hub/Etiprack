/* ==========================================================================
   IMPRE SaaS - Product Management Controller (CRUD, Filters & Search)
   ========================================================================== */

class ProductManager {
  constructor() {
    this.currentFilter = "";
    this.currentCategory = "";
  }

  loadProductsTable() {
    const tenantId = auth.getTenantId();
    if (!tenantId) return;

    let products = storage.getTenantProducts(tenantId);

    // Apply Search Filter
    if (this.currentFilter) {
      const q = this.currentFilter.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.internalCode.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    // Apply Category Filter
    if (this.currentCategory) {
      products = products.filter(p => p.category === this.currentCategory);
    }

    const tbody = document.getElementById("products-table-body");
    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">
            <i class="ri-inbox-line" style="font-size: 32px; display: block; margin-bottom: 8px;"></i>
            Nenhum produto cadastrado ou encontrado.
          </td>
        </tr>
      `;
      return;
    }

    let html = "";
    products.forEach(p => {
      const priceFormatted = typeof p.price === 'number' ? p.price.toFixed(2).replace('.', ',') : p.price;
      
      html += `
        <tr>
          <td><input type="checkbox" class="product-select-chk" data-id="${p.id}" /></td>
          <td><strong>${p.internalCode}</strong></td>
          <td>
            <div style="font-weight: 600;">${p.name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${p.description || ''}</div>
          </td>
          <td><span class="badge badge-info">${p.category || 'Geral'}</span></td>
          <td><code style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;">${p.barcode || '-'}</code></td>
          <td><strong>R$ ${priceFormatted}</strong> <span style="font-size: 11px; color: var(--text-muted);">/${p.unit || 'un'}</span></td>
          <td>${p.isWeighable ? '<span class="badge badge-warning">Pesável</span>' : '<span class="badge badge-success">Unitário</span>'}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-sm btn-primary" onclick="productsManager.quickPrint('${p.id}')" title="Gerar Etiqueta">
                <i class="ri-printer-line"></i> Etiqueta
              </button>
              <button class="btn btn-sm btn-secondary btn-icon" onclick="productsManager.openEditModal('${p.id}')" title="Editar">
                <i class="ri-edit-line"></i>
              </button>
              <button class="btn btn-sm btn-secondary btn-icon" onclick="productsManager.duplicateProduct('${p.id}')" title="Duplicar">
                <i class="ri-file-copy-line"></i>
              </button>
              <button class="btn btn-sm btn-danger btn-icon" onclick="productsManager.deleteProduct('${p.id}')" title="Excluir">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  openNewModal() {
    const modal = document.getElementById("modal-product-form");
    if (!modal) return;
    document.getElementById("prod-form-id").value = "";
    document.getElementById("prod-form-code").value = "";
    document.getElementById("prod-form-barcode").value = "";
    document.getElementById("prod-form-name").value = "";
    document.getElementById("prod-form-category").value = "Mercearia";
    document.getElementById("prod-form-price").value = "";
    document.getElementById("prod-form-unit").value = "un";
    document.getElementById("prod-form-weighable").checked = false;
    document.getElementById("prod-form-expdays").value = "365";
    document.getElementById("prod-form-lot").value = "";
    document.getElementById("prod-form-info").value = "";

    modal.classList.add("active");
  }

  openEditModal(productId) {
    const tenantId = auth.getTenantId();
    const products = storage.getTenantProducts(tenantId);
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    document.getElementById("prod-form-id").value = p.id;
    document.getElementById("prod-form-code").value = p.internalCode;
    document.getElementById("prod-form-barcode").value = p.barcode;
    document.getElementById("prod-form-name").value = p.name;
    document.getElementById("prod-form-category").value = p.category || "Mercearia";
    document.getElementById("prod-form-price").value = p.price;
    document.getElementById("prod-form-unit").value = p.unit || "un";
    document.getElementById("prod-form-weighable").checked = p.isWeighable || false;
    document.getElementById("prod-form-expdays").value = p.expDays || "365";
    document.getElementById("prod-form-lot").value = p.lot || "";
    document.getElementById("prod-form-info").value = p.additionalInfo || "";

    const modal = document.getElementById("modal-product-form");
    modal.classList.add("active");
  }

  saveProductFromForm() {
    const tenantId = auth.getTenantId();
    const user = storage.getUserById(tenantId);
    const userPlan = CONFIG.PLANS[user.plan || 'basic'];

    const existingProducts = storage.getTenantProducts(tenantId);
    const id = document.getElementById("prod-form-id").value;

    if (!id && existingProducts.length >= userPlan.maxProducts) {
      app.showToast(`Limite do seu plano (${userPlan.name}) de ${userPlan.maxProducts} produtos atingido! Faça upgrade.`, "error");
      return;
    }

    const internalCode = document.getElementById("prod-form-code").value.trim();
    const barcode = document.getElementById("prod-form-barcode").value.trim();
    const name = document.getElementById("prod-form-name").value.trim();
    const price = parseFloat(document.getElementById("prod-form-price").value);

    if (!internalCode || !name || isNaN(price)) {
      app.showToast("Preencha os campos obrigatórios: Código Interno, Nome e Preço.", "warning");
      return;
    }

    // Validate Barcode if provided
    if (barcode) {
      const barcodeValidation = barcodeEngine.validateBarcode(barcode, "EAN13");
      if (!barcodeValidation.valid) {
        app.showToast(barcodeValidation.error, "error");
        return;
      }
    }

    const productData = {
      id: id || null,
      internalCode,
      barcode: barcode || internalCode,
      barcodeType: "EAN13",
      name,
      category: document.getElementById("prod-form-category").value,
      price,
      unit: document.getElementById("prod-form-unit").value,
      isWeighable: document.getElementById("prod-form-weighable").checked,
      expDays: parseInt(document.getElementById("prod-form-expdays").value, 10) || 365,
      lot: document.getElementById("prod-form-lot").value,
      additionalInfo: document.getElementById("prod-form-info").value
    };

    storage.saveTenantProduct(tenantId, productData);
    app.showToast(id ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!", "success");

    document.getElementById("modal-product-form").classList.remove("active");
    this.loadProductsTable();
  }

  duplicateProduct(productId) {
    const tenantId = auth.getTenantId();
    const products = storage.getTenantProducts(tenantId);
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    const copy = { ...p, id: null, internalCode: p.internalCode + "_COPY", name: p.name + " (Cópia)" };
    storage.saveTenantProduct(tenantId, copy);
    app.showToast("Produto duplicado com sucesso!", "info");
    this.loadProductsTable();
  }

  deleteProduct(productId) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    const tenantId = auth.getTenantId();
    storage.deleteTenantProduct(tenantId, productId);
    app.showToast("Produto excluído.", "info");
    this.loadProductsTable();
  }

  quickPrint(productId) {
    const tenantId = auth.getTenantId();
    const products = storage.getTenantProducts(tenantId);
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    if (p.isWeighable) {
      // Direct user to scale label view prefilled
      app.navigateTo('scale');
      document.getElementById('scale-prod-select').value = p.id;
      scaleApp.onScaleProductSelect(p.id);
    } else {
      printEngine.printLabels([{ ...p, quantity: 1 }]);
    }
  }
}

const productsManager = new ProductManager();
