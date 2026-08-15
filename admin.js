/* ==========================================================================
   IMPRE SaaS - Super Admin & Reseller Management Panel
   ========================================================================== */

class AdminManager {
  constructor() {
    this.currentSearch = "";
  }

  loadAdminView() {
    if (!auth.isSuperAdmin()) {
      app.showToast("Acesso restrito ao Administrador da Plataforma.", "error");
      app.navigateTo('dashboard');
      return;
    }

    const users = storage.getAllUsers();
    let filteredUsers = users.filter(u => u.role !== 'superadmin');

    if (this.currentSearch) {
      const q = this.currentSearch.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.companyName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.responsibleName.toLowerCase().includes(q)
      );
    }

    // Platform Analytics KPI Totals
    const totalClients = users.filter(u => u.role !== 'superadmin').length;
    const activeClients = users.filter(u => u.status === 'Ativo').length;
    const totalLabelsPlatform = users.reduce((sum, u) => sum + (u.labelCount || 0), 0);

    const kpiClientsEl = document.getElementById("admin-stat-clients");
    const kpiActiveEl = document.getElementById("admin-stat-active");
    const kpiLabelsEl = document.getElementById("admin-stat-labels");

    if (kpiClientsEl) kpiClientsEl.innerText = totalClients;
    if (kpiActiveEl) kpiActiveEl.innerText = activeClients;
    if (kpiLabelsEl) kpiLabelsEl.innerText = totalLabelsPlatform;

    const tbody = document.getElementById("admin-users-table-body");
    if (!tbody) return;

    let html = "";
    filteredUsers.forEach(u => {
      const createdDate = new Date(u.createdAt).toLocaleDateString('pt-BR');
      const planSpec = CONFIG.PLANS[u.plan || 'basic'];
      
      let statusBadgeClass = "badge-success";
      if (u.status === "Bloqueado") statusBadgeClass = "badge-danger";
      if (u.status === "Teste") statusBadgeClass = "badge-warning";
      if (u.status === "Expirado") statusBadgeClass = "badge-info";

      html += `
        <tr>
          <td>
            <div style="font-weight: 700;">${u.companyName}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${u.responsibleName} • ${u.email}</div>
          </td>
          <td><span class="plan-tag ${planSpec.badgeClass}">${planSpec.name}</span></td>
          <td><span class="badge ${statusBadgeClass}">${u.status}</span></td>
          <td><strong>${u.labelCount || 0}</strong> / ${planSpec.monthlyLabelLimit}</td>
          <td>${createdDate}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-sm btn-secondary" onclick="adminManager.openEditUserModal('${u.id}')" title="Editar Usuário">
                <i class="ri-edit-line"></i> Gerenciar
              </button>
              ${u.status === 'Ativo' ? `
                <button class="btn btn-sm btn-warning" onclick="adminManager.setUserStatus('${u.id}', 'Bloqueado')" title="Bloquear Conta">
                  <i class="ri-lock-line"></i> Bloquear
                </button>
              ` : `
                <button class="btn btn-sm btn-success" onclick="adminManager.setUserStatus('${u.id}', 'Ativo')" title="Ativar Conta">
                  <i class="ri-checkbox-circle-line"></i> Ativar
                </button>
              `}
              <button class="btn btn-sm btn-danger btn-icon" onclick="adminManager.deleteUser('${u.id}')" title="Excluir Usuário">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  openEditUserModal(userId) {
    const u = storage.getUserById(userId);
    if (!u) return;

    document.getElementById("admin-form-userid").value = u.id;
    document.getElementById("admin-form-company").value = u.companyName;
    document.getElementById("admin-form-responsible").value = u.responsibleName;
    document.getElementById("admin-form-email").value = u.email;
    document.getElementById("admin-form-phone").value = u.phone || "";
    document.getElementById("admin-form-plan").value = u.plan || "pro";
    document.getElementById("admin-form-status").value = u.status || "Ativo";

    const modal = document.getElementById("modal-admin-user");
    modal.classList.add("active");
  }

  saveUserFromAdmin() {
    const id = document.getElementById("admin-form-userid").value;
    const u = storage.getUserById(id);
    if (!u) return;

    u.companyName = document.getElementById("admin-form-company").value.trim();
    u.responsibleName = document.getElementById("admin-form-responsible").value.trim();
    u.email = document.getElementById("admin-form-email").value.trim();
    u.phone = document.getElementById("admin-form-phone").value.trim();
    u.plan = document.getElementById("admin-form-plan").value;
    u.status = document.getElementById("admin-form-status").value;

    storage.saveUser(u);
    app.showToast("Usuário atualizado com sucesso!", "success");

    document.getElementById("modal-admin-user").classList.remove("active");
    this.loadAdminView();
  }

  setUserStatus(userId, newStatus) {
    const u = storage.getUserById(userId);
    if (!u) return;

    u.status = newStatus;
    storage.saveUser(u);
    app.showToast(`Status de ${u.companyName} alterado para ${newStatus}.`, "info");
    this.loadAdminView();
  }

  deleteUser(userId) {
    if (!confirm("Tem certeza que deseja excluir esta conta de usuário e todos os seus dados?")) return;
    let users = storage.getAllUsers();
    users = users.filter(u => u.id !== userId);
    storage.saveCollection(CONFIG.STORAGE_KEYS.USERS, users);
    app.showToast("Usuário excluído do sistema.", "info");
    this.loadAdminView();
  }
}

const adminManager = new AdminManager();
