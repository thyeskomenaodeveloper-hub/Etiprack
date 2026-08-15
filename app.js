/* ==========================================================================
   IMPRE SaaS - Main Application SPA Controller & Event Bus
   ========================================================================== */

class AppController {
  constructor() {
    this.currentView = "dashboard";
  }

  async init() {
    // Reseed password hashes for demo users (ensures compatibility with file:// protocol)
    await storage.reseedPasswords();

    // Check Authentication state
    if (!auth.isAuthenticated()) {
      this.showAuthView("login");
      return;
    }

    this.showAppLayout();
    this.navigateTo(auth.isSuperAdmin() ? "admin" : "dashboard");
    this.bindEvents();
    this.initScaleApp();
  }

  showAuthView(mode = "login") {
    document.getElementById("app-auth-wrapper").style.display = "flex";
    document.getElementById("app-main-layout").style.display = "none";

    document.getElementById("auth-view-login").style.display = mode === "login" ? "block" : "none";
    document.getElementById("auth-view-register").style.display = mode === "register" ? "block" : "none";
    document.getElementById("auth-view-forgot").style.display = mode === "forgot" ? "block" : "none";
  }

  showAppLayout() {
    document.getElementById("app-auth-wrapper").style.display = "none";
    document.getElementById("app-main-layout").style.display = "flex";

    const user = auth.currentUser;
    const planSpec = CONFIG.PLANS[user.plan || 'basic'];

    // Update Header & Sidebar Badges
    document.getElementById("user-display-name").innerText = user.responsibleName || user.companyName;
    document.getElementById("user-display-company").innerText = user.companyName;
    document.getElementById("sidebar-company-name").innerText = user.companyName;

    const planTag = document.getElementById("sidebar-plan-tag");
    planTag.innerText = planSpec.name;
    planTag.className = `plan-tag ${planSpec.badgeClass}`;

    // Admin Sidebar Nav Link Visibility
    const adminLink = document.getElementById("nav-item-admin");
    if (adminLink) {
      adminLink.style.display = auth.isSuperAdmin() ? "flex" : "none";
    }
  }

