/**
 * MAST APPLICATION SCRIPT
 * Centralized Store & UI Controllers for all 3 Scenarios
 * Clean, Compact, DRY & Accessible
 */

// ==========================================================
// 1. CENTRAL MOCK DATA STORE (Single Source of Truth)
// ==========================================================
const Store = {
  activeView: 'noa', // 'noa' | 'agent' | 'admin'
  currentRequestId: '10293',

  // Master applications database
  applications: {
    '10293': {
      id: '10293',
      customerName: 'נועה לוי',
      israeliId: '039847125',
      phone: '052-4412389',
      email: 'noa.levy@example.com',
      role: 'דייר נכנס',
      vipStatus: 'לקוח חדש',
      address: 'סוקולוב 42, הרצליה (דירה 7)',
      consumerId: '9842103',
      entryDate: '2026-10-01',
      meterReading: 482,
      systemMeterReading: 495, // Mismatch for agent review!
      waterMeterNumber: 'WM-981240',
      occupantsCount: 2,
      adultOccupants: [{ name: 'יונתן לוי', id: '038291487', relation: 'בן זוג' }],
      status: 'under_review', // 'submitted' | 'under_review' | 'needs_documents' | 'approved' | 'blocked'
      missingReason: '',
      submittedAt: '22/09/2026, 11:20',
      assignedAgent: 'דניאל ר.',
      hasSignedPoa: false
    }
  },

  // Active exceptions for Admin Ops Center
  exceptions: [
    { id: '#99281', type: 'חריגת SLA', waitTime: '04:12:00', status: 'בהמתנה', agent: 'לא משויך', actionLabel: 'שיוך מהיר' },
    { id: '#99304', type: 'כשל העלאה', waitTime: '00:05:00', status: 'נכשל', agent: 'מיכל כ.', actionLabel: 'ניסיון חוזר' },
    { id: '#99312', type: 'ללא נציג', waitTime: '00:45:00', status: 'פתוח', agent: 'לא משויך', actionLabel: 'העברה לצוות' },
    { id: '#99315', type: 'כשל הגשה', waitTime: '00:02:00', status: 'חסום', agent: 'מערכת', actionLabel: 'שחרור חסימה' },
    { id: '#10293', type: 'חריגת מונה (נועה)', waitTime: '00:28:15', status: 'בבדיקה', agent: 'דניאל ר.', actionLabel: 'בדיקת נציג' }
  ],

  // Agents list for Management Drawer
  agents: [
    { id: 1, name: 'דניאל ר.', role: 'נציג בכיר', active: true, load: '3 פניות' },
    { id: 2, name: 'מיכל כ.', role: 'נציגה', active: true, load: '4 פניות' },
    { id: 3, name: 'רון א.', role: 'נציג תמיכה', active: false, load: '0 פניות' },
    { id: 4, name: 'הילה ב.', role: 'ראש צוות', active: true, load: '1 פנייה' }
  ],

  // Audit Log History
  auditLog: [
    { time: '11:20:05', user: 'נועה לוי', action: 'הגשת בקשה מקוונת מס׳ #10293' },
    { time: '11:21:40', user: 'מערכת אוטומטית', action: 'הצלבת נתונים: זוהתה חריגה בקריאת מונה' },
    { time: '11:22:15', user: 'דניאל ר. (נציג)', action: 'פתיחת תיק פנייה וטעינת מסמכים' }
  ]
};

