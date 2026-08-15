/* ==========================================================================
   IMPRE SaaS - Local Storage & Multi-Tenant Data Management
   ========================================================================== */

class StorageManager {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    // Seed Super Admin and default demo accounts if no users exist
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.USERS)) {
      const defaultUsers = [
        {
          id: "usr_admin_master",
          companyName: "Plataforma IMPRE SaaS (Admin)",
          responsibleName: "Administrador Master",
          email: "admin@impre.com.br",
          phone: "(11) 99999-0000",
          role: "superadmin",
          status: "Ativo", // Ativo, Bloqueado, Teste, Expirado
          plan: "premium",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastAccess: new Date().toISOString(),
          labelCount: 1420,
          // Placeholder hash — will be reseeded on first app.init()
          passwordHash: "__needs_reseed__",
          salt: "impre_salt_999",
          _seedPassword: "admin123"
        },
        {
          id: "usr_mercado_central",
          companyName: "Mercado Central & Açougue",
          responsibleName: "Carlos Eduardo Silva",
          email: "carlos@mercadocentral.com.br",
          phone: "(11) 98888-7777",
          role: "client",
          status: "Ativo",
          plan: "pro",
          createdAt: "2026-02-15T10:30:00.000Z",
          lastAccess: new Date().toISOString(),
          labelCount: 380,
          // Placeholder hash — will be reseeded on first app.init()
          passwordHash: "__needs_reseed__",
          salt: "impre_salt_123",
          _seedPassword: "cliente123"
        }
      ];
      localStorage.setItem(CONFIG.STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    }

    // Seed default sample products for tenant usr_mercado_central
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTS)) {
      const defaultProducts = [
        {
          id: "prod_001",
          tenantId: "usr_mercado_central",
          internalCode: "1001",
          barcode: "7891000100103",
          barcodeType: "EAN13",
          name: "Café Torrado e Moído Tradicional 500g",
          description: "Café de alta qualidade torra média",
          category: "Mercearia",
          price: 18.90,
          unit: "un",
          weight: 0.500,
          isWeighable: false,
          mfgDate: "2026-08-01",
          expDate: "2027-08-01",
          lot: "L- Caf2026",
          additionalInfo: "Manter em local seco e arejado",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_002",
          tenantId: "usr_mercado_central",
          internalCode: "2005",
          barcode: "20005001495", // EAN-13 Toledo scale barcode base
          barcodeType: "EAN13",
          name: "Picanha Bovina Maturada Grill / kg",
          description: "Corte nobre selecionado",
          category: "Açougue",
          price: 89.90,
          unit: "kg",
          weight: 1.250,
          isWeighable: true,
          mfgDate: "2026-08-14",
          expDate: "2026-08-25",
          lot: "L-PIC882",
          additionalInfo: "Conservar sob refrigeração 0°C a 4°C",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_003",
          tenantId: "usr_mercado_central",
          internalCode: "3012",
          barcode: "7894900011517",
          barcodeType: "EAN13",
          name: "Refrigerante Coca-Cola Original 2L",
          description: "Pet 2 Litros gelada",
          category: "Bebidas",
          price: 9.50,
          unit: "un",
          weight: 2.000,
          isWeighable: false,
          mfgDate: "2026-07-20",
          expDate: "2027-01-20",
          lot: "L-CC991",
          additionalInfo: "Servir gelado",
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
    }

    // Seed default print history
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY)) {
      const defaultHistory = [
        {
          id: "hist_001",
          tenantId: "usr_mercado_central",
          productName: "Picanha Bovina Maturada Grill / kg",
          barcode: "200050014953",
          quantity: 12,
          templateName: "Etiqueta Balança 60x40mm",
          printedAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(defaultHistory));
    }
  }

  // Re-hash seed passwords using the current hashing algorithm
  // This ensures login works regardless of whether crypto.subtle is available
  async reseedPasswords() {
    const users = this.getAllUsers();
    let changed = false;

    // Known demo seed passwords (for existing localStorage that may have old hashes)
    const knownSeeds = {
      "admin@impre.com.br": { password: "admin123", salt: "impre_salt_999" },
      "carlos@mercadocentral.com.br": { password: "cliente123", salt: "impre_salt_123" }
    };

    for (const user of users) {
      const seed = user._seedPassword ? { password: user._seedPassword, salt: user.salt } : knownSeeds[user.email];
      
      if (seed) {
        const correctHash = await auth.hashPassword(seed.password, seed.salt);
        if (user.passwordHash !== correctHash) {
          user.passwordHash = correctHash;
          user._seedPassword = seed.password;
          changed = true;
        }
      }
    }
    if (changed) {
      this.saveCollection(CONFIG.STORAGE_KEYS.USERS, users);
    }
  }

  // Get raw collection
  getCollection(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading storage key ${key}:`, e);
      return [];
    }
  }

  // Save collection
  saveCollection(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving storage key ${key}:`, e);
    }
  }

  // Tenant Isolated CRUD operations
  getTenantProducts(tenantId) {
    const products = this.getCollection(CONFIG.STORAGE_KEYS.PRODUCTS);
    return products.filter(p => p.tenantId === tenantId);
  }

  saveTenantProduct(tenantId, productData) {
    const products = this.getCollection(CONFIG.STORAGE_KEYS.PRODUCTS);
    if (productData.id) {
      // Update existing
      const index = products.findIndex(p => p.id === productData.id && p.tenantId === tenantId);
      if (index !== -1) {
        products[index] = { ...products[index], ...productData, tenantId };
      }
    } else {
      // Create new
      productData.id = "prod_" + Date.now() + "_" + Math.floor(Math.random()*1000);
      productData.tenantId = tenantId;
      productData.createdAt = new Date().toISOString();
      products.push(productData);
    }
    this.saveCollection(CONFIG.STORAGE_KEYS.PRODUCTS, products);
    return productData;
  }

  deleteTenantProduct(tenantId, productId) {
    let products = this.getCollection(CONFIG.STORAGE_KEYS.PRODUCTS);
    products = products.filter(p => !(p.id === productId && p.tenantId === tenantId));
    this.saveCollection(CONFIG.STORAGE_KEYS.PRODUCTS, products);
  }

  // Tenant History Log
  addHistoryLog(tenantId, logData) {
    const history = this.getCollection(CONFIG.STORAGE_KEYS.HISTORY);
    const newLog = {
      id: "hist_" + Date.now(),
      tenantId,
      ...logData,
      printedAt: new Date().toISOString()
    };
    history.unshift(newLog);
    this.saveCollection(CONFIG.STORAGE_KEYS.HISTORY, history);

    // Increment tenant label count stat
    this.incrementUserLabelCount(tenantId, logData.quantity || 1);
  }

  getTenantHistory(tenantId) {
    const history = this.getCollection(CONFIG.STORAGE_KEYS.HISTORY);
    return history.filter(h => h.tenantId === tenantId);
  }

  // User Management
  getAllUsers() {
    return this.getCollection(CONFIG.STORAGE_KEYS.USERS);
  }

  getUserById(userId) {
    const users = this.getAllUsers();
    return users.find(u => u.id === userId);
  }

  saveUser(userData) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === userData.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...userData };
    } else {
      users.push(userData);
    }
    this.saveCollection(CONFIG.STORAGE_KEYS.USERS, users);
  }

  incrementUserLabelCount(userId, count) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].labelCount = (users[idx].labelCount || 0) + count;
      this.saveCollection(CONFIG.STORAGE_KEYS.USERS, users);
    }
  }
}

const storage = new StorageManager();
