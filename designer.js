/* ==========================================================================
   IMPRE SaaS - Visual Label Editor & Customizer Engine
   ========================================================================== */

class LabelDesigner {
  constructor() {
    this.currentProduct = {
      name: "Café Torrado e Moído Tradicional 500g",
      internalCode: "1001",
      barcode: "7891000100103",
      barcodeType: "EAN13",
      price: 18.90,
      unit: "un",
      weight: "0.500 kg",
      mfgDate: "15/08/2026",
      expDate: "15/08/2027",
      lot: "L-2026A",
      additionalInfo: "Manter sob refrigeração"
    };
    
    this.currentDesign = {
      size: CONFIG.PRESET_LABEL_SIZES[1], // Default 40x30mm
      customWidth: 40,
      customHeight: 30,
      fontFamily: "Arial, sans-serif",
      fontSize: 12,
      fontWeight: "bold",
      textAlign: "center",
      
      // Visibility Toggles
      showLogo: true,
      showTitle: true,
      showCode: true,
      showPrice: true,
      showWeight: true,
      showMfgDate: true,
      showExpDate: true,
      showLot: true,
      showBarcode: true,
      showAdditionalInfo: false,
      
      logoUrl: null,
      zoomLevel: 2.5 // Screen zoom factor for crisp editing preview
    };
  }

  getCurrentProduct() {
    // Return a copy so it can be mutated (e.g. quantity)
    return { ...this.currentProduct };
  }

  setDesignOption(key, value) {
    this.currentDesign[key] = value;
    this.renderPreview();
  }

  setLogoUrl(url) {
    this.currentDesign.logoUrl = url;
    this.renderPreview();
  }

  // Render Real-time preview inside #label-preview-target
  renderPreview(sampleProduct = null) {
    const target = document.getElementById("label-preview-target");
    if (!target) return;

    if (sampleProduct) {
      this.currentProduct = sampleProduct;
    }
    const product = this.currentProduct;

    const d = this.currentDesign;
    const widthPx = (d.size.widthMm || d.customWidth) * d.zoomLevel * 3.78; // mm to px roughly
    const heightPx = (d.size.heightMm || d.customHeight) * d.zoomLevel * 3.78;

    let barcodeSvg = "";
    if (d.showBarcode) {
      const codeToUse = product.barcode || "7891000100103";
      barcodeSvg = barcodeEngine.renderBarcodeSVG(codeToUse, product.barcodeType || "EAN13", {
        height: Math.max(20, heightPx * 0.25),
        displayValue: true,
        fontSize: Math.max(9, d.fontSize - 2)
      });
    }

    let html = `
      <div class="label-canvas-wrapper" style="transform: scale(1);">
        <div class="label-canvas" style="
          width: ${widthPx}px;
          height: ${heightPx}px;
          font-family: ${d.fontFamily};
          text-align: ${d.textAlign};
        ">
    `;

    // Logo Area
    if (d.showLogo && d.logoUrl) {
      html += `
        <div class="label-logo-area">
          <img src="${d.logoUrl}" alt="Logo" />
        </div>
      `;
    }

    // Title & Internal Code
    html += `<div class="label-header">`;
    if (d.showTitle) {
      html += `<div class="label-product-title" style="font-size: ${d.fontSize}px; font-weight: ${d.fontWeight};">${product.name}</div>`;
    }
    if (d.showCode) {
      html += `<div class="label-code">CÓD: ${product.internalCode}</div>`;
    }
    html += `</div>`;

    // Price Box
    if (d.showPrice) {
      const formattedPrice = typeof product.price === 'number' ? product.price.toFixed(2).replace('.', ',') : product.price;
      html += `
        <div class="label-price-box">
          <div class="label-price-val" style="font-size: ${d.fontSize * 1.4}px;">R$ ${formattedPrice}</div>
          ${d.showWeight && product.weight ? `<div class="label-price-sub">PESO: ${product.weight}</div>` : ''}
        </div>
      `;
    }

    // Dates & Lot
    if (d.showMfgDate || d.showExpDate || d.showLot) {
      html += `<div class="label-details-row">`;
      if (d.showMfgDate) html += `<span>FAB: ${product.mfgDate || '15/08/2026'}</span>`;
      if (d.showExpDate) html += `<span>VAL: ${product.expDate || '15/08/2027'}</span>`;
      if (d.showLot) html += `<span>LOT: ${product.lot || 'L-01'}</span>`;
      html += `</div>`;
    }

    // Barcode SVG
    if (d.showBarcode) {
      html += `<div class="label-barcode-area">${barcodeSvg}</div>`;
    }

    // Additional Info
    if (d.showAdditionalInfo && product.additionalInfo) {
      html += `<div style="font-size: 8px; color: #475569; margin-top: 2px;">${product.additionalInfo}</div>`;
    }

    html += `
        </div>
      </div>
    `;

    target.innerHTML = html;
  }
}

const labelDesigner = new LabelDesigner();
