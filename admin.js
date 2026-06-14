function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const userDataString = sessionStorage.getItem('ubu_user_data');
const userToken = sessionStorage.getItem('ubu_token');
let currentUser = null;
try { currentUser = JSON.parse(userDataString); } catch(e) {}

if (!currentUser || !userToken || currentUser.role !== 'admin') {
    sessionStorage.clear();
    if(document.getElementById('appLayout')) document.getElementById('appLayout').style.display = 'none'; 
    Swal.fire({ icon: 'error', title: 'ปฏิเสธการเข้าถึง', text: 'เซสชันหมดอายุ หรือคุณไม่มีสิทธิ์เข้าถึงหน้านี้', confirmButtonText: 'กลับไปหน้าเข้าสู่ระบบ', confirmButtonColor: '#1976D2', allowOutsideClick: false }).then(() => { window.location.replace("index.html"); });
    throw new Error("Unauthorized");
}

const adminId = currentUser.studentId;
window.Swal = Swal.mixin({ confirmButtonText: 'ตกลง', cancelButtonText: 'ยกเลิก' });

function checkAuthError(res) {
    if (!res) return false;
    if (res.success === false && (res.message||'').match(/(401|403|เซสชัน|Token|Unauthorized|สวมรอย)/)) {
        Swal.fire({ icon: 'error', title: 'ระบบความปลอดภัย', text: res.message || 'เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่', confirmButtonText: 'เข้าสู่ระบบใหม่', allowOutsideClick: false }).then(() => { sessionStorage.clear(); window.location.replace("index.html"); });
        return true;
    }
    return false;
}

function safeArray(res) { return Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : (res && Array.isArray(res.list) ? res.list : [])); }
function showLoading(msg) { const t = document.getElementById('loaderText'), l = document.getElementById('customLoader'); if(t) t.innerHTML = msg || 'ระบบกำลังประมวลผล กรุณารอสักครู่'; if(l) l.style.display = 'flex'; }
function hideLoading() { const l = document.getElementById('customLoader'); if(l) l.style.display = 'none'; }
function maskString(str, type) { if (!str) return '-'; if (type === 'email') { const p = String(str).split('@'); return p.length < 2 ? str : (p[0].length > 3 ? p[0].substring(0,3) + '***' : '***') + '@' + p[1]; } return str; }
function formatDate(dateStr) { if(!dateStr) return '-'; const d = new Date(dateStr); return isNaN(d) ? dateStr : d.toLocaleDateString('th-TH', {year:'numeric', month:'short', day:'numeric'}); }
function getRoleDisplay(role) { return role === 'admin' ? 'ผู้ทำรายการสถานศึกษา' : 'นักศึกษาผู้กู้ยืม'; }
function closeSidebarOnMobile() { const s = document.getElementById('sidebar'), o = document.getElementById('sidebarOverlay'); if (window.innerWidth <= 900) { if(s) s.classList.remove('active'); if(o) o.classList.remove('active'); } }

function showAlert(msg, type = 'success') { 
    let t = 'แจ้งเตือน', c = '#7066e0';
    if(type==='success'){ t='ทำรายการสำเร็จ'; c='#28a745'; } else if(type==='error'){ t='เกิดข้อผิดพลาด'; c='#dc3545'; }
    Swal.fire({ icon: type, title: t, html: msg, confirmButtonColor: c }); 
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(sectionId); if(target) target.classList.add('active');
    window.scrollTo(0, 0);
}

function hideEmptyMenus() {
    document.querySelectorAll('.sidebar-menu > li.nav-item').forEach(m => {
        const sub = m.querySelector('.submenu-list');
        if (sub) {
            let hasV = false; sub.querySelectorAll('a.nav-link').forEach(l => { if (l.style.display !== 'none' && l.parentElement.style.display !== 'none') hasV = true; });
            if (!hasV) m.style.display = 'none';
        }
    });
    let currH = null, found = false;
    document.querySelectorAll('.sidebar-menu > *').forEach(el => {
        if (el.classList.contains('nav-header')) { if (currH && !found) currH.style.display = 'none'; currH = el; found = false; }
        else if (el.style.display !== 'none') { found = true; }
    });
    if (currH && !found) currH.style.display = 'none';
}

async function loadAdminDashboardStats() {
    showLoading();
    try {
        const res = await callApi("getDashboardStats", { adminId, token: userToken });
        hideLoading(); if (checkAuthError(res)) return;
        if(document.getElementById('totalUsersCount')) document.getElementById('totalUsersCount').textContent = res.stats.totalUsers.toLocaleString();
        if(document.getElementById('maleCount')) document.getElementById('maleCount').textContent = res.stats.male.toLocaleString();     
        if(document.getElementById('femaleCount')) document.getElementById('femaleCount').textContent = res.stats.female.toLocaleString(); 
        if(document.getElementById('confirmedRegistrationsCount')) document.getElementById('confirmedRegistrationsCount').textContent = res.stats.confirmedRegistrations.toLocaleString();
    } catch(e) { hideLoading(); }
}

