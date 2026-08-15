/* ==========================================================================
   IMPRE SaaS - System Configuration & Constants
   ========================================================================== */

const CONFIG = {
  APP_NAME: "IMPRE SaaS",
  VERSION: "2.5.0",
  STORAGE_KEYS: {
    USERS: "impre_users_v2",
    CURRENT_USER: "impre_current_user_v2",
    PRODUCTS: "impre_products_v2",
    TEMPLATES: "impre_templates_v2",
    HISTORY: "impre_history_v2",
    SCALE_CONFIGS: "impre_scale_configs_v2",
    SETTINGS: "impre_settings_v2"
  },
  
  PLANS: {
    basic: {
      id: "basic",
      name: "Plano Básico",
      monthlyLabelLimit: 500,
      maxProducts: 50,
      customLogo: false,
      excelImport: false,
      scaleEngine: false,
      badgeClass: "plan-basic"
    },
    pro: {
      id: "pro",
      name: "Plano Profissional",
      monthlyLabelLimit: 5000,
      maxProducts: 1000,
      customLogo: true,
      excelImport: true,
      scaleEngine: true,
      badgeClass: "plan-pro"
    },
    premium: {
      id: "premium",
      name: "Plano Premium",
      monthlyLabelLimit: 999999,
      maxProducts: 999999,
      customLogo: true,
      excelImport: true,
      scaleEngine: true,
      badgeClass: "plan-premium"
    }
  },

  BARCODE_TYPES: [
    { id: "EAN13", name: "EAN-13 (13 dígitos)", length: 13, numericOnly: true, hasChecksum: true },
    { id: "EAN8", name: "EAN-8 (8 dígitos)", length: 8, numericOnly: true, hasChecksum: true },
    { id: "UPCA", name: "UPC-A (12 dígitos)", length: 12, numericOnly: true, hasChecksum: true },
    { id: "CODE128", name: "Code 128 (Alfanumérico)", length: null, numericOnly: false, hasChecksum: false },
    { id: "CODE39", name: "Code 39 (Alfanumérico)", length: null, numericOnly: false, hasChecksum: false },
    { id: "ITF14", name: "ITF-14 / Interleaved 2 of 5", length: 14, numericOnly: true, hasChecksum: true },
    { id: "GS1128", name: "GS1-128 (Comercial / Logístico)", length: null, numericOnly: false, hasChecksum: false }
  ],

  PRESET_LABEL_SIZES: [
    { id: "30x20", name: "30 × 20 mm", widthMm: 30, heightMm: 20 },
    { id: "40x25", name: "40 × 25 mm", widthMm: 40, heightMm: 25 },
    { id: "40x30", name: "40 × 30 mm", widthMm: 40, heightMm: 30 },
    { id: "50x30", name: "50 × 30 mm", widthMm: 50, heightMm: 30 },
    { id: "57x32", name: "57 × 32 mm", widthMm: 57, heightMm: 32 },
    { id: "60x40", name: "60 × 40 mm", widthMm: 60, heightMm: 40 },
    { id: "70x40", name: "70 × 40 mm", widthMm: 70, heightMm: 40 },
    { id: "80x50", name: "80 × 50 mm", widthMm: 80, heightMm: 50 },
    { id: "100x50", name: "100 × 50 mm", widthMm: 100, heightMm: 50 }
  ],

  SCALE_PRESETS: {
    toledo_price: {
      name: "Toledo Prix (Codificação por Preço Total)",
      prefix: "20",
      codeLength: 5,
      encodeType: "price", // price or weight
      valueLength: 5,
      decimals: 2
    },
    toledo_weight: {
      name: "Toledo Prix (Codificação por Peso)",
      prefix: "21",
      codeLength: 5,
      encodeType: "weight",
      valueLength: 5,
      decimals: 3
    },
    filizola_price: {
      name: "Filizola (Preço Total)",
      prefix: "2",
      codeLength: 6,
      encodeType: "price",
      valueLength: 5,
      decimals: 2
    },
    urano: {
      name: "Urano / Elgin (Preço Total)",
      prefix: "22",
      codeLength: 5,
      encodeType: "price",
      valueLength: 5,
      decimals: 2
    }
  }
};
