/* ==========================================================================
   IMPRE SaaS - Scale Barcode & Label Engine ("Etiqueta para Balança")
   Supports: Toledo Prix (3/4/5/6), Filizola, Urano, Elgin, Ramuza
   Dynamically generates EAN-13 barcodes with embedded Total Price or Weight
   ========================================================================== */

class ScaleEngine {
  constructor() {
    this.defaultConfig = CONFIG.SCALE_PRESETS.toledo_price;
  }

  /**
   * Builds an EAN-13 barcode string for scale items based on configuration
   * @param {string|number} itemCode - Product internal code (e.g. 5 digits)
   * @param {number} totalValue - Total price in R$ or weight in kg
   * @param {object} customConfig - Scale barcode configuration overrides
   */
  generateScaleBarcode(itemCode, totalValue, customConfig = {}) {
    const config = { ...this.defaultConfig, ...customConfig };
    const prefix = config.prefix || "20";
    const codeLen = parseInt(config.codeLength || 5, 10);
    const valueLen = parseInt(config.valueLength || 5, 10);
    const decimals = parseInt(config.decimals || 2, 10);

    // 1. Format Item Code to fixed length with leading zeros
    const cleanItemCode = String(itemCode).replace(/\D/g, '').padStart(codeLen, '0').slice(-codeLen);

    // 2. Format Value (Total Price or Weight) to integer cents/grams
    const multiplier = Math.pow(10, decimals);
    const numericVal = Math.round((parseFloat(totalValue) || 0) * multiplier);
    const formattedVal = String(numericVal).padStart(valueLen, '0').slice(-valueLen);

    // 3. Assemble 12-digit EAN-13 payload
    const base12 = `${prefix}${cleanItemCode}${formattedVal}`;

    // 4. Calculate 13th Check Digit (DV) using BarcodeEngine
    const checkDigit = barcodeEngine.calculateCheckDigit(base12, "EAN13");

    const fullEAN13 = `${base12}${checkDigit}`;

    return {
      barcode: fullEAN13,
      prefix,
      itemCode: cleanItemCode,
      formattedVal,
      checkDigit,
      isValid: fullEAN13.length === 13
    };
  }

  /**
   * Formats a complete scale label payload for printing or preview
   */
  formatScaleLabelData(product, weightKg, unitPricePerKg, customConfig = {}) {
    const weight = parseFloat(weightKg) || 0.500;
    const pricePerKg = parseFloat(unitPricePerKg || product.price) || 29.90;
    const totalPrice = weight * pricePerKg;

    // Generate scale EAN-13 code
    const barcodeObj = this.generateScaleBarcode(
      product.internalCode || "1001",
      totalPrice,
      customConfig
    );

    const today = new Date();
    const expDate = new Date();
    expDate.setDate(today.getDate() + (parseInt(product.expDays || 5, 10)));

    return {
      productName: product.name || "NOME DO PRODUTO",
      internalCode: product.internalCode || "00001",
      weightKg: weight.toFixed(3) + " kg",
      pricePerKgFormatted: "R$ " + pricePerKg.toFixed(2).replace('.', ','),
      totalPriceFormatted: "R$ " + totalPrice.toFixed(2).replace('.', ','),
      totalPriceNum: totalPrice,
      mfgDateFormatted: today.toLocaleDateString('pt-BR'),
      expDateFormatted: expDate.toLocaleDateString('pt-BR'),
      lot: product.lot || "L-BAL" + today.getFullYear(),
      scaleBarcode: barcodeObj.barcode,
      barcodeObj
    };
  }
}

const scaleEngine = new ScaleEngine();
