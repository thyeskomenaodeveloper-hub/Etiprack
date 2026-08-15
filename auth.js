/* ==========================================================================
   IMPRE SaaS - Authentication & Security Controller
   ========================================================================== */

class AuthManager {
  constructor() {
    this.currentUser = this.loadSession();
  }

  // Pure JavaScript SHA-256 Password Hash Generator
  async hashPassword(password, salt = "impre_default_salt") {
    const text = password + salt;
    
    // crypto.subtle only works in secure contexts (HTTPS / localhost)
    // Fallback to a simple hash for file:// protocol
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const msgUint8 = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        // Fall through to fallback
      }
    }
    
    // Fallback: simple djb2-based hash (for local file:// usage)
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  loadSession() {
    try {
      const data = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  saveSession(user) {
    this.currentUser = user;
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
    window.location.reload();
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  isSuperAdmin() {
    return this.currentUser && this.currentUser.role === 'superadmin';
  }

  getTenantId() {
    return this.currentUser ? this.currentUser.id : null;
  }

  // Login Handler
  async login(email, password) {
    const users = storage.getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error("E-mail não cadastrado na plataforma.");
    }

    if (user.status === "Bloqueado") {
      throw new Error("Sua conta está bloqueada pelo administrador. Entre em contato para reativação.");
    }

    if (user.status === "Expirado") {
      throw new Error("Seu período de teste ou assinatura expirou. Renove seu plano.");
    }

    const testHash = await this.hashPassword(password, user.salt || "impre_salt_123");
    if (testHash !== user.passwordHash) {
      throw new Error("Senha incorreta. Tente novamente.");
    }

    // Update last access timestamp
    user.lastAccess = new Date().toISOString();
    storage.saveUser(user);

    this.saveSession(user);
    return user;
  }

  // User Registration Handler
  async register(registrationData) {
    const users = storage.getAllUsers();
    const existing = users.find(u => u.email.toLowerCase() === registrationData.email.toLowerCase());
    
    if (existing) {
      throw new Error("Já existe um cadastro com este e-mail.");
    }

    const salt = "salt_" + Date.now() + "_" + Math.floor(Math.random()*1000);
    const passwordHash = await this.hashPassword(registrationData.password, salt);

    const newUser = {
      id: "usr_" + Date.now() + "_" + Math.floor(Math.random()*1000),
      companyName: registrationData.companyName,
      responsibleName: registrationData.responsibleName,
      email: registrationData.email,
      phone: registrationData.phone,
      document: registrationData.document || "",
      role: "client",
      status: "Teste", // Default to 7 days trial
      plan: "pro", // Trial grants Pro features
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      labelCount: 0,
      passwordHash: passwordHash,
      salt: salt,
      logoUrl: null
    };

    storage.saveUser(newUser);
    this.saveSession(newUser);
    return newUser;
  }

  // Password Recovery Request Simulation
  async requestPasswordReset(email) {
    const users = storage.getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error("E-mail não encontrado no sistema.");
    }
    // Simulation token
    return `Instruções de recuperação de senha enviadas com sucesso para ${email}. Verifique sua caixa de entrada.`;
  }

  // Change Password
  async changePassword(oldPassword, newPassword) {
    if (!this.currentUser) throw new Error("Usuário não autenticado.");
    
    const user = storage.getUserById(this.currentUser.id);
    const oldHash = await this.hashPassword(oldPassword, user.salt);
    
    if (oldHash !== user.passwordHash) {
      throw new Error("Senha atual incorreta.");
    }

    user.passwordHash = await this.hashPassword(newPassword, user.salt);
    storage.saveUser(user);
    this.saveSession(user);
  }
}

const auth = new AuthManager();