// ==========================================================
// 2. GENERAL APP CONTROLLER & TOASTS
// ==========================================================
const App = {
  init() {
    this.setupRoleSwitcher();
    this.renderAdminExceptions();
    this.renderDrawerAgents();
    this.renderAuditFeed();
    NoaWizard.init();
    DocViewer.init();
    AgentOps.initSlaTimer();
  },

  setupRoleSwitcher() {
    document.querySelectorAll('.role-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = tab.getAttribute('data-view');
        this.switchRole(view);
      });
    });
  },

  switchRole(view) {
    Store.activeView = view;
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.role-tab[data-view="${view}"]`).classList.add('active');

    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(`view-${view}`);
    if (targetSection) targetSection.classList.add('active');

    // Scenario specific refreshes
    if (view === 'agent') {
      AgentOps.refreshWorkspace();
    } else if (view === 'admin') {
      this.renderAdminExceptions();
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  addAudit(user, action) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    Store.auditLog.unshift({ time: timeStr, user, action });
    this.renderAuditFeed();
  },

  openAuditModal() {
    const modal = document.getElementById('modal-audit');
    const list = document.getElementById('full-audit-list');
    list.innerHTML = Store.auditLog.map(item => `
      <div class="audit-item" style="margin-bottom: 8px;">
        <span class="audit-time">${item.time} | מבצע: <strong>${item.user}</strong></span>
        <div>${item.action}</div>
      </div>
    `).join('');
    modal.style.display = 'flex';
  },

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  },

  renderAuditFeed() {
    const feed = document.getElementById('drawer-audit-feed');
    if (!feed) return;
    feed.innerHTML = Store.auditLog.slice(0, 8).map(item => `
      <div class="audit-item">
        <span class="audit-time">${item.time} | ${item.user}</span>
        <div>${item.action}</div>
      </div>
    `).join('');
  },

  renderAdminExceptions() {
    const tbody = document.getElementById('exceptions-table-body');
    if (!tbody) return;

    tbody.innerHTML = Store.exceptions.map((exc, idx) => `
      <tr>
        <td><strong>${exc.id}</strong></td>
        <td><span class="badge ${exc.type.includes('חריגת') ? 'badge-danger' : exc.type.includes('כשל') ? 'badge-warning' : 'badge-info'}">${exc.type}</span></td>
        <td><code>${exc.waitTime}</code></td>
        <td>${exc.status}</td>
        <td>${exc.agent}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="AdminOps.handleQuickAction(${idx})">
            ${exc.actionLabel}
          </button>
        </td>
      </tr>
    `).join('');

    // Update KPI counters
    const slaCount = Store.exceptions.filter(e => e.type.includes('SLA')).length;
    const unassignedCount = Store.exceptions.filter(e => e.agent === 'לא משויך').length;
    const failCount = Store.exceptions.filter(e => e.type.includes('כשל')).length;

    const elSla = document.getElementById('kpi-sla-count');
    const elUnassigned = document.getElementById('kpi-unassigned-count');
    const elFailures = document.getElementById('kpi-failures-count');

    if (elSla) elSla.textContent = `${slaCount} פניות`;
    if (elUnassigned) elUnassigned.textContent = `${unassignedCount} משימות`;
    if (elFailures) elFailures.textContent = `${failCount} אירועים`;
  },

  renderDrawerAgents() {
    const list = document.getElementById('drawer-agents-list');
    if (!list) return;
    list.innerHTML = Store.agents.map(ag => `
      <div class="agent-row">
        <div class="agent-info">
          <strong>${ag.name} (${ag.role})</strong>
          <span>עומס: ${ag.load}</span>
        </div>
        <label class="switch">
          <input type="checkbox" ${ag.active ? 'checked' : ''} onchange="AdminOps.toggleAgent(${ag.id})">
          <span class="slider"></span>
        </label>
      </div>
    `).join('');
  }
};

// ==========================================================
// 3. SCENARIO 1: NOA'S JOURNEY (CITIZEN PORTAL)
// ==========================================================
const NoaWizard = {
  currentStep: 0,
  requestId: '10293',

  // Field config per document-driven screen: key -> label shown to Noa
  fieldConfig: {
    id: [
      { key: 'fullName', label: 'שם מלא' },
      { key: 'govId', label: 'מספר תעודת זהות' },
      { key: 'address', label: 'כתובת רשומה' }
    ],
    contract: [
      { key: 'contractAddress', label: 'כתובת הנכס' },
      { key: 'entryDate', label: 'תאריך כניסה' },
      { key: 'landlordName', label: 'שם המשכיר' },
      { key: 'landlordPhone', label: 'טלפון המשכיר' }
    ],
    meter: [
      { key: 'meterReading', label: 'קריאת המונה' },
      { key: 'consumerNumber', label: 'מספר נכס / צרכן' },
      { key: 'waterCardNumber', label: 'מספר כרטיס מים' }
    ]
  },

  // Everything extracted / chosen so far
  data: {
    fullName: '', govId: '', address: '', govPhone: '', govEmail: '',
    contractAddress: '', entryDate: '', landlordName: '', landlordPhone: '', tenantNameContract: '',
    whoFills: 'me', poaPhoto: false,
    meterReading: '', consumerNumber: '', waterCardNumber: '', meterDate: '',
    occupantsCount: null,
    additionalResidents: [],
    declarationConfirmed: false
  },
  photos: { id: false, contract: false, meter: false },
  confirmed: {},

  init() {
    this.checkSavedProgress();
  },

  // ---------- Mock "reading the document" (OCR/AI stand-in) ----------
  mockExtract(stepKey) {
    const samples = {
      id: { fullName: 'נועה לוי', govId: '039847125', address: 'סוקולוב 42, הרצליה (דירה 7)' },
      contract: { contractAddress: 'סוקולוב 42, הרצליה (דירה 7)', entryDate: '01/10/2026', landlordName: 'משה כהן', landlordPhone: '054-1234567', tenantNameContract: 'נועה לוי' },
      meter: { meterReading: '482', consumerNumber: '9842103', waterCardNumber: 'WM-981240' }
    };
    return samples[stepKey];
  },

  handleFile(stepKey, inputEl) {
    if (stepKey === 'poa') { this.handlePoaFile(inputEl); return; }
    if (!inputEl.files || !inputEl.files[0]) return;

    const box = document.getElementById(`photo-box-${stepKey}`);
    const placeholder = document.getElementById(`photo-placeholder-${stepKey}`);
    const status = document.getElementById(`extract-status-${stepKey}`);
    box.classList.add('has-file');
    placeholder.innerHTML = `<span class="noa-photo-icon">✅</span><strong>התמונה התקבלה — לחצו כדי להחליף</strong>`;
    status.textContent = 'קוראים את המסמך…';
    status.className = 'noa-extract-status loading';

    // Reset confirmations for this step's fields (new photo = re-verify)
    (this.fieldConfig[stepKey] || []).forEach(f => { this.confirmed[f.key] = false; });
    this.photos[stepKey] = false;
    this.updateNextButton(stepKey);

    setTimeout(() => {
      const extracted = this.mockExtract(stepKey);
      Object.assign(this.data, extracted);
      this.photos[stepKey] = true;
      status.textContent = '';
      status.className = 'noa-extract-status';
      this.renderConfirmCard(stepKey);
      if (stepKey === 'id') {
        document.getElementById('contact-block-id').style.display = 'block';
      }
      if (stepKey === 'contract') this.checkWhoFills();
      if (stepKey === 'meter') {
        this.data.meterDate = new Date().toLocaleDateString('he-IL');
        const dateLine = document.getElementById('meter-date-line');
        if (dateLine) dateLine.textContent = `תאריך הקריאה: היום, ${this.data.meterDate} (נרשם אוטומטית)`;
      }
      this.updateNextButton(stepKey);
      this.saveProgress();
    }, 1100);
  },

  handlePoaFile(inputEl) {
    if (!inputEl.files || !inputEl.files[0]) return;
    const placeholder = document.getElementById('photo-placeholder-poa');
    const box = document.getElementById('photo-box-poa');
    box.classList.add('has-file');
    placeholder.innerHTML = `<span class="noa-photo-icon">✅</span><strong>ייפוי הכוח התקבל — לחצו כדי להחליף</strong>`;
    this.data.poaPhoto = true;
    this.updateNextButton('contract');
    this.saveProgress();
  },

  // ---------- Confirm cards: display extracted values, tap to confirm/edit ----------
  renderConfirmCard(stepKey) {
    const container = document.getElementById(`confirm-card-${stepKey}`);
    if (!container) return;
    container.style.display = 'flex';
    container.innerHTML = this.fieldConfig[stepKey].map(f => this.confirmRowHtml(stepKey, f)).join('');
  },

  confirmRowHtml(stepKey, field) {
    const isConfirmed = !!this.confirmed[field.key];
    return `
      <div class="noa-confirm-row ${isConfirmed ? 'is-confirmed' : ''}" id="row-${field.key}">
        <span class="noa-confirm-label">${field.label}</span>
        <span class="noa-confirm-value" id="val-${field.key}">${this.data[field.key] || '—'}</span>
        <div class="noa-confirm-actions">
          <button type="button" class="noa-chip noa-chip-ok ${isConfirmed ? 'active' : ''}" onclick="NoaWizard.confirmField('${stepKey}','${field.key}')">✓ נכון</button>
          <button type="button" class="noa-chip" onclick="NoaWizard.editField('${stepKey}','${field.key}')">✏️ לתקן</button>
        </div>
      </div>`;
  },

  confirmField(stepKey, key) {
    this.confirmed[key] = true;
    const row = document.getElementById(`row-${key}`);
    if (row) row.classList.add('is-confirmed');
    this.updateNextButton(stepKey);
    this.saveProgress();
  },

  editField(stepKey, key) {
    const valueEl = document.getElementById(`val-${key}`);
    if (!valueEl) return;
    const current = this.data[key] || '';
    valueEl.innerHTML = `<input type="text" id="input-${key}" value="${current}">`;
    document.getElementById(`input-${key}`).focus();
    const row = document.getElementById(`row-${key}`);
    const actions = row.querySelector('.noa-confirm-actions');
    actions.innerHTML = `<button type="button" class="noa-chip noa-chip-ok" onclick="NoaWizard.saveField('${stepKey}','${key}')">שמרו</button>`;
    this.confirmed[key] = false;
    row.classList.remove('is-confirmed');
    this.updateNextButton(stepKey);
  },

  saveField(stepKey, key) {
    const input = document.getElementById(`input-${key}`);
    this.data[key] = (input.value || '').trim();
    this.confirmField(stepKey, key);
    this.renderConfirmCard(stepKey);
    if (stepKey === 'contract' && key === 'tenantNameContract') this.checkWhoFills();
  },

  allFieldsConfirmed(stepKey) {
    return (this.fieldConfig[stepKey] || []).every(f => this.confirmed[f.key]);
  },

  // Returns what's still missing on a step (empty string = ready to continue)
  missingForStep(stepKey) {
    if (!this.photos[stepKey]) return 'צריך לצלם או לבחור תמונה של המסמך (ולחכות רגע שנקרא אותו)';
    if (!this.allFieldsConfirmed(stepKey)) return 'לחצו "✓ נכון" (או "✏️ לתקן") ליד כל אחד מהפרטים שזיהינו';
    if (stepKey === 'id') {
      const digits = (this.data.govPhone || '').replace(/\D/g, '');
      if (digits.length < 9) return 'צריך למלא מספר טלפון נייד תקין';
    }
    if (stepKey === 'contract' && this.data.whoFills === 'other' && !this.data.poaPhoto) {
      return 'צריך לצרף ייפוי כוח חתום';
    }
    return '';
  },

  // Button stays clickable (looks locked) so a click can explain what's missing
  updateNextButton(stepKey) {
    const btn = document.getElementById(`btn-next-${stepKey}`);
    if (!btn) return;
    btn.classList.toggle('noa-btn-locked', !!this.missingForStep(stepKey));
  },

  tryGoToStep(stepKey, stepIndex) {
    const missing = this.missingForStep(stepKey);
    if (missing) {
      App.showToast(`כמעט! ${missing}`, 'warning');
      return;
    }
    this.goToStep(stepIndex);
  },

  updateContact() {
    this.data.govPhone = document.getElementById('input-phone').value.trim();
    this.data.govEmail = document.getElementById('input-email').value.trim();
    this.updateNextButton('id');
    this.saveProgress();
  },

  // ---------- "Who fills the form" — asked only when names don't match ----------
  checkWhoFills() {
    const box = document.getElementById('who-fills-box');
    if (!box) return;
    const namesMatch = this.data.fullName && this.data.tenantNameContract &&
      this.data.fullName.trim() === this.data.tenantNameContract.trim();
    if (namesMatch) {
      box.style.display = 'none';
      this.data.whoFills = 'me';
    } else {
      box.style.display = 'block';
    }
    this.updateNextButton('contract');
  },

  chooseWhoFills(val) {
    this.data.whoFills = val;
    document.querySelectorAll('#who-fills-grid .noa-choice-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.value === val);
    });
    document.getElementById('photo-box-poa').style.display = (val === 'other') ? 'block' : 'none';
    this.updateNextButton('contract');
    this.saveProgress();
  },

  // ---------- Residents ----------
  setOccupantCount(n) {
    this.data.occupantsCount = n;
    document.querySelectorAll('#occupant-count-grid .noa-choice-btn').forEach((b, i) => {
      b.classList.toggle('selected', i === (n - 1) || (n === 4 && i === 3));
    });
    const container = document.getElementById('additional-residents-container');
    const extraCount = n - 1;
    this.data.additionalResidents = new Array(Math.max(extraCount, 0)).fill(null).map((_, i) => this.data.additionalResidents[i] || null);
    if (extraCount <= 0) {
      container.innerHTML = '';
    } else {
      container.innerHTML = new Array(extraCount).fill(0).map((_, i) => `
        <div class="noa-resident-card">
          <p>דייר נוסף ${i + 1}: צלמו תעודת זהות</p>
          <label class="noa-photo-box noa-photo-box-small" id="photo-box-resident-${i}">
            <input type="file" accept="image/*" class="noa-photo-input-hidden" onchange="NoaWizard.handleResidentFile(${i}, this)">
            <div class="noa-photo-placeholder" id="photo-placeholder-resident-${i}">
              <span class="noa-photo-icon">📷</span>
              <strong>לחצו כדי לצלם או לבחור תמונה</strong>
            </div>
          </label>
        </div>`).join('');
    }
    this.updateResidentsNextButton();
    this.saveProgress();
  },

  handleResidentFile(index, inputEl) {
    if (!inputEl.files || !inputEl.files[0]) return;
    const placeholder = document.getElementById(`photo-placeholder-resident-${index}`);
    document.getElementById(`photo-box-resident-${index}`).classList.add('has-file');
    const sample = index === 0
      ? { name: 'יונתן לוי', govId: '038291487' }
      : { name: `דייר נוסף ${index + 1}`, govId: '' };
    this.data.additionalResidents[index] = sample;
    placeholder.innerHTML = `<span class="noa-photo-icon">✅</span><strong>זוהה: ${sample.name}</strong>`;
    this.updateResidentsNextButton();
    this.saveProgress();
  },

  updateResidentsNextButton() {
    const btn = document.getElementById('btn-next-residents');
    if (!btn) return;
    const n = this.data.occupantsCount;
    if (!n) { btn.disabled = true; return; }
    const needed = n - 1;
    const gotAll = needed <= 0 || this.data.additionalResidents.filter(Boolean).length >= needed;
    btn.disabled = !gotAll;
  },

  // ---------- Summary & submit ----------
  renderSummary() {
    const list = document.getElementById('summary-list');
    if (!list) return;
    const occupantsLabel = this.data.occupantsCount ? `${this.data.occupantsCount} מבוגרים` : 'לא צוין';
    list.innerHTML = `
      <div class="noa-summary-card">
        <div class="noa-summary-card-title"><span>👤 מי אתם</span><button class="noa-btn noa-btn-text" onclick="NoaWizard.goToStep(2)">לתקן</button></div>
        <div class="noa-summary-row"><strong>שם:</strong> ${this.data.fullName}</div>
        <div class="noa-summary-row"><strong>ת"ז:</strong> ${this.data.govId}</div>
        <div class="noa-summary-row"><strong>טלפון:</strong> ${this.data.govPhone}</div>
      </div>
      <div class="noa-summary-card">
        <div class="noa-summary-card-title"><span>📍 הנכס</span><button class="noa-btn noa-btn-text" onclick="NoaWizard.goToStep(3)">לתקן</button></div>
        <div class="noa-summary-row"><strong>כתובת:</strong> ${this.data.contractAddress}</div>
        <div class="noa-summary-row"><strong>תאריך כניסה:</strong> ${this.data.entryDate}</div>
        <div class="noa-summary-row"><strong>משכיר:</strong> ${this.data.landlordName} · ${this.data.landlordPhone}</div>
      </div>
      <div class="noa-summary-card">
        <div class="noa-summary-card-title"><span>💧 מים ודיירים</span><button class="noa-btn noa-btn-text" onclick="NoaWizard.goToStep(4)">לתקן</button></div>
        <div class="noa-summary-row"><strong>קריאת מונה:</strong> ${this.data.meterReading} מ"ק (${this.data.meterDate})</div>
        <div class="noa-summary-row"><strong>מספר נכס:</strong> ${this.data.consumerNumber} · <strong>כרטיס מים:</strong> ${this.data.waterCardNumber}</div>
        <div class="noa-summary-row"><strong>דיירים בדירה:</strong> ${occupantsLabel}</div>
      </div>`;
  },

  toggleDeclare() {
    this.data.declarationConfirmed = !this.data.declarationConfirmed;
    const btn = document.getElementById('btn-declare');
    btn.classList.toggle('confirmed', this.data.declarationConfirmed);
    btn.textContent = this.data.declarationConfirmed ? '✓ אישרתי' : 'אני מאשר/ת שהפרטים נכונים';
    document.getElementById('btn-submit-application').disabled = !this.data.declarationConfirmed;
  },

  submitApplication() {
    if (!this.data.declarationConfirmed) {
      App.showToast('יש לאשר שהפרטים נכונים', 'warning');
      return;
    }

    // Keep Agent/Admin views in sync
    const req = Store.applications[this.requestId];
    if (req) {
      req.customerName = this.data.fullName || req.customerName;
      req.israeliId = this.data.govId || req.israeliId;
      req.phone = this.data.govPhone || req.phone;
      req.email = this.data.govEmail || req.email;
      req.address = this.data.contractAddress || req.address;
      req.entryDate = this.data.entryDate || req.entryDate;
      req.meterReading = Number(this.data.meterReading) || req.meterReading;
      req.consumerId = this.data.consumerNumber || req.consumerId;
      req.waterMeterNumber = this.data.waterCardNumber || req.waterMeterNumber;
      req.occupantsCount = this.data.occupantsCount || req.occupantsCount;
      req.hasSignedPoa = this.data.whoFills === 'other' && this.data.poaPhoto;
      req.status = 'under_review';
    }
    App.addAudit(this.data.fullName || 'נועה לוי', `שיגור בקשה #${this.requestId} דרך המסך הנגיש (זיהוי אוטומטי ממסמכים)`);

    document.getElementById('wizard-container').style.display = 'none';
    document.getElementById('noa-stepper').style.display = 'none';
    document.getElementById('noa-tracking-screen').style.display = 'block';
    document.getElementById('track-request-id').textContent = this.requestId;

    localStorage.removeItem('noaFlowProgress');
    App.showToast('הבקשה נשלחה בהצלחה! 🚀', 'success');
  },

  // ---------- Persistent human help ----------
  callMe() {
    const summary = document.getElementById('noa-call-summary');
    const lines = [];
    if (this.data.fullName) lines.push(`שם: ${this.data.fullName}`);
    if (this.data.govPhone) lines.push(`טלפון: ${this.data.govPhone}`);
    if (this.data.contractAddress) lines.push(`כתובת: ${this.data.contractAddress}`);
    if (this.data.meterReading) lines.push(`קריאת מונה: ${this.data.meterReading}`);
    if (this.data.occupantsCount) lines.push(`דיירים: ${this.data.occupantsCount}`);
    summary.innerHTML = lines.length
      ? lines.map(l => `<div>• ${l}</div>`).join('')
      : '<div>עדיין לא מילאתם פרטים — זה בסדר, הנציג יתחיל איתכם מהתחלה.</div>';
    document.getElementById('modal-call-me').style.display = 'flex';
  },

  // ---------- Navigation & progress bar ----------
  goToStep(stepIndex) {
    this.currentStep = stepIndex;
    document.querySelectorAll('.noa-screen').forEach((st, i) => st.classList.toggle('active', i === stepIndex));

    const progressBar = document.getElementById('noa-stepper');
    const progressText = document.getElementById('noa-progress-text');
    // Steps 2..6 map to "1 of 5" .. "5 of 5"; welcome (0) and prep (1) show no progress
    if (stepIndex >= 2) {
      progressBar.style.display = 'block';
      progressText.textContent = `שלב ${stepIndex - 1} מתוך 5`;
    } else {
      progressBar.style.display = 'none';
    }

    if (stepIndex === 6) this.renderSummary();
    this.saveProgress();
  },

  // ---------- Save/resume progress between visits ----------
  saveProgress() {
    try {
      localStorage.setItem('noaFlowProgress', JSON.stringify({
        currentStep: this.currentStep, data: this.data, confirmed: this.confirmed, photos: this.photos
      }));
    } catch (e) { /* storage unavailable — not critical for the demo */ }
  },

  checkSavedProgress() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('noaFlowProgress')); } catch (e) { saved = null; }
    if (saved && saved.currentStep > 0) {
      this._savedState = saved;
      document.getElementById('noa-resume-banner').style.display = 'block';
    }
  },

  resumeProgress() {
    if (!this._savedState) return;
    Object.assign(this.data, this._savedState.data);
    Object.assign(this.confirmed, this._savedState.confirmed);
    Object.assign(this.photos, this._savedState.photos);
    document.getElementById('noa-resume-banner').style.display = 'none';

    // Re-render whichever confirm cards / choices already had data
    ['id', 'contract', 'meter'].forEach(stepKey => {
      if (this.photos[stepKey]) {
        const placeholder = document.getElementById(`photo-placeholder-${stepKey}`);
        const box = document.getElementById(`photo-box-${stepKey}`);
        if (box) box.classList.add('has-file');
        if (placeholder) placeholder.innerHTML = `<span class="noa-photo-icon">✅</span><strong>התמונה התקבלה — לחצו כדי להחליף</strong>`;
        this.renderConfirmCard(stepKey);
        this.updateNextButton(stepKey);
      }
    });
    if (this.data.govPhone || this.data.govEmail) {
      document.getElementById('contact-block-id').style.display = 'block';
      document.getElementById('input-phone').value = this.data.govPhone || '';
      document.getElementById('input-email').value = this.data.govEmail || '';
    }
    if (this.data.meterDate) {
      const dateLine = document.getElementById('meter-date-line');
      if (dateLine) dateLine.textContent = `תאריך הקריאה: היום, ${this.data.meterDate} (נרשם אוטומטית)`;
    }
    if (this.data.tenantNameContract) this.checkWhoFills();
    if (this.data.occupantsCount) this.setOccupantCount(this.data.occupantsCount);

    this.goToStep(this._savedState.currentStep);
  },

  discardProgress() {
    localStorage.removeItem('noaFlowProgress');
    document.getElementById('noa-resume-banner').style.display = 'none';
    this._savedState = null;
  },

  restartFlow() {
    document.getElementById('wizard-container').style.display = 'block';
    document.getElementById('noa-tracking-screen').style.display = 'none';
    this.data = { fullName: '', govId: '', address: '', govPhone: '', govEmail: '', contractAddress: '', entryDate: '', landlordName: '', landlordPhone: '', tenantNameContract: '', whoFills: 'me', poaPhoto: false, meterReading: '', consumerNumber: '', waterCardNumber: '', meterDate: '', occupantsCount: null, additionalResidents: [], declarationConfirmed: false };
    this.confirmed = {};
    this.photos = { id: false, contract: false, meter: false };
    ['id', 'contract', 'meter'].forEach(stepKey => this.updateNextButton(stepKey));
    localStorage.removeItem('noaFlowProgress');
    this.goToStep(0);
  },

  openResubmitModal() {
    document.getElementById('modal-resubmit').style.display = 'flex';
  },

  confirmResubmit() {
    const req = Store.applications[this.requestId];
    req.status = 'under_review';
    document.getElementById('noa-missing-alert').style.display = 'none';
    App.closeModals();
    App.addAudit(this.data.fullName || 'נועה לוי', `העלאה חוזרת של מסמך תקין לבקשה #${this.requestId}`);
    App.showToast('המסמך הועלה בהצלחה והועבר לבדיקת הנציג!', 'success');
  }
};