let allUsersCache = [];
async function searchUsersBackend() {
    const q = document.getElementById('userSearchInput').value.trim();
    if(!q) return Swal.fire('แจ้งเตือน', 'กรุณากรอกคำค้นหา', 'warning');
    showLoading();
    try {
        const res = await callApi("searchUsersBackend", { query: q, adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        allUsersCache = safeArray(res); renderUserTable(allUsersCache);
    } catch(e) { hideLoading(); }
}

function renderUserTable(arr) {
    const tb = document.querySelector('#usersTable tbody'); if(!tb) return; tb.innerHTML = '';
    if(!arr.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">ไม่พบข้อมูลผู้ใช้</td></tr>'; return; }
    arr.forEach(u => {
        const st = u.status === 'Suspended' ? '<br><span style="color:#e53e3e;font-size:12px;">● ถูกระงับ</span>' : '<br><span style="color:#38a169;font-size:12px;">● ปกติ</span>';
        tb.innerHTML += `<tr><td>${escapeHTML(u.studentId)}</td><td>${escapeHTML(u.firstName)} ${escapeHTML(u.lastName)}</td><td>${escapeHTML(maskString(u.gmail,'email'))}${st}</td><td>${escapeHTML(getRoleDisplay(u.role))}</td><td><button class="btn btn-info btn-sm btn-edit-user" data-id="${escapeHTML(u.id)}">จัดการ</button></td></tr>`;
    });
}

function editUser(id) {
    const u = allUsersCache.find(x => x.id === id); if(!u) return;
    document.getElementById('userId').value = u.id;
    document.getElementById('modalUserGmail').value = u.gmail || '';
    document.getElementById('modalUserStudentId').value = u.studentId || '';
    document.getElementById('modalUserFirstName').value = u.firstName || '';
    document.getElementById('modalUserLastName').value = u.lastName || '';
    document.getElementById('modalUserPrefix').value = u.prefix || 'นาย';
    document.getElementById('modalUserFaculty').value = u.faculty || '';
    document.getElementById('modalUserPhone').value = u.phone || '';
    document.getElementById('modalUserRole').value = u.role || 'user';
    
    const display = document.getElementById('modalUserStatusDisplay'), btn = document.getElementById('modalBtnSuspend');
    document.getElementById('modalStatusContainer').style.display = 'flex';
    if(u.status === 'Suspended') {
        display.innerHTML = `<span style="color:#e53e3e;">ถูกระงับ: ${escapeHTML(u.suspendReason||'-')}</span>`;
        btn.className = "btn btn-success"; btn.innerHTML = 'ปลดระงับ';
        btn.onclick = () => { document.getElementById('userModal').style.display='none'; actionSuspend(u.id, 'Active'); };
    } else {
        display.innerHTML = '<span style="color:#38a169;">ปกติ (Active)</span>';
        btn.className = "btn btn-danger"; btn.innerHTML = 'ระงับบัญชี';
        btn.onclick = () => { document.getElementById('userModal').style.display='none'; actionSuspend(u.id, 'Suspended'); };
    }
    document.getElementById('userModal').style.display = 'flex';
}

function actionSuspend(id, status) {
    if(status === 'Suspended') {
        Swal.fire({ title: 'ระบุสาเหตุการระงับบัญชี', input: 'text', showCancelButton: true, inputValidator: v => !v ? 'กรุณากรอกสาเหตุ' : null }).then(r => {
            if(r.isConfirmed) executeStatusUpdate(id, status, r.value);
        });
    } else {
        Swal.fire({ title: 'ยืนยันปลดระงับบัญชี', icon: 'question', showCancelButton: true }).then(r => { if(r.isConfirmed) executeStatusUpdate(id, status, ''); });
    }
}

async function executeStatusUpdate(userId, status, reason) {
    showLoading();
    try {
        const res = await callApi("updateUser", { userId, status, suspendReason: reason, adminId, token: userToken });
        hideLoading(); if (checkAuthError(res)) return;
        if(res.success) { Swal.fire('สำเร็จ', res.message, 'success'); loadSuspendedUsers(); searchUsersBackend(); } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
    } catch(e) { hideLoading(); }
}

let cachedDuplicateGroups = [];
async function runDuplicateCheck() {
    const area = document.getElementById('duplicateResultArea'); if(area) area.innerHTML = '<div class="text-center">กำลังสแกน...</div>';
    showLoading();
    try {
        const res = await callApi("checkDuplicateAccounts", { adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        cachedDuplicateGroups = safeArray(res); displayDuplicateResults(cachedDuplicateGroups);
    } catch(e) { hideLoading(); }
}

function displayDuplicateResults(arr) {
    const area = document.getElementById('duplicateResultArea'); if(!area) return;
    if(!arr.length) { area.innerHTML = '<div class="alert alert-success">ไม่พบข้อมูลซ้ำซ้อนในระบบ</div>'; return; }
    let html = '';
    arr.forEach((g, i) => {
        const tid = 'dup-group-' + i;
        html += `<div style="border:1px solid #ddd; margin-bottom:10px; border-radius:8px; padding:10px;">
            <div class="parent-dup-toggle" data-target="${tid}" style="cursor:pointer; display:flex; justify-content:space-between; font-weight:bold;">
                <div>[${escapeHTML(g.type)}] ${escapeHTML(g.duplicateValue)}</div>
                <div><span class="badge" style="background:#e53e3e; color:white; padding:2px 8px; border-radius:10px;">ซ้ำ ${g.count} บัญชี</span></div>
            </div>
            <div id="${tid}" style="display:none; margin-top:10px;">
                <table class="clean-table" style="font-size:12px;">
                    ${g.users.map(u => `<tr><td><b>${escapeHTML(u.studentId)}</b></td><td>${escapeHTML(u.name)}</td><td>${u.status==='Suspended'?'ระงับ':'ปกติ'}</td><td><button class="btn btn-sm btn-dup-suspend" data-id="${u.id}" data-status="${u.status}">${u.status==='Suspended'?'ปลด':'แบน'}</button> <button class="btn btn-sm btn-danger btn-dup-delete" data-id="${u.id}" data-sid="${u.studentId}">ลบ</button></td></tr>`).join('')}
                </table>
            </div>
        </div>`;
    });
    area.innerHTML = html;
}

async function loadSuspendedUsers() {
    const tb = document.querySelector('#suspendedUsersTable tbody'); if(!tb) return;
    tb.innerHTML = '<tr><td colspan="5" class="text-center">กำลังโหลด...</td></tr>';
    try {
        const res = await callApi("getSuspendedUsers", { adminId, token: userToken });
        if(checkAuthError(res)) return; const arr = safeArray(res); tb.innerHTML = '';
        if(!arr.length) { tb.innerHTML = '<tr><td colspan="5" class="text-center" style="color:#999;">ไม่มีบัญชีที่ถูกระงับ</td></tr>'; return; }
        arr.forEach(u => {
            tb.innerHTML += `<tr><td class="text-center"><input type="checkbox" class="chk-suspended" value="${escapeHTML(u.id)}"></td><td>${escapeHTML(u.studentId)}</td><td>${escapeHTML(u.firstName)} ${escapeHTML(u.lastName)}</td><td style="color:#dc3545">${escapeHTML(u.suspendReason||'-')}</td><td class="text-center"><button class="btn btn-success btn-sm btn-susp-unsuspend" data-id="${u.id}">ปลดระงับ</button> <button class="btn btn-danger btn-sm btn-susp-delete" data-id="${u.id}" data-sid="${u.studentId}">ลบ</button></td></tr>`;
        });
    } catch(e) { tb.innerHTML = '<tr><td colspan="5" class="text-center">โหลดล้มเหลว</td></tr>'; }
}

async function adminCheckStudentVerify() {
    const sid = document.getElementById('adminCheckStudentId').value.trim();
    if(!sid) return showAlert('กรุณากรอกรหัสนักศึกษา', 'warning');
    showLoading();
    try {
        const res = await callApi("checkStudentForVerification", { studentId: sid, adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        document.getElementById('adminVerifyStep2').style.display = 'block';
        document.getElementById('adm_ver_name').textContent = res.name || '-';
        document.getElementById('adm_ver_studentId').textContent = res.studentId || '-';
        document.getElementById('adm_ver_phone').textContent = res.phone || '-';
        document.getElementById('adm_ver_idCard').textContent = res.idCard ? '***' + String(res.idCard).slice(-4) : '-';
        document.getElementById('adm_ver_accountStatus').textContent = res.accountStatus || '-';
        document.getElementById('adm_ver_profileStatus').innerHTML = res.hasProfile ? '<span style="color:green;font-weight:bold;">บันทึกแล้ว</span>' : '<span style="color:red;">ยังไม่บันทึก</span>';
        document.getElementById('adm_ver_updatedAt').textContent = res.profileUpdatedAt ? formatDate(res.profileUpdatedAt) : '-';
        
        const unlockBtn = document.getElementById('btnAdminUnlockAccount');
        if(unlockBtn) unlockBtn.style.display = (res.accountStatus === 'Locked' || res.accountStatus === 'Suspended') ? 'inline-block' : 'none';
        
        if (res.isVerified) {
            document.getElementById('admAlreadyVerifiedMessage').style.display = 'block';
            document.getElementById('adminVerifyIdentityForm').style.display = 'none';
        } else {
            document.getElementById('admAlreadyVerifiedMessage').style.display = 'none';
            document.getElementById('adminVerifyIdentityForm').style.display = 'block';
            document.getElementById('adminVerifyIdCardInput').value = '';
        }
        if(res.profileImage) {
            document.getElementById('adm_ver_profileImg').src = "https://drive.google.com/uc?export=view&id=" + res.profileImage;
        } else {
            document.getElementById('adm_ver_profileImg').src = "https://placehold.co/150x150?text=NO+IMAGE";
        }
    } catch(e) { hideLoading(); }
}

async function adminSubmitVerifyIdentity(e) {
    e.preventDefault();
    const sid = document.getElementById('adm_ver_studentId').textContent;
    const idCard = document.getElementById('adminVerifyIdCardInput').value.trim();
    if(idCard.length !== 13) return showAlert('บัตรประชาชนต้องมี 13 หลัก', 'warning');
    showLoading();
    try {
        const res = await callApi("submitIdentityVerification", { studentId: sid, idCard, adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        if(res.success) { Swal.fire('สำเร็จ', 'ยืนยันตัวตนและรีเซ็ตรหัสผ่านเรียบร้อย', 'success'); adminCheckStudentVerify(); } else { Swal.fire('ล้มเหลว', res.message, 'error'); }
    } catch(e) { hideLoading(); }
}

async function adminForceResetPassword() {
    const sid = document.getElementById('adm_ver_studentId').textContent;
    Swal.fire({ title: 'คุณต้องการบังคับรีเซ็ตรหัสผ่าน?', text: 'รหัสผ่านจะเปลี่ยนเป็นเลขบัตรประชาชน 13 หลัก', icon: 'warning', showCancelButton: true }).then(async r => {
        if(r.isConfirmed) {
            showLoading();
            try {
                const res = await callApi("adminForceResetPassword", { studentId: sid, adminId, token: userToken });
                hideLoading(); if(res.success) Swal.fire('รีเซ็ตสำเร็จ', res.message, 'success'); else Swal.fire('ล้มเหลว', res.message, 'error');
            } catch(e) { hideLoading(); }
        }
    });
}

async function adminUnlockAccount() {
    const sid = document.getElementById('adm_ver_studentId').textContent;
    showLoading();
    try {
        const res = await callApi("adminUnlockAccount", { studentId: sid, adminId, token: userToken });
        hideLoading(); if(res.success) { Swal.fire('ปลดล็อกสำเร็จ', 'เปิดใช้งานบัญชีเรียบร้อย', 'success'); adminCheckStudentVerify(); } else { Swal.fire('ล้มเหลว', res.message, 'error'); }
    } catch(e) { hideLoading(); }
}

let allProfilesData = [], currentFilteredData = [], currentPage = 1, rowsPerPage = 10;
async function loadProfilesForAdmin() {
    showLoading();
    try {
        const res = await callApi("getProfileSummaries", { adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        allProfilesData = safeArray(res); currentFilteredData = allProfilesData;
        const total = allProfilesData.length, done = allProfilesData.filter(p => p.hasProfile).length;
        if(document.getElementById('profStatTotal')) document.getElementById('profStatTotal').textContent = total;
        if(document.getElementById('profStatDone')) document.getElementById('profStatDone').textContent = done;
        if(document.getElementById('profStatPending')) document.getElementById('profStatPending').textContent = total - done;
        if(document.getElementById('profileStatsGrid')) document.getElementById('profileStatsGrid').style.display = 'grid';
        currentPage = 1; renderPagination();
    } catch(e) { hideLoading(); }
}

function renderPagination() {
    const tb = document.querySelector('#adminProfilesTable tbody'); if(!tb) return; tb.innerHTML = '';
    if(!currentFilteredData.length) { tb.innerHTML = '<tr><td colspan="6" class="text-center">ไม่พบข้อมูลประวัติ</td></tr>'; return; }
    const limit = rowsPerPage === 10000 ? currentFilteredData.length : rowsPerPage;
    const start = (currentPage - 1) * limit, end = start + limit;
    currentFilteredData.slice(start, end).forEach(p => {
        const st = p.hasProfile ? '<span style="color:green;font-weight:bold;">บันทึกแล้ว</span>' : '<span style="color:red;">ยังไม่บันทึก</span>';
        tb.innerHTML += `<tr><td>${escapeHTML(p.studentId)}</td><td>${escapeHTML(p.name)}</td><td>${escapeHTML(p.faculty)}</td><td>${st}</td><td>${formatDate(p.updatedAt)}</td><td><button class="btn btn-info btn-sm btn-prof-edit" data-sid="${escapeHTML(p.studentId)}">ตรวจสอบ</button></td></tr>`;
    });
    const totalPages = Math.ceil(currentFilteredData.length / limit) || 1;
    if(document.getElementById('pageInfoText')) document.getElementById('pageInfoText').textContent = `หน้า ${currentPage} / ${totalPages} (รวม ${currentFilteredData.length} รายการ)`;
    if(document.getElementById('btnPrevPage')) document.getElementById('btnPrevPage').disabled = (currentPage === 1);
    if(document.getElementById('btnNextPage')) document.getElementById('btnNextPage').disabled = (currentPage === totalPages);
}

function searchProfiles() {
    const input = document.getElementById('adminProfileSearchInput'); if(!input) return;
    const q = input.value.toLowerCase();
    currentFilteredData = q ? allProfilesData.filter(p => String(p.studentId).toLowerCase().includes(q) || String(p.name).toLowerCase().includes(q)) : allProfilesData;
    currentPage = 1; renderPagination();
}

async function openAdminEditProfile(studentId) {
    showLoading(); 
    const targetIdEl = document.getElementById('adm_targetStudentId'), showIdEl = document.getElementById('adm_studentId_show');
    if(targetIdEl) targetIdEl.value = studentId; if(showIdEl) showIdEl.value = studentId;
    try {
        const p = await callApi("getProfile", { studentId: studentId, adminId: adminId, token: userToken });
        hideLoading(); if(checkAuthError(p)) return;
        if (p && Object.keys(p).length > 0) {
            ['idCard','nickname','dob','gpa','phone','disease','fatherName','fatherJob','fatherPhone','motherName','motherJob','motherPhone','parentsStatus','familyMembers','householdIncome','debt','addrNo','subDistrict','district','province','zipcode','mapLink'].forEach(k => {
                const el = document.getElementById('adm_'+k); if (el) el.value = p[k] || '';
            });
        } else { showAlert('นักศึกษายังไม่ได้บันทึกข้อมูล (สามารถกรอกแทนได้)', 'info'); }
        const modal = document.getElementById('adminProfileModal'); if(modal) modal.style.display = 'flex';
    } catch(err) { hideLoading(); }
}

let cachedImageReportData = [], currentFilteredImageReportData = [], imgCurrentPage = 1, imgRowsPerPage = 20;
async function loadAdminImageReport() {
    showLoading();
    try {
        const data = await callApi("getStudentImageReport", { adminId: adminId, token: userToken });
        hideLoading(); if(checkAuthError(data)) return;
        cachedImageReportData = safeArray(data); filterImageReport();
    } catch(e) { hideLoading(); }
}

function filterImageReport() {
    const q = document.getElementById('imageReportSearchInput').value.toLowerCase().trim();
    const f = document.getElementById('imageStatusFilter').value;
    currentFilteredImageReportData = cachedImageReportData.filter(i => {
        const matchQ = String(i.studentId).includes(q) || String(i.name).toLowerCase().includes(q) || (i.idCard && String(i.idCard).includes(q));
        const matchF = f === 'all' ? true : (f === 'has_image' ? !!i.profileImage : !i.profileImage);
        return matchQ && matchF;
    });
    imgCurrentPage = 1; renderImageReportTable();
}

function renderImageReportTable() {
    const tb = document.querySelector('#imageReportTable tbody'); if(!tb) return; tb.innerHTML = '';
    const countEl = document.getElementById('imageReportCount');
    if (!currentFilteredImageReportData.length) { tb.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบข้อมูลภาพประจำตัว</td></tr>'; if(countEl) countEl.textContent='พบ 0 รายการ'; return; }
    if(countEl) countEl.textContent = `พบข้อมูล ${currentFilteredImageReportData.length} รายการ`;
    
    const limit = imgRowsPerPage === 'all' ? currentFilteredImageReportData.length : parseInt(imgRowsPerPage);
    const start = (imgCurrentPage - 1) * limit;
    currentFilteredImageReportData.slice(start, start + limit).forEach((i, idx) => {
        let imgHtml = `<img src="https://placehold.co/150x150?text=NO+IMAGE" style="width:50px;height:60px;object-fit:cover;border-radius:4px;">`;
        if(i.profileImage && i.profileImage !== "undefined") {
            const src = "https://drive.google.com/uc?export=view&id=" + i.profileImage;
            imgHtml = `<img src="${src}" data-img="${src}" onerror="this.onerror=null; this.src='https://drive.google.com/thumbnail?id=${i.profileImage}&sz=w200';" style="width:50px;height:60px;object-fit:cover;cursor:pointer;border-radius:4px;" class="img-report-thumbnail">`;
        }
        const btn = i.profileImage ? `<button class="btn btn-info btn-sm btn-img-history" data-sid="${escapeHTML(i.studentId)}">ประวัติ</button>` : '-';
        tb.innerHTML += `<tr><td class="text-center">${start+idx+1}</td><td class="text-center">${imgHtml}</td><td><b>${escapeHTML(i.studentId)}</b></td><td>${escapeHTML(i.name)}</td><td>${escapeHTML(i.idCard||'-')}</td><td>${escapeHTML(i.faculty||'-')}</td><td class="text-center">${btn}</td></tr>`;
    });
    const totalPages = Math.ceil(currentFilteredImageReportData.length / limit) || 1;
    if(document.getElementById('imgPageInfo')) document.getElementById('imgPageInfo').textContent = `หน้า ${imgCurrentPage} / ${totalPages}`;
    if(document.getElementById('imgBtnPrev')) document.getElementById('imgBtnPrev').disabled = (imgCurrentPage === 1);
    if(document.getElementById('imgBtnNext')) document.getElementById('imgBtnNext').disabled = (imgCurrentPage === totalPages);
}

async function viewImageHistory(sid) {
    document.getElementById('ih_studentId').textContent = 'รหัสนักศึกษา: ' + sid;
    const student = cachedImageReportData.find(x => x.studentId === sid);
    document.getElementById('ih_studentName').textContent = student ? student.name : '-';
    document.getElementById('imageHistoryModal').style.display = 'flex';
    const c = document.getElementById('imageHistoryContainer'); c.innerHTML = 'กำลังโหลด...';
    try {
        const res = await callApi("getProfileImageHistory", { studentId: sid, adminId, token: userToken });
        const arr = safeArray(res); c.innerHTML = '';
        if(!arr.length) { c.innerHTML = '<div style="grid-column:1/-1;" class="text-center">ไม่พบประวัติการเปลี่ยนรูปภาพ</div>'; return; }
        arr.forEach(x => {
            c.innerHTML += `<div style="text-align:center; border:1px solid #eee; padding:5px; border-radius:6px;">
                <img src="https://drive.google.com/uc?export=view&id=${x.imageUrl}" onerror="this.onerror=null; this.src='https://drive.google.com/thumbnail?id=${x.imageUrl}&sz=w400';" style="width:100%;height:140px;object-fit:cover;border-radius:4px;cursor:pointer;" class="img-history-thumbnail">
                <div style="font-size:11px;color:#666;margin-top:4px;">${formatDate(x.timestamp)}</div>
            </div>`;
        });
    } catch(e) { c.innerHTML = 'เกิดข้อผิดพลาด'; }
}

function openLightbox(url) { 
    const img = document.getElementById('lightboxImage'); const mod = document.getElementById('lightboxModal');
    if(img && mod) { img.src = url; mod.style.display = 'flex'; }
}

let adminActivitiesCache = [], currentAdminTab = 'current';
async function loadActivitiesForAdmin() {
    showLoading();
    try {
        const res = await callApi("getActivities", { mode: 'admin', studentId: adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        adminActivitiesCache = safeArray(res); renderAdminActivityTable(currentAdminTab);
    } catch(e) { hideLoading(); }
}

function switchAdminTab(tab) { 
    currentAdminTab = tab; 
    const bCurr = document.getElementById('btnTabCurrent'), bHist = document.getElementById('btnTabHistory');
    if(bCurr) { bCurr.style.backgroundColor = tab === 'current' ? 'var(--secondary-color)' : '#f1f3f5'; bCurr.style.color = tab === 'current' ? 'white' : '#666'; }
    if(bHist) { bHist.style.backgroundColor = tab === 'history' ? 'var(--secondary-color)' : '#f1f3f5'; bHist.style.color = tab === 'history' ? 'white' : '#666'; }
    renderAdminActivityTable(tab); 
}

function renderAdminActivityTable(tab) {
    const tb = document.querySelector('#adminActivityTable tbody'); if(!tb) return; tb.innerHTML = '';
    const today = new Date(); today.setHours(0,0,0,0);
    const filtered = adminActivitiesCache.filter(a => tab === 'current' ? new Date(a.date) >= today : new Date(a.date) < today);
    if(!filtered.length) { tb.innerHTML = '<tr><td colspan="6" class="text-center">ไม่มีรายการกิจกรรมจิตอาสา</td></tr>'; return; }
    
    const grp = {}; filtered.forEach(a => { if(!grp[a.date]) grp[a.date] = []; grp[a.date].push(a); });
    Object.keys(grp).sort((a,b) => new Date(b) - new Date(a)).forEach(d => {
        const key = d.replace(/[^a-zA-Z0-9]/g, '');
        const q = grp[d].reduce((s,x)=>s+parseInt(x.quota),0), c = grp[d].reduce((s,x)=>s+parseInt(x.current),0);
        tb.innerHTML += `<tr style="background:#e3f2fd; cursor:pointer;" class="parent-row" data-dateid="${key}">
            <td colspan="6"><div style="font-weight:bold;color:#1976D2;"><i class="material-icons" id="icon-${key}" style="vertical-align:bottom;font-size:18px;">expand_more</i> วันที่ ${formatDate(d)} &nbsp;|&nbsp; <span style="color:#555;font-weight:normal;">เปิดรับ ${grp[d].length} รอบ (ลงแล้ว ${c}/${q} คน)</span></div></td>
        </tr>`;
        grp[d].forEach(a => {
            const h = a.status === 'Hide' ? 'style="background:#fafafa;color:#aaa;"' : '';
            tb.innerHTML += `<tr class="child-row-${key}" ${h} style="display:none;">
                <td></td><td>${escapeHTML(a.period)}</td><td>${escapeHTML(a.name)}${a.status==='Hide'?' (ซ่อน)':''}</td><td>${escapeHTML(a.location)}</td><td>${a.current}/${a.quota}</td>
                <td>
                    <button class="btn btn-success btn-sm btn-act-edit" data-id="${a.id}"><i class="material-icons" style="font-size:14px;">edit</i></button>
                    <button class="btn btn-info btn-sm btn-act-toggle" data-id="${a.id}" data-status="${a.status}"><i class="material-icons" style="font-size:14px;">${a.status==='Show'?'visibility':'visibility_off'}</i></button>
                    <button class="btn btn-danger btn-sm btn-act-delete" data-id="${a.id}"><i class="material-icons" style="font-size:14px;">delete</i></button>
                </td>
            </tr>`;
        });
    });
}

function toggleChildRows(id) { 
    const icon = document.getElementById('icon-' + id); let isH = false;
    document.querySelectorAll(`.child-row-${id}`).forEach(r => { if (r.style.display === 'none') { r.style.display = 'table-row'; isH = false; } else { r.style.display = 'none'; isH = true; } }); 
    if (icon) icon.textContent = isH ? 'expand_more' : 'expand_less'; 
}

function openEditActivityModal(id) {
    const a = adminActivitiesCache.find(act => act.id === id); if(!a) return;
    document.getElementById('editActId').value = a.id; document.getElementById('editActName').value = a.name; document.getElementById('editActDate').value = a.date; document.getElementById('editActPeriod').value = a.period; document.getElementById('editActLocation').value = a.location; document.getElementById('editActQuota').value = a.quota; 
    const modal = document.getElementById('editActivityModal'); if(modal) modal.style.display = 'flex';
}

async function toggleStatus(id, st) { 
    showLoading(); 
    try {
        const r = await callApi("toggleActivityStatus", { id: id, status: st, adminId: adminId, token: userToken });
        if(checkAuthError(r)) return; hideLoading(); loadActivitiesForAdmin();
    } catch(err) { hideLoading(); }
}

function deleteActivity(id) { 
    Swal.fire({ title: 'ยืนยันการลบ', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบข้อมูล' }).then(async r => {
        if (r.isConfirmed) { 
            showLoading(); try {
                const res = await callApi("deleteActivity", { id: id, adminId: adminId, token: userToken });
                if(checkAuthError(res)) return; hideLoading(); loadActivitiesForAdmin();
            } catch(err) { hideLoading(); }
        }
    });
}

window.printActivitiesCache = [];
async function handlePrintSearchSubmit(e) {
    e.preventDefault();
    const d = document.getElementById('printSearchDate').value, p = document.getElementById('printSearchPeriod').value;
    if(!d) return showAlert('กรุณาเลือกวันที่', 'warning');
    showLoading();
    try {
        const res = await callApi("getActivities", { mode: 'admin', studentId: adminId, token: userToken });
        hideLoading(); window.printActivitiesCache = safeArray(res);
        const tb = document.querySelector('#printResultTable tbody'); tb.innerHTML = '';
        const f = window.printActivitiesCache.filter(x => x.date === d && (p === 'all' || x.period === p));
        if(!f.length) { tb.innerHTML = '<tr><td colspan="6" class="text-center" style="color:red;">ไม่พบกิจกรรมในระบบ</td></tr>'; return; }
        f.forEach(x => {
            tb.innerHTML += `<tr><td>${formatDate(x.date)}</td><td>${x.period}</td><td>${x.name}</td><td>${x.location}</td><td>${x.current}/${x.quota}</td><td><button class="btn btn-secondary btn-sm btn-act-print" data-id="${x.id}"><i class="material-icons" style="font-size:14px;vertical-align:middle;">print</i> พิมพ์</button></td></tr>`;
        });
    } catch(err) { hideLoading(); }
}

async function printActivityList(id) {
    const act = window.printActivitiesCache.find(x => x.id === id); if(!act) return;
    showLoading();
    try {
        const list = await callApi("getRegisteredList", { id, adminId, token: userToken });
        hideLoading(); const arr = safeArray(list);
        if(!arr.length) return Swal.fire('แจ้งเตือน', 'ไม่มีผู้ลงทะเบียนกิจกรรมนี้', 'info');
        const rows = arr.map((s, i) => `<tr><td style="text-align:center;">${i+1}</td><td style="text-align:center;">${s.studentId}</td><td>${s.name}</td><td>${s.faculty}</td><td></td></tr>`).join('');
        const html = `<html><head><style>body{font-family:'Sarabun',sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #000;padding:6px;font-size:13px;}</style></head><body><h3 style="text-align:center;">ใบเซ็นชื่อเข้าร่วมกิจกรรมจิตอาสา</h3><p><b>กิจกรรม:</b> ${act.name}<br><b>วันเวลา:</b> ${formatDate(act.date)} (${act.period})<br><b>สถานที่:</b> ${act.location}</p><table><tr><th>#</th><th>รหัสนักศึกษา</th><th>ชื่อ-สกุล</th><th>คณะ</th><th>ลงชื่อ</th></tr>${rows}</table></body></html>`;
        const iframe = document.getElementById('previewIframe'); iframe.contentWindow.document.open(); iframe.contentWindow.document.write(html); iframe.contentWindow.document.close();
        document.getElementById('printPreviewModal').style.display = 'flex';
    } catch(e) { hideLoading(); }
}

let adminQueueCache = [], currentQueueTab = 'current';
async function loadAdminQueueSlots() {
    showLoading();
    try {
        const res = await callApi("getQueueSlots", { role: 'admin', studentId: adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        adminQueueCache = safeArray(res); renderAdminQueueTable();
    } catch(e) { hideLoading(); }
}

function switchQueueTab(tab) { 
    currentQueueTab = tab; 
    const tbCurr = document.getElementById('tabQueueCurrent'), tbHist = document.getElementById('tabQueueHistory');
    if(tbCurr) tbCurr.classList.toggle('active', tab === 'current');
    if(tbHist) tbHist.classList.toggle('active', tab === 'history');
    renderAdminQueueTable(); 
}

function renderAdminQueueTable() {
    const tb = document.getElementById('adminQueueTableBody'); if(!tb) return; tb.innerHTML = '';
    const today = new Date(); today.setHours(0,0,0,0);
    const filtered = adminQueueCache.filter(s => { if(!s.date) return false; const d = new Date(s.date.split('T')[0]); return currentQueueTab === 'current' ? d >= today : d < today; });
    if(!filtered.length) { tb.innerHTML = '<tr><td colspan="6" class="text-center">ไม่มีรอบคิวบริการ</td></tr>'; return; }
    
    filtered.sort((a,b) => currentQueueTab==='current'? new Date(a.date)-new Date(b.date) : new Date(b.date)-new Date(a.date)).forEach(s => {
        const pct = s.quota > 0 ? Math.min(100, Math.round((s.current/s.quota)*100)) : 0;
        const color = pct >= 100 ? '#f44336' : (pct > 80 ? '#ff9800' : '#4caf50');
        const status = s.status === 'Hide' ? 'ซ่อน' : (s.current>=s.quota?'เต็ม':'เปิด');
        tb.innerHTML += `<tr style="${s.status==='Hide'?'opacity:0.6;background:#fafafa;':''}">
            <td><b>${formatDate(s.date)}</b></td><td><b>${s.time}</b></td><td>${s.current}/${s.quota} คน</td>
            <td><div style="display:flex;align-items:center;gap:10px;"><div style="flex:1;background:#eee;height:6px;border-radius:4px;"><div style="width:${pct}%;background:${color};height:100%;border-radius:4px;"></div></div><span>${pct}%</span></div></td>
            <td>${status}</td>
            <td>
                <button class="btn btn-sm btn-queue-toggle" data-id="${s.id}" data-status="${s.status}"><i class="material-icons" style="font-size:14px;">${s.status==='Show'?'visibility_off':'visibility'}</i></button>
                <button class="btn btn-info btn-sm btn-queue-edit" data-id="${s.id}"><i class="material-icons" style="font-size:14px;">edit</i></button>
                <button class="btn btn-danger btn-sm btn-queue-delete" data-id="${s.id}"><i class="material-icons" style="font-size:14px;">delete</i></button>
            </td>
        </tr>`;
    });
}

function editQueueSlot(id) { 
    const s = adminQueueCache.find(x => x.id === id); if(!s) return;
    document.getElementById('qEditId').value = id; document.getElementById('qDate').value = s.date.split('T')[0]; document.getElementById('qTime').value = s.time; document.getElementById('qQuota').value = s.quota; document.getElementById('qStatus').value = s.status; document.getElementById('queueModalTitle').innerHTML = 'แก้ไขรอบคิว'; 
    const modal = document.getElementById('queueModal'); if(modal) modal.style.display = 'flex'; 
}

function toggleQueueStatus(id, st) { 
    Swal.fire({ title: 'ยืนยันเปลี่ยนสถานะ', icon: 'question', showCancelButton: true }).then(async r => {
        if (r.isConfirmed) { 
            showLoading(); try {
                const res = await callApi("toggleQueueStatus", { id: id, status: st === 'Show' ? 'Hide' : 'Show', adminId: adminId, token: userToken });
                if(checkAuthError(res)) return; hideLoading(); loadAdminQueueSlots();
            } catch(err) { hideLoading(); }
        }
    }); 
}

function deleteQueueSlot(id) { 
    Swal.fire({ title: 'ยืนยันลบข้อมูล', text: 'ข้อมูลการจองในรอบนี้จะหายไปทั้งหมด', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async r => {
        if (r.isConfirmed) { 
            showLoading(); try {
                const res = await callApi("deleteQueueSlot", { id: id, adminId: adminId, token: userToken });
                if(checkAuthError(res)) return; hideLoading(); loadAdminQueueSlots();
            } catch(err) { hideLoading(); }
        }
    }); 
}

let queueOptionsCache = {}, currentSearchInfo = {}, currentQueueListData = [];
async function loadQueueDateOptions() {
    try {
        const res = await callApi("getQueueSlotOptions", { adminId, token: userToken });
        if(checkAuthError(res)) return; queueOptionsCache = res || {};
        const sel = document.getElementById('searchQDate'); if(!sel) return;
        sel.innerHTML = '<option value="">-- เลือกวันที่ --</option>';
        Object.keys(queueOptionsCache).forEach(k => sel.innerHTML += `<option value="${escapeHTML(k)}">${formatDate(k)}</option>`);
    } catch(e) {}
}

function updateTimeOptions() { 
    const t = document.getElementById('searchQTime'), dEl = document.getElementById('searchQDate'); 
    if(!t || !dEl) return; const d = dEl.value; t.innerHTML = '<option value="">-- เลือกเวลา --</option>'; 
    if (d && queueOptionsCache[d]) { 
        queueOptionsCache[d].forEach(x => t.innerHTML += '<option value="' + escapeHTML(x) + '">' + escapeHTML(x) + '</option>'); t.disabled = false; 
    } else { t.disabled = true; }
}

async function handleQueueListSearch(e) {
    e.preventDefault();
    const d = document.getElementById('searchQDate').value, t = document.getElementById('searchQTime').value;
    if(!d || !t) return showAlert('กรุณาเลือกข้อมูลให้ครบ', 'warning');
    currentSearchInfo = { date: d, time: t }; showLoading();
    try {
        const res = await callApi("getQueueAttendees", { date: d, time: t, adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        currentQueueListData = safeArray(res);
        const tb = document.querySelector('#queueResultTable tbody'); tb.innerHTML = '';
        document.getElementById('printQueueBtnArea').style.display = currentQueueListData.length ? 'block' : 'none';
        if(!currentQueueListData.length) { tb.innerHTML = '<tr><td colspan="5" class="text-center">ไม่มีผู้จองคิวในรอบนี้</td></tr>'; return; }
        currentQueueListData.forEach(x => {
            tb.innerHTML += `<tr><td><b>${x.queueNumber}</b></td><td>${x.studentId}</td><td>${x.name}</td><td>${x.faculty}</td><td></td></tr>`;
        });
    } catch(err) { hideLoading(); }
}

function printQueueList() {
    const rows = currentQueueListData.map(x => '<tr><td style="text-align:center;"><b>' + escapeHTML(x.queueNumber) + '</b></td><td style="text-align:center;">' + escapeHTML(x.studentId) + '</td><td>' + escapeHTML(x.name) + '</td><td>' + escapeHTML(x.faculty) + '</td><td></td></tr>').join('');
    const html = '<html><head><style>body{font-family:\'Sarabun\',sans-serif;margin:20px;} table{width:100%;border-collapse:collapse;margin-top:10px;} th,td{border:1px solid #000;padding:8px;font-size:14px;} th{background:#f0f0f0;}</style></head><body><h2>ใบรายชื่อผู้จองคิวส่งเอกสาร กยศ.</h2><h3>มหาวิทยาลัยอุบลราชธานี</h3><div style="margin:20px 0; border:1px solid #000; padding:10px; border-radius:4px;"><b>วันที่:</b> ' + escapeHTML(formatDate(currentSearchInfo.date)) + '<br><b>เวลา:</b> ' + escapeHTML(currentSearchInfo.time) + '<br><b>ผู้จอง:</b> ' + currentQueueListData.length + ' คน</div><table><tr><th>คิว</th><th>รหัส</th><th>ชื่อ</th><th>คณะ</th><th>หมายเหตุ/เซ็นชื่อ</th></tr>' + rows + '</table></body></html>';
    const iframe = document.getElementById('previewIframe');
    if(iframe) { iframe.contentWindow.document.open(); iframe.contentWindow.document.write(html); iframe.contentWindow.document.close(); const mod = document.getElementById('printPreviewModal'); if(mod) mod.style.display = 'flex'; }
}

async function loadAdminLoanStats() {
    try {
        const s = await callApi("getLoanDashboardStats2569", { adminId, token: userToken });
        if(checkAuthError(s)) return;
        if(document.getElementById('statEligible')) document.getElementById('statEligible').textContent = s.totalEligible || 0;
        if(document.getElementById('statSubmitted')) document.getElementById('statSubmitted').textContent = s.submitted || 0;
        if(document.getElementById('statNotSubmitted')) document.getElementById('statNotSubmitted').textContent = s.notSubmitted || 0;
        if(document.getElementById('statFailed')) document.getElementById('statFailed').textContent = `${s.gpaFail||0}/${s.creditFail||0}`;
    } catch(e){}
}

let currentAdminLoanData = null;
async function searchLoanForAdmin() {
    const sid = document.getElementById('adminLoanSearchInput2').value.trim();
    if(!sid) return showAlert('กรุณากรอกรหัสนักศึกษา', 'warning');
    showLoading();
    try {
        const res = await callApi("adminGetLoanInfo", { studentId: sid, adminId, token: userToken });
        hideLoading(); const area = document.getElementById('adminLoanResultArea');
        if(res.status === 'not_found_student') { Swal.fire('ไม่พบสิทธิ์', 'นักศึกษาไม่มีชื่อในระบบรายเก่า', 'error'); if(area) area.style.display='none'; return; }
        currentAdminLoanData = res;
        document.getElementById('adm_loanName').textContent = res.studentInfo.name;
        document.getElementById('adm_loanId').textContent = res.studentInfo.studentId;
        document.getElementById('adm_loanFaculty').textContent = res.studentInfo.faculty;
        document.getElementById('adm_loanGpa').textContent = res.studentInfo.gpa;
        document.getElementById('adm_loanCredits').textContent = res.studentInfo.credits;
        
        const badge = document.getElementById('adm_statusBadge'), warn = document.getElementById('adm_warningBox');
        if(!res.studentInfo.isPassed) { if(warn) warn.style.display='block'; if(badge){ badge.innerHTML='ไม่ผ่าน'; badge.style.background='#dc3545'; badge.style.color='#fff'; }}
        else { if(warn) warn.style.display='none'; if(badge){ badge.innerHTML='ผ่านเกณฑ์'; badge.style.background='#28a745'; badge.style.color='#fff'; }}
        
        document.getElementById('adm_checkLiving').checked = res.loanData && res.loanData.livingAmount > 0;
        document.getElementById('adm_checkTuition').checked = res.loanData && res.loanData.tuitionAmount > 0;
        document.getElementById('adm_inputTuition').value = res.loanData ? res.loanData.tuitionAmount : '';
        toggleAdminTuition();
        document.getElementById('btnAdminDelete').style.display = res.loanData ? 'inline-flex' : 'none';
        if(area) area.style.display = 'block';
    } catch(e){ hideLoading(); }
}

function toggleAdminTuition() {
    const cb = document.getElementById('adm_checkTuition').checked;
    document.getElementById('adm_inputTuition').disabled = !cb;
    document.getElementById('adm_tuition_wrapper').style.display = cb ? 'block' : 'none';
    calcAdminLoanTotal();
}

function calcAdminLoanTotal() {
    let t = 0;
    if(document.getElementById('adm_checkLiving').checked) t += 18000;
    if(document.getElementById('adm_checkTuition').checked) t += Number(document.getElementById('adm_inputTuition').value) || 0;
    document.getElementById('adm_showTotal').textContent = t.toLocaleString();
}

async function saveLoanAsAdmin() {
    const isL = document.getElementById('adm_checkLiving').checked, isT = document.getElementById('adm_checkTuition').checked, tVal = Number(document.getElementById('adm_inputTuition').value)||0;
    if(!isL && !isT) return showAlert('กรุณาเลือกอย่างน้อย 1 รายการ', 'warning');
    if(isT && tVal<=0) return showAlert('กรุณาระบุจำนวนเงินค่าเล่าเรียน', 'warning');
    showLoading();
    try {
        const res = await callApi("adminSaveLoanRequest", { studentId: currentAdminLoanData.studentInfo.studentId, name: currentAdminLoanData.studentInfo.name, reqType: (isL&&isT)?'Both':(isL?'Living':'Tuition'), livingAmount: isL?18000:0, tuitionAmount: isT?tVal:0, totalAmount: (isL?18000:0)+tVal, adminId, token: userToken });
        hideLoading(); if(res.success) { Swal.fire('สำเร็จ', 'บันทึกข้อมูลกู้ยืมเรียบร้อย', 'success'); searchLoanForAdmin(); } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
    } catch(e){ hideLoading(); }
}

function deleteLoanAsAdmin() { 
    Swal.fire({ title: 'ลบรายการกู้ยืม', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ตกลงลบ' }).then(async r => {
        if (r.isConfirmed) { 
            showLoading(); try {
                const res = await callApi("adminDeleteLoanRequest", { studentId: currentAdminLoanData.studentInfo.studentId, adminId: adminId, token: userToken });
                if(checkAuthError(res)) return; hideLoading(); 
                document.getElementById('adminLoanResultArea').style.display = 'none'; document.getElementById('adminLoanSearchInput2').value = '';
            } catch(err) { hideLoading(); }
        } 
    });
}

async function uploadExcelFile() {
    const file = document.getElementById('excelFileInput').files[0]; if(!file) return showAlert('กรุณาเลือกไฟล์', 'warning');
    Swal.fire({ title: 'กำลังประมวลผลไฟล์รายชื่อ', text: 'กรุณารอสักครู่...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const res = await callApi("uploadAndImportExcel", { fileName: file.name, mimeType: file.type||"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: e.target.result.split(',')[1], blockedPrefixes: [], adminId, token: userToken });
            if(res.success) { Swal.fire('สำเร็จ', res.message, 'success'); loadAdminLoanStats(); document.getElementById('excelFileInput').value=''; } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
        } catch(err){ Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error'); }
    };
    reader.readAsDataURL(file);
}

async function downloadAdminReport() {
    const rType = document.querySelector('input[name="reportType"]:checked').value, fac = document.getElementById('reportFaculty').value;
    showLoading();
    try {
        const res = await callApi("getAdminReportCSV", { reportType: rType, faculty: fac, adminId, token: userToken });
        hideLoading(); if(res.success) { downloadCSV(res.csvData, `รายงาน_${rType}_2569.csv`); } else { Swal.fire('แจ้งเตือน', res.message, 'info'); }
    } catch(e){ hideLoading(); }
}

function downloadCSV(csv, name) { const blob = new Blob(["\uFEFF" + csv], {type: 'text/csv;charset=utf-8;'}); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = name; link.click(); }

let overAllData = [], overFilteredData = [], overCurrentPage = 1, overRowsPerPage = 10;
async function loadAdminOverLoanStats() {
    try {
        const s = await callApi("getOverLoanDashboardStats", { adminId, token: userToken });
        if(document.getElementById('statOverEligible')) document.getElementById('statOverEligible').textContent = s.totalEligible || 0;
        if(document.getElementById('statOverSubmitted')) document.getElementById('statOverSubmitted').textContent = s.submitted || 0;
        if(document.getElementById('statOverNotSubmitted')) document.getElementById('statOverNotSubmitted').textContent = s.notSubmitted || 0;
        if(document.getElementById('statOverFailed')) document.getElementById('statOverFailed').textContent = `${s.gpaFail||0}/${s.creditFail||0}`;
    } catch(e){}
}

async function uploadOverExcel() {
    const file = document.getElementById('overExcelInput').files[0]; if(!file) return showAlert('กรุณาเลือกไฟล์ก่อน', 'warning');
    Swal.fire({ title: 'กำลังนำเข้าข้อมูล', text: 'กรุณารอสักครู่...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const res = await callApi("uploadAndImportOverExcel", { fileName: file.name, mimeType: file.type, content: e.target.result.split(',')[1], blockedPrefixes: [], adminId, token: userToken });
            if(res.success) { Swal.fire('สำเร็จ', res.message, 'success'); loadAdminOverLoanStats(); loadOverLoanAdminTable(); document.getElementById('overExcelInput').value=''; } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
        } catch(err){ Swal.fire('ผิดพลาด', err.message, 'error'); }
    };
    reader.readAsDataURL(file);
}

async function uploadOverGpa() {
    const file = document.getElementById('overGpaInput').files[0]; if(!file) return showAlert('กรุณาเลือกไฟล์ก่อน', 'warning');
    Swal.fire({ title: 'กำลังอัปเดตเกรด', text: 'กรุณารอสักครู่...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const res = await callApi("uploadAndImportOverGPACredits", { fileName: file.name, mimeType: file.type, content: e.target.result.split(',')[1], adminId, token: userToken });
            if(res.success) { Swal.fire('สำเร็จ', `อัปเดตสำเร็จ ${res.updateCount} รายการ`, 'success'); loadAdminOverLoanStats(); loadOverLoanAdminTable(); document.getElementById('overGpaInput').value=''; } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
        } catch(err){ Swal.fire('ผิดพลาด', err.message, 'error'); }
    };
    reader.readAsDataURL(file);
}

async function loadOverLoanAdminTable() {
    try {
        const res = await callApi("getOverLoanProfilesSummary", { adminId, token: userToken });
        overAllData = safeArray(res); overFilteredData = overAllData; overCurrentPage = 1; renderOverLoanTable();
    } catch(e){}
}

function renderOverLoanTable() {
    const tb = document.querySelector('#overAdminTable tbody'); if(!tb) return; tb.innerHTML = '';
    if(!overFilteredData.length) { tb.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบข้อมูล</td></tr>'; return; }
    const start = (overCurrentPage - 1) * overRowsPerPage, end = start + overRowsPerPage;
    overFilteredData.slice(start, end).forEach((p, i) => {
        const st = p.status === 'Submitted' ? '<span style="color:green;font-weight:bold;">ยื่นแล้ว</span>' : '<span style="color:#777;">ยังไม่ยื่น</span>';
        tb.innerHTML += `<tr><td class="text-center">${start+i+1}</td><td>${escapeHTML(p.studentId)}</td><td>${escapeHTML(p.name)}</td><td>${escapeHTML(p.faculty)}</td><td class="text-center">${p.gpa}</td><td class="text-center">${p.credits}</td><td class="text-center">${st}</td></tr>`;
    });
    if(document.getElementById('overPageInfo')) document.getElementById('overPageInfo').textContent = `หน้า ${overCurrentPage} จาก ${Math.ceil(overFilteredData.length/overRowsPerPage)||1}`;
    if(document.getElementById('btnOverPrev')) document.getElementById('btnOverPrev').disabled = (overCurrentPage === 1);
    if(document.getElementById('btnOverNext')) document.getElementById('btnOverNext').disabled = (overCurrentPage === Math.ceil(overFilteredData.length/overRowsPerPage));
}

function searchOverLoanTable() {
    const q = document.getElementById('overSearchInput').value.toLowerCase().trim();
    const f = document.getElementById('overStatusFilter').value;
    overFilteredData = overAllData.filter(p => {
        const mq = String(p.studentId).includes(q) || p.name.toLowerCase().includes(q);
        const mf = f === 'all' ? true : (f === 'Submitted' ? p.status === 'Submitted' : p.status !== 'Submitted');
        return mq && mf;
    });
    overCurrentPage = 1; renderOverLoanTable();
}

async function downloadOverReport() {
    showLoading();
    try {
        const res = await callApi("getOverAdminReportCSV", { adminId, token: userToken });
        hideLoading(); if(res.success) downloadCSV(res.csvData, 'รายงานกู้เกินหลักสูตร_2569.csv'); else Swal.fire('เตือน', res.message, 'info');
    } catch(e){ hideLoading(); }
}

async function loadAdminResignStats() {
    try {
        const s = await callApi("getResignDashboardStats", { adminId, token: userToken });
        if(document.getElementById('statResignEligible')) document.getElementById('statResignEligible').textContent = s.totalEligible || 0;
        if(document.getElementById('rsStatMoveUni')) document.getElementById('rsStatMoveUni').textContent = s.moveUni || 0;
        if(document.getElementById('rsStatChangeFac')) document.getElementById('rsStatChangeFac').textContent = s.changeFac || 0;
        if(document.getElementById('rsStatQuit')) document.getElementById('rsStatQuit').textContent = s.quit || 0;
        
        if(document.getElementById('rsStatEligible')) document.getElementById('rsStatEligible').textContent = s.totalEligible || 0;
        if(document.getElementById('rsStatSubmitted')) document.getElementById('rsStatSubmitted').textContent = s.submitted || 0;
        if(document.getElementById('rsStatPending')) document.getElementById('rsStatPending').textContent = s.pending || 0;
        if(document.getElementById('rsStatCompleted')) document.getElementById('rsStatCompleted').textContent = s.completed || 0;
    } catch(e){}
}

async function uploadResignFile() {
    const file = document.getElementById('resignExcelInput').files[0]; if(!file) return showAlert('กรุณาเลือกไฟล์ก่อน', 'warning');
    Swal.fire({ title: 'กำลังประมวลผลนำเข้าข้อมูลลาออก', text: 'กรุณารอสักครู่...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const res = await callApi("uploadAndImportResignExcel", { fileName: file.name, mimeType: file.type, content: e.target.result.split(',')[1], adminId, token: userToken });
            if(res.success) { Swal.fire('สำเร็จ', res.message, 'success'); loadAdminResignStats(); loadResignAdminTable(); document.getElementById('resignExcelInput').value=''; } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
        } catch(err){ Swal.fire('ผิดพลาด', err.message, 'error'); }
    };
    reader.readAsDataURL(file);
}

let resignAllData = [], resignFilteredData = [], resignCurrentPage = 1, resignRowsPerPage = 10;
async function loadResignAdminTable() {
    try {
        const res = await callApi("getResignAdminData", { adminId, token: userToken });
        resignAllData = safeArray(res); filterResignTable();
    } catch(e){}
}

function filterResignTable() {
    const q = document.getElementById('rsSearchInput').value.toLowerCase().trim();
    const f = document.getElementById('rsStatusFilter').value;
    resignFilteredData = resignAllData.filter(p => {
        const mq = String(p.studentId).includes(q) || p.name.toLowerCase().includes(q);
        const mf = f === 'all' ? true : p.status === f;
        return mq && mf;
    });
    resignCurrentPage = 1; renderResignTable();
}

function renderResignTable() {
    const tb = document.querySelector('#rsTable tbody'); if(!tb) return; tb.innerHTML = '';
    if(!resignFilteredData.length) { tb.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบข้อมูลคำร้องลาออก</td></tr>'; return; }
    const start = (resignCurrentPage - 1) * resignRowsPerPage, end = start + resignRowsPerPage;
    resignFilteredData.slice(start, end).forEach((p, i) => {
        let details = '-';
        if(p.type==='ย้ายสถานศึกษา') details = p.newUni;
        else if(p.type==='ย้ายคณะภายใน') details = `${p.newFaculty} / ${p.newMajor}`;
        const st = p.status === 'Completed' ? '<span style="color:green;font-weight:bold;">เสร็จสิ้น</span>' : '<span style="color:orange;">รอดำเนินการ</span>';
        const btn = p.status === 'Pending' ? `<button class="btn btn-success btn-sm btn-rs-complete" data-id="${p.id}">เสร็จสิ้น</button>` : '-';
        tb.innerHTML += `<tr><td class="text-center">${start+i+1}</td><td>${escapeHTML(p.studentId)}</td><td>${escapeHTML(p.name)}</td><td>${escapeHTML(p.type)}</td><td>${escapeHTML(details)}</td><td class="text-center">${st}</td><td class="text-center">${btn}</td></tr>`;
    });
    if(document.getElementById('rsPageInfo')) document.getElementById('rsPageInfo').textContent = `หน้า ${resignCurrentPage} / ${Math.ceil(resignFilteredData.length/resignRowsPerPage)||1}`;
    if(document.getElementById('rsBtnPrev')) document.getElementById('rsBtnPrev').disabled = (resignCurrentPage === 1);
    if(document.getElementById('rsBtnNext')) document.getElementById('rsBtnNext').disabled = (resignCurrentPage === Math.ceil(resignFilteredData.length/resignRowsPerPage));
}

async function updateResignStatus(reqId) {
    Swal.fire({ title: 'ยืนยันดำเนินการคำร้องลาออกนี้เสร็จสิ้น?', icon: 'warning', showCancelButton: true }).then(async r => {
        if(r.isConfirmed) {
            showLoading();
            try {
                const res = await callApi("updateResignRequestStatus", { requestId: reqId, status: 'Completed', adminId, token: userToken });
                hideLoading(); if(res.success) { Swal.fire('สำเร็จ', 'อัปเดตสถานะสำเร็จ', 'success'); loadAdminResignStats(); loadResignAdminTable(); } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
            } catch(e){ hideLoading(); }
        }
    });
}

async function loadAdminAnnouncements() {
    try {
        const res = await callApi("getAdminAnnList", { adminId, token: userToken });
        const tb = document.getElementById('annTableBody'); if(!tb) return; tb.innerHTML = '';
        const arr = safeArray(res);
        if(!arr.length) { tb.innerHTML = '<tr><td colspan="5" class="text-center">ไม่พบข้อมูลประกาศ</td></tr>'; return; }
        arr.forEach(x => {
            const st = x.status === 'เปิดใช้งาน' ? '<span style="color:green">🟢 เปิดใช้งาน</span>' : '<span style="color:red">🔴 ปิดใช้งาน</span>';
            tb.innerHTML += `<tr><td>${formatDate(x.createdAt)}</td><td><b>${escapeHTML(x.title)}</b></td><td>${formatDate(x.endDate)}</td><td>${st}</td>
                <td>
                    <button class="btn btn-info btn-sm btn-ann-edit" data-id="${x.id}" data-title="${escapeHTML(x.title)}" data-content="${escapeHTML(x.content)}" data-end="${x.endDate}" data-status="${x.status}"><i class="material-icons" style="font-size:14px;">edit</i></button>
                    <button class="btn btn-danger btn-sm btn-ann-delete" data-id="${x.id}"><i class="material-icons" style="font-size:14px;">delete</i></button>
                </td></tr>`;
        });
    } catch(e){}
}

async function saveAnnData() {
    const id = document.getElementById('annID').value, title = document.getElementById('annTitle').value.trim(), content = document.getElementById('annContent').value.trim(), endDate = document.getElementById('annEndDate').value, status = document.getElementById('annStatus').value;
    if(!title || !content || !endDate) return showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    showLoading();
    try {
        const res = await callApi("saveAnnData", { id, title, content, endDate, status, adminId, token: userToken });
        hideLoading(); if(res.success) { Swal.fire('สำเร็จ', 'บันทึกข้อมูลประกาศเรียบร้อย', 'success'); document.getElementById('annModal').style.display='none'; loadAdminAnnouncements(); } else { Swal.fire('ล้มเหลว', res.message, 'error'); }
    } catch(e){ hideLoading(); }
}

function deleteAnnData(id) {
    Swal.fire({ title: 'ยืนยันลบประกาศนี้?', text: 'ข้อมูลประกาศจะถูกลบถาวร', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async r => {
        if(r.isConfirmed) {
            showLoading();
            try {
                const res = await callApi("deleteAnnData", { id, adminId, token: userToken });
                hideLoading(); if(res.success) { Swal.fire('สำเร็จ', 'ลบประกาศเรียบร้อย', 'success'); loadAdminAnnouncements(); } else { Swal.fire('ล้มเหลว', res.message, 'error'); }
            } catch(e){ hideLoading(); }
        }
    });
}

let cachedPetitionsData = [], currentFilteredPetitionsData = [], petCurrentPage = 1, petRowsPerPage = 20;
async function loadAdminPetitions() {
    showLoading();
    try {
        const res = await callApi("getAdminPetitions", { adminId, token: userToken });
        hideLoading(); if(checkAuthError(res)) return;
        cachedPetitionsData = safeArray(res);
        const t = cachedPetitionsData.length, p = cachedPetitionsData.filter(x => x['สถานะ'] === 'รอดำเนินการ' || x['สถานะ'] === 'รับคำร้อง').length;
        if(document.getElementById('petStatTotal')) document.getElementById('petStatTotal').textContent = t;
        if(document.getElementById('petStatPending')) document.getElementById('petStatPending').textContent = p;
        if(document.getElementById('petStatDone')) document.getElementById('petStatDone').textContent = t - p;
        filterPetitionsTable();
    } catch(e){ hideLoading(); }
}

function filterPetitionsTable() {
    const t = document.getElementById('filterPetType').value, s = document.getElementById('filterPetStatus').value;
    currentFilteredPetitionsData = cachedPetitionsData.filter(x => {
        const mt = t === 'all' ? true : x['ประเภทคำร้อง'] === t;
        const ms = s === 'all' ? true : x['สถานะ'] === s;
        return mt && ms;
    });
    petCurrentPage = 1; renderPetitionsTable();
}

function renderPetitionsTable() {
    const tb = document.querySelector('#adminPetitionTable tbody'); if(!tb) return; tb.innerHTML = '';
    const info = document.getElementById('petPaginationInfo'), limit = parseInt(petRowsPerPage);
    if(!currentFilteredPetitionsData.length) { tb.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบคำร้องที่ระบุ</td></tr>'; if(info) info.textContent='แสดง 0-0 จาก 0 รายการ'; return; }
    
    const start = (petCurrentPage - 1) * limit, end = Math.min(start + limit, currentFilteredPetitionsData.length);
    if(info) info.textContent = `แสดง ${start+1}-${end} จาก ${currentFilteredPetitionsData.length} รายการ`;
    
    currentFilteredPetitionsData.slice(start, end).forEach(x => {
        const st = x['สถานะ'] || 'รอดำเนินการ';
        let bg = '#f1f1f1', col = '#333';
        if(st==='รอดำเนินการ'||st==='รับคำร้อง'){ bg='#e3f2fd'; col='#0d47a1'; }
        else if(st.includes('อนุมัติ')||st.includes('สำเร็จ')){ bg='#e8f5e9'; col='#2e7d32'; }
        else if(st.includes('ไม่สำเร็จ')||st==='ไม่อนุมัติ'){ bg='#ffebee'; col='#d32f2f'; }
        
        tb.innerHTML += `<tr>
            <td class="text-center"><input type="checkbox" class="chk-petition" value="${x.rowIndex}" style="transform:scale(1.2)"></td>
            <td>${formatDate(x['วันที่ยื่น'])}</td><td><b>${escapeHTML(x['รหัสนักศึกษา'])}</b></td><td>${escapeHTML(x['ชื่อ-สกุล'])}</td><td><small>${escapeHTML(x['ประเภทคำร้อง'])}</small></td>
            <td><span style="background:${bg};color:${col};padding:3px 8px;border-radius:12px;font-size:11px;font-weight:bold;">${escapeHTML(st)}</span></td>
            <td class="text-center"><button class="btn btn-info btn-sm btn-pet-manage" data-index="${x.rowIndex}" data-id="${x['รหัสนักศึกษา']}" data-name="${escapeHTML(x['ชื่อ-สกุล'])}" data-type="${escapeHTML(x['ประเภทคำร้อง'])}" data-reason="${escapeHTML(x['เหตุผลประกอบ'])}" data-status="${escapeHTML(st)}" data-note="${escapeHTML(x['หมายเหตุเจ้าหน้าที่']||'')}">พิจารณา</button></td>
        </tr>`;
    });
    if(document.getElementById('btnPetPrev')) document.getElementById('btnPetPrev').disabled = (petCurrentPage === 1);
    if(document.getElementById('btnPetNext')) document.getElementById('btnPetNext').disabled = (petCurrentPage === Math.ceil(currentFilteredPetitionsData.length / limit));
    document.getElementById('selectAllPetitions').checked = false; updateSelectedPetitionsCount();
}

function updateSelectedPetitionsCount() {
    const checked = document.querySelectorAll('.chk-petition:checked').length;
    if(document.getElementById('selectedPetCount')) document.getElementById('selectedPetCount').textContent = checked;
}

async function submitPetitionUpdate(e) {
    e.preventDefault();
    const idx = document.getElementById('modalPetRowIndex').value, status = document.getElementById('modalPetStatus').value, note = document.getElementById('modalPetNote').value.trim();
    if(status === 'ไม่อนุมัติ' && !note) return showAlert('กรุณาระบุหมายเหตุในกรณีที่ไม่อนุมัติคำร้อง', 'warning');
    showLoading();
    try {
        const res = await callApi("updatePetitionStatus", { rowIndex: idx, status, note, adminId, token: userToken });
        hideLoading(); if(res.success) { Swal.fire('สำเร็จ', 'อัปเดตสถานะคำร้องเรียบร้อย', 'success'); document.getElementById('petitionUpdateModal').style.display='none'; loadAdminPetitions(); } else { Swal.fire('ล้มเหลว', res.message, 'error'); }
    } catch(err){ hideLoading(); }
}

async function submitBulkPetitionUpdate() {
    const checked = Array.from(document.querySelectorAll('.chk-petition:checked')).map(cb => cb.value);
    if(!checked.length) return;
    const status = document.getElementById('bulkPetStatus').value, note = document.getElementById('bulkPetNote').value.trim();
    showLoading();
    try {
        const res = await callApi("bulkUpdatePetitionStatus", { rowIndexes: checked, status, note, adminId, token: userToken });
        hideLoading(); if(res.success) { Swal.fire('สำเร็จ', `อัปเดตสำเร็จ ${checked.length} รายการ`, 'success'); document.getElementById('bulkPetitionUpdateModal').style.display='none'; loadAdminPetitions(); } else { Swal.fire('ล้มเหลว', res.message, 'error'); }
    } catch(e){ hideLoading(); }
}

async function loadAdminMenuSettings() {
    showLoading();
    try {
        const settings = await callApi("getSystemMenuSettings", { adminId, token: userToken });
        hideLoading(); if(!settings) return;
        ['menu_userProfile','menu_userPetition','menu_userActivity','menu_userQueue','menu_loan2569','menu_overLoan','menu_userResign','pet_type1_open','pet_type2_open','pet_type4_open'].forEach(k => {
            const chk = document.getElementById('setting_'+k); if(chk) chk.checked = (settings[k] === 'true' || settings[k] === undefined);
        });
    } catch(e){ hideLoading(); }
}

async function saveAdminMenuSettings() {
    const s = {};
    ['menu_userProfile','menu_userPetition','menu_userActivity','menu_userQueue','menu_loan2569','menu_overLoan','menu_userResign','pet_type1_open','pet_type2_open','pet_type4_open'].forEach(k => {
        const chk = document.getElementById('setting_'+k); if(chk) s[k] = String(chk.checked);
    });
    showLoading();
    try {
        const res = await callApi("saveSystemMenuSettings", { settings: s, adminId, token: userToken });
        hideLoading(); if(res.success) Swal.fire('สำเร็จ', 'บันทึกการตั้งค่าเมนูเรียบร้อย', 'success'); else Swal.fire('ล้มเหลว', res.message, 'error');
    } catch(e){ hideLoading(); }
}

async function searchSpecialAccess() {
    const sid = document.getElementById('specialAccessSearchInput').value.trim();
    if(!sid) return showAlert('กรุณากรอกรหัสนักศึกษา', 'warning');
    showLoading();
    try {
        const res = await callApi("searchStudentForSpecialAccess", { studentId: sid, adminId, token: userToken });
        hideLoading(); const area = document.getElementById('specialAccessResultArea');
        if(res.success) {
            document.getElementById('sa_name').textContent = res.name;
            document.getElementById('sa_id').textContent = res.studentId;
            document.getElementById('sa_faculty').textContent = res.faculty;
            if(area) area.style.display = 'flex';
        } else { Swal.fire('ไม่พบข้อมูล', res.message, 'error'); if(area) area.style.display='none'; }
    } catch(e){ hideLoading(); }
}

async function grantSpecialAccess() {
    const sid = document.getElementById('sa_id').textContent; showLoading();
    try {
        const res = await callApi("grantSpecialMenuAccess", { studentId: sid, adminId, token: userToken });
        hideLoading(); if(res.success) { Swal.fire('สำเร็จ', 'ให้สิทธิ์บันทึกประวัตินอกรอบเรียบร้อย', 'success'); document.getElementById('specialAccessResultArea').style.display='none'; loadSpecialAccessList(); } else { Swal.fire('ล้มเหลว', res.message, 'error'); }
    } catch(e){ hideLoading(); }
}

async function loadSpecialAccessList() {
    const tb = document.querySelector('#specialAccessTable tbody'); if(!tb) return; tb.innerHTML = '<tr><td colspan="5" class="text-center">กำลังโหลด...</td></tr>';
    try {
        const res = await callApi("getSpecialAccessList", { adminId, token: userToken });
        const arr = safeArray(res); tb.innerHTML = '';
        if(!arr.length) { tb.innerHTML = '<tr><td colspan="5" class="text-center" style="color:#999;">ไม่มีรายชื่อนักศึกษาที่ได้รับสิทธิ์พิเศษ</td></tr>'; return; }
        arr.forEach((x, i) => {
            tb.innerHTML += `<tr><td class="text-center">${i+1}</td><td><b>${escapeHTML(x.studentId)}</b></td><td>${escapeHTML(x.name)}</td><td>${formatDate(x.grantedAt)}</td><td class="text-center"><button class="btn btn-danger btn-sm btn-sa-revoke" data-sid="${escapeHTML(x.studentId)}">ถอนสิทธิ์</button></td></tr>`;
        });
    } catch(e){ tb.innerHTML = '<tr><td colspan="5" class="text-center">เกิดข้อผิดพลาด</td></tr>'; }
}

function revokeSpecialAccess(sid) {
    Swal.fire({ title: 'ยืนยันถอนสิทธิ์พิเศษ', text: 'นักศึกษาคนนี้จะไม่สามารถเข้าเมนูประวัตินอกเวลาได้', icon: 'warning', showCancelButton: true }).then(async r => {
        if(r.isConfirmed) {
            showLoading();
            try {
                const res = await callApi("revokeSpecialMenuAccess", { studentId: sid, adminId, token: userToken });
                hideLoading(); if(res.success) { Swal.fire('สำเร็จ', 'ถอนสิทธิ์เรียบร้อย', 'success'); loadSpecialAccessList(); } else { Swal.fire('ล้มเหลว', res.message, 'error'); }
            } catch(e){ hideLoading(); }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('topbarAdminName').textContent = currentUser.firstName ? `${currentUser.prefix||''} ${currentUser.firstName} ${currentUser.lastName}` : 'ผู้ดูแลระบบ';
    loadAdminDashboardStats();

    document.querySelectorAll('.submenu-toggle').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); const sub = this.nextElementSibling; const arrow = this.querySelector('.arrow-icon');
            if(sub) { const open = sub.style.display === 'block'; sub.style.display = open ? 'none' : 'block'; if(arrow) arrow.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)'; }
        });
    });
    
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        const sidebarEl = document.getElementById('sidebar');
        if (window.innerWidth <= 900) { 
            if (sidebarEl) sidebarEl.classList.toggle('active'); 
            document.getElementById('sidebarOverlay')?.classList.toggle('active'); 
        } else { 
            if (sidebarEl) sidebarEl.classList.toggle('collapsed'); 
        }
    });
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebarOnMobile);

    function bindNav(id, sec, cb) {
        document.getElementById(id)?.addEventListener('click', (e) => { e.preventDefault(); showSection(sec); document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active')); document.getElementById(id).classList.add('active'); closeSidebarOnMobile(); if(cb) cb(); });
    }

    bindNav('navDashboard', 'adminDashboardSection', loadAdminDashboardStats);
    bindNav('navManageUsers', 'manageUsersSection', () => loadUsersForAdmin(false));
    bindNav('navAdminVerify', 'section-admin-verify', () => { document.getElementById('adminVerifyStep2').style.display='none'; document.getElementById('adminCheckStudentId').value=''; });
    bindNav('navSuspendSystem', 'suspendSystemSection', loadSuspendedUsers);
    bindNav('navAdminProfiles', 'adminManageProfilesSection', loadProfilesForAdmin);
    bindNav('navAdminImageReport', 'adminImageReportSection', loadAdminImageReport);
    bindNav('navAdminActivity', 'adminActivitySection', loadActivitiesForAdmin);
    bindNav('navPrintReport', 'printReportSection', () => { document.querySelector('#printResultTable tbody').innerHTML='<tr><td colspan="6" class="text-center">กรุณาเลือกข้อมูลค้นหา</td></tr>'; });
    bindNav('navExportData', 'exportDataSection', () => document.getElementById('exportForm').reset());
    bindNav('navAdminSpecialAccess', 'adminSpecialAccessSection', loadSpecialAccessList);
    bindNav('navManageQueue', 'adminQueue', loadAdminQueueSlots);
    bindNav('navCheckQueueList', 'adminCheckQueueListSection', () => { loadQueueDateOptions(); document.querySelector('#queueResultTable tbody').innerHTML='<tr><td colspan="5" class="text-center">กรุณากดค้นหาคิว</td></tr>'; });
    bindNav('navAdminMenuSettings', 'adminMenuSettingsSection', loadAdminMenuSettings);
    bindNav('navAdminAnnouncement', 'adminAnnouncementSection', loadAdminAnnouncements);
    bindNav('navAdminLoan2569', 'adminLoan2569Section', loadAdminLoanStats);
    bindNav('navAdminLoanManage', 'adminLoanManageSection', () => { document.getElementById('adminLoanResultArea').style.display='none'; document.getElementById('adminLoanSearchInput2').value=''; });
    bindNav('navAdminReports', 'adminReportSection', () => document.getElementById('reportStartDate').value='');
    bindNav('navAdminOverLoan', 'adminOverLoanSection', () => { loadAdminOverLoanStats(); loadOverLoanAdminTable(); });
    bindNav('navAdminResign', 'adminResignSection', loadAdminResignStats);
    bindNav('navAdminResignManage', 'adminResignManageSection', loadResignAdminTable);

    document.getElementById('btnSearchUsers')?.addEventListener('click', searchUsersBackend);
    document.getElementById('btnAdminCheckVerify')?.addEventListener('click', adminCheckStudentVerify);
    document.getElementById('adminVerifyIdentityForm')?.addEventListener('submit', adminSubmitVerifyIdentity);
    document.getElementById('btnAdminForceReset')?.addEventListener('click', adminForceResetPassword);
    document.getElementById('btnAdminUnlockAccount')?.addEventListener('click', adminUnlockAccount);
    document.getElementById('btnResetVerifyForm')?.addEventListener('click', () => { document.getElementById('adminVerifyStep2').style.display='none'; document.getElementById('adminCheckStudentId').value=''; });
    document.getElementById('btnAdminSearchProfiles')?.addEventListener('click', searchProfiles);
    document.getElementById('btnSearchImageReport')?.addEventListener('click', filterImageReport);
    document.getElementById('imageStatusFilter')?.addEventListener('change', filterImageReport);
    document.getElementById('searchPrintForm')?.addEventListener('submit', handlePrintSearchSubmit);
    document.getElementById('btnSearchSpecialAccess')?.addEventListener('click', searchSpecialAccess);
    document.getElementById('btnGrantAccess')?.addEventListener('click', grantSpecialAccess);
    document.getElementById('searchQueueListForm')?.addEventListener('submit', handleQueueListSearch);
    document.getElementById('searchQDate')?.addEventListener('change', updateTimeOptions);
    document.getElementById('btnPrintQueueList')?.addEventListener('click', printQueueList);
    document.getElementById('btnUploadExcelFile')?.addEventListener('click', uploadExcelFile);
    document.getElementById('btnUploadGPAExcelFile')?.addEventListener('click', uploadGPAExcelFile);
    document.getElementById('btnSearchLoanForAdmin')?.addEventListener('click', searchLoanForAdmin);
    document.getElementById('adm_checkTuition')?.addEventListener('change', toggleAdminTuition);
    document.getElementById('adm_inputTuition')?.addEventListener('input', calcAdminLoanTotal);
    document.getElementById('adm_checkLiving')?.addEventListener('change', calcAdminLoanTotal);
    document.getElementById('btnSaveLoanAsAdmin')?.addEventListener('click', saveLoanAsAdmin);
    document.getElementById('btnAdminDelete')?.addEventListener('click', deleteLoanAsAdmin);
    document.getElementById('btnDownloadAdminReport')?.addEventListener('click', downloadAdminReport);
    document.getElementById('btnUploadOverExcel')?.addEventListener('click', uploadOverExcel);
    document.getElementById('btnUploadOverGpa')?.addEventListener('click', uploadOverGpa);
    document.getElementById('btnDownloadOverReport')?.addEventListener('click', downloadOverReport);
    document.getElementById('btnUploadResignFile')?.addEventListener('click', uploadResignFile);
    document.getElementById('btnRunDuplicateCheck')?.addEventListener('click', runDuplicateCheck);
    document.getElementById('btnFilterDuplicateResults')?.addEventListener('click', filterDuplicateResults);
    document.getElementById('btnRefreshSuspendedUsers')?.addEventListener('click', loadSuspendedUsers);
    document.getElementById('btnDeleteSelectedSuspended')?.addEventListener('click', deleteSelectedSuspended);
    document.getElementById('btnSaveAdminMenuSettings')?.addEventListener('click', saveAdminMenuSettings);
    document.getElementById('btnSaveAnnData')?.addEventListener('click', saveAnnData);
    document.getElementById('overSearchInput')?.addEventListener('input', searchOverLoanTable);
    document.getElementById('overStatusFilter')?.addEventListener('change', searchOverLoanTable);

    document.getElementById('rowsPerPageSelect')?.addEventListener('change', function(){ rowsPerPage = parseInt(this.value); currentPage = 1; renderPagination(); });
    document.getElementById('imgRowsPerPage')?.addEventListener('change', function(){ imgRowsPerPage = this.value; imgCurrentPage = 1; renderImageReportTable(); });
    document.getElementById('rsRowsPerPage')?.addEventListener('change', function(){ resignRowsPerPage = parseInt(this.value); resignCurrentPage = 1; renderResignTable(); });
    document.getElementById('overRowsPerPage')?.addEventListener('change', function(){ overRowsPerPage = parseInt(this.value); overCurrentPage = 1; renderOverLoanTable(); });
    document.getElementById('petRowsPerPage')?.addEventListener('change', function(){ petRowsPerPage = parseInt(this.value); petCurrentPage = 1; renderPetitionsTable(); });

    document.getElementById('btnPrevPage')?.addEventListener('click', () => { if(currentPage>1){ currentPage--; renderPagination(); }});
    document.getElementById('btnNextPage')?.addEventListener('click', () => { currentPage++; renderPagination(); });
    document.getElementById('imgBtnPrev')?.addEventListener('click', () => { if(imgCurrentPage>1){ imgCurrentPage--; renderImageReportTable(); }});
    document.getElementById('imgBtnNext')?.addEventListener('click', () => { imgCurrentPage++; renderImageReportTable(); });
    document.getElementById('rsBtnPrev')?.addEventListener('click', () => { if(resignCurrentPage>1){ resignCurrentPage--; renderResignTable(); }});
    document.getElementById('rsBtnNext')?.addEventListener('click', () => { resignCurrentPage++; renderResignTable(); });
    document.getElementById('btnOverPrev')?.addEventListener('click', () => { if(overCurrentPage>1){ overCurrentPage--; renderOverLoanTable(); }});
    document.getElementById('btnOverNext')?.addEventListener('click', () => { overCurrentPage++; renderOverLoanTable(); });
    document.getElementById('btnPetPrev')?.addEventListener('click', () => { if(petCurrentPage>1){ petCurrentPage--; renderPetitionsTable(); }});
    document.getElementById('btnPetNext')?.addEventListener('click', () => { petCurrentPage++; renderPetitionsTable(); });

    document.getElementById('btnTabCurrent')?.addEventListener('click', () => switchAdminTab('current'));
    document.getElementById('btnTabHistory')?.addEventListener('click', () => switchAdminTab('history'));
    document.getElementById('tabQueueCurrent')?.addEventListener('click', () => switchQueueTab('current'));
    document.getElementById('tabQueueHistory')?.addEventListener('click', () => switchQueueTab('history'));

    document.getElementById('filterPetType')?.addEventListener('change', filterPetitionsTable);
    document.getElementById('filterPetStatus')?.addEventListener('change', filterPetitionsTable);
    document.getElementById('petitionUpdateForm')?.addEventListener('submit', submitPetitionUpdate);
    document.getElementById('btnSubmitBulkPetitionUpdate')?.addEventListener('click', submitBulkPetitionUpdate);
    document.getElementById('btnRefreshPetitions')?.addEventListener('click', loadAdminPetitions);

    const setupModal = (btnId, modalId, closeIds, openCb) => {
        document.getElementById(btnId)?.addEventListener('click', () => { if(openCb) openCb(); document.getElementById(modalId).style.display='flex'; });
        closeIds.forEach(id => document.getElementById(id)?.addEventListener('click', () => document.getElementById(modalId).style.display='none'));
    };
    setupModal('addUserBtn', 'userModal', ['btnCloseUserModal','btnCancelUserModal'], () => { document.getElementById('userForm').reset(); document.getElementById('userId').value=''; document.getElementById('modalStatusContainer').style.display='none'; });
    setupModal('btnOpenAnnModal', 'annModal', ['btnCloseAnnModal','btnCancelAnnModal'], () => { document.getElementById('annID').value=''; document.getElementById('annTitle').value=''; document.getElementById('annContent').value=''; });
    setupModal('btnOpenAddActivityModal', 'addActivityModal', ['btnCloseAddActivityModal','btnCancelAddActivityModal'], () => document.getElementById('addActivityForm').reset());
    setupModal('btnOpenAddQueueModal', 'queueModal', ['btnCloseQueueModal','btnCancelQueueModal'], () => { document.getElementById('queueForm').reset(); document.getElementById('qEditId').value=''; document.getElementById('queueModalTitle').innerHTML='เปิดรอบคิวใหม่'; });
    setupModal('btnOpenBulkPetitionModal', 'bulkPetitionUpdateModal', ['btnCloseBulkPetitionModal','btnCancelBulkPetitionModal'], () => {
        const len = document.querySelectorAll('.chk-petition:checked').length; document.getElementById('bulkPetCount').textContent = len; document.getElementById('bulkPetNote').value='';
    });

    ['btnCancelAdminProfileModal','btnCloseAdminProfileModal'].forEach(id => document.getElementById(id)?.addEventListener('click', () => document.getElementById('adminProfileModal').style.display='none'));
    ['btnCancelPetitionUpdateModal','btnClosePetitionUpdateModal'].forEach(id => document.getElementById(id)?.addEventListener('click', () => document.getElementById('petitionUpdateModal').style.display='none'));
    ['btnCancelPrintPreviewModal'].forEach(id => document.getElementById(id)?.addEventListener('click', () => document.getElementById('printPreviewModal').style.display='none'));
    document.getElementById('btnCloseLightboxModal')?.addEventListener('click', () => document.getElementById('lightboxModal').style.display='none');
    document.getElementById('btnCancelImageHistoryModal')?.addEventListener('click', () => document.getElementById('imageHistoryModal').style.display='none');
    document.getElementById('btnCloseImageHistoryModal')?.addEventListener('click', () => document.getElementById('imageHistoryModal').style.display='none');
    document.getElementById('btnCloseEditActivityModal')?.addEventListener('click', () => document.getElementById('editActivityModal').style.display='none');
    document.getElementById('btnCancelEditActivityModal')?.addEventListener('click', () => document.getElementById('editActivityModal').style.display='none');
    document.getElementById('btnTriggerPrint')?.addEventListener('click', () => document.getElementById('previewIframe').contentWindow.print());

    document.getElementById('selectAllSuspended')?.addEventListener('change', function(){ document.querySelectorAll('.chk-suspended').forEach(c => c.checked = this.checked); toggleDeleteButton(this.checked ? document.querySelectorAll('.chk-suspended').length : 0); });
    document.getElementById('selectAllPetitions')?.addEventListener('change', function(){ document.querySelectorAll('.chk-petition').forEach(c => c.checked = this.checked); updateSelectedPetitionsCount(); });

    document.getElementById('navLogout')?.addEventListener('click', () => {
        Swal.fire({ title: 'ออกจากระบบ', text: 'ยืนยันการออกจากระบบเจ้าหน้าที่?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545' }).then(r => {
            if(r.isConfirmed){ sessionStorage.clear(); window.location.replace("index.html"); }
        });
    });
});

document.body.addEventListener('click', function(e) {
    const t = e.target;
    if(t.classList.contains('btn-edit-user')) editUser(t.getAttribute('data-id'));
    else if(t.classList.contains('btn-prof-edit')) openAdminEditProfile(t.getAttribute('data-sid'));
    else if(t.classList.contains('btn-img-history')) viewImageHistory(t.getAttribute('data-sid'));
    else if(t.classList.contains('img-report-thumbnail') || t.classList.contains('img-history-thumbnail')) openLightbox(t.getAttribute('data-img'));
    else if(t.classList.contains('btn-act-edit')) openEditActivityModal(t.getAttribute('data-id'));
    else if(t.classList.contains('btn-act-toggle')) toggleStatus(t.getAttribute('data-id'), t.getAttribute('data-status') === 'Show' ? 'Hide' : 'Show');
    else if(t.classList.contains('btn-act-delete')) deleteActivity(t.getAttribute('data-id'));
    else if(t.classList.contains('btn-act-print')) printActivityList(t.getAttribute('data-id'));
    else if(t.classList.contains('btn-queue-edit')) editQueueSlot(t.getAttribute('data-id'));
    else if(t.classList.contains('btn-queue-toggle')) toggleQueueStatus(t.getAttribute('data-id'), t.getAttribute('data-status'));
    else if(t.classList.contains('btn-queue-delete')) deleteQueueSlot(t.getAttribute('data-id'));
    else if(t.classList.contains('btn-rs-complete')) updateResignStatus(t.getAttribute('data-id'));
    else if(t.classList.contains('btn-sa-revoke')) revokeSpecialAccess(t.getAttribute('data-sid'));
    else if(t.closest('.parent-row')) toggleChildRows(t.closest('.parent-row').getAttribute('data-dateid'));
    else if(t.closest('.parent-dup-toggle')) { const id = t.closest('.parent-dup-toggle').getAttribute('data-target'); const block = document.getElementById(id); if(block) block.style.display = block.style.display==='none'?'block':'none'; }
    else if(t.classList.contains('chk-suspended')) checkSuspendedSelection();
    else if(t.classList.contains('chk-petition')) updateSelectedPetitionsCount();
    else if(t.classList.contains('btn-ann-edit')) {
        document.getElementById('annID').value = t.getAttribute('data-id'); document.getElementById('annTitle').value = t.getAttribute('data-title'); document.getElementById('annContent').value = t.getAttribute('data-content'); document.getElementById('annEndDate').value = t.getAttribute('data-end').split('T')[0]; document.getElementById('annStatus').value = t.getAttribute('data-status'); document.getElementById('annModalTitle').textContent = 'แก้ไขประกาศ'; document.getElementById('annModal').style.display='flex';
    }
    else if(t.classList.contains('btn-ann-delete')) deleteAnnData(t.getAttribute('data-id'));
    else if(t.classList.contains('btn-pet-manage')) {
        document.getElementById('modalPetRowIndex').value = t.getAttribute('data-index'); document.getElementById('modalPetStudentName').textContent = t.getAttribute('data-name'); document.getElementById('modalPetStudentId').textContent = t.getAttribute('data-id'); document.getElementById('modalPetType').textContent = t.getAttribute('data-type'); document.getElementById('modalPetReason').textContent = t.getAttribute('data-reason'); document.getElementById('modalPetStatus').value = t.getAttribute('data-status'); document.getElementById('modalPetNote').value = t.getAttribute('data-note'); document.getElementById('petitionUpdateModal').style.display='flex';
    }
});

const autoLogoutSystem = () => {
    let timer;
    const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            sessionStorage.clear();
            Swal.fire({ icon: 'warning', title: 'หมดเวลาการเชื่อมต่อ', text: 'ระบบตัดการเชื่อมต่ออัตโนมัติเนื่องจากไม่มีการใช้งานระบบเกิน 10 นาที', confirmButtonText: 'เข้าสู่ระบบใหม่', allowOutsideClick: false }).then(() => window.location.replace("index.html"));
        }, 10 * 60 * 1000);
    };
    ['mousemove','keypress','touchstart','click','scroll'].forEach(e => document.addEventListener(e, reset, {passive:true}));
    reset();
};
autoLogoutSystem();
