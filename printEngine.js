/* ==========================================================================
   IMPRE SaaS - Professional Printing & PDF Export Engine
   ========================================================================== */

class PrintEngine {
  constructor() {
    this.printQueue = [];
  }

  addToQueue(item, designConfig = null) {
    if (!item) return;
    
    // Armazena a config atual do design junto com o item para a fila
    const configToUse = designConfig || labelDesigner.currentDesign;
    this.printQueue.push({ item, designConfig: JSON.parse(JSON.stringify(configToUse)) });
    
    app.showToast("Etiqueta adicionada à fila com sucesso!", "success");
    this.updateQueueUI();
  }

  clearQueue() {
    this.printQueue = [];
    this.updateQueueUI();
  }

  printQueueItems() {
    if (this.printQueue.length === 0) {
      app.showToast("A fila de impressão está vazia.", "warning");
      return;
    }

    // Build mixed items array to send to printLabels
    // printLabels uses global design config by default, but we need it to support mixed designs.
    // To keep it simple, if printLabels is called from queue, we will pass a special array.
    // Actually, printLabels logic currently assumes a single designConfig for all items:
    // const d = designConfig || labelDesigner.currentDesign;
    // We should modify printLabels to handle item.specificDesign later or just use the current design for all.
    // I'll update printLabels right after to support item.specificDesign.
    
    this.printLabels(this.printQueue.map(q => {
      let itm = { ...q.item };
      itm.specificDesign = q.designConfig;
      return itm;
    }));

    // Opcional: limpar fila após imprimir? Geralmente não limpa automático para caso dê erro na impressora
  }

  updateQueueUI() {
    const counter = document.getElementById("queue-counter");
    const btnPrintQueue = document.getElementById("btn-print-queue");
    const btnClearQueue = document.getElementById("btn-clear-queue");
    
    if (counter) {
      counter.innerText = `Fila: ${this.printQueue.length} etiqueta(s)`;
      if (this.printQueue.length > 0) {
        counter.style.display = "inline-block";
      } else {
        counter.style.display = "none";
      }
    }
    
    if (btnPrintQueue) {
      btnPrintQueue.style.display = this.printQueue.length > 0 ? "inline-flex" : "none";
    }
    if (btnClearQueue) {
      btnClearQueue.style.display = this.printQueue.length > 0 ? "inline-flex" : "none";
    }
  }

  /**
   * Triggers browser print dialog for single or batch products
   * preserving 100% real millimeter dimensions for thermal printers
   */
  printLabels(items, designConfig = null) {
    if (!items || items.length === 0) {
      app.showToast("Nenhum produto selecionado para impressão.", "warning");
      return;
    }

    // Check user plan limit before proceeding
    const tenantId = auth.getTenantId();
    const user = storage.getUserById(tenantId);
    const userPlan = CONFIG.PLANS[user.plan || 'basic'];
    
    const totalToPrint = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    if (user.labelCount + totalToPrint > userPlan.monthlyLabelLimit) {
      app.showToast(`Limite do seu plano (${userPlan.name}) atingido! Atualize seu plano para continuar imprimindo.`, "error");
      return;
    }

    const mountArea = document.getElementById("print-mount-area");
    if (!mountArea) return;

    const d = designConfig || labelDesigner.currentDesign;
    const widthMm = d.size.widthMm || d.customWidth || 40;
    const heightMm = d.size.heightMm || d.customHeight || 30;

    const modeSelect = document.getElementById("global-printer-mode");
    const mode = modeSelect ? modeSelect.value : 'thermal';

    let html = '';
    if (mode === 'a4') {
      html += `
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          #print-mount-area {
            display: flex !important;
            flex-wrap: wrap !important;
            align-content: flex-start !important;
            gap: 2mm !important;
          }
          .printable-label {
            page-break-after: auto !important;
            break-after: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            border: 1px dashed #ccc !important;
          }
        </style>
      `;
    } else {
      html += `
        <style>
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0;
          }
        </style>
      `;
    }

    items.forEach(item => {
      const itemDesign = item.specificDesign || d;
      const itemWidth = itemDesign.size.widthMm || itemDesign.customWidth || 40;
      const itemHeight = itemDesign.size.heightMm || itemDesign.customHeight || 30;

      const qty = item.quantity || 1;
      for (let i = 0; i < qty; i++) {
        const barcodeSvg = barcodeEngine.renderBarcodeSVG(
          item.barcode || "7891000100103",
          item.barcodeType || "EAN13",
          { height: 35, displayValue: true, fontSize: 10 }
        );

        const formattedPrice = typeof item.price === 'number' ? item.price.toFixed(2).replace('.', ',') : item.price;

        html += `
          <div class="printable-label" style="width: ${itemWidth}mm; height: ${itemHeight}mm;">
            ${itemDesign.showLogo && itemDesign.logoUrl ? `<img src="${itemDesign.logoUrl}" style="max-height: 6mm;" />` : ''}
            <div class="p-title" style="font-size: ${itemDesign.fontSize || 9}pt;">${item.name}</div>
            ${itemDesign.showCode ? `<div style="font-size: 7pt; color: #333;">CÓD: ${item.internalCode}</div>` : ''}
            ${itemDesign.showPrice ? `<div class="p-price">R$ ${formattedPrice}</div>` : ''}
            <div class="p-details">
              ${itemDesign.showMfgDate ? `<span>FAB: ${item.mfgDate || '15/08/2026'}</span>` : ''}
              ${itemDesign.showExpDate ? `<span>VAL: ${item.expDate || '15/08/2027'}</span>` : ''}
            </div>
            ${itemDesign.showBarcode ? `<div class="p-barcode">${barcodeSvg}</div>` : ''}
          </div>
        `;
      }
    });

    mountArea.innerHTML = html;

    // Log print action into history
    items.forEach(item => {
      storage.addHistoryLog(tenantId, {
        productName: item.name,
        barcode: item.barcode,
        quantity: item.quantity || 1,
        templateName: `${widthMm}x${heightMm}mm`
      });
    });

    app.showToast(`Iniciando impressão de ${totalToPrint} etiqueta(s)...`, "success");

    // Execute window.print()
    setTimeout(() => {
      window.print();
    }, 300);
  }
}

const printEngine = new PrintEngine();