// ==========================================================
// 4. SCENARIO 2: AGENT WORKSPACE (BACK-OFFICE)
// ==========================================================
const AgentOps = {
  slaSeconds: 9910, // 2h 45m 10=s
  slaTimerInterval: null,

  initSlaTimer() {
    this.slaTimerInterval = setInterval(() => {
      if (this.slaSeconds > 0) {
        this.slaSeconds--;
        const hours = String(Math.floor(this.slaSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((this.slaSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(this.slaSeconds % 60).padStart(2, '0');
        const timerEl = document.getElementById('agent-sla-timer');
        if (timerEl) timerEl.textContent = `${hours}:${minutes}:${seconds}`;
      }
    }, 1000);
  },

  refreshWorkspace() {
    const req = Store.applications['10293'];
    document.getElementById('agent-cust-name').textContent = req.customerName;
    document.getElementById('agent-cust-id').textContent = `ת"ז: ${req.israeliId}`;
    document.getElementById('agent-req-id').textContent = `#${req.id}`;
    document.getElementById('agent-role-display').textContent = req.role;

    // Sticky bar handling
    const stickyBar = document.getElementById('agent-sticky-bar');
    if (stickyBar) {
      if (req.status === 'needs_documents') {
        stickyBar.className = 'sticky-exceptions-bar alert-warning';
        document.getElementById('agent-sticky-message').innerHTML = `<strong>הבקשה ממתינה להשלמת מסמכים מהלקוח.</strong> נשלח SMS ישיר.`;
      }
    }
  },

  approveApplication() {
    const req = Store.applications['10293'];
    req.status = 'approved';
    App.addAudit('דניאל ר. (נציג)', 'אישור סופי של בקשה #10293 והפקת מסמך חילופי מחזיקים');

    // Update Noa's tracking UI
    const stepApproved = document.getElementById('track-step-approved');
    if (stepApproved) stepApproved.classList.add('done');

    App.showToast('הבקשה אושרה בהצלחה! מסמך אישור הופק ונשלח ללקוח', 'success');
  },

  openMissingDocsModal() {
    document.getElementById('modal-missing-docs').style.display = 'flex';
  },

  sendMissingDocsRequest() {
    const note = document.getElementById('missing-custom-note').value.trim();
    const req = Store.applications['10293'];
    req.status = 'needs_documents';
    req.missingReason = note || 'צילום תעודת זהות אינו קריא ומספר המונה חורג';

    App.addAudit('דניאל ר. (נציג)', `שליחת בקשת השלמת מסמכים ב-SMS לנועה לוי (#10293)`);
    App.closeModals();

    // Trigger alert banner inside Noa's view!
    const alertBanner = document.getElementById('noa-missing-alert');
    const reasonText = document.getElementById('noa-missing-reason');
    if (alertBanner && reasonText) {
      reasonText.textContent = req.missingReason;
      alertBanner.style.display = 'flex';
    }

    App.showToast('הודעת SMS ובקשת השלמה נשלחו בהצלחה ללקוח! 📲', 'warning');
  },

  escalateToAdmin() {
    const req = Store.applications['10293'];
    req.status = 'blocked';
    App.addAudit('דניאל ר. (נציג)', 'הסלמת בקשה #10293 לדרג מנהל לבדיקת חריגת מונה');

    // Add to admin exceptions table if not present
    if (!Store.exceptions.some(e => e.id === '#10293')) {
      Store.exceptions.unshift({
        id: '#10293',
        type: 'חריגת מונה מורכבת',
        waitTime: '00:01:00',
        status: 'בבדיקת מנהל',
        agent: 'דניאל ר.',
        actionLabel: 'שחרור חסימה'
      });
    }
    App.renderAdminExceptions();
    App.showToast('הבקשה הועברה ישירות למרכז השליטה של המנהל 🛡️', 'info');
  }
};

// ==========================================================
// 5. INTERACTIVE DOCUMENT VIEWER (Agent Tool)
// ==========================================================
const DocViewer = {
  currentDoc: 'meter',
  zoom: 1,
  rotation: 0,
  isHighlightActive: false,

  docsData: {
    meter: {
      name: 'WaterMeter_Photo_482.jpg',
      html: `
        <div style="text-align: center; margin-top: 20px;">
          <h4 style="color: #1A3A5F;">תצלום מונה מים רשמי</h4>
          <div style="margin: 25px auto; padding: 20px; border: 3px solid #000; display: inline-block; background: #FFF9E6; border-radius: 8px;">
            <div style="font-size: 0.85rem; color: #555;">ARAD WATER METERS - D15</div>
            <div style="display: flex; gap: 4px; margin-top: 10px; font-size: 1.8rem; font-family: monospace; font-weight: 800;">
              <span style="background: #000; color: #fff; padding: 4px 8px; border-radius: 2px;">0</span>
              <span style="background: #000; color: #fff; padding: 4px 8px; border-radius: 2px;">4</span>
              <span style="background: #000; color: #fff; padding: 4px 8px; border-radius: 2px;">8</span>
              <span style="background: #000; color: #fff; padding: 4px 8px; border-radius: 2px;">2</span>
              <span style="background: #EF4444; color: #fff; padding: 4px 8px; border-radius: 2px;">7</span>
            </div>
            <div style="font-size: 0.75rem; color: #777; margin-top: 8px;">קוד מכשיר: WM-981240</div>
          </div>
          <div style="font-size: 0.85rem; color: #64748B;">צולם בתאריך: 22/09/2026 09:40</div>
        </div>
      `
    },
    contract: {
      name: 'Rental_Agreement_Sokolov42.pdf',
      html: `
        <div style="font-size: 0.85rem; line-height: 1.6;">
          <h4 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px;">הסכם שכירות בלתי מוגנת</h4>
          <p><strong>המשכיר:</strong> ישראל ישראלי (ת"ז 012345678)</p>
          <p><strong>השוכר:</strong> נועה לוי (ת"ז 039847125)</p>
          <p><strong>הנכס:</strong> דירת מגורים ברח' סוקולוב 42, הרצליה, דירה מס' 7.</p>
          <p><strong>תקופת השכירות:</strong> החל מיום 01/10/2026 ועד 30/09/2027.</p>
          <div style="margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 15px;">
            <div>חתימת המשכיר: <i>ישראל</i></div>
            <div>חתימת השוכר: <i>נועה לוי</i></div>
          </div>
        </div>
      `
    },
    tz: {
      name: 'ID_Noa_Levy.jpg',
      html: `
        <div style="background: #E0F2FE; border: 2px solid #0284C7; border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #0284C7; padding-bottom: 6px;">
            <strong>מדינת ישראל - תעודת זהות</strong>
            <span>🇮🇱</span>
          </div>
          <div style="margin-top: 14px; display: flex; gap: 14px;">
            <div style="width: 70px; height: 90px; background: #94A3B8; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 2rem;">👤</div>
            <div style="font-size: 0.85rem;">
              <p>שם משפחה: <strong>לוי</strong></p>
              <p>שם פרטי: <strong>נועה</strong></p>
              <p>מספר זהות: <strong>039847125</strong></p>
              <p>תאריך לידה: <strong>14/05/1995</strong></p>
            </div>
          </div>
          <div style="margin-top: 12px; font-size: 0.78rem; background: #fff; padding: 6px; border-radius: 4px;">
            ספח רשום: סוקולוב 42, הרצליה
          </div>
        </div>
      `
    }
  },

  init() {
    this.switchDoc('meter');
    this.setupDocHighlightClick();
  },

  switchDoc(docKey) {
    this.currentDoc = docKey;
    document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
    event?.target?.classList?.add('active');

    const data = this.docsData[docKey];
    document.getElementById('mock-doc-body').innerHTML = data.html;
    document.getElementById('doc-filename').textContent = `קובץ: ${data.name}`;
    this.reset();
  },

  zoomIn() {
    this.zoom = Math.min(this.zoom + 0.15, 2.0);
    this.applyTransform();
  },

  zoomOut() {
    this.zoom = Math.max(this.zoom - 0.15, 0.6);
    this.applyTransform();
  },

  rotate() {
    this.rotation = (this.rotation + 90) % 360;
    this.applyTransform();
  },

  reset() {
    this.zoom = 1;
    this.rotation = 0;
    this.applyTransform();
    // remove existing highlights
    document.querySelectorAll('.doc-highlight-overlay').forEach(el => el.remove());
  },

  applyTransform() {
    const stage = document.getElementById('doc-stage');
    if (stage) {
      stage.style.transform = `scale(${this.zoom}) rotate(${this.rotation}deg)`;
    }
  },

  toggleHighlight() {
    this.isHighlightActive = !this.isHighlightActive;
    const btn = document.getElementById('tool-highlight');
    if (btn) btn.classList.toggle('active-tool', this.isHighlightActive);
    App.showToast(this.isHighlightActive ? 'מרקר פעיל: לחץ על המסמך כדי לסמן' : 'מרקר כבוי', 'info');
  },

  setupDocHighlightClick() {
    const doc = document.getElementById('mock-doc-content');
    if (!doc) return;
    doc.addEventListener('click', (e) => {
      if (!this.isHighlightActive) return;
      const rect = doc.getBoundingClientRect();
      const x = e.clientX - rect.left - 40;
      const y = e.clientY - rect.top - 10;

      const hl = document.createElement('div');
      hl.className = 'doc-highlight-overlay';
      hl.style.left = `${x}px`;
      hl.style.top = `${y}px`;
      hl.style.width = '100px';
      hl.style.height = '24px';
      doc.appendChild(hl);

      App.addAudit('דניאל ר. (נציג)', `סימון מרקר על גבי מסמך ${this.currentDoc}`);
      App.showToast('הדגשה נשמרה על המסמך', 'success');
    });
  }
};

// ==========================================================
// 6. SCENARIO 3: ADMIN OPS CONTROL CENTER
// ==========================================================
const AdminOps = {
  toggleDrawer(open) {
    document.getElementById('management-drawer').classList.toggle('open', open);
    document.getElementById('drawer-backdrop').classList.toggle('open', open);
  },

  toggleAgent(agentId) {
    const agent = Store.agents.find(a => a.id === agentId);
    if (agent) {
      agent.active = !agent.active;
      App.addAudit('מנהל מערכת', `שינוי הרשאת פעילות לנציג: ${agent.name} (סטטוס: ${agent.active ? 'פעיל' : 'כבוי'})`);
      App.showToast(`הרשאת נציג ${agent.name} עודכנה בהצלחה`, 'info');
    }
  },

  autoAssignAll() {
    Store.exceptions.forEach(exc => {
      if (exc.agent === 'לא משויך') {
        exc.agent = 'מיכל כ.';
        exc.status = 'בטיפול';
      }
    });
    App.addAudit('מנהל מערכת', 'הפעלת אלגוריתם שיוך אוטומטי לחלוקת עומסים');
    App.renderAdminExceptions();
    App.showToast('כל הפניות הלא משויכות חולקו בהצלחה לנציגים זמינים! 🤖', 'success');
  },

  unblockAll() {
    Store.exceptions = Store.exceptions.filter(e => !e.status.includes('חסום'));
    App.addAudit('מנהל מערכת', 'שחרור חסימות גורף לכשלי הגשה');
    App.renderAdminExceptions();
    App.showToast('כל התהליכים החסומים שוחררו בהצלחה! 🔓', 'success');
  },

  handleQuickAction(index) {
    const exc = Store.exceptions[index];
    if (exc.actionLabel === 'שיוך מהיר' || exc.actionLabel === 'העברה לצוות') {
      exc.agent = 'דניאל ר.';
      exc.status = 'בטיפול';
      exc.actionLabel = 'הושלם ✔️';
      App.showToast(`אירוע ${exc.id} שויך בהצלחה לנציג דניאל ר.`, 'success');
    } else if (exc.actionLabel === 'ניסיון חוזר') {
      exc.status = 'סונכרן';
      exc.actionLabel = 'הושלם ✔️';
      App.showToast(`בוצע סנכרון חוזר מוצלח לאירוע ${exc.id}`, 'success');
    } else if (exc.actionLabel === 'שחרור חסימה') {
      exc.status = 'פתוח לטיפול';
      exc.actionLabel = 'הושלם ✔️';
      App.showToast(`החסימה שוחררה בהצלחה לאירוע ${exc.id}`, 'success');
    } else if (exc.actionLabel === 'בדיקת נציג') {
      App.switchRole('agent');
      return;
    }
    App.addAudit('מנהל מערכת', `ביצוע פעולה מהירה על אירוע ${exc.id} (${exc.type})`);
    App.renderAdminExceptions();
  }
};

// Initialize Application when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