  navigateTo(viewId) {
    this.currentView = viewId;

    // Update active navbar item
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item.dataset.target === viewId);
    });

    // Update active page view container
    document.querySelectorAll(".page-view").forEach(page => {
      page.classList.toggle("active", page.id === `view-${viewId}`);
    });

    // Refresh view data
    if (viewId === "dashboard") dashboardManager.loadDashboardView();
    if (viewId === "products") productsManager.loadProductsTable();
    if (viewId === "designer") labelDesigner.renderPreview();
    if (viewId === "history") historyManager.loadHistoryTable();
    if (viewId === "admin") adminManager.loadAdminView();
    if (viewId === "scale") scaleApp.loadScaleView();

    // Scroll to top
    window.scrollTo(0, 0);
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "ri-information-line";
    if (type === "success") icon = "ri-checkbox-circle-line";
    if (type === "error") icon = "ri-error-warning-line";
    if (type === "warning") icon = "ri-alert-line";

    toast.innerHTML = `
      <i class="${icon}" style="font-size: 20px;"></i>
      <span style="flex: 1; font-weight: 500;">${message}</span>
      <i class="ri-close-line" style="cursor: pointer; opacity: 0.7;" onclick="this.parentElement.remove()"></i>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  }

  bindEvents() {
    // Navigation clicks
    document.querySelectorAll("[data-target]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = btn.dataset.target;
        this.navigateTo(target);
      });
    });

    // Close Modal buttons
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest(".modal-backdrop").classList.remove("active");
      });
    });

    // Designer Size Picker
    document.querySelectorAll(".size-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".size-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        
        const sizeId = pill.dataset.size;
        const preset = CONFIG.PRESET_LABEL_SIZES.find(s => s.id === sizeId);
        if (preset) {
          labelDesigner.setDesignOption("size", preset);
        }
      });
    });

    // Designer Element Toggles
    document.querySelectorAll(".toggle-item input[type='checkbox']").forEach(chk => {
      chk.addEventListener("change", (e) => {
        const prop = e.target.dataset.prop;
        if (prop) {
          labelDesigner.setDesignOption(prop, e.target.checked);
        }
      });
    });

    // Logo File Upload Input
    const logoInput = document.getElementById("designer-logo-file");
    if (logoInput) {
      logoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            labelDesigner.setLogoUrl(ev.target.result);
            this.showToast("Logotipo carregado!", "success");
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // CSV File Importer Input
    const csvInput = document.getElementById("import-file-input");
    if (csvInput) {
      csvInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          importer.handleFileUpload(file);
        }
      });
    }
  }

  initScaleApp() {
    window.scaleApp = {
      loadScaleView: () => {
        const tenantId = auth.getTenantId();
        const products = storage.getTenantProducts(tenantId);
        const weighable = products.filter(p => p.isWeighable || p.unit === 'kg');

        const select = document.getElementById("scale-prod-select");
        if (!select) return;

        let html = `<option value="">-- Selecione um produto pesável --</option>`;
        weighable.forEach(p => {
          html += `<option value="${p.id}">${p.name} (R$ ${p.price.toFixed(2)}/kg)</option>`;
        });
        select.innerHTML = html;
      },

      onScaleProductSelect: (prodId) => {
        if (!prodId) return;
        const tenantId = auth.getTenantId();
        const products = storage.getTenantProducts(tenantId);
        const p = products.find(prod => prod.id === prodId);
        if (!p) return;

        document.getElementById("scale-item-code").value = p.internalCode;
        document.getElementById("scale-unit-price").value = p.price;
        this.updateScaleLabelPreview();
      },

      updateScaleLabelPreview: () => {
        const weight = parseFloat(document.getElementById("scale-weight-input").value) || 0.500;
        const unitPrice = parseFloat(document.getElementById("scale-unit-price").value) || 29.90;
        const code = document.getElementById("scale-item-code").value || "1001";

        const brand = document.getElementById("scale-brand-preset").value || "toledo_price";
        const scaleConfig = CONFIG.SCALE_PRESETS[brand] || CONFIG.SCALE_PRESETS.toledo_price;

        const labelData = scaleEngine.formatScaleLabelData(
          { name: "Picanha Bovina Maturada / kg", internalCode: code, price: unitPrice },
          weight,
          unitPrice,
          scaleConfig
        );

        const target = document.getElementById("scale-label-preview-target");
        if (!target) return;

        const barcodeSvg = barcodeEngine.renderBarcodeSVG(labelData.scaleBarcode, "EAN13", {
          height: 38,
          displayValue: true,
          fontSize: 10
        });

        target.innerHTML = `
          <div class="label-canvas-wrapper">
            <div class="label-canvas" style="width: 260px; height: 180px; padding: 12px; justify-content: space-between;">
              <div style="font-weight: 700; font-size: 13px; text-align: center; text-transform: uppercase;">${labelData.productName}</div>
              <div style="font-size: 9px; color: #475569; text-align: center;">CÓDIGO: ${labelData.internalCode}</div>
              
              <div style="display: flex; justify-content: space-between; font-size: 10px; margin: 4px 0; background: #f8fafc; padding: 4px; border: 1px solid #e2e8f0;">
                <div>PESO: <strong>${labelData.weightKg}</strong></div>
                <div>PREÇO/kg: <strong>${labelData.pricePerKgFormatted}</strong></div>
              </div>

              <div style="text-align: center; font-size: 18px; font-weight: 900; color: #000; margin: 2px 0;">
                TOTAL: ${labelData.totalPriceFormatted}
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 8px; color: #334155;">
                <span>DATA: ${labelData.mfgDateFormatted}</span>
                <span>VAL: ${labelData.expDateFormatted}</span>
                <span>LOT: ${labelData.lot}</span>
              </div>

              <div style="text-align: center; margin-top: 4px;">
                ${barcodeSvg}
              </div>
            </div>
          </div>
        `;
      },

      printScaleLabel: () => {
        const weight = parseFloat(document.getElementById("scale-weight-input").value) || 0.500;
        const unitPrice = parseFloat(document.getElementById("scale-unit-price").value) || 29.90;
        const code = document.getElementById("scale-item-code").value || "1001";
        const brand = document.getElementById("scale-brand-preset").value || "toledo_price";
        const scaleConfig = CONFIG.SCALE_PRESETS[brand];

        const formatted = scaleEngine.formatScaleLabelData(
          { name: "Picanha Bovina Maturada / kg", internalCode: code, price: unitPrice },
          weight,
          unitPrice,
          scaleConfig
        );

        printEngine.printLabels([{
          name: formatted.productName,
          internalCode: formatted.internalCode,
          barcode: formatted.scaleBarcode,
          barcodeType: "EAN13",
          price: formatted.totalPriceNum,
          quantity: 1,
          mfgDate: formatted.mfgDateFormatted,
          expDate: formatted.expDateFormatted
        }]);
      }
    };
  }
}

const app = new AppController();

// Global Auth Trigger Handlers
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-password").value;
  try {
    await auth.login(email, pass);
    app.showToast("Login efetuado com sucesso!", "success");
    app.init();
  } catch (err) {
    app.showToast(err.message, "error");
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const regData = {
    companyName: document.getElementById("reg-company").value,
    responsibleName: document.getElementById("reg-name").value,
    email: document.getElementById("reg-email").value,
    password: document.getElementById("reg-password").value,
    phone: document.getElementById("reg-phone").value,
    document: document.getElementById("reg-cnpj").value
  };

  try {
    await auth.register(regData);
    app.showToast("Conta criada com sucesso! Período de teste ativado.", "success");
    app.init();
  } catch (err) {
    app.showToast(err.message, "error");
  }
}

async function handleForgotSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("forgot-email").value;
  try {
    const msg = await auth.requestPasswordReset(email);
    app.showToast(msg, "info");
    app.showAuthView("login");
  } catch (err) {
    app.showToast(err.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
