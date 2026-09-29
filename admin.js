// Security-hardened admin client v2.0.7

  function toggleSubMenu(id) {
    const el = document.getElementById(id);
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    
    function escapeInlineJsArg(value) {
        const json = JSON.stringify(String(value == null ? '' : value))
            .replace(/</g, '\u003c').replace(/>/g, '\u003e').replace(/&/g, '\u0026')
            .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
        return json.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

const userDataString = sessionStorage.getItem('ubu_user_data');
    const userToken = sessionStorage.getItem('ubu_token');
    let currentUser = null;

    try { currentUser = JSON.parse(userDataString); } catch(e) {}
    
    if (!currentUser || !userToken || currentUser.role !== 'admin') {
        sessionStorage.clear();
        
        const appLayout = document.getElementById('appLayout');
        if (appLayout) appLayout.style.display = 'none'; 
        
        Swal.fire({
            icon: 'error',
            title: 'ปฏิเสธการเข้าถึง',
            text: 'เซสชันหมดอายุ หรือคุณไม่มีสิทธิ์เข้าถึงหน้านี้',
            confirmButtonText: 'กลับไปหน้าเข้าสู่ระบบ',
            confirmButtonColor: '#1976D2',
            allowOutsideClick: false
        }).then(() => {
            window.location.replace("index.html");
        });
        throw new Error("Unauthorized access");
    }

    const adminId = currentUser.studentId;


    function checkAuthError(res) {
        if (!res) return false;
        if (res.success === false) {
            const msg = res.message || '';
            const isAuthIssue = msg.includes('401') || msg.includes('403') || msg.includes('เซสชัน') || msg.includes('Token') || msg.includes('Unauthorized') || msg.includes('สวมรอย');
            
            if (isAuthIssue) {
                Swal.fire({
                    icon: 'error',
                    title: 'ระบบความปลอดภัย',
                    text: msg || 'เซสชันของคุณไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
                    confirmButtonText: 'เข้าสู่ระบบใหม่',
                    allowOutsideClick: false
                }).then(() => {
                    sessionStorage.clear();
                    window.location.replace("index.html");
                });
                return true; 
            }
            return false; // ถ้าเป็น Error ทั่วไป ให้ฟังก์ชันไปจัดการต่อเอง
        }
        return false; 
    }

    // ฟังก์ชันช่วยเเปลงข้อมูลให้เป็น Array เสมอ ป้องกัน forEach is not a function
    function safeArray(res) {
        if (!res) return [];
        if (res && typeof res === 'object' && !Array.isArray(res) && res.success === false) {
            throw new Error(res.message || 'ระบบไม่สามารถดึงข้อมูลได้');
        }
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.list && Array.isArray(res.list)) return res.list;
        return [];
    }

    function throwIfApiFailure(res, fallbackMessage = 'ระบบไม่สามารถดึงข้อมูลได้') {
        if (res && !Array.isArray(res) && typeof res === 'object' && res.success === false) {
            throw new Error(res.message || fallbackMessage);
        }
        return res;
    }

    // --- 3. UI Helpers ---
    
    // --- 3. UI Helpers ---
    window.Swal = Swal.mixin({ 
        confirmButtonText: 'ตกลง', 
        cancelButtonText: 'ยกเลิก'
    });
    
    let _adminLoaderShowTimer = null;

    function showLoading(msg) {
        const loaderText = document.getElementById('loaderText');
        const customLoader = document.getElementById('customLoader');
        if (loaderText) loaderText.textContent = msg || 'ระบบกำลังประมวลผล กรุณารอสักครู่';
        if (!customLoader) return;

        clearTimeout(_adminLoaderShowTimer);
        _adminLoaderShowTimer = setTimeout(() => {
            customLoader.style.display = 'flex';
        }, 140);
    }

    function hideLoading() {
        clearTimeout(_adminLoaderShowTimer);
        _adminLoaderShowTimer = null;
        const customLoader = document.getElementById('customLoader');
        if (customLoader) customLoader.style.display = 'none';
    }
    
    function showAlert(msg, type = 'success') { 
        let titleText = 'แจ้งเตือน';
        let btnColor = '#7066e0'; 
        
        if (type === 'success') {
            titleText = 'ทำรายการสำเร็จ';
            btnColor = '#28a745'; 
        } else if (type === 'error') {
            titleText = 'เกิดข้อผิดพลาด';
            btnColor = '#dc3545'; 
        } else if (type === 'warning') {
            titleText = 'แจ้งเตือน';
            btnColor = '#ffc107'; 
        } else if (type === 'info') {
            titleText = 'ข้อมูลระบบ';
            btnColor = '#17a2b8'; 
        }

        Swal.fire({ 
            icon: type, 
            title: titleText, 
            html: msg, 
            confirmButtonColor: btnColor,
            confirmButtonText: 'ตกลง'
        }); 
    }
    
    function maskString(str, type) {
        if (!str) return '-'; str = String(str);
        if (type === 'email') {
            const parts = str.split('@'); if (parts.length < 2) return str;
            return (parts[0].length > 3 ? parts[0].substring(0,3) + '***' : '***') + '@' + parts[1];
        }
        return str;
    }
    
    function formatDate(dateStr) {
        if(!dateStr) return '-';
        const d = new Date(dateStr);
        return isNaN(d) ? dateStr : d.toLocaleDateString('th-TH', {year:'numeric', month:'short', day:'numeric'});
    }
    
    function getRoleDisplay(role) { return role === 'admin' ? 'ผู้ทำรายการสถานศึกษา' : (role === 'user' ? 'นักศึกษาผู้กู้ยืม' : role); }

    document.addEventListener('DOMContentLoaded', () => {
        const adminNameEl = document.getElementById('topbarAdminName') || document.getElementById('topbarUserName');
        if (adminNameEl) adminNameEl.textContent = escapeHTML(currentUser.firstName) + ' ' + escapeHTML(currentUser.lastName);
        
        if (currentUser.allowedMenus) {
            const allowedList = currentUser.allowedMenus.split(',');
            const hasAny = (menuIds) => menuIds.some(id => allowedList.includes(id));
            
            document.querySelectorAll('#sidebar a').forEach(link => {
                if (link.id && link.id.startsWith('nav') && link.id !== 'navDashboard') {
                    if (!allowedList.includes(link.id)) {
                        const li = link.closest('li'); 
                        if (li) li.style.display = 'none';
                        else link.style.display = 'none';
                    }
                }
            });

            const hideMenuByText = (text) => {
                document.querySelectorAll('#sidebar a').forEach(a => {
                    if (a.innerText.includes(text)) {
                        const li = a.closest('li');
                        if (li) li.style.display = 'none';
                        else a.style.display = 'none';
                    }
                });
                document.querySelectorAll('#sidebar .nav-header, #sidebar li, #sidebar div').forEach(el => {
                    if (!el.querySelector('a') && el.innerText.includes(text)) {
                        el.style.display = 'none';
                    }
                });
            };

            } // (ปีกกาปิดของเงื่อนไขเดิมที่มีอยู่)

        // เรียกใช้ฟังก์ชันซ่อนเมนูอัตโนมัติที่เราเพิ่งสร้าง
        hideEmptyMenus();

        showPage('adminDashboardSection');

        // V3: preload ข้อมูลประจำหน้า "ทุกเมนู Admin" หลัง Login
        const adminBasePayload = { adminId: adminId, token: userToken };
        const adminPreloadTasks = [
            { action: 'getDashboardStats', payload: adminBasePayload },
            { action: 'getSuspendedUsers', payload: adminBasePayload },
            { action: 'getSuperAdminDetails', payload: adminBasePayload },
            { action: 'getUsersWithoutProfile', payload: adminBasePayload },

            { action: 'getProfileSummaries', payload: adminBasePayload },
            { action: 'getStudentImageReport', payload: adminBasePayload },

            { action: 'getSpecialAccessList', payload: adminBasePayload },
            { action: 'getSpecialLoanAccessList', payload: adminBasePayload },
            { action: 'getSpecialQueueAccessList', payload: { action: 'getSpecialQueueAccessList', ...adminBasePayload } },
            { action: 'getSystemMenuSettings', payload: adminBasePayload },
            { action: 'getAdminAnnList', payload: adminBasePayload },

            { action: 'getAdminPetitions', payload: adminBasePayload },
            { action: 'getTransferRequests', payload: adminBasePayload },

            { action: 'getActivities', payload: { mode: 'admin', studentId: adminId, token: userToken } },

            { action: 'getQueueSlots', payload: { role: 'admin', studentId: adminId, token: userToken } },
            { action: 'getQueueSlotOptions', payload: adminBasePayload },

            { action: 'getLoanDashboardStats2569', payload: adminBasePayload },
            { action: 'getLoanProfilesSummary2569', payload: adminBasePayload },
            { action: 'getLoanDashboardStatsWithFaculty2569', payload: adminBasePayload },
            { action: 'getLoanStatistics', payload: adminBasePayload },

            { action: 'getOverLoanDashboardStats', payload: adminBasePayload },
            { action: 'getOverLoanProfilesSummary', payload: adminBasePayload },

            { action: 'getResignDashboardStats', payload: adminBasePayload },
            { action: 'getResignAdminData', payload: adminBasePayload },

            { action: 'getGysDashboardSummary', payload: {
                ...adminBasePayload, year: 'all', term: 'all', type: 'all'
            }},
            { action: 'getGysAvsDates', payload: adminBasePayload }
        ];

        scheduleApiPreload(adminPreloadTasks, {
            startDelayMs: 350,
            concurrency: 2,
            gapMs: 100
        });

        window.refreshAllAdminMenuCache = async () => {
            clearApiCache();
            return apiPreloadQueue(adminPreloadTasks, { concurrency: 2, gapMs: 100 });
        };
    });

    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    function closeSidebarOnMobile() {
        if (window.innerWidth <= 900) {
            if (sidebar) sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }
    }
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                if (sidebar) sidebar.classList.toggle('active');
                if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
            } else {
                if (sidebar) sidebar.classList.toggle('collapsed');
            }
        });
    }
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarOnMobile);

    window.showPage = async (id) => {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if(target) target.classList.add('active');
        
        document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector('a[onclick="showPage(\'' + id + '\')"]');
        if(activeNav) activeNav.classList.add('active');
        closeSidebarOnMobile();
        window.scrollTo(0,0);
        
        if(id === 'adminDashboardSection') loadAdminDashboardStats();
        if(id === 'manageUsersSection') loadUsersForAdmin(true);
        if(id === 'suspendSystemSection') loadSuspendedUsers();
        if(id === 'adminSpecialAccessSection') { 
            const resArea = document.getElementById('specialAccessResultArea');
            const searchInput = document.getElementById('specialAccessSearchInput');
            if(resArea) resArea.style.display = 'none'; 
            if(searchInput) searchInput.value = ''; 
            loadSpecialAccessList(); 
        }
        if(id === 'adminManagePetitionSection') loadAdminPetitions();
        if(id === 'adminManageProfilesSection') loadProfilesForAdmin();
        if(id === 'adminImageReportSection') { 
            const searchInput = document.getElementById('imageReportSearchInput');
            const filterInput = document.getElementById('imageStatusFilter');
            if(searchInput) searchInput.value = ''; 
            if(filterInput) filterInput.value = 'all'; 
            imgRowsPerPage = 20; imgCurrentPage = 1; loadAdminImageReport(); 
        }
        if(id === 'adminActivitySection') loadActivitiesForAdmin();
        if(id === 'printReportSection') {
            const table = document.getElementById('printResultTable');
            if(table) table.querySelector('tbody').innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#999;">กรุณาเลือกวันที่และกดค้นหา</td></tr>';
        }
        if(id === 'exportDataSection') { 
            const today = new Date().toISOString().split('T')[0]; 
            const startD = document.getElementById('exportStartDate');
            const endD = document.getElementById('exportEndDate');
            if(startD) startD.value = today; 
            if(endD) endD.value = today; 
        }
        if(id === 'adminQueue') loadAdminQueueSlots();
        if(id === 'adminCheckQueueListSection') { 
            const table = document.getElementById('queueResultTable');
            const btnArea = document.getElementById('printQueueBtnArea');
            if(table) table.querySelector('tbody').innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#999;">กรุณาเลือกข้อมูลแล้วกดค้นหา</td></tr>'; 
            if(btnArea) btnArea.style.display = 'none'; 
            loadQueueDateOptions(); 
        }
        if(id === 'adminLoan2569Section') { loadAdminLoanStats(); loadLoanAdminTable(); }
        if(id === 'adminLoanManageSection') { 
            const input = document.getElementById('adminLoanSearchInput');
            const resArea = document.getElementById('adminLoanResultArea');
            if(input) input.value = ''; 
            if(resArea) resArea.style.display = 'none'; 
        }
        if(id === 'adminReportSection') { 
            const radios = document.getElementsByName('reportType'); 
            if(radios.length > 0) radios[0].checked = true; 
            const fac = document.getElementById('reportFaculty');
            if(fac) fac.value = 'all'; 
        }
        if(id === 'adminResignSection') loadResignStats();
        if(id === 'adminResignManageSection') loadResignManagementData();
        if(id === 'adminMenuSettingsSection') loadAdminMenuSettings();
        if(id === 'adminOverLoanSection') { loadAdminOverLoanStats(); loadOverLoanAdminTable(); 
        }
        if(id === 'adminSpecialLoanAccessSection') { 
            const resArea = document.getElementById('specialLoanResultArea');
            const searchInput = document.getElementById('specialLoanSearchInput');
            if(resArea) resArea.style.display = 'none'; 
            if(searchInput) searchInput.value = ''; 
            loadSpecialLoanList(); 
        }
        if(id === 'adminAddMissingStudentSection') { 
            document.getElementById('missingStudentSearchInput').value = ''; 
            document.getElementById('missingStudentResultArea').style.display = 'none'; 
        }
        if(id === 'adminAnnouncementSection') loadAdminAnnouncement();

        if(id === 'adminTransferSection') {loadTransferData();
        }
        if(id === 'adminLoan2569DashboardSection') loadLoanFacultyStats();
        if(id === 'adminLoanImportDashboardSection') loadGysDashboardData({ refreshAvs: true });
    };


    function setupNav(id, sectionId, callback) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                showPage(sectionId);
                if (callback) callback();
            });
        }
    }
    
    setupNav('navDashboard', 'adminDashboardSection');
    setupNav('navManageUsers', 'manageUsersSection');
    setupNav('navSuspendSystem', 'suspendSystemSection');
    setupNav('navAdminSpecialAccess', 'adminSpecialAccessSection');
    setupNav('navAdminManagePetition', 'adminManagePetitionSection');
    setupNav('navAdminProfiles', 'adminManageProfilesSection');
    setupNav('navAdminImageReport', 'adminImageReportSection');
    setupNav('navAdminActivity', 'adminActivitySection');
    setupNav('navPrintReport', 'printReportSection');
    setupNav('navExportData', 'exportDataSection');
    setupNav('navManageQueue', 'adminQueue');
    setupNav('navCheckQueueList', 'adminCheckQueueListSection');
    setupNav('navAdminLoan2569', 'adminLoan2569Section');
    setupNav('navAdminLoanManage', 'adminLoanManageSection');
    setupNav('navAdminReports', 'adminReportSection');
    setupNav('navAdminResign', 'adminResignSection');
    setupNav('navAdminResignManage', 'adminResignManageSection');
    setupNav('navAdminMenuSettings', 'adminMenuSettingsSection');
    setupNav('navAdminOverLoan', 'adminOverLoanSection');
    setupNav('navAdminVerify', 'section-admin-verify');
    setupNav('navAdminSpecialLoanAccess', 'adminSpecialLoanAccessSection');
    setupNav('navAdminAddMissingStudent', 'adminAddMissingStudentSection');
    setupNav('navAdminAnnouncement', 'adminAnnouncementSection');
    setupNav('navAdminTransfer', 'adminTransferSection');
    setupNav('navAdminLoan2569Dashboard', 'adminLoan2569DashboardSection');
    setupNav('navAdminLoanImportDashboard', 'adminLoanImportDashboardSection');


    document.querySelectorAll('.submenu-toggle').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const submenu = this.nextElementSibling;
            const icon = this.querySelector('.arrow-icon');
            if (submenu.style.display === 'none' || submenu.style.display === '') {
                submenu.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            } else {
                submenu.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });

    const logoutBtn = document.getElementById('navLogout');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => { 
            e.preventDefault(); 
            Swal.fire({
                title: 'ยืนยันการออกจากระบบ',
                text: "คุณต้องการออกจากระบบใช่หรือไม่",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'ใช่, ออกจากระบบ',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    sessionStorage.clear();
                    
                    // เพิ่มกล่องข้อความแจ้งเตือนความสำเร็จ
                    Swal.fire({
                        title: 'ออกจากระบบสำเร็จ',
                        text: 'ระบบกำลังพากลับไปยังหน้าเข้าสู่ระบบ',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false,
                        allowOutsideClick: false
                    }).then(() => {
                        window.location.replace("index.html");
                    });
                }
            });
        };
    }

    const autoLogout = () => {
        let timer;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                sessionStorage.clear();
                Swal.fire({
                    icon: 'warning',
                    title: 'หมดเวลาการเชื่อมต่อ',
                    text: 'ระบบออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานเกิน 15 นาที',
                    confirmButtonText: 'กลับสู่หน้าเข้าสู่ระบบ',
                    confirmButtonColor: '#f57f17',
                    allowOutsideClick: false
                }).then(() => {
                    window.location.replace("index.html");
                });
            }, 15 * 60 * 1000); 
        };
        window.onload=resetTimer; document.onmousemove=resetTimer; document.onkeypress=resetTimer; document.ontouchstart=resetTimer; document.onclick=resetTimer; document.onscroll=resetTimer;
    };
    autoLogout();

    async function loadAdminDashboardStats() {
        showLoading();
        try {
            const res = await callApi("getDashboardStats", { adminId: adminId, token: userToken });
            if (checkAuthError(res)) { hideLoading(); return; }
            throwIfApiFailure(res, 'ไม่สามารถดึงข้อมูลหน้าหลักแอดมินได้');
            if (!res || !res.stats) throw new Error('ไม่พบข้อมูลสถิติจากระบบ');
            
            hideLoading();
            const els = {
                total: document.getElementById('totalUsersCount'),
                male: document.getElementById('maleCount'),
                female: document.getElementById('femaleCount'),
                reg: document.getElementById('confirmedRegistrationsCount')
            };
            if(els.total) els.total.textContent = res.stats.totalUsers.toLocaleString();
            if(els.male) els.male.textContent = res.stats.male.toLocaleString();     
            if(els.female) els.female.textContent = res.stats.female.toLocaleString(); 
            if(els.reg) els.reg.textContent = res.stats.confirmedRegistrations.toLocaleString();
        } catch(err) {
            hideLoading();
            console.error('Dashboard load error:', err);
            showAlert(err.message || 'ไม่สามารถดึงข้อมูลหน้าหลักได้', 'error');
        }
    }

    let allUsersCache = [];
    function loadUsersForAdmin(autoRender = false) {
        const query = document.getElementById('userSearchInput').value.trim();
        const tbody = document.querySelector('#usersTable tbody');
        
        if (query || autoRender) {
            const searchBtn = document.getElementById('btnSearchUsers');
            if (searchBtn) searchBtn.click();
        } else if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color:#666;"><i class="material-icons" style="font-size:48px; display:block; margin-bottom:10px; color:#ccc;">search</i>กรุณากรอกรหัสนักศึกษา หรือ ชื่อ-นามสกุล เพื่อค้นหาข้อมูลผู้ใช้งาน</td></tr>';
        }
    }

    const btnSearchUsers = document.getElementById('btnSearchUsers');
    if (btnSearchUsers) {
        btnSearchUsers.onclick = async () => {
            const query = document.getElementById('userSearchInput').value.trim();
            const tbody = document.querySelector('#usersTable tbody');
            
            if (!query && tbody) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color:#666;"><i class="material-icons" style="font-size:48px; display:block; margin-bottom:10px; color:#ccc;">search</i>กรุณากรอกข้อมูลค้นหา</td></tr>';
                return;
            }
            showLoading('กำลังตรวจสอบรายการในระบบ');
            try {
                const users = await callApi("searchUsersBackend", { query: query, adminId: adminId, token: userToken });
                if (checkAuthError(users)) { hideLoading(); return; }
                throwIfApiFailure(users, 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
                
                hideLoading();
                allUsersCache = safeArray(users); 
                renderUserTable(allUsersCache);
            } catch(err) {
                hideLoading();
                showAlert(err.message, 'error');
            }
        };
    }

    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (btnSearchUsers) btnSearchUsers.click();
            }
        });
    }

    function renderUserTable(usersToRender) {
        const tbody = document.querySelector('#usersTable tbody');
        if(!tbody) return;
        tbody.innerHTML = '';
        if (usersToRender.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#d32f2f;">ไม่พบข้อมูลผู้ใช้งานที่ตรงตามเงื่อนไข</td></tr>'; 
            return; 
        }
        
        usersToRender.forEach(u => {
            const tr = tbody.insertRow();
            const statusHtml = u.status === 'Suspended' 
                ? '<br><span style="color:#e53e3e; font-weight:bold; font-size:12px;"><i class="material-icons" style="font-size:12px; vertical-align:middle;">block</i> ถูกระงับ</span>' 
                : '<br><span style="color:#38a169; font-weight:bold; font-size:12px;"><i class="material-icons" style="font-size:12px; vertical-align:middle;">check_circle</i> ปกติ</span>';
            
            tr.innerHTML = `<td>${escapeHTML(u.studentId)}</td>
                        <td>${escapeHTML(u.firstName)} ${escapeHTML(u.lastName)}</td>
                        <td>${escapeHTML(maskString(u.gmail, 'email'))} ${statusHtml}</td>
                        <td>${escapeHTML(getRoleDisplay(u.role))}</td>
                        <td><button class="btn btn-info btn-sm" onclick="editUser(${escapeInlineJsArg(u.id)})">จัดการ</button></td>`;
        });
    }

    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.onclick = () => { 
            document.getElementById('userForm').reset(); 
            document.getElementById('userId').value = ''; 
            const statCont = document.getElementById('modalStatusContainer');
            if (statCont) statCont.style.display = 'none';
            document.getElementById('userModal').style.display = 'flex'; 
        };
    }

    window.editUser = (id) => {
        const u = allUsersCache.find(x => x.id === id);
        if(!u) return;

        document.getElementById('userId').value = u.id;
        document.getElementById('modalUserGmail').value = u.gmail || '';
        document.getElementById('modalUserStudentId').value = u.studentId || '';
        document.getElementById('modalUserFirstName').value = u.firstName || '';
        document.getElementById('modalUserLastName').value = u.lastName || '';
        document.getElementById('modalUserPrefix').value = u.prefix || '';
        document.getElementById('modalUserFaculty').value = u.faculty || '';
        document.getElementById('modalUserPhone').value = u.phone || '';
        document.getElementById('modalUserRole').value = u.role || 'user';
        
        const statusContainer = document.getElementById('modalStatusContainer');
        const statusDisplay = document.getElementById('modalUserStatusDisplay');
        const btnSuspend = document.getElementById('modalBtnSuspend');
        
        if (statusContainer && statusDisplay && btnSuspend) {
            statusContainer.style.display = 'flex'; 
            if (u.status === 'Suspended') {
                statusDisplay.innerHTML = '<span style="color:#e53e3e;"><i class="material-icons" style="font-size:18px; vertical-align:text-bottom;">block</i> ถูกระงับการใช้งาน</span>';
                if (u.suspendReason) {
                    statusDisplay.innerHTML += '<div style="font-size:12px; color:#e53e3e; font-weight:normal; margin-top:4px;">เหตุผล: ' + escapeHTML(u.suspendReason) + '</div>';
                }
                btnSuspend.style.backgroundColor = '#edf2f7'; 
                btnSuspend.style.color = '#4a5568'; 
                btnSuspend.innerHTML = '<i class="material-icons" style="font-size:16px; margin-right:5px;">lock_open</i> ปลดระงับบัญชี';
                btnSuspend.onclick = () => { document.getElementById('userModal').style.display = 'none'; actionSuspend(u.id, 'Active'); };
            } else {
                statusDisplay.innerHTML = '<span style="color:#38a169;"><i class="material-icons" style="font-size:18px; vertical-align:text-bottom;">check_circle</i> ปกติ (Active)</span>';
                btnSuspend.style.backgroundColor = '#ffc107'; 
                btnSuspend.style.color = '#000'; 
                btnSuspend.innerHTML = '<i class="material-icons" style="font-size:16px; margin-right:5px;">block</i> ระงับบัญชี';
                btnSuspend.onclick = () => { document.getElementById('userModal').style.display = 'none'; actionSuspend(u.id, 'Suspended'); };
            }
        }
        document.getElementById('userModal').style.display = 'flex';
    };

    const userFormEl = document.getElementById('userForm');
    if (userFormEl) {
        userFormEl.onsubmit = async (e) => {
            e.preventDefault(); 
            showLoading();
            
            const id = document.getElementById('userId').value;
            const data = {
                gmail: document.getElementById('modalUserGmail').value, 
                studentId: document.getElementById('modalUserStudentId').value,
                firstName: document.getElementById('modalUserFirstName').value, 
                lastName: document.getElementById('modalUserLastName').value,
                prefix: document.getElementById('modalUserPrefix').value, 
                faculty: document.getElementById('modalUserFaculty').value,
                phone: document.getElementById('modalUserPhone').value, 
                role: document.getElementById('modalUserRole').value,
                password: document.getElementById('modalUserPassword').value
            };
            
            try {
                let res;
                if (id) {
                    res = await callApi("updateUser", { userId: id, ...data, adminId: adminId, token: userToken });
                } else {
                    res = await callApi("createUser", { userData: data, adminId: adminId, token: userToken });
                }
                
                if (checkAuthError(res)) { hideLoading(); return; }
                hideLoading(); 
                
                if (res.success) { 
                    showAlert('บันทึกสำเร็จ'); 
                    document.getElementById('userModal').style.display = 'none'; 
                    loadUsersForAdmin(true); 
                } else {
                    showAlert(res.message, 'error'); 
                }
            } catch(err) {
                hideLoading();
                showAlert(err.message, 'error');
            }
        };
    }

    let cachedDuplicateGroups = [];
    window.runDuplicateCheck = async () => {
        const resArea = document.getElementById('duplicateResultArea');
        if(resArea) resArea.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">กำลังตรวจสอบข้อมูลทั้งระบบ</div>';
        showLoading();
        try {
            const groups = await callApi("checkDuplicateAccounts", { adminId: adminId, token: userToken });
            if(checkAuthError(groups)) { hideLoading(); return; }
            hideLoading(); 
            cachedDuplicateGroups = safeArray(groups); 
            displayDuplicateResults(cachedDuplicateGroups);
            const statEl = document.getElementById('secStatDuplicates');
            if (statEl) statEl.textContent = cachedDuplicateGroups.length;
        } catch(err) {
            hideLoading();
            showAlert(err.message, 'error');
        }
    };
    
    function displayDuplicateResults(groups) {
        const resultArea = document.getElementById('duplicateResultArea');
        if(!resultArea) return;

        if (!groups || groups.length === 0) {
            resultArea.innerHTML = '<div style="background:#f0fff4; color:#276749; padding:20px; border-radius:10px; border:1px solid #c6f6d5; display:flex; align-items:center; gap:12px;"><i class="material-icons" style="color:#38a169;">verified_user</i><b>ตรวจสอบเสร็จสิ้น:</b> ไม่พบข้อมูลที่ซ้ำซ้อนในระบบ</div>'; 
            return;
        }
        
        let html = '';
        groups.forEach((g, idx) => {
            const uniqueId = 'dup-group-' + idx;
            html += '<div class="duplicate-item-card" style="border:1px solid #ddd; margin-bottom:10px; border-radius:8px; padding:10px;"><div class="duplicate-header" onclick="document.getElementById(\'' + uniqueId + '\').style.display = document.getElementById(\'' + uniqueId + '\').style.display === \'none\' ? \'block\' : \'none\';" style="cursor:pointer; display:flex; justify-content:space-between;"><div><span style="font-size:12px; color:#718096; font-weight:bold;">ซ้ำที่ข้อมูล ' + escapeHTML(g.type) + '</span><div style="font-size:16px; color:#2d3748; font-weight:bold;">' + escapeHTML(g.duplicateValue) + '</div></div><div style="display:flex; align-items:center; gap:15px;"><span class="badge-count">' + g.count + ' บัญชี</span><i class="material-icons" style="color:#a0aec0;">expand_more</i></div></div><div id="' + uniqueId + '" class="duplicate-body" style="display:none; margin-top:10px;"><table class="clean-table" style="font-size:13px; border:none;"><thead style="background:#f8fafc;"><tr><th>รหัสนักศึกษา</th><th>ชื่อ-นามสกุล</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>';
            html += g.users.map(u => '<tr><td><b>' + escapeHTML(u.studentId) + '</b></td><td>' + escapeHTML(u.name) + '</td><td>' + (u.status === 'Suspended' ? '<span style="color:#e53e3e;">● ระงับ</span>' : '<span style="color:#38a169;">● ปกติ</span>') + '</td><td><div style="display:flex; gap:5px;"><button class="btn btn-sm" style="background:#edf2f7; padding:2px 8px;" onclick="actionSuspend(\'' + escapeHTML(u.id) + '\', \'' + (u.status === 'Suspended' ? 'Active' : 'Suspended') + '\')">' + (u.status === 'Suspended' ? 'ปลด' : 'ระงับ') + '</button><button class="btn btn-sm" style="background:#fff5f5; color:#c53030; padding:2px 8px;" onclick="actionDelete(\'' + escapeHTML(u.id) + '\', \'' + escapeHTML(u.studentId) + '\')">ลบ</button></div></td></tr>').join('');
            html += '</tbody></table></div></div>';
        });
        resultArea.innerHTML = html;
    }

    window.filterDuplicateResults = () => {
        const q = document.getElementById('duplicateSearchInput').value.toLowerCase().trim();
        if (!q) { 
            displayDuplicateResults(cachedDuplicateGroups); 
            return; 
        }
        const filtered = cachedDuplicateGroups.filter(g => 
            String(g.duplicateValue).toLowerCase().includes(q) || 
            g.users.some(u => String(u.studentId).toLowerCase().includes(q) || String(u.name).toLowerCase().includes(q))
        );
        displayDuplicateResults(filtered);
    };

    window.toggleAllSuspended = (source) => {
        document.querySelectorAll('.chk-suspended').forEach(chk => chk.checked = source.checked);
        checkSuspendedSelection();
    };

window.checkSuspendedSelection = () => {
    const chks = document.querySelectorAll('.chk-suspended');
    const checked = document.querySelectorAll('.chk-suspended:checked');
    const sa = document.getElementById('selectAllSuspended');
    if(sa) sa.checked = (chks.length > 0 && chks.length === checked.length);
    
    const btnDel = document.getElementById('btnDeleteSelectedSuspended');
    const btnUnlock = document.getElementById('btnUnlockSelectedSuspended');
    
    if(btnDel) {
        btnDel.style.display = checked.length > 0 ? 'inline-flex' : 'none';
        btnDel.innerHTML = '<i class="material-icons" style="font-size:18px;">delete_sweep</i> <span>ลบที่เลือก (' + checked.length + ')</span>';
    }
    if(btnUnlock) {
        btnUnlock.style.display = checked.length > 0 ? 'inline-flex' : 'none';
        btnUnlock.innerHTML = '<i class="material-icons" style="font-size:18px;">lock_open</i> <span>ปลดล็อก (' + checked.length + ')</span>';
    }
};

window.unlockSelectedSuspended = () => {
    const ids = Array.from(document.querySelectorAll('.chk-suspended:checked')).map(chk => chk.value);
    if (ids.length === 0) return;
    
    Swal.fire({
        title: 'ยืนยันปลดระงับหลายรายการ', 
        html: 'ต้องการปลดระงับบัญชีจำนวน <b>' + ids.length + '</b> บัญชี เพื่อให้กลับมาใช้งานได้ปกติใช่หรือไม่', 
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonText: 'ยืนยันปลดระงับ', 
        confirmButtonColor: '#28a745' 
    }).then(async r => {
        if (r.isConfirmed) {
            showLoading('กำลังดำเนินการปลดระงับบัญชี');
            try {
                const promises = ids.map(id => callApi("updateUser", { userId: id, status: 'Active', suspendReason: '', adminId: adminId, token: userToken }));
                await Promise.all(promises);
                
                hideLoading(); 
                Swal.fire('ปลดระงับสำเร็จ', 'บัญชีที่เลือกสามารถเข้าใช้งานระบบได้ตามปกติแล้ว', 'success'); 
                loadSuspendedUsers(); 
                if (typeof loadUsersForAdmin === 'function') loadUsersForAdmin(false); 
            } catch(err) {
                hideLoading();
                Swal.fire('ผิดพลาด', err.message, 'error');
            }
        }
    });
};

const originalLoadSuspendedUsers = window.loadSuspendedUsers;

window.loadSuspendedUsers = async () => {
    const tbody = document.querySelector('#suspendedUsersTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #718096;">กำลังโหลดข้อมูล...</td></tr>';

    try {
        const res = await callApi('getSuspendedUsers', { adminId: adminId, token: userToken });
        let users = Array.isArray(res) ? res : (res.data || []);

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #a0aec0;">ไม่มีบัญชีที่ถูกระงับในขณะนี้</td></tr>';
        } else {
            tbody.innerHTML = '';
            users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align: center;">
                        <input type="checkbox" class="chk-suspended" value="${u.id}" onchange="window.checkSuspendedSelection()">
                    </td>
                    <td style="padding-left: 10px; font-weight: 500;">${u.studentId || '-'}</td>
                    <td style="font-weight: 500; color: #2d3748;">${u.name || 'ไม่ระบุชื่อ'}</td>
                    <td style="color: #c53030; font-size: 14px;">${u.suspendReason || 'บัญชีถูกระงับ'}</td>
                    <td style="text-align: center;">
                        <button class="btn btn-success" style="padding: 4px 15px; font-size: 13px; border-radius: 20px; border: none; cursor: pointer;" onclick="unlockSingleAccount(${escapeInlineJsArg(u.id)})">
                            ปลดล็อก
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        const statEl = document.getElementById('secStatSuspended');
        if (statEl) statEl.textContent = users.length;
        
        if (typeof window.checkSuspendedSelection === 'function') {
            window.checkSuspendedSelection();
        }

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e53e3e; padding: 20px;">โหลดข้อมูลล้มเหลว: ${escapeHTML(err.message || 'เกิดข้อผิดพลาด')}</td></tr>`;
    }
};

window.toggleDeleteButton = function(count) {
    if (typeof window.checkSuspendedSelection === 'function') {
        window.checkSuspendedSelection();
    }
};

    window.deleteSelectedSuspended = () => {
        const ids = Array.from(document.querySelectorAll('.chk-suspended:checked')).map(chk => chk.value);
        if (ids.length === 0) return;
        
        Swal.fire({
            title: 'ยืนยันลบหลายรายการ', 
            html: 'ลบถาวร <b>' + ids.length + '</b> บัญชีใช่หรือไม่', 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonText: 'ตกลง', 
            confirmButtonColor: '#d33' 
        }).then(async r => {
            if (r.isConfirmed) {
                showLoading();
                try {
                    const res = await callApi("deleteMultipleUsers", { userIds: ids, adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading(); 
                    if (res.success) { 
                        Swal.fire('ลบสำเร็จ', '', 'success'); 
                        loadSuspendedUsers(); 
                    } else {
                        Swal.fire('ผิดพลาด', res.message, 'error');
                    }
                } catch(err) {
                    hideLoading();
                    Swal.fire('ผิดพลาด', err.message, 'error');
                }
            }
        });
    };

    window.actionDelete = (userId, studentId) => {
        Swal.fire({ 
            title: `ลบรหัส ${studentId}`, 
            text: 'ลบแล้วกู้คืนไม่ได้', 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#d33' 
        }).then(async r => {
            if (r.isConfirmed) {
                showLoading();
                try {
                    const res = await callApi("deleteUser", { userId: userId, adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading(); 
                    
                    Swal.fire('ลบสำเร็จ', '', 'success');
                    if (document.getElementById('usersTable')) loadUsersForAdmin(true);
                    if (document.getElementById('suspendedUsersTable')) loadSuspendedUsers();
                } catch(err) {
                    hideLoading();
                    Swal.fire('ผิดพลาด', err.message, 'error');
                }
            }
        });
    };

async function checkSuperAdminPermission() {
    showLoading('กำลังตรวจสอบสิทธิ์');
    try {
        const res = await callApi("getSuperAdminDetails", { adminId: adminId, token: userToken });
        hideLoading();
        
        if (res && res.success && res.isSuperAdmin === true) {
            return true;
        } else {
            let message = 'บัญชีนี้ถูกระงับด้วยเงื่อนไขความเสี่ยงสูง กรุณาแจ้งผู้มีสิทธิ์อนุมัติเพื่อดำเนินการ';
            if (res && res.list) {
                let listHtml = res.list.map(name => `<br>• คุณ${name}`).join('');
                message += `<br><br>รายชื่อผู้มีสิทธิ์:<br>${listHtml}`;
            }
            Swal.fire({
                icon: 'error',
                title: 'ไม่มีสิทธิ์พิจารณาดำเนินการ',
                html: `<div style="text-align: left; font-size: 14px;">${message}</div>`
            });
            return false;
        }
    } catch(err) {
        hideLoading();
        Swal.fire('ผิดพลาด', 'ไม่สามารถตรวจสอบสิทธิ์ได้: ' + err.message, 'error');
        return false;
    }
}

window.actionSuspend = async (userId, newStatus) => {
    const u = typeof allUsersCache !== 'undefined' ? allUsersCache.find(x => x.id === userId) : null;
    const currentReason = u ? (u.suspendReason || '') : '';

    if (newStatus === 'Suspended') {
        Swal.fire({ 
            title: 'ระบุสาเหตุการระงับบัญชี', 
            html: `
                <input id="swal-suspend-reason" class="swal2-input" placeholder="ระบุสาเหตุการระงับ" style="width: 85%;">
                <div style="margin-top: 15px; text-align: left; padding: 0 25px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #d32f2f; font-weight: bold; font-size: 14px;">
                        <input type="checkbox" id="swal-require-survey" style="width: 18px; height: 18px;" checked>
                        บังคับให้ทำแบบสอบถามความเสี่ยง ก่อนปลดล็อก
                    </label>
                </div>
            `,
            showCancelButton: true, confirmButtonText: 'ระงับบัญชี', confirmButtonColor: '#d33',
            preConfirm: () => {
                const reason = document.getElementById('swal-suspend-reason').value.trim();
                const reqSurvey = document.getElementById('swal-require-survey').checked;
                if (!reason) { Swal.showValidationMessage('กรุณาระบุสาเหตุ'); return false; }
                return reqSurvey ? '[REQ_SURVEY]' + reason : reason;
            }
        }).then(r => { if (r.isConfirmed) executeStatusUpdate(userId, newStatus, r.value); });

    } else {
        if (currentReason.includes('[REQ_SURVEY]')) {
            if (!(await checkSuperAdminPermission())) return;
            if (typeof window.showUnlockSurveyModal === 'function') {
                window.showUnlockSurveyModal(userId, u ? u.studentId : '', false);
            }
        } else {
            Swal.fire({ 
                title: 'ปลดระงับบัญชีนี้', 
                text: 'ต้องการปลดระงับบัญชีให้ใช้งานได้ปกติใช่หรือไม่?',
                icon: 'question', 
                showCancelButton: true, 
                confirmButtonText: 'ยืนยันปลดล็อก',
                confirmButtonColor: '#28a745' 
            }).then(r => { if (r.isConfirmed) executeStatusUpdate(userId, newStatus, ''); });
        }
    }
};

   const btnAdminUnlockAccount = document.getElementById('btnAdminUnlockAccount');
if (btnAdminUnlockAccount) {
    btnAdminUnlockAccount.onclick = async () => {
        const studentId = document.getElementById('adm_ver_studentId').textContent;
        const suspendReasonEl = document.getElementById('adm_ver_suspendReason');
        const suspendReason = suspendReasonEl ? suspendReasonEl.textContent : '';

        if (suspendReason.includes('[REQ_SURVEY]')) {
            if (!(await checkSuperAdminPermission())) return;
            if (typeof window.showUnlockSurveyModal === 'function') {
                window.showUnlockSurveyModal(null, studentId, true);
            }
        } else {
            Swal.fire({
                title: 'ปลดล็อกบัญชี',
                text: `ต้องการปลดล็อกบัญชีของรหัส ${studentId} ใช่หรือไม่`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ยืนยัน',
                confirmButtonColor: '#28a745'
            }).then(r => {
                if (r.isConfirmed) executeAdminUnlockVerifyPage(studentId);
            });
        }
    };
}

    async function executeAdminUnlockVerifyPage(studentId) {
        showLoading();
        try {
            const res = await callApi("adminUnlockAccount", { studentId: studentId, adminId: adminId, token: userToken });
            if (checkAuthError(res)) { hideLoading(); return; }
            hideLoading();
            if (res.success) {
                Swal.fire('สำเร็จ', 'ปลดล็อกบัญชีเรียบร้อยแล้ว', 'success');
                const checkBtn = document.getElementById('btnAdminCheckVerify');
                if(checkBtn) checkBtn.click();
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    }

    let allProfilesData = [];
    let currentFilteredData = [];
    let currentPage = 1;
    let rowsPerPage = 10;

    window.loadProfilesForAdmin = async () => {
        showLoading();
        try {
            const profiles = await callApi("getProfileSummaries", { adminId: adminId, token: userToken });
            if(checkAuthError(profiles)) { hideLoading(); return; }
            throwIfApiFailure(profiles, 'ไม่สามารถดึงข้อมูลทะเบียนประวัตินักศึกษาได้');
            hideLoading(); 
            
            allProfilesData = safeArray(profiles); 
            currentFilteredData = allProfilesData;
            
            const total = allProfilesData.length || 0;
            const done = allProfilesData.filter(p => p.hasProfile).length || 0;
            const elTotal = document.getElementById('profStatTotal');
            const elDone = document.getElementById('profStatDone');
            const elPend = document.getElementById('profStatPending');
            const grid = document.getElementById('profileStatsGrid');

            if(elTotal) elTotal.textContent = total;
            if(elDone) elDone.textContent = done;
            if(elPend) elPend.textContent = total - done;
            if(grid) grid.style.display = 'grid'; 
            
            currentPage = 1; 
            renderPagination(); 
        } catch(err) {
            hideLoading();
            console.error(err);
            const tbody = document.querySelector('#adminProfilesTable tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#d32f2f; padding:20px;">${escapeHTML(err.message || 'ไม่สามารถดึงข้อมูลทะเบียนประวัติได้')}</td></tr>`;
            showAlert(err.message || 'ไม่สามารถดึงข้อมูลทะเบียนประวัติได้', 'error');
        }
    };

    function renderPagination() {
        const tbody = document.querySelector('#adminProfilesTable tbody'); 
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if (currentFilteredData.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">ไม่พบข้อมูล</td></tr>'; 
            return; 
        }
        
        const limit = rowsPerPage === 10000 ? currentFilteredData.length : rowsPerPage;
        const start = (currentPage - 1) * limit;
        const end = start + limit;
        
        currentFilteredData.slice(start, end).forEach(p => {
            tbody.innerHTML += '<tr><td>' + escapeHTML(p.studentId) + '</td><td>' + escapeHTML(p.name) + '</td><td>' + escapeHTML(p.faculty) + '</td><td>' + (p.hasProfile ? '<span style="color:green; font-weight:bold;">บันทึกแล้ว</span>' : '<span style="color:red;">ยังไม่บันทึก</span>') + '</td><td>' + formatDate(p.updatedAt) + '</td><td><button class="btn btn-info btn-sm" onclick="openAdminEditProfile(\'' + escapeHTML(p.studentId) + '\')"><i class="material-icons" style="font-size:14px;">edit</i> ตรวจสอบ</button></td></tr>';
        });
        
        const totalPages = Math.ceil(currentFilteredData.length / limit) || 1;
        const infoText = document.getElementById('pageInfoText');
        const btnPrev = document.getElementById('btnPrevPage');
        const btnNext = document.getElementById('btnNextPage');
        
        if(infoText) infoText.textContent = `หน้า ${currentPage} / ${totalPages} (รวม ${currentFilteredData.length} รายการ)`;
        if(btnPrev) btnPrev.disabled = (currentPage === 1);
        if(btnNext) btnNext.disabled = (currentPage === totalPages);
    }

    const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');
    if(rowsPerPageSelect) {
        rowsPerPageSelect.onchange = function() { 
            rowsPerPage = parseInt(this.value); 
            currentPage = 1; 
            renderPagination(); 
        };
    }
    const btnPrevPage = document.getElementById('btnPrevPage');
    if(btnPrevPage) {
        btnPrevPage.onclick = function() { 
            if (currentPage > 1) { currentPage--; renderPagination(); } 
        };
    }
    const btnNextPage = document.getElementById('btnNextPage');
    if(btnNextPage) {
        btnNextPage.onclick = function() { 
            const limit = rowsPerPage === 10000 ? currentFilteredData.length : rowsPerPage;
            if (currentPage < Math.ceil(currentFilteredData.length / limit)) { 
                currentPage++; renderPagination(); 
            } 
        };
    }
    
    window.searchProfiles = () => {
        const input = document.getElementById('adminProfileSearchInput');
        if(!input) return;
        const q = input.value.toLowerCase();
        currentFilteredData = q ? allProfilesData.filter(p => String(p.studentId).toLowerCase().includes(q) || String(p.name).toLowerCase().includes(q)) : allProfilesData;
        currentPage = 1; 
        renderPagination();
    };
    
    const btnAdminSearchProfiles = document.getElementById('btnAdminSearchProfiles');
    if(btnAdminSearchProfiles) btnAdminSearchProfiles.onclick = window.searchProfiles;
    
    const adminProfileSearchInput = document.getElementById('adminProfileSearchInput');
    if(adminProfileSearchInput) {
        adminProfileSearchInput.addEventListener('keypress', function (e) { 
            if (e.key === 'Enter') searchProfiles(); 
        });
    }

    window.openAdminEditProfile = async (studentId) => {
        showLoading(); 
        const form = document.getElementById('adminProfileForm');
        if(form) form.reset();
        
        const targetIdEl = document.getElementById('adm_targetStudentId');
        const showIdEl = document.getElementById('adm_studentId_show');
        if(targetIdEl) targetIdEl.value = studentId; 
        if(showIdEl) showIdEl.value = studentId;
        
        try {
            const p = await callApi("getProfile", { studentId: studentId, adminId: adminId, token: userToken });
            if(checkAuthError(p)) { hideLoading(); return; }
            throwIfApiFailure(p, 'ไม่สามารถดึงข้อมูลทะเบียนประวัติของนักศึกษารายนี้ได้');
            hideLoading();

            if (p && Object.keys(p).length > 0) {
                ['idCard','nickname','dob','gpa','phone','disease','fatherName','fatherJob','fatherPhone','motherName','motherJob','motherPhone','parentsStatus','familyMembers','householdIncome','debt','addrNo','subDistrict','district','province','zipcode','mapLink'].forEach(k => {
                    const el = document.getElementById('adm_'+k); 
                    if (el) el.value = p[k] || '';
                });
            } else {
                showAlert('นักศึกษายังไม่ได้บันทึกข้อมูล (สามารถกรอกแทนได้)', 'info');
            }
            const modal = document.getElementById('adminProfileModal');
            if(modal) modal.style.display = 'flex';
        } catch(err) {
            hideLoading();
            console.error(err);
        }
    };

    const adminProfileFormEl = document.getElementById('adminProfileForm');
    if (adminProfileFormEl) {
        adminProfileFormEl.onsubmit = async (e) => {
            e.preventDefault(); 
            showLoading();
            
            const targetIdEl = document.getElementById('adm_targetStudentId');
            const pd = {studentId: targetIdEl ? targetIdEl.value : ''};
            
            ['idCard','nickname','dob','gpa','phone','disease','fatherName','fatherJob','fatherPhone','motherName','motherJob','motherPhone','parentsStatus','familyMembers','householdIncome','debt','addrNo','subDistrict','district','province','zipcode','mapLink'].forEach(k => { 
                const el = document.getElementById('adm_'+k);
                pd[k] = el ? el.value : ''; 
            });
            
            try {
                const res = await callApi("saveProfile", { profileData: pd, adminId: adminId, token: userToken });
                if(checkAuthError(res)) { hideLoading(); return; }
                hideLoading(); 
                
                if (res.success) { 
                    showAlert('แก้ไขข้อมูลสำเร็จ'); 
                    document.getElementById('adminProfileModal').style.display='none'; 
                    loadProfilesForAdmin(); 
                } else {
                    showAlert(res.message,'error');
                }
            } catch(err) {
                hideLoading();
                showAlert(err.message,'error');
            }
        };
    }

    let cachedImageReportData = [];
    let currentFilteredImageReportData = [];
    let imgCurrentPage = 1;
    let imgRowsPerPage = 20;

    window.loadAdminImageReport = async (forceRefresh = false) => {
        const tbody = document.querySelector('#imageReportTable tbody');
        if (tbody && cachedImageReportData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#666;">กำลังโหลดข้อมูลรูปภาพนักศึกษา...</td></tr>';
        }

        showLoading('กำลังโหลดรายงานรูปภาพนักศึกษา');
        try {
            const payload = { adminId: adminId, token: userToken };
            const data = forceRefresh
                ? await apiRefresh("getStudentImageReport", payload)
                : await callApi("getStudentImageReport", payload);

            if(checkAuthError(data)) { hideLoading(); return; }

            cachedImageReportData = safeArray(data);
            hideLoading();
            filterImageReport();
        } catch(err) {
            hideLoading();
            console.error('Image report load error:', err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#d32f2f;">${escapeHTML(err.message || 'ไม่สามารถโหลดรายงานรูปภาพนักศึกษาได้')}</td></tr>`;
            }
            showAlert(err.message || 'ไม่สามารถโหลดรายงานรูปภาพนักศึกษาได้', 'error');
        }
    };

    window.searchImageReport = () => { filterImageReport(); };

    window.filterImageReport = () => {
        const input = document.getElementById('imageReportSearchInput');
        const filterEl = document.getElementById('imageStatusFilter');
        if(!input || !filterEl) return;

        const q = input.value.toLowerCase().trim();
        const f = filterEl.value;
        
        currentFilteredImageReportData = cachedImageReportData.filter(i => {
            const m = String(i.studentId).toLowerCase().includes(q) || String(i.name).toLowerCase().includes(q) || (i.idCard && String(i.idCard).includes(q));
            const mf = f === 'all' ? true : (f === 'has_image' ? !!i.profileImage : !i.profileImage);
            return m && mf;
        });
        
        imgCurrentPage = 1; 
        renderImageReportTable();
    };

    function renderImageReportTable() {
        const tb = document.querySelector('#imageReportTable tbody'); 
        if(!tb) return;
        tb.innerHTML = '';
        
        const countEl = document.getElementById('imageReportCount');
        if (currentFilteredImageReportData.length === 0) { 
            tb.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">ไม่พบข้อมูล</td></tr>'; 
            if(countEl) countEl.textContent = 'พบข้อมูล 0 รายการ'; 
            return; 
        }
        
        if(countEl) countEl.textContent = `พบข้อมูล ${currentFilteredImageReportData.length} รายการ`;
        const limit = imgRowsPerPage === 'all' ? currentFilteredImageReportData.length : parseInt(imgRowsPerPage);
        const totalPages = Math.ceil(currentFilteredImageReportData.length / limit) || 1;
        const start = (imgCurrentPage - 1) * limit;
        
        currentFilteredImageReportData.slice(start, start + limit).forEach((i, idx) => {
            let imgTag = '';
            
            if (i.profileImage && i.profileImage !== 'undefined' && i.profileImage !== "") {
                let imageId = i.profileImage;
                if (imageId.includes('id=')) imageId = imageId.split('id=')[1].split('&')[0];
                else if (imageId.includes('/d/')) imageId = imageId.split('/d/')[1].split('/')[0];
                else if (imageId.includes('picture/0')) imageId = imageId.split('picture/0')[1];

                imageId = String(imageId || '').replace(/[^a-zA-Z0-9_-]/g, '');
                const driveSrc = `https://drive.google.com/thumbnail?id=${imageId}&sz=w200`;
                const fallbackLarge = `https://drive.google.com/thumbnail?id=${imageId}&sz=w1200`;

                imgTag = `<img src="${driveSrc}" data-img="${fallbackLarge}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.style.opacity='0.35';" style="width:50px;height:60px;object-fit:cover;cursor:pointer;border-radius:4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="openLightbox(this.getAttribute('data-img'))">`;
            } else {
                imgTag = `<img src="https://placehold.co/150x150?text=NO+IMAGE" style="width:50px;height:60px;object-fit:cover;border-radius:4px;">`;
            }

            const btnHistory = i.profileImage ? '<button class="btn btn-info btn-sm" onclick="viewImageHistory(\'' + escapeHTML(i.studentId) + '\')">ประวัติ</button>' : '<span style="color:#999;font-size:12px;">ไม่มีรูป</span>';

            tb.innerHTML += '<tr><td style="text-align:center;">' + (start + idx + 1) + '</td><td style="text-align:center;">' + imgTag + '</td><td style="font-weight:bold; color:var(--secondary-color);">' + escapeHTML(i.studentId) + '</td><td>' + escapeHTML(i.name) + '</td><td>' + escapeHTML(i.idCard || '-') + '</td><td>' + escapeHTML(i.faculty || '-') + '</td><td style="text-align:center;">' + btnHistory + '</td></tr>';
        });
        
        const pageInfo = document.getElementById('imgPageInfo');
        const btnPrev = document.getElementById('imgBtnPrev');
        const btnNext = document.getElementById('imgBtnNext');
        
        if(pageInfo) pageInfo.textContent = `หน้า ${imgCurrentPage} / ${totalPages}`;
        if(btnPrev) btnPrev.disabled = (imgCurrentPage === 1); 
        if(btnNext) btnNext.disabled = (imgCurrentPage === totalPages || totalPages === 0);
    }

    window.changeImageReportRowsPerPage = () => { 
        const sel = document.getElementById('imgRowsPerPage');
        if(sel) { imgRowsPerPage = sel.value; imgCurrentPage = 1; renderImageReportTable(); }
    };

    window.prevImagePage = () => { 
        if (imgCurrentPage > 1) { imgCurrentPage--; renderImageReportTable(); } 
    };

    window.nextImagePage = () => { 
        const limit = imgRowsPerPage === 'all' ? currentFilteredImageReportData.length : parseInt(imgRowsPerPage); 
        if (imgCurrentPage < Math.ceil(currentFilteredImageReportData.length / limit)) { 
            imgCurrentPage++; 
            renderImageReportTable(); 
        } 
    };

    window.viewImageHistory = async (id) => {
        const student = cachedImageReportData.find(x => x.studentId === id);
        const name = student ? student.name : '-';

        const nEl = document.getElementById('ih_studentName');
        const iEl = document.getElementById('ih_studentId');
        if(nEl) nEl.textContent = name; 
        if(iEl) iEl.textContent = `รหัสนักศึกษา: ${id}`;
        
        const mod = document.getElementById('imageHistoryModal');
        if(mod) mod.style.display = 'flex';
        
        const c = document.getElementById('imageHistoryContainer'); 
        if(c) c.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">กำลังโหลดประวัติ...</div>';
        
        try {
            const h = await callApi("getProfileImageHistory", { studentId: id, adminId: adminId, token: userToken });
            if(checkAuthError(h)) { if(c) c.innerHTML='Error API'; return; }
            const safeH = safeArray(h);

            if(!c) return;
            if (safeH.length === 0) {
                c.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999;">ไม่พบประวัติ</div>';
            } else {
                c.innerHTML = safeH.map(x => {
                    let imageId = x.imageUrl;
                    if (imageId.includes('id=')) imageId = imageId.split('id=')[1].split('&')[0];
                    else if (imageId.includes('/d/')) imageId = imageId.split('/d/')[1].split('/')[0];
                    else if (imageId.includes('picture/0')) imageId = imageId.split('picture/0')[1];

                    imageId = String(imageId || '').replace(/[^a-zA-Z0-9_-]/g, '');
                    const driveSrc = `https://drive.google.com/thumbnail?id=${imageId}&sz=w400`; 
                    const fallbackLarge = `https://drive.google.com/thumbnail?id=${imageId}&sz=w1200`; 

                    return `<div style="text-align:center; border:1px solid #eee; padding:10px; border-radius:8px;">
                        <img src="${driveSrc}" data-img="${fallbackLarge}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.style.opacity='0.35';" style="width:100%;height:150px;object-fit:cover;cursor:pointer;border-radius:4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="openLightbox(this.getAttribute('data-img'))">
                        <br><small style="color:#666;">${escapeHTML(formatDate(x.timestamp))}</small>
                    </div>`;
                }).join('');
            }
        } catch(err) {
            if(c) c.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">เกิดข้อผิดพลาด</div>';
        }
    };

    window.openLightbox = (url) => { 
        const img = document.getElementById('lightboxImage');
        const mod = document.getElementById('lightboxModal');
        if(img && mod) { img.src = url; mod.style.display = 'flex'; }
    };

    let adminActivitiesCache = [];
    let currentAdminTab = 'current';

    window.loadActivitiesForAdmin = async () => { 
        showLoading(); 
        try {
            const a = await callApi("getActivities", { mode: 'admin', studentId: adminId, token: userToken });
            if(checkAuthError(a)) { hideLoading(); return; }
            hideLoading(); 
            adminActivitiesCache = safeArray(a); 
            renderAdminTable(currentAdminTab); 
        } catch(err) {
            hideLoading();
            console.error(err);
        }
    };

    window.switchAdminTab = (tab) => { 
        currentAdminTab = tab; 
        const bCurr = document.getElementById('btnTabCurrent');
        const bHist = document.getElementById('btnTabHistory');
        if(bCurr) {
            bCurr.style.backgroundColor = tab === 'current' ? 'var(--secondary-color)' : '#f1f3f5';
            bCurr.style.color = tab === 'current' ? 'white' : '#666';
        }
        if(bHist) {
            bHist.style.backgroundColor = tab === 'history' ? 'var(--secondary-color)' : '#f1f3f5';
            bHist.style.color = tab === 'history' ? 'white' : '#666';
        }
        renderAdminTable(tab); 
    };

    function renderAdminTable(mode) {
        const tb = document.querySelector('#adminActivityTable tbody'); 
        if(!tb) return;
        tb.innerHTML = '';
        const today = new Date(); 
        today.setHours(0, 0, 0, 0);
        
        const filtered = adminActivitiesCache.filter(a => mode === 'current' ? new Date(a.date) >= today : new Date(a.date) < today);
        if (filtered.length === 0) { 
            tb.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">ไม่มีข้อมูลกิจกรรม</td></tr>'; 
            return; 
        }
        
        const grp = {}; 
        filtered.forEach(a => { 
            if (!grp[a.date]) grp[a.date] = []; 
            grp[a.date].push(a); 
        });
        
        Object.keys(grp).sort((a, b) => new Date(b) - new Date(a)).forEach(d => {
            const dateId = d.replace(/[^a-zA-Z0-9]/g, '');
            const q = grp[d].reduce((s, x) => s + x.quota, 0);
            const c = grp[d].reduce((s, x) => s + x.current, 0);
            
            tb.innerHTML += `<tr style="background:#e3f2fd; cursor:pointer;" onclick="toggleChildRows(${escapeInlineJsArg(dateId)})">
    <td colspan="6">
        <div style="display:flex; align-items:center; gap:5px; font-weight:bold; color:var(--secondary-color);">
            <i class="material-icons" id="icon-${escapeHTML(dateId)}">expand_more</i>
            ${escapeHTML(formatDate(d))} &nbsp; | &nbsp; 
            <span style="color:#555;font-weight:normal;">${grp[d].length} รอบ | จองแล้ว ${c}/${q} คน</span>
        </div>
    </td>
</tr>`;
            
            grp[d].forEach(a => {
                tb.innerHTML += '<tr class="child-row-' + escapeHTML(dateId) + '" style="display:none; ' + (a.status === 'Hide' ? 'background:#fafafa;color:#aaa;' : '') + '"><td></td><td>' + escapeHTML(a.period) + '</td><td>' + escapeHTML(a.name) + (a.status === 'Hide' ? ' (ซ่อนอยู่)' : '') + '</td><td>' + escapeHTML(a.location) + '</td><td>' + escapeHTML(String(a.current)) + '/' + escapeHTML(String(a.quota)) + '</td><td><div style="display:flex; gap:5px;"><button class="btn btn-success" style="padding:4px 8px;" onclick="openEditActivityModal(\'' + escapeHTML(a.id) + '\')"><i class="material-icons" style="font-size:14px;">edit</i></button> <button class="btn ' + (a.status === 'Show' ? 'btn-info' : 'btn-secondary') + '" style="padding:4px 8px;" onclick="toggleStatus(\'' + escapeHTML(a.id) + '\',\'' + escapeHTML(a.status) + '\')"><i class="material-icons" style="font-size:14px;">' + (a.status === 'Show' ? 'visibility' : 'visibility_off') + '</i></button> <button class="btn btn-danger" style="padding:4px 8px;" onclick="deleteActivity(\'' + escapeHTML(a.id) + '\')"><i class="material-icons" style="font-size:14px;">delete</i></button></div></td></tr>';
            });
        });
    }

    window.toggleChildRows = (id) => { 
        const icon = document.getElementById('icon-' + id); 
        let isH = false;
        document.querySelectorAll(`.child-row-${id}`).forEach(r => { 
            if (r.style.display === 'none') {
                r.style.display = 'table-row'; 
                isH = false;
            } else {
                r.style.display = 'none'; 
                isH = true;
            } 
        }); 
        if (icon) { 
            icon.textContent = isH ? 'expand_more' : 'expand_less'; 
        }
    };

    window.openAddActivityModal = () => { 
        const form = document.getElementById('addActivityForm');
        if(form) form.reset(); 
        ['Morning', 'Afternoon', 'Evening'].forEach(p => {
            const el = document.getElementById('quota' + p);
            if(el) el.disabled = true;
        }); 
        const modal = document.getElementById('addActivityModal');
        if(modal) modal.style.display = 'flex'; 
    };

    window.toggleQuotaInput = (p) => { 
        const el = document.getElementById('quota' + p);
        const chk = document.getElementById('check' + p);
        if(!el || !chk) return;
        el.disabled = !chk.checked; 
        if (chk.checked) el.focus(); 
        else el.value = ''; 
    };

    const addActivityFormEl = document.getElementById('addActivityForm');
    if (addActivityFormEl) {
        addActivityFormEl.onsubmit = async (e) => {
            e.preventDefault(); 
            const p = []; 
            ['Morning', 'Afternoon', 'Evening'].forEach(x => { 
                const chk = document.getElementById('check' + x);
                const q = document.getElementById('quota' + x);
                if (chk && chk.checked) {
                    p.push({ time: chk.value, quota: q ? q.value : 0 });
                } 
            });
            
            if (p.length === 0) return Swal.fire('เตือน', 'เลือกเวลาอย่างน้อย 1 ช่วง', 'warning');
            
            showLoading();
            try {
                const r = await callApi("createActivity", {
                    name: document.getElementById('actName').value, 
                    date: document.getElementById('actDate').value, 
                    location: document.getElementById('actLocation').value, 
                    periods: p,
                    adminId: adminId, 
                    token: userToken
                });
                if(checkAuthError(r)) { hideLoading(); return; }
                hideLoading(); 
                
                if (r.success) { 
                    Swal.fire('ทำรายการสำเร็จ', '', 'success'); 
                    const modal = document.getElementById('addActivityModal');
                    if(modal) modal.style.display = 'none'; 
                    loadActivitiesForAdmin(); 
                } else {
                    Swal.fire('ผิดพลาด', r.message, 'error');
                }
            } catch(err) {
                hideLoading();
                Swal.fire('ผิดพลาด', err.message, 'error');
            }
        };
    }

    window.openEditActivityModal = (id) => {
        const a = adminActivitiesCache.find(act => act.id === id);
        if(!a) return;
        document.getElementById('editActId').value = a.id; 
        document.getElementById('editActName').value = a.name; 
        document.getElementById('editActDate').value = a.date; 
        document.getElementById('editActPeriod').value = a.period; 
        document.getElementById('editActLocation').value = a.location; 
        document.getElementById('editActQuota').value = a.quota; 
        const modal = document.getElementById('editActivityModal');
        if(modal) modal.style.display = 'flex';
    };

    const editActivityFormEl = document.getElementById('editActivityForm');
    if (editActivityFormEl) {
        editActivityFormEl.onsubmit = async (e) => {
            e.preventDefault(); 
            showLoading();
            try {
                const r = await callApi("updateActivity", {
                    id: document.getElementById('editActId').value, 
                    name: document.getElementById('editActName').value, 
                    date: document.getElementById('editActDate').value, 
                    period: document.getElementById('editActPeriod').value, 
                    location: document.getElementById('editActLocation').value, 
                    quota: document.getElementById('editActQuota').value,
                    adminId: adminId,
                    token: userToken
                });
                if(checkAuthError(r)) { hideLoading(); return; }
                hideLoading(); 
                
                if (r.success) { 
                    Swal.fire('ทำรายการสำเร็จ', '', 'success'); 
                    const modal = document.getElementById('editActivityModal');
                    if(modal) modal.style.display = 'none'; 
                    loadActivitiesForAdmin(); 
                } else {
                    Swal.fire('ผิดพลาด', r.message, 'error');
                } 
            } catch(err) {
                hideLoading();
                Swal.fire('ผิดพลาด', err.message, 'error');
            }
        };
    }

    window.toggleStatus = async (id, st) => { 
        showLoading(); 
        try {
            const r = await callApi("toggleActivityStatus", { id: id, status: st, adminId: adminId, token: userToken });
            if(checkAuthError(r)) { hideLoading(); return; }
            hideLoading(); 
            loadActivitiesForAdmin();
        } catch(err) {
            hideLoading();
            console.error(err);
        }
    };

    window.deleteActivity = (id) => { 
        Swal.fire({
            title: 'ยืนยันการลบ',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบข้อมูล'
        }).then(async r => {
            if (r.isConfirmed) {
                showLoading(); 
                try {
                    const res = await callApi("deleteActivity", { id: id, adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading(); 
                    loadActivitiesForAdmin();
                } catch(err) {
                    hideLoading();
                    console.error(err);
                }
            }
        });
    };

    const searchPrintFormEl = document.getElementById('searchPrintForm');
    window.printActivitiesCache = [];
    if (searchPrintFormEl) {
        searchPrintFormEl.onsubmit = async (e) => {
            e.preventDefault(); 
            showLoading(); 
            const d = document.getElementById('printSearchDate').value;
            const p = document.getElementById('printSearchPeriod').value;
            try {
                const a = await callApi("getActivities", { mode: 'admin', studentId: adminId, token: userToken });
                if(checkAuthError(a)) { hideLoading(); return; }
                hideLoading(); 
                
                window.printActivitiesCache = safeArray(a);
                renderPrintSearchResults(window.printActivitiesCache, d, p); 
            } catch(err) {
                hideLoading();
                console.error(err);
            }
        };
    }

    function renderPrintSearchResults(a, d, p) {
        const tb = document.querySelector('#printResultTable tbody'); 
        if(!tb) return;
        tb.innerHTML = '';
        const f = a.filter(x => x.date === d && (p === 'all' || x.period === p));
        if (f.length === 0) { 
            tb.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">ไม่พบกิจกรรม</td></tr>'; 
            return; 
        }
        f.forEach(x => { 
            tb.innerHTML += `<tr>
                <td>${escapeHTML(formatDate(x.date))}</td>
                <td>${escapeHTML(x.period)}</td>
                <td>${escapeHTML(x.name)}</td>
                <td>${escapeHTML(x.location)}</td>
                <td style="text-align:center;">${escapeHTML(String(x.current))}/${escapeHTML(String(x.quota))}</td>
                <td>
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn btn-warning" onclick="openAttendanceModal(${escapeInlineJsArg(x.id)})">
                            <i class="material-icons" style="font-size:14px;vertical-align:middle;">fact_check</i> เช็คชื่อ
                        </button>
                        <button class="btn btn-secondary" onclick="printActivityList(${escapeInlineJsArg(x.id)})" style="background:#607d8b;color:white;">
                            <i class="material-icons" style="font-size:14px;vertical-align:middle;">print</i> พิมพ์
                        </button>
                    </div>
                </td>
            </tr>`; 
        });
    }

    window.printActivityList = async (id) => {
        const act = window.printActivitiesCache.find(x => x.id === id);
        if(!act) return;
        showLoading(); 
        try {
            const list = await callApi("getRegisteredList", { id: id, adminId: adminId, token: userToken });
            if(checkAuthError(list)) { hideLoading(); return; }
            hideLoading(); 
            
            const safeList = safeArray(list);
            if (safeList.length === 0) return Swal.fire('เตือน', 'ไม่มีคนลงทะเบียน', 'info');
            
            const rows = safeList.map((s, i) => '<tr><td style="text-align:center;">' + (i + 1) + '</td><td style="text-align:center;">' + escapeHTML(s.studentId) + '</td><td style="padding-left:10px;">' + escapeHTML(s.name) + '</td><td style="text-align:center;">' + escapeHTML(s.faculty) + '</td><td></td></tr>').join('');
            
            const html = '<html><head><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:\'Sarabun\',sans-serif; margin:20px;} table{width:100%;border-collapse:collapse;margin-top:10px;} th,td{border:1px solid #000;padding:8px;font-size:14px;} th{background:#f0f0f0;} h2,h3{text-align:center;margin:5px 0;}</style></head><body><h2>ใบลงทะเบียนผู้เข้าร่วมกิจกรรมจิตอาสา</h2><h3>มหาวิทยาลัยอุบลราชธานี</h3><div style="margin:20px 0; border-bottom:1px solid #000; padding-bottom:10px;"><b>กิจกรรม:</b> ' + escapeHTML(act.name) + '<br><b>วันที่:</b> ' + escapeHTML(formatDate(act.date)) + ' <b>เวลา:</b> ' + escapeHTML(act.period) + '<br><b>สถานที่:</b> ' + escapeHTML(act.location) + '</div><table><tr><th>ลำดับ</th><th>รหัสนักศึกษา</th><th>ชื่อ-สกุล</th><th>คณะ</th><th>ลงชื่อ</th></tr>' + rows + '</table></body></html>';
                
            const iframe = document.getElementById('previewIframe');
            if(iframe) {
                iframe.contentWindow.document.open();
                iframe.contentWindow.document.write(html);
                iframe.contentWindow.document.close();
            }
            const modal = document.getElementById('printPreviewModal');
            if(modal) modal.style.display = 'flex';
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    window.triggerPrintFromPreview = () => { 
        const iframe = document.getElementById('previewIframe');
        if(iframe) iframe.contentWindow.print(); 
    };

   const exportFormEl = document.getElementById('exportForm');
    if (exportFormEl) {
        exportFormEl.onsubmit = async (e) => {
            e.preventDefault(); 
            showLoading('ระบบกำลังประมวลผล กรุณารอสักครู่');
            try {
                const statusVal = document.getElementById('exportAttendanceStatus') ? document.getElementById('exportAttendanceStatus').value : 'all';
                const timeVal = document.getElementById('exportTimePeriod') ? document.getElementById('exportTimePeriod').value : 'all'; // ดึงค่าช่วงเวลา
                
                const res = await callApi("getExportDataCSV", { 
                    startDate: document.getElementById('exportStartDate').value, 
                    endDate: document.getElementById('exportEndDate').value, 
                    attendanceStatus: statusVal,
                    timePeriod: timeVal, 
                    adminId: adminId, 
                    token: userToken 
                });
                if(checkAuthError(res)) { hideLoading(); return; }
                hideLoading(); 

                if (res.success) {
                    downloadCSV(res.csvData, res.fileName); 
                } else {
                    Swal.fire('แจ้งเตือน', res.message, 'warning'); 
                }
            } catch(err) {
                hideLoading();
                Swal.fire('Error', err.message, 'error');
            }
        };
    }

    let adminQueueCache = [];
    let currentQueueTab = 'current';

    window.loadAdminQueueSlots = async () => { 
        showLoading(); 
        try {
            const s = await callApi("getQueueSlots", { role: 'admin', studentId: adminId, token: userToken });
            if(checkAuthError(s)) { hideLoading(); return; }
            hideLoading(); 
            
            adminQueueCache = safeArray(s); 
            renderAdminQueueGrouped(adminQueueCache); 
        } catch(err) {
            hideLoading();
            console.error(err);
        }
    };

    window.switchQueueTab = (tab) => { 
        currentQueueTab = tab; 
        const tbCurr = document.getElementById('tabQueueCurrent');
        const tbHist = document.getElementById('tabQueueHistory');
        if(tbCurr) tbCurr.classList.toggle('active', tab === 'current');
        if(tbHist) tbHist.classList.toggle('active', tab === 'history');
        renderAdminQueueGrouped(adminQueueCache); 
    };

    // ฟังก์ชันเดิม (กดขยายในหน้าจอ)
    function renderAdminQueueGrouped(slots) {
        const container = document.getElementById('adminQueueSlotsContainer'); 
        if(!container) return;
        container.innerHTML = '';
        
        if (!slots || slots.length === 0) { 
            container.innerHTML = '<div style="text-align:center; padding:30px; color:#999; background: white; border-radius:8px; border: 1px solid #eee;">ไม่มีข้อมูลในระบบ</div>'; 
            return; 
        }
        
        const today = new Date(); 
        today.setHours(0, 0, 0, 0);
        const f = slots.filter(s => { 
            if(!s.date) return false;
            const d = new Date(s.date.split('T')[0]); 
            return currentQueueTab === 'current' ? d >= today : d < today; 
        });
        
        if (f.length === 0) { 
            container.innerHTML = '<div style="text-align:center; padding:30px; color:#999; background: white; border-radius:8px; border: 1px solid #eee;">ไม่มีรอบคิวในช่วงเวลานี้</div>'; 
            return; 
        }

        const groupedData = {};
        f.forEach(s => {
            if (!groupedData[s.date]) groupedData[s.date] = [];
            groupedData[s.date].push(s);
        });

        Object.keys(groupedData).sort((a, b) => currentQueueTab === 'current' ? new Date(a) - new Date(b) : new Date(b) - new Date(a)).forEach(dateStr => {
            const dateSlots = groupedData[dateStr];
            dateSlots.sort((a,b) => a.time.localeCompare(b.time));

            let totalQuotaOfDay = 0, totalCurrentOfDay = 0;
            dateSlots.forEach(s => {
                totalQuotaOfDay += parseInt(s.quota);
                totalCurrentOfDay += parseInt(s.current);
            });

            const contentId = 'queue-date-' + dateStr.replace(/[\/\s-]/g, '');
            const isFullyBooked = totalCurrentOfDay >= totalQuotaOfDay && totalQuotaOfDay > 0;

            container.innerHTML += `
                <div style="margin-bottom: 15px; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; background: white;">
                    <div style="background: ${isFullyBooked ? '#ffebee' : '#f8f9fa'}; padding: 15px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" 
                         onclick="const el = document.getElementById('${contentId}'); const icon = document.getElementById('icon-${contentId}'); if(el.style.display === 'none'){ el.style.display = 'block'; icon.textContent = 'expand_less'; } else { el.style.display = 'none'; icon.textContent = 'expand_more'; }">
                        <div style="font-weight: bold; font-size: 16px; color: #1976D2; display: flex; align-items: center; gap: 10px;">
                            <i class="material-icons" id="icon-${contentId}">expand_more</i>
                            <i class="material-icons" style="color: #666;">calendar_month</i> วันที่ ${formatDate(dateStr)}
                            <span style="background: #1976D2; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: normal;">${dateSlots.length} รอบ</span>
                        </div>
                        <div style="font-size: 14px; color: #555;">
                            จองแล้ว <b style="color: ${isFullyBooked ? '#d32f2f' : '#2e7d32'}">${totalCurrentOfDay}</b> / ${totalQuotaOfDay} คน
                        </div>
                    </div>
                    
                    <div id="${contentId}" style="display: none; padding: 0;">
                        <table class="clean-table" style="margin: 0; border: none;">
                            <thead style="background: #f1f5f9;">
                                <tr>
                                    <th style="padding-left: 20px;">ช่วงเวลา</th>
                                    <th style="text-align: center;">จำนวนรับ (คน)</th>
                                    <th style="text-align: center;">จองแล้ว (คน)</th>
                                    <th style="text-align: center;">สถานะ</th>
                                    <th style="text-align: center; padding-right: 20px;">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dateSlots.map(s => {
                                    const isFull = parseInt(s.current) >= parseInt(s.quota);
                                    const isHidden = s.status === 'Hide';
                                    let badge = isHidden 
                                        ? '<span style="background:#f1f3f5;color:#666;padding:4px 8px;border-radius:12px;font-size:12px;">ซ่อนอยู่</span>' 
                                        : (isFull ? '<span style="background:#ffebee;color:#d32f2f;padding:4px 8px;border-radius:12px;font-size:12px;">เต็มแล้ว</span>' : '<span style="background:#e8f5e9;color:#2e7d32;padding:4px 8px;border-radius:12px;font-size:12px;">เปิดจอง</span>');
                                    
                                    return `
                                    <tr style="${isHidden ? 'opacity:0.6; background:#fafafa;' : ''} ${isFull && !isHidden ? 'background: #fff5f5;' : ''}">
                                        <td style="font-weight: bold; padding-left: 20px;">${escapeHTML(s.time)}</td>
                                        <td style="text-align: center;">${s.quota}</td>
                                        <td style="text-align: center; color: ${isFull ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">
                                            ${s.current} / ${s.quota}
                                        </td>
                                        <td style="text-align: center;">${badge}</td>
                                        <td style="text-align: center; padding-right: 20px;">
                                            <div style="display:flex; gap:5px; justify-content:center;">
                                                <button class="btn btn-sm" style="background:#e2e8f0; padding:4px 8px;" onclick="toggleQueueStatus(${escapeInlineJsArg(s.id)},${escapeInlineJsArg(s.status)})">
                                                    <i class="material-icons" style="font-size:14px;">${isHidden ? 'visibility' : 'visibility_off'}</i>
                                                </button>
                                                <button class="btn btn-danger btn-sm" style="padding:4px 8px;" onclick="deleteQueueSlot(${escapeInlineJsArg(s.id)})">
                                                    <i class="material-icons" style="font-size:14px;">delete</i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
    }

    // ฟังก์ชันสร้างคิวแบบกำหนดเอง (แก้ไขตัวแปรไม่ให้ซ้ำ)
    const adminQueueSingleForm = document.getElementById('createQueueSingleForm');
    if (adminQueueSingleForm) {
        adminQueueSingleForm.onsubmit = async (e) => {
            e.preventDefault();
            const date = document.getElementById('queueDateSingle').value;
            const time = document.getElementById('queueTimeSingle').value;
            const quota = document.getElementById('queueQuotaSingle').value;

            Swal.fire({ title: 'ยืนยันการสร้างคิว', icon: 'question', showCancelButton: true }).then(async r => {
                if (r.isConfirmed) {
                    showLoading('ระบบกำลังบันทึก');
                    try {
                        const res = await callApi('createQueueSlot', { date, time, quota, status: 'Show', adminId: adminId, token: userToken });
                        hideLoading();
                        if (res.success) {
                            Swal.fire('ทำรายการสำเร็จ', 'สร้างรอบคิวแล้ว', 'success');
                            document.getElementById('createQueueSingleForm').reset();
                            document.getElementById('createQueueSingleModal').style.display = 'none'; // ปิดหน้าต่างป๊อปอัพ
                            loadAdminQueueSlots();
                        } else Swal.fire('ผิดพลาด', res.message, 'error');
                    } catch (err) { hideLoading(); Swal.fire('ผิดพลาด', err.message, 'error'); }
                }
            });
        };
    }

    // ฟังก์ชันสร้างคิวแบบกลุ่ม (แก้ไขตัวแปรไม่ให้ซ้ำ)
    const adminQueueBulkForm = document.getElementById('createQueueBulkForm');
    if (adminQueueBulkForm) {
        adminQueueBulkForm.onsubmit = async (e) => {
            e.preventDefault();
            const date = document.getElementById('queueDateBulk').value;
            const quota = document.getElementById('queueQuotaBulk').value;
            
            const checkboxes = document.querySelectorAll('input[name="bulkTime"]:checked');
            const times = Array.from(checkboxes).map(cb => cb.value);

            if (times.length === 0) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกช่วงเวลาอย่างน้อย 1 รายการ', 'warning');

            Swal.fire({ 
                title: 'ยืนยันการสร้างคิว', 
                text: `ระบบจะสร้างคิวในวันที่ ${date} จำนวน ${times.length} รอบ (รอบละ ${quota} คน) ยืนยันหรือไม่`, 
                icon: 'question', 
                showCancelButton: true 
            }).then(async r => {
                if (r.isConfirmed) {
                    showLoading('กำลังสร้างกลุ่มคิว อาจใช้เวลาสักครู่');
                    let successCount = 0;
                    try {
                        for (let t of times) {
                            const res = await callApi('createQueueSlot', { 
                                date: date, time: t, quota: quota, status: 'Show', adminId: adminId, token: userToken 
                            });
                            if(res.success) successCount++;
                        }
                        hideLoading();
                        Swal.fire('ทำรายการสำเร็จ', `สร้างรอบคิวเสร็จสมบูรณ์ ${successCount} รายการ`, 'success');
                        document.getElementById('createQueueBulkForm').reset();
                        document.getElementById('createQueueBulkModal').style.display = 'none'; // ปิดหน้าต่างป๊อปอัพ
                        loadAdminQueueSlots(); 
                    } catch (err) { 
                        hideLoading(); 
                        Swal.fire('ผิดพลาด', err.message, 'error'); 
                    }
                }
            });
        };
    }

    window.toggleQueueStatus = (id, st) => { 
        Swal.fire({
            title: 'ยืนยันเปลี่ยนสถานะ', 
            icon: 'question', 
            showCancelButton: true
        }).then(async r => {
            if (r.isConfirmed) { 
                showLoading(); 
                try {
                    const res = await callApi("toggleQueueStatus", { id: id, status: st === 'Show' ? 'Hide' : 'Show', adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading();
                    loadAdminQueueSlots();
                } catch(err) {
                    hideLoading();
                    console.error(err);
                }
            }
        }); 
    };

    window.deleteQueueSlot = (id) => { 
        Swal.fire({
            title: 'ยืนยันลบข้อมูล', 
            text: 'ข้อมูลการจองในรอบนี้จะหายไปทั้งหมด', 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#d33'
        }).then(async r => {
            if (r.isConfirmed) { 
                showLoading(); 
                try {
                    const res = await callApi("deleteQueueSlot", { id: id, adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading();
                    loadAdminQueueSlots();
                } catch(err) {
                    hideLoading();
                    console.error(err);
                }
            }
        }); 
    };


    let queueOptionsCache = {};
    let currentSearchInfo = {};
    let currentQueueListData = [];

    window.loadQueueDateOptions = async () => {
        try {
            const m = await callApi("getQueueSlotOptions", { adminId: adminId, token: userToken });
            if(checkAuthError(m)) return;
            queueOptionsCache = m || {}; 
            const sel = document.getElementById('searchQDate'); 
            if(sel) {
                sel.innerHTML = '<option value="">-- เลือก --</option>'; 
                Object.keys(queueOptionsCache).forEach(k => sel.innerHTML += '<option value="' + escapeHTML(k) + '">' + escapeHTML(formatDate(k)) + '</option>'); 
            }
        } catch(err) {
            console.error(err);
        }
    };

    window.updateTimeOptions = () => { 
        const t = document.getElementById('searchQTime');
        const dEl = document.getElementById('searchQDate'); 
        if(!t || !dEl) return;
        const d = dEl.value;
        t.innerHTML = '<option value="">-- เลือกเวลา --</option>'; 
        if (d && queueOptionsCache[d]) { 
            queueOptionsCache[d].forEach(x => t.innerHTML += '<option value="' + escapeHTML(x) + '">' + escapeHTML(x) + '</option>'); 
            t.disabled = false; 
        } else {
            t.disabled = true; 
        }
    };

    const searchQueueListFormEl = document.getElementById('searchQueueListForm');
    if (searchQueueListFormEl) {
        searchQueueListFormEl.onsubmit = async (e) => {
            e.preventDefault(); 
            showLoading(); 
            currentSearchInfo = {
                date: document.getElementById('searchQDate').value, 
                time: document.getElementById('searchQTime').value
            };
            try {
                const l = await callApi("getQueueAttendees", { date: currentSearchInfo.date, time: currentSearchInfo.time, adminId: adminId, token: userToken });
                if(checkAuthError(l)) { hideLoading(); return; }
                hideLoading(); 

                currentQueueListData = safeArray(l); 
                const tb = document.querySelector('#queueResultTable tbody'); 
                if(tb) {
                    tb.innerHTML = '';
                    if (currentQueueListData.length === 0) {
                        tb.innerHTML = '<tr><td colspan="5" style="text-align:center;">ไม่พบผู้จองคิว</td></tr>';
                    } else {
                        currentQueueListData.forEach(x => tb.innerHTML += '<tr><td style="text-align:center; font-weight:bold; color:var(--secondary-color);">' + escapeHTML(x.queueNumber) + '</td><td style="text-align:center;">' + escapeHTML(x.studentId) + '</td><td>' + escapeHTML(x.name) + '</td><td>' + escapeHTML(x.faculty) + '</td><td><div style="border-bottom:1px solid #ddd; height:20px;"></div></td></tr>');
                    }
                }
                const pArea = document.getElementById('printQueueBtnArea');
                if(pArea) pArea.style.display = currentQueueListData.length > 0 ? 'block' : 'none';
            } catch(err) {
                hideLoading();
                console.error(err);
            }
        };
    }

    window.printQueueList = () => {
        const rows = currentQueueListData.map(x => '<tr><td style="text-align:center;"><b>' + escapeHTML(x.queueNumber) + '</b></td><td style="text-align:center;">' + escapeHTML(x.studentId) + '</td><td>' + escapeHTML(x.name) + '</td><td>' + escapeHTML(x.faculty) + '</td><td></td></tr>').join('');
        
        const html = '<html><head><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:\'Sarabun\',sans-serif;margin:20px;} table{width:100%;border-collapse:collapse;margin-top:10px;} th,td{border:1px solid #000;padding:8px;font-size:14px;} th{background:#f0f0f0;}</style></head><body><h2>ใบรายชื่อผู้จองคิวส่งเอกสาร กยศ.</h2><h3>มหาวิทยาลัยอุบลราชธานี</h3><div style="margin:20px 0; border:1px solid #000; padding:10px; border-radius:4px;"><b>วันที่:</b> ' + escapeHTML(formatDate(currentSearchInfo.date)) + '<br><b>เวลา:</b> ' + escapeHTML(currentSearchInfo.time) + '<br><b>ผู้จอง:</b> ' + currentQueueListData.length + ' คน</div><table><tr><th>คิว</th><th>รหัส</th><th>ชื่อ</th><th>คณะ</th><th>หมายเหตุ/เซ็นชื่อ</th></tr>' + rows + '</table></body></html>';
        
        const iframe = document.getElementById('previewIframe');
        if(iframe) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(html);
            iframe.contentWindow.document.close();
            const mod = document.getElementById('printPreviewModal');
            if(mod) mod.style.display = 'flex';
        } else {
             const pw = window.open('', '', 'width=800,height=600'); 
             if(pw) {
                 pw.document.write(html); 
                 pw.document.close(); 
                 setTimeout(()=>pw.print(), 500);
             }
        }
    };

    window.loadAdminLoanStats = async () => {
        try {
            const s = await callApi("getLoanDashboardStats2569", { adminId: adminId, token: userToken });
            if(checkAuthError(s)) return;

            const e1 = document.getElementById('statEligible'); if(e1) e1.textContent = s.totalEligible || 0; 
            const e2 = document.getElementById('statSubmitted'); if(e2) e2.textContent = s.submitted || 0; 
            const e3 = document.getElementById('statNotSubmitted'); if(e3) e3.textContent = s.notSubmitted || 0; 
            const e4 = document.getElementById('statFailed'); if(e4) e4.textContent = `${s.gpaFail||0} / ${s.creditFail||0}`; 
        } catch(err) {
            console.error(err);
        }
    };

    window.uploadExcelFile = async () => {
        const fileInput = document.getElementById('excelFileInput');
        if(!fileInput) return;
        const file = fileInput.files[0]; 
        
        if (!file) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ก่อนกดอัปโหลด', 'warning');
            return;
        }
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            Swal.fire('แจ้งเตือน', 'ระบบรองรับเฉพาะไฟล์ Excel (.xlsx, .xls) เท่านั้น', 'error');
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: 'ตั้งค่าเงื่อนไขการนำเข้า',
            html:
                '<p style="font-size: 14px; color: #555;">ระบุ 2 หลักแรกของรหัสนักศึกษาที่ <b>ไม่อนุญาต</b> ให้นำเข้า<br>เช่น 64,65 (หากไม่มีให้เว้นว่างไว้)</p>' +
                '<input id="swal-input1" class="swal2-input" placeholder="เช่น 64,65,68">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'อัปโหลดข้อมูล',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2e7d32',
            preConfirm: () => {
                const val = document.getElementById('swal-input1').value;
                if(!val) return [];
                return val.split(',').map(s => s.trim()).filter(s => s.length === 2);
            }
        });

        if (formValues === undefined) return; 

        
        Swal.fire({
            title: 'ระบบกำลังประมวลผล', 
            text: 'กรุณารอสักครู่ ห้ามปิดหน้าต่างนี้', 
            allowOutsideClick: false, 
            didOpen: () => { Swal.showLoading() }
        });
        
        const reader = new FileReader();
        reader.onload = async e => {
            try {
                const r = await callApi("uploadAndImportExcel", {
                    fileName: file.name, 
                    mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                    content: e.target.result.split(',')[1],
                    blockedPrefixes: formValues, 
                    adminId: adminId, 
                    token: userToken
                });
                
                if (r.success) {
                    Swal.fire('ทำรายการสำเร็จ', r.message, 'success'); 
                    loadAdminLoanStats();
                    fileInput.value = ''; 
                } else {
                    Swal.fire('แจ้งเตือน', r.message, 'warning'); 
                }
            } catch(err) {
                Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
            }
        };
        reader.onerror = () => Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้', 'error');
        reader.readAsDataURL(file);
    };

   window.uploadGPAExcelFile = () => {
    const fileInput = document.getElementById('gpaExcelFileInput');
    if(!fileInput) return;
    const file = fileInput.files[0]; 
    
    if (!file) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ก่อนกดอัปโหลด', 'warning');
        return;
    }
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        Swal.fire('แจ้งเตือน', 'ระบบรองรับเฉพาะไฟล์ Excel (.xlsx, .xls) เท่านั้น', 'error');
        return;
    }
    
    Swal.fire({
        title: 'ระบบกำลังประมวลผลการเรียน', 
        text: 'กำลังอ่านไฟล์ด้วยระบบ กรุณารอสักครู่',
        allowOutsideClick: false, 
        didOpen: () => { Swal.showLoading() }
    });
    
    const reader = new FileReader();
    reader.onload = async e => {
        try {
  
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            // ดึงข้อมูลตารางออกมาเป็น Array 2 มิติ ทันที
            const allValues = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            
            const r = await callApi("uploadAndImportGPACredits", {
                allValues: allValues, 
                adminId: adminId,
                token: userToken
            });
            
            if (r.success) {
                Swal.fire({
                    title: 'อัปเดตข้อมูลสำเร็จ', 
                    html: `อัปเดต <b>${r.updateCount}</b> รายการ<br>` + (r.failedCount > 0 ? `<span style="color:red">ไม่พบรหัส ${r.failedCount} รายการในฐานระบบ</span>` : ''), 
                    icon: 'success'
                });
                fileInput.value = '';
            } else {
                Swal.fire('ผิดพลาด', r.message, 'error'); 
            }
            loadAdminLoanStats();
        } catch(err) {
            Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
        }
    };
    reader.onerror = () => Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้', 'error');
    
    reader.readAsArrayBuffer(file); 
};
    
    let currentAdminLoanData = null;

    window.searchLoanForAdmin = async () => {
        const searchInput = document.getElementById('adminLoanSearchInput');
        if(!searchInput) return;
        const val = searchInput.value;
        showLoading(); 
        try {
            const res = await callApi("adminGetLoanInfo", { studentId: val, adminId: adminId, token: userToken });
            if(checkAuthError(res) && res.status !== 'not_found_student') { hideLoading(); return; }
            hideLoading();

            const resArea = document.getElementById('adminLoanResultArea');
            if (res.status === 'not_found_student') { 
                Swal.fire('ไม่พบรายการที่ตรวจสอบในระบบ', 'ตรวจสอบไม่พบว่ามีสิทธิ์ยื่นขอกู้ยืม ในระบบรายเก่าเลื่อนชั้นปี', 'error'); 
                if(resArea) resArea.style.display = 'none'; 
            } else { 
                currentAdminLoanData = res; 
                document.getElementById('adm_loanName').textContent = res.studentInfo.name; 
                document.getElementById('adm_loanId').textContent = res.studentInfo.studentId; 
                document.getElementById('adm_loanFaculty').textContent = res.studentInfo.faculty; 
                document.getElementById('adm_loanGpa').textContent = res.studentInfo.gpa; 
                document.getElementById('adm_loanCredits').textContent = res.studentInfo.credits;
                
                const warnBox = document.getElementById('adm_warningBox');
                const badge = document.getElementById('adm_statusBadge');
                if (!res.studentInfo.isPassed) { 
                    if(warnBox) warnBox.style.display = 'block'; 
                    if(badge) {
                        badge.innerHTML = 'ไม่ผ่านเกณฑ์'; 
                        badge.style.background = '#dc3545'; 
                        badge.style.color = 'white'; 
                    }
                } else { 
                    if(warnBox) warnBox.style.display = 'none'; 
                    if(badge) {
                        badge.innerHTML = 'ผ่านเกณฑ์'; 
                        badge.style.background = '#28a745'; 
                        badge.style.color = 'white'; 
                    }
                }
                
                const cLiving = document.getElementById('adm_checkLiving');
                const cTuition = document.getElementById('adm_checkTuition');
                const iTuition = document.getElementById('adm_inputTuition');
                
                if(cLiving) cLiving.checked = res.loanData && res.loanData.livingAmount > 0;
                if(cTuition) cTuition.checked = res.loanData && res.loanData.tuitionAmount > 0;
                if(iTuition) iTuition.value = res.loanData ? res.loanData.tuitionAmount : '';
                
                toggleAdminTuition(); 
                const btnDel = document.getElementById('btnAdminDelete');
                if(btnDel) btnDel.style.display = res.loanData ? 'inline-flex' : 'none';
                if(resArea) resArea.style.display = 'block';
            }
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    window.toggleAdminTuition = () => { 
        const cTuition = document.getElementById('adm_checkTuition');
        const iTuition = document.getElementById('adm_inputTuition');
        const wTuition = document.getElementById('adm_tuition_wrapper');
        
        if(!cTuition || !iTuition || !wTuition) return;
        
        iTuition.disabled = !cTuition.checked; 
        wTuition.style.display = cTuition.checked ? 'block' : 'none'; 
        calcAdminLoanTotal(); 
    };

    window.calcAdminLoanTotal = () => { 
        let t = 0; 
        const cLiving = document.getElementById('adm_checkLiving');
        const cTuition = document.getElementById('adm_checkTuition');
        const iTuition = document.getElementById('adm_inputTuition');
        const showTot = document.getElementById('adm_showTotal');
        
        if (cLiving && cLiving.checked) t += 18000; 
        if (cTuition && cTuition.checked && iTuition) t += Number(iTuition.value) || 0; 
        if (showTot) showTot.textContent = t.toLocaleString(); 
    };

    window.saveLoanAsAdmin = async () => {
        const cLiving = document.getElementById('adm_checkLiving');
        const cTuition = document.getElementById('adm_checkTuition');
        const iTuition = document.getElementById('adm_inputTuition');
        if(!cLiving || !cTuition || !iTuition) return;
        
        const isL = cLiving.checked;
        const isT = cTuition.checked;
        const tVal = Number(iTuition.value) || 0;
        
        if (!isL && !isT) return Swal.fire('เตือน', 'เลือกอย่างน้อย 1 รายการ', 'warning'); 
        if (isT && tVal <= 0) return Swal.fire('เตือน', 'ระบุค่าเทอม', 'warning');
        
        showLoading(); 
        const req = (isL && isT) ? 'Both' : (isL ? 'Living' : 'Tuition');
        
        try {
            const res = await callApi("adminSaveLoanRequest", {
                studentId: currentAdminLoanData.studentInfo.studentId, 
                name: currentAdminLoanData.studentInfo.name, 
                reqType: req, 
                livingAmount: isL ? 18000 : 0, 
                tuitionAmount: isT ? tVal : 0, 
                totalAmount: (isL ? 18000 : 0) + (isT ? tVal : 0),
                adminId: adminId, 
                token: userToken
            });
            if(checkAuthError(res)) { hideLoading(); return; }
            hideLoading(); 
            Swal.fire('ทำรายการสำเร็จ', '', 'success'); 
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    window.deleteLoanAsAdmin = () => { 
        Swal.fire({
            title: 'ลบรายการกู้ยืม',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ตกลงลบ'
        }).then(async r => {
            if (r.isConfirmed) { 
                showLoading(); 
                try {
                    const res = await callApi("adminDeleteLoanRequest", { studentId: currentAdminLoanData.studentInfo.studentId, adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading(); 
                    
                    const resArea = document.getElementById('adminLoanResultArea');
                    const searchIn = document.getElementById('adminLoanSearchInput');
                    if(resArea) resArea.style.display = 'none'; 
                    if(searchIn) searchIn.value = '';
                } catch(err) {
                    hideLoading();
                    Swal.fire('Error', err.message, 'error');
                }
            } 
        });
    };

    window.downloadAdminReport = async () => { 
        showLoading('ระบบกำลังประมวลผลรายงาน'); 
        const reportTypeEl = document.querySelector('input[name="reportType"]:checked');
        const facultyEl = document.getElementById('reportFaculty');
        const startDateEl = document.getElementById('reportStartDate');
        const endDateEl = document.getElementById('reportEndDate');
        
        if(!reportTypeEl || !facultyEl) { hideLoading(); return; }
        
        const requestData = {
            reportType: reportTypeEl.value, 
            faculty: facultyEl.value, 
            adminId: adminId, 
            token: userToken 
        };

        if (startDateEl && startDateEl.value) requestData.startDate = startDateEl.value;
        if (endDateEl && endDateEl.value) requestData.endDate = endDateEl.value;
        
        try {
            const r = await callApi("getAdminReportCSV", requestData);
            
            if(checkAuthError(r)) { hideLoading(); return; }
            hideLoading(); 
            
            if (r.success) {
                const fileNameMap = {
                    'submitted': 'ผู้ยื่นคำร้องแล้ว_กยศ2569.csv',
                    'ineligible': 'ผู้ขาดคุณสมบัติ_กยศ2569.csv',
                    'not_submitted': 'ยังไม่ดำเนินการ_กยศ2569.csv'
                };
                
                let downloadName = fileNameMap[reportTypeEl.value] || 'Loan2569_Report.csv';
                if (requestData.startDate && requestData.startDate === requestData.endDate) {
                    downloadName = `(วันที่_${requestData.startDate})_` + downloadName;
                }
                
                downloadCSV(r.csvData, downloadName); 
            } else {
                Swal.fire('แจ้งเตือน', r.message, 'info');
            }
        } catch(err) {
            hideLoading();
            Swal.fire('ข้อผิดพลาด', err.message, 'error');
        }
    };

    function downloadCSV(csv, name) { 
        const blob = new Blob(["\uFEFF" + csv], {type: 'text/csv;charset=utf-8;'}); 
        const link = document.createElement("a"); 
        link.href = URL.createObjectURL(blob); 
        link.download = name; 
        link.click(); 
    }

    let overAllData = [];
    let overFilteredData = [];
    let overCurrentPage = 1;
    let overRowsPerPage = 10;

    window.loadAdminOverLoanStats = async () => { 
        try {
            const s = await callApi("getOverLoanDashboardStats", { adminId: adminId, token: userToken });
            if(checkAuthError(s)) return;
            const s1 = document.getElementById('statOverEligible');
            const s2 = document.getElementById('statOverSubmitted');
            const s3 = document.getElementById('statOverNotSubmitted');
            const s4 = document.getElementById('statOverFailed');
            if(s1) s1.textContent = s.totalEligible || 0; 
            if(s2) s2.textContent = s.submitted || 0; 
            if(s3) s3.textContent = s.notSubmitted || 0; 
            if(s4) s4.textContent = `${s.gpaFail||0} / ${s.creditFail||0}`; 
        } catch(err) {
            console.error(err);
        }
    };

    window.uploadOverExcel = async () => { 
        const fileInput = document.getElementById('overExcelInput');
        if(!fileInput) return;
        const file = fileInput.files[0]; 
        
        if (!file) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ก่อนกดอัปโหลด', 'warning');
            return;
        }
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            Swal.fire('แจ้งเตือน', 'ระบบรองรับเฉพาะไฟล์ Excel (.xlsx, .xls) เท่านั้น', 'error');
            return;
        }
        
        const { value: formValues } = await Swal.fire({
            title: 'ตั้งค่าเงื่อนไขการนำเข้า',
            html:
                '<p style="font-size: 14px; color: #555;">ระบุ 2 หลักแรกของรหัสนักศึกษาที่ <b>ไม่อนุญาต</b> ให้นำเข้า<br>เช่น 64,65 (หากไม่มีให้เว้นว่างไว้)</p>' +
                '<input id="swal-input-over" class="swal2-input" placeholder="เช่น 64,65,68">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'อัปโหลดข้อมูล',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#e65100',
            preConfirm: () => {
                const val = document.getElementById('swal-input-over').value;
                if(!val) return [];
                return val.split(',').map(s => s.trim()).filter(s => s.length === 2);
            }
        });

        if (formValues === undefined) return; 
        
        Swal.fire({
            title: 'กำลังนำเข้าข้อมูลระบบ', 
            text: 'กรุณารอสักครู่ ห้ามปิดหน้าต่างนี้', 
            allowOutsideClick: false, 
            didOpen: () => {Swal.showLoading()}
        }); 
        
        const reader = new FileReader(); 
        reader.onload = async e => {
            try {
                const x = await callApi("uploadAndImportOverExcel", {
                    fileName: file.name,
                    mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    content: e.target.result.split(',')[1],
                    blockedPrefixes: formValues,
                    adminId: adminId,
                    token: userToken
                });
                
                if (x.success) {
                    Swal.fire('ทำรายการสำเร็จ', x.message, 'success');
                    fileInput.value = '';
                } else {
                    Swal.fire('แจ้งเตือน', x.message, 'warning');
                }
                loadAdminOverLoanStats();
                loadOverLoanAdminTable();
            } catch(err) {
                Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
            }
        };
        reader.onerror = () => Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้', 'error');
        reader.readAsDataURL(file); 
    };

   window.uploadOverGpa = () => { 
        const fileInput = document.getElementById('overGpaInput');
        if(!fileInput) return;
        const file = fileInput.files[0]; 
        
        if (!file) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ก่อนกดอัปโหลด', 'warning');
            return;
        }
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            Swal.fire('แจ้งเตือน', 'ระบบรองรับเฉพาะไฟล์ Excel (.xlsx, .xls) เท่านั้น', 'error');
            return;
        }
        
        Swal.fire({
            title: 'กำลังอัปเดตเกรด', 
            text: 'กรุณารอสักครู่...', 
            allowOutsideClick: false, 
            didOpen: () => {Swal.showLoading()}
        }); 
        
        const reader = new FileReader(); 
        reader.onload = async e => {
            try {
                const base64Content = e.target.result.split(',')[1];
                if (!base64Content) {
                    Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านเนื้อหาไฟล์ได้', 'error');
                    return;
                }

                const x = await callApi("uploadAndImportOverGPACredits", {
                    fileName: file.name,
                    mimeType: file.type || "application/vnd.ms-excel",
                    content: base64Content, 
                    adminId: adminId,
                    token: userToken
                });
                
                if (x.success) {
                    Swal.fire('ทำรายการสำเร็จ', `ทำรายการสำเร็จ ${x.updateCount} รายการ`, 'success');
                    fileInput.value = '';
                } else {
                    Swal.fire('ผิดพลาด', x.message, 'error');
                }
                loadAdminOverLoanStats();
                loadOverLoanAdminTable();
            } catch(err) {
                Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
            }
        };
        reader.onerror = () => Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้', 'error');
        reader.readAsDataURL(file); 
    };

    window.loadOverLoanAdminTable = async () => { 
        const tb = document.querySelector('#overAdminTable tbody');
        if(tb) tb.innerHTML = '<tr><td colspan="7" style="text-align:center;">กำลังโหลดข้อมูล</td></tr>'; 
        try {
            const d = await callApi("getOverLoanProfilesSummary", { adminId: adminId, token: userToken });
            if(checkAuthError(d)) return;

            overAllData = safeArray(d); 
            filterOverTable(); 
        } catch(err) {
            console.error(err);
        }
    };

    window.filterOverTable = () => { 
        const qInput = document.getElementById('overSearchInput');
        const stInput = document.getElementById('overStatusFilter');
        if(!qInput || !stInput) return;
        const q = qInput.value.toLowerCase().trim();
        const st = stInput.value;
        overFilteredData = overAllData.filter(x => (String(x.studentId).toLowerCase().includes(q) || String(x.name).toLowerCase().includes(q)) && (st === 'all' || x.status === st));
        resetOverPagination(); 
    };

    window.resetOverPagination = () => { 
        const rpp = document.getElementById('overRowsPerPage');
        if(rpp) overRowsPerPage = parseInt(rpp.value); 
        overCurrentPage = 1; 
        renderOverLoanTable(); 
    };

    window.changeOverPage = (s) => { 
        overCurrentPage += s; 
        renderOverLoanTable(); 
    };

    function renderOverLoanTable() {
        const tb = document.querySelector('#overAdminTable tbody'); 
        if(!tb) return;
        tb.innerHTML = '';
        
        const infoEl = document.getElementById('overPageInfo');
        const btnP = document.getElementById('btnOverPrev');
        const btnN = document.getElementById('btnOverNext');
        
        if (overFilteredData.length === 0) { 
            tb.innerHTML = '<tr><td colspan="7" style="text-align:center;">ไม่พบข้อมูล</td></tr>'; 
            if(infoEl) infoEl.textContent = 'หน้า 0 / 0'; 
            return; 
        }
        
        const start = (overCurrentPage - 1) * overRowsPerPage; 
        const pageData = overFilteredData.slice(start, start + overRowsPerPage);
        
        pageData.forEach((x, i) => { 
            tb.innerHTML += '<tr><td style="text-align:center;">' + (start + i + 1) + '</td><td>' + escapeHTML(x.studentId) + '</td><td>' + escapeHTML(x.name) + '</td><td>' + escapeHTML(x.faculty) + '</td><td style="text-align:center;">' + escapeHTML(String(x.gpa)) + '</td><td style="text-align:center;">' + escapeHTML(String(x.credits)) + '</td><td style="text-align:center;">' + (x.status === 'Submitted' ? '<span style="color:green;font-weight:bold;">ยื่นแล้ว</span>' : '<span style="color:red;">ยังไม่ยื่น</span>') + '</td></tr>'; 
        });
        
        const total = Math.ceil(overFilteredData.length / overRowsPerPage);
        if(infoEl) infoEl.textContent = `หน้า ${overCurrentPage} / ${total} (ทั้งหมด ${overFilteredData.length} รายการ)`;
        if(btnP) btnP.disabled = (overCurrentPage === 1);
        if(btnN) btnN.disabled = (overCurrentPage === total);
    }

    window.downloadOverReport = async () => { 
        showLoading(); 
        try {
            const r = await callApi("getOverAdminReportCSV", { adminId: adminId, token: userToken });
            if(checkAuthError(r)) { hideLoading(); return; }
            hideLoading(); 
            
            downloadCSV(r.csvData, 'over_loan.csv');
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    let rsAllData = [];
    let rsFilteredData = [];
    let rsCurrentPage = 1;
    let rsRowsPerPage = 10;

    window.loadResignStats = async () => { 
        try {
            const s = await callApi("getResignDashboardStats", { adminId: adminId, token: userToken });
            if(checkAuthError(s)) return;
            const el = document.getElementById('statResignEligible');
            if(el) el.textContent = s.totalEligible || 0; 

            const r = await callApi("getResignAdminData", { adminId: adminId, token: userToken });
            if (r && r.success) {
                const sMove = document.getElementById('rsStatMoveUni');
                const sChange = document.getElementById('rsStatChangeFac');
                const sQuit = document.getElementById('rsStatQuit');
                
                if(sMove) sMove.textContent = r.stats.typeMoveUni || 0;
                if(sChange) sChange.textContent = r.stats.typeChangeFac || 0;
                if(sQuit) sQuit.textContent = r.stats.typeQuit || 0;
            }
        } catch(err) {
            console.error(err);
        }
    };

    window.uploadResignFile = () => { 
        const fileInput = document.getElementById('resignExcelInput');
        if(!fileInput) return;
        const file = fileInput.files[0]; 
        
        if (!file) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ก่อนกดอัปโหลด', 'warning');
            return;
        }
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            Swal.fire('แจ้งเตือน', 'ระบบรองรับเฉพาะไฟล์ Excel (.xlsx, .xls) เท่านั้น', 'error');
            return;
        }
        
        Swal.fire({
            title: 'กำลังอัปโหลดข้อมูล', 
            text: 'กรุณารอสักครู่', 
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading()
        }); 
        
        const reader = new FileReader(); 
        reader.onload = async e => {
            try {
                const x = await callApi("uploadAndImportResignExcel", {
                    fileName: file.name,
                    mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    content: e.target.result.split(',')[1],
                    adminId: adminId,
                    token: userToken
                });
                if (x.success) {
                    Swal.fire('ทำรายการสำเร็จ', x.message, 'success'); 
                    fileInput.value = '';
                } else {
                    Swal.fire('ผิดพลาด', x.message, 'error');
                }
                loadResignStats();
            } catch(err) {
                Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
            }
        };
        reader.onerror = () => Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้', 'error');
        reader.readAsDataURL(file); 
    };
    
    window.loadResignManagementData = async () => { 
        showLoading(); 
        try {
            const r = await callApi("getResignAdminData", { adminId: adminId, token: userToken });
            if(checkAuthError(r)) { hideLoading(); return; }
            hideLoading(); 

            if (r.success) { 
                rsAllData = safeArray(r); 
                
                const se = document.getElementById('rsStatEligible');
                const ss = document.getElementById('rsStatSubmitted');
                const sp = document.getElementById('rsStatPending');
                const sc = document.getElementById('rsStatCompleted');
                
                const sMove = document.getElementById('rsStatMoveUni');
                const sChange = document.getElementById('rsStatChangeFac');
                const sQuit = document.getElementById('rsStatQuit');
                
                if(se) se.textContent = r.stats.eligible || 0; 
                if(ss) ss.textContent = r.stats.submitted || 0; 
                if(sp) sp.textContent = r.stats.pending || 0; 
                if(sc) sc.textContent = r.stats.completed || 0; 
                

                if(sMove) sMove.textContent = r.stats.typeMoveUni || 0;
                if(sChange) sChange.textContent = r.stats.typeChangeFac || 0;
                if(sQuit) sQuit.textContent = r.stats.typeQuit || 0;

                filterResignData(); 
            } 
        } catch(err) {
            hideLoading();
            console.error(err);
        }
    };

    window.filterResignData = () => {
        const qInput = document.getElementById('rsSearchInput');
        const stInput = document.getElementById('rsStatusFilter');
        if(!qInput || !stInput) return;
        
        const q = qInput.value.toLowerCase().trim();
        const st = stInput.value;
        rsFilteredData = rsAllData.filter(x => (String(x.studentId).toLowerCase().includes(q) || String(x.name).toLowerCase().includes(q)) && (st === 'all' || x.status === st));
        rsCurrentPage = 1; 
        renderResignTable();
    };

    function renderResignTable() { 
        const tb = document.querySelector('#rsTable tbody'); 
        if(!tb) return;
        tb.innerHTML = ''; 
        
        const pInfo = document.getElementById('rsPageInfo');
        const bPrev = document.getElementById('rsBtnPrev');
        const bNext = document.getElementById('rsBtnNext');
        
        if (rsFilteredData.length === 0) { 
            tb.innerHTML = '<tr><td colspan="7" style="text-align:center;">ไม่พบข้อมูล</td></tr>'; 
            if(pInfo) pInfo.textContent = 'หน้า 0 / 0'; 
            return; 
        }
        
        const start = (rsCurrentPage - 1) * rsRowsPerPage; 
        rsFilteredData.slice(start, start + rsRowsPerPage).forEach((x, i) => { 
            tb.innerHTML += '<tr><td>' + (start + i + 1) + '</td><td>' + escapeHTML(x.studentId) + '</td><td>' + escapeHTML(x.name) + '</td><td>' + escapeHTML(x.resignType) + '</td><td>' + escapeHTML(x.newDetail) + '</td><td>' + (x.status === 'Completed' ? '<span style="color:green;font-weight:bold;">เสร็จสิ้น</span>' : '<span style="color:red;font-weight:bold;">รอตรวจสอบ</span>') + '</td><td style="text-align:center;">' + (x.status === 'Completed' ? '<button class="btn btn-secondary btn-sm" disabled>เรียบร้อย</button>' : '<button class="btn btn-success btn-sm" onclick="markResignCompleted(\'' + escapeHTML(x.id) + '\',\'' + escapeHTML(x.studentId) + '\')">ยืนยันผล</button>') + '</td></tr>'; 
        }); 
        
        const total = Math.ceil(rsFilteredData.length / rsRowsPerPage);
        if(pInfo) pInfo.textContent = `หน้า ${rsCurrentPage} / ${total}`;
        if(bPrev) bPrev.disabled = (rsCurrentPage === 1); 
        if(bNext) bNext.disabled = (rsCurrentPage === total);
    }

    window.markResignCompleted = (id, sid) => { 
        Swal.fire({
            title: 'ยืนยันว่าดำเนินการเสร็จสิ้น',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            confirmButtonText: 'ยืนยันผล'
        }).then(async r => {
            if (r.isConfirmed) { 
                showLoading(); 
                try {
                    const res = await callApi("updateResignRequestStatus", { requestId: id, status: 'Completed', adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading();
                    
                    loadResignManagementData();
                } catch(err) {
                    hideLoading();
                    Swal.fire('Error', err.message, 'error');
                }
            }
        }); 
    };

    const rsSearchIn = document.getElementById('rsSearchInput');
    const rsStatusFil = document.getElementById('rsStatusFilter');
    const rsRowsPer = document.getElementById('rsRowsPerPage');
    const rsBtnP = document.getElementById('rsBtnPrev');
    const rsBtnN = document.getElementById('rsBtnNext');

    if(rsSearchIn) rsSearchIn.addEventListener('keyup', filterResignData); 
    if(rsStatusFil) rsStatusFil.addEventListener('change', filterResignData);
    if(rsRowsPer) {
        rsRowsPer.onchange = function() { 
            rsRowsPerPage = parseInt(this.value); rsCurrentPage = 1; renderResignTable(); 
        };
    }
    if(rsBtnP) {
        rsBtnP.onclick = function() { 
            if (rsCurrentPage > 1) { rsCurrentPage--; renderResignTable(); } 
        };
    }
    if(rsBtnN) {
        rsBtnN.onclick = function() { 
            if (rsCurrentPage < Math.ceil(rsFilteredData.length / rsRowsPerPage)) { rsCurrentPage++; renderResignTable(); } 
        };
    }
    
    window.exportResignCSV = () => { 
        const csv = "\uFEFFStudent ID,Name,Type,Resign Date,Details,Status,Submitted At\n" + rsFilteredData.map(e => `"${e.studentId}","${e.name}","${e.resignType}","${e.resignDate}","${e.newDetail}","${e.status}","${e.submittedAt}"`).join("\n"); 
        downloadCSV(csv, "resign_report.csv"); 
    };

    window.printResignList = () => {
        let html = '<html><head><title>รายงานลาออก</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:\'Sarabun\',sans-serif;}table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #000;padding:8px;font-size:12px;} th{background:#eee;} h2{text-align:center;}</style></head><body><h2>รายชื่อผู้แจ้งความประสงค์ลาออก</h2><table><tr><th>ลำดับ</th><th>รหัส</th><th>ชื่อ</th><th>ประเภท</th><th>สถานะ</th></tr>';
        rsFilteredData.forEach((x,i) => {
            html += '<tr><td style="text-align:center;">' + (i+1) + '</td><td style="text-align:center;">' + escapeHTML(x.studentId) + '</td><td>' + escapeHTML(x.name) + '</td><td>' + escapeHTML(x.resignType) + '</td><td style="text-align:center;">' + escapeHTML(x.status) + '</td></tr>';
        });
        html += '</table></body></html>';
        const pw = window.open('', '', 'width=800,height=600'); 
        if(pw) {
            pw.document.write(html); 
            pw.document.close(); 
            setTimeout(()=>pw.print(), 500);
        }
    };

    window.loadAdminMenuSettings = async () => { 
        showLoading(); 
        try {
            const s = await callApi("getSystemMenuSettings", { adminId: adminId, token: userToken });
            if(checkAuthError(s)) { hideLoading(); return; }
            hideLoading(); 
            
            ['userProfile','userActivity','userQueue','loan2569','userResign','userPetition','overLoan','userTransfer'].forEach(k => {
                if (document.getElementById('setting_menu_' + k)) document.getElementById('setting_menu_' + k).checked = (s['menu_' + k] === 'true');
            }); 
            ['type1','type2','type3','type4'].forEach(k => {
                if (document.getElementById('setting_pet_' + k + '_open')) document.getElementById('setting_pet_' + k + '_open').checked = (s['pet_' + k + '_open'] === 'true');
            }); 
        } catch(err) {
            hideLoading();
            console.error(err);
        }
    };

    window.saveAdminMenuSettings = async () => { 
        showLoading(); 
        const s = {}; 
        
        ['userProfile','userActivity','userQueue','loan2569','userResign','userPetition','overLoan','userTransfer'].forEach(k => {
            if (document.getElementById('setting_menu_' + k)) s['menu_' + k] = document.getElementById('setting_menu_' + k).checked.toString();
        }); 
        ['type1','type2','type3','type4'].forEach(k => {
            if (document.getElementById('setting_pet_' + k + '_open')) s['pet_' + k + '_open'] = document.getElementById('setting_pet_' + k + '_open').checked.toString();
        }); 
        
        try {
            const res = await callApi("saveSystemMenuSettings", { settings: s, adminId: adminId, token: userToken });
            if(checkAuthError(res)) { hideLoading(); return; }
            hideLoading();
            
            Swal.fire('ทำรายการสำเร็จ','อัปเดตเมนูเรียบร้อย','success');
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    let currentSpecialAccessStudent = null;

    window.searchForSpecialAccess = async () => { 
        showLoading(); 
        const saInput = document.getElementById('specialAccessSearchInput');
        if(!saInput) return;
        
        try {
            const r = await callApi("searchStudentForSpecialAccess", { studentId: saInput.value.trim(), adminId: adminId, token: userToken });
            if(checkAuthError(r)) { hideLoading(); return; }
            hideLoading(); 
            
            const resArea = document.getElementById('specialAccessResultArea');
            if (r.success) { 
                currentSpecialAccessStudent = r.student; 
                document.getElementById('sa_name').textContent = r.student.name; 
                document.getElementById('sa_id').textContent = r.student.studentId; 
                document.getElementById('sa_faculty').textContent = r.student.faculty || '-'; 
                if(resArea) resArea.style.display = 'flex'; 
            } else { 
                Swal.fire('ไม่พบ', '', 'error'); 
                if(resArea) resArea.style.display = 'none'; 
            } 
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    window.grantSpecialAccess = async () => { 
        if(!currentSpecialAccessStudent) return;
        showLoading(); 
        try {
            const res = await callApi("grantSpecialMenuAccess", { studentId: currentSpecialAccessStudent.studentId, adminId: adminId, token: userToken });
            if(checkAuthError(res)) { hideLoading(); return; }
            hideLoading(); 
            
            Swal.fire('ทำรายการสำเร็จ', '', 'success'); 
            loadSpecialAccessList(); 
            const resArea = document.getElementById('specialAccessResultArea');
            const saInput = document.getElementById('specialAccessSearchInput');
            if(resArea) resArea.style.display = 'none'; 
            if(saInput) saInput.value = ''; 
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    window.loadSpecialAccessList = async () => { 
        try {
            const l = await callApi("getSpecialAccessList", { adminId: adminId, token: userToken });
            if(checkAuthError(l)) return;

            const tb = document.querySelector('#specialAccessTable tbody'); 
            if(!tb) return;
            tb.innerHTML = ''; 
            
            const safeL = safeArray(l);
            if (safeL.length === 0) { 
                tb.innerHTML = '<tr><td colspan="5" style="text-align:center;">ไม่มีผู้ได้รับสิทธิ์</td></tr>'; 
                return;
            } 
            
            safeL.forEach((x, i) => { 
                tb.innerHTML += '<tr><td style="text-align:center;">' + (i + 1) + '</td><td style="font-weight:bold; color:var(--secondary-color);">' + escapeHTML(x.studentId) + '</td><td>' + escapeHTML(x.name) + '</td><td>' + escapeHTML(formatDate(x.timestamp)) + '</td><td style="text-align:center;"><button class="btn btn-danger btn-sm" style="border-radius:20px;" onclick="revokeSpecialAccess(\'' + escapeHTML(x.studentId) + '\')">ลบสิทธิ์</button></td></tr>'; 
            }); 
        } catch(err) {
            console.error(err);
        }
    };

    window.revokeSpecialAccess = (id) => { 
        Swal.fire({
            title: 'ยืนยันลบสิทธิ์',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบสิทธิ์'
        }).then(async r => {
            if (r.isConfirmed) { 
                showLoading(); 
                try {
                    const res = await callApi("revokeSpecialMenuAccess", { studentId: id, adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading(); 
                    
                    loadSpecialAccessList();
                } catch(err) {
                    hideLoading();
                    Swal.fire('Error', err.message, 'error');
                }
            } 
        });
    };

    let adminPetitionsCache = [];
    let petCurrentPage = 1;
    let petRowsPerPage = 20;
    let lastFilteredPetitions = [];

    window.loadAdminPetitions = async () => { 
        showLoading('กำลังโหลดคำร้อง'); 
        try {
            const r = await callApi("getAdminPetitions", { adminId: adminId, token: userToken });
            if(checkAuthError(r)) { hideLoading(); return; }
            hideLoading(); 
            
            if (r && r.success) { 
                adminPetitionsCache = safeArray(r); 
                updatePetitionStats(); 
                filterAdminPetitions(); 
            } else {
                Swal.fire('แจ้งเตือน', r ? r.message : 'ไม่พบข้อมูลคำร้อง', 'warning');
                const tb = document.querySelector('#adminPetitionTable tbody');
                if(tb) tb.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#d32f2f;">ไม่สามารถโหลดข้อมูลฐานข้อมูลคำร้องได้</td></tr>';
            } 
        } catch(err) {
            hideLoading();
            Swal.fire('ข้อผิดพลาดการเชื่อมต่อ', 'Error: ' + err.message, 'error');
            const tb = document.querySelector('#adminPetitionTable tbody');
            if(tb) tb.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#d32f2f;">การเชื่อมต่อฐานข้อมูลล้มเหลว</td></tr>';
        }
    };

    window.updatePetitionStats = () => { 
        const doneStatuses = ["อนุมัติดำเนินการเรียบร้อย", "ไม่อนุมัติ", "ยื่นคำร้องไม่สำเร็จ"]; 
        const newStatuses = ["รอดำเนินการ"]; 
        
        const tEl = document.getElementById('petStatTotal');
        const dEl = document.getElementById('petStatDone');
        const newEl = document.getElementById('petStatNew');
        const procEl = document.getElementById('petStatProcessing');
        
        let doneCount = 0;
        let newCount = 0;
        let procCount = 0;

        adminPetitionsCache.forEach(p => {
            const currentStatus = String(p['สถานะ'] || 'รอดำเนินการ').trim();
            if (doneStatuses.includes(currentStatus)) {
                doneCount++; 
            } else if (newStatuses.includes(currentStatus)) {
                newCount++; 
            } else {
                procCount++; 
            }
        });

        if(tEl) tEl.textContent = adminPetitionsCache.length; 
        if(dEl) dEl.textContent = doneCount; 
        if(newEl) newEl.textContent = newCount; 
        if(procEl) procEl.textContent = procCount; 
    };

    window.resetPetPage = () => { 
        petCurrentPage = 1; 
        const rowEl = document.getElementById('petRowsPerPage');
        if(rowEl) petRowsPerPage = parseInt(rowEl.value) || 20; 
        filterAdminPetitions(); 
    };

    window.changePetPage = (s) => { 
        petCurrentPage += s; 
        filterAdminPetitions(); 
    };

    window.filterAdminPetitions = () => {
        const searchEl = document.getElementById('petSearchInput');
        const typeEl = document.getElementById('filterPetType');
        const statEl = document.getElementById('filterPetStatus');
        
        const searchQ = searchEl ? searchEl.value.toLowerCase().trim() : '';
        const typeF = typeEl ? typeEl.value : 'all';
        const statusF = statEl ? statEl.value : 'all';
        
        lastFilteredPetitions = adminPetitionsCache.filter(p => {
            const petType = p['ประเภทคำร้อง'] || '';
            const petStatus = p['สถานะ'] || 'รอดำเนินการ';
            const stdId = String(p['รหัสนักศึกษา'] || '').toLowerCase();
            const stdName = String(p['ชื่อ-สกุล'] || '').toLowerCase();

            const matchSearch = searchQ === '' || stdId.includes(searchQ) || stdName.includes(searchQ);
            const matchType = typeF === 'all' || petType === typeF;
            const matchStatus = statusF === 'all' || petStatus === statusF;

            return matchSearch && matchType && matchStatus;
        });
        
        const tb = document.querySelector('#adminPetitionTable tbody'); 
        if(!tb) return;
        tb.innerHTML = '';
        
        const infoEl = document.getElementById('petPaginationInfo');
        const bPrev = document.getElementById('btnPetPrev');
        const bNext = document.getElementById('btnPetNext');
        
        if (lastFilteredPetitions.length === 0) { 
            tb.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 60px; color: #94a3b8;"><i class="material-icons" style="font-size: 48px; opacity: 0.3; display: block; margin-bottom: 10px;">search_off</i><span style="font-size: 16px;">ไม่พบคำร้องตามเงื่อนไขที่ค้นหา</span></td></tr>'; 
            if(infoEl) infoEl.textContent = 'หน้า 0 / 0'; 
            return; 
        }
        
        const start = (petCurrentPage - 1) * petRowsPerPage;
        lastFilteredPetitions.slice(start, start + petRowsPerPage).forEach(p => { 
            const status = p['สถานะ'] || 'รอดำเนินการ';
            
            let badgeBg = '#f1f5f9', badgeCol = '#475569';
            if (['รอดำเนินการ', 'รับคำร้อง'].includes(status)) { badgeBg = '#eff6ff'; badgeCol = '#2563eb'; }
            else if (['อยู่ระหว่างตรวจสอบ', 'ตรวจสอบเเล้วอยู่ระหว่างพิจารณา'].includes(status)) { badgeBg = '#fffbeb'; badgeCol = '#d97706'; }
            else if (status === 'อนุมัติดำเนินการเรียบร้อย') { badgeBg = '#ecfdf5'; badgeCol = '#059669'; }
            else if (['ไม่อนุมัติ', 'ยื่นคำร้องไม่สำเร็จ'].includes(status)) { badgeBg = '#fef2f2'; badgeCol = '#dc2626'; }

            const badgeHtml = `<span style="background: ${badgeBg}; color: ${badgeCol}; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; white-space: nowrap; display: inline-block;">${escapeHTML(status)}</span>`;

            const dateStr = p['วันที่ยื่นคำร้อง'] ? formatDate(p['วันที่ยื่นคำร้อง']) : '-';
            const timeStr = p['วันที่ยื่นคำร้อง'] ? new Date(p['วันที่ยื่นคำร้อง']).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '';

            // เพิ่มปุ่มพิมพ์คู่กับปุ่มจัดการ
            tb.innerHTML += `<tr style="transition: all 0.2s; border-bottom: 1px solid #f1f5f9;">
                <td style="text-align: center; padding: 18px 10px;">
                    <input type="checkbox" class="pet-checkbox" value="${escapeHTML(String(p._rowIndex))}" onclick="updateSelectedPetCount()" style="transform: scale(1.3); cursor: pointer; accent-color: #3b82f6;">
                </td>
                <td>
                    <div style="font-weight: 600; color: #334155; font-size: 15px;">${escapeHTML(dateStr)}</div>
                    <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;"><i class="material-icons" style="font-size: 14px; vertical-align: middle;">schedule</i> ${escapeHTML(timeStr)} น.</div>
                </td>
                <td><b style="color: #1e293b; font-size: 16px;">${escapeHTML(p['รหัสนักศึกษา'] || '-')}</b></td>
                <td style="color: #1e293b; font-size: 16px; font-weight: 500;">${escapeHTML(p['ชื่อ-สกุล'] || '-')}</td>
                <td><div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #475569; font-size: 15px;" title="${escapeHTML(p['ประเภทคำร้อง'])}">${escapeHTML(p['ประเภทคำร้อง'] || '-')}</div></td>
                <td>${badgeHtml}</td>
                <td style="text-align:center;">
                    <div style="display: inline-flex; gap: 6px; justify-content: center;">
                        <button class="btn btn-sm" style="background: #e0f2fe; color: #0284c7; border-radius: 8px; padding: 6px 12px; font-size: 14px; font-weight: bold; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #bae6fd;" onclick="openPetModal(${escapeHTML(String(p._rowIndex))})" title="จัดการ">
                            <i class="material-icons" style="font-size: 16px;">edit</i>
                        </button>
                        <button class="btn btn-sm" style="background: #f1f5f9; color: #475569; border-radius: 8px; padding: 6px 12px; font-size: 14px; font-weight: bold; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #e2e8f0;" onclick="printPetitionForm(${escapeHTML(String(p._rowIndex))})" title="พิมพ์ใบคำร้อง">
                            <i class="material-icons" style="font-size: 16px;">print</i>
                        </button>
                    </div>
                </td>
            </tr>`; 
        });
        
        const total = Math.ceil(lastFilteredPetitions.length / petRowsPerPage);
        if(infoEl) infoEl.textContent = `หน้า ${petCurrentPage} / ${total} (ทั้งหมด ${lastFilteredPetitions.length} รายการ)`;
        if(bPrev) bPrev.disabled = (petCurrentPage === 1); 
        if(bNext) bNext.disabled = (petCurrentPage === total || total === 0);

        const selectAllCb = document.getElementById('selectAllPetitions');
        if(selectAllCb) selectAllCb.checked = false;
        updateSelectedPetCount(); 
    };



    window.toggleAllPetitions = (source) => {
        const checkboxes = document.querySelectorAll('.pet-checkbox');
        checkboxes.forEach(cb => cb.checked = source.checked);
        updateSelectedPetCount();
    };

    window.updateSelectedPetCount = () => {
        const count = document.querySelectorAll('.pet-checkbox:checked').length;
        const countLabel = document.getElementById('selectedPetCount');
        if(countLabel) countLabel.innerText = count;
        
        // เช็คว่าเลือกครบทุกอันในหน้าไหม เพื่อติ๊กถูกที่หัวตารางอัตโนมัติ
        const totalCheckboxes = document.querySelectorAll('.pet-checkbox').length;
        const selectAllCb = document.getElementById('selectAllPetitions');
        if(selectAllCb && totalCheckboxes > 0) {
            selectAllCb.checked = (count === totalCheckboxes);
        }
    };

    window.openBulkPetitionModal = () => {
        const selected = document.querySelectorAll('.pet-checkbox:checked');
        if(selected.length === 0) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกคำร้องที่ต้องการอัปเดตอย่างน้อย 1 รายการ', 'warning');

        document.getElementById('bulkPetStatus').value = 'รับคำร้อง';
        document.getElementById('bulkPetNote').value = '';
        document.getElementById('bulkPetCount').innerText = selected.length;
        document.getElementById('bulkPetitionUpdateModal').style.display = 'block';
    };

   window.submitBulkPetitionUpdate = async () => {
    const selected = Array.from(document.querySelectorAll('.pet-checkbox:checked')).map(cb => cb.value);
    const status = document.getElementById('bulkPetStatus').value;
    const note = document.getElementById('bulkPetNote').value.trim();

    if(selected.length === 0) return;

    Swal.fire({
        title: 'ยืนยันการทำรายการ',
        text: `ระบบจะเปลี่ยนสถานะคำร้องทั้ง ${selected.length} รายการเป็น "${status}" ยืนยันหรือไม่`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dd6b20'
    }).then(async r => {
        if(r.isConfirmed) {
            showLoading('กำลังปรังปรุงข้อมูล อาจใช้เวลาสักครู่'); 
            try {
                const res = await callApi("bulkUpdatePetitionStatus", { rows: selected, status: status, note: note, adminId: adminId, token: userToken });
                
                if(res.success) {
                    if (status === 'อนุมัติดำเนินการเรียบร้อย') {
                        const approvedPetitions = adminPetitionsCache.filter(p => selected.includes(String(p._rowIndex)));
                        const needSpecialAccess = approvedPetitions.filter(p => 
                            p['ประเภทคำร้อง'] === 'ขอลงทะเบียนปรับปรุงข้อมูลประวัติ (ไม่อยู่ในช่วงระยะเวลาที่กำหนด)'
                        );

                        if (needSpecialAccess.length > 0) {
                            for (const pet of needSpecialAccess) {
                                const studentId = pet['รหัสนักศึกษา'];
                                if (studentId) {
                                    await callApi("grantSpecialMenuAccess", { 
                                        studentId: studentId, 
                                        adminId: adminId, 
                                        token: userToken 
                                    });
                                }
                            }
                        }
                    }

                    hideLoading();
                    Swal.fire('สำเร็จ', 'อัปเดตสถานะคำร้อง และจัดการสิทธิ์เรียบร้อยแล้ว', 'success');
                    document.getElementById('bulkPetitionUpdateModal').style.display = 'none';
                    if(document.getElementById('selectAllPetitions')) document.getElementById('selectAllPetitions').checked = false;
                    updateSelectedPetCount();
                    if(typeof loadAdminPetitions === 'function') loadAdminPetitions(); 
                } else {
                    hideLoading();
                    Swal.fire('Error', res.message, 'error');
                }
            } catch(e) { 
                hideLoading(); 
                Swal.fire('Error', e.message, 'error'); 
            }
        }
    });
};

    window.openPetModal = async (rowIndex) => { 
    const p = adminPetitionsCache.find(x => x._rowIndex == rowIndex);
    if(!p) return;
    
    document.getElementById('modalPetRowIndex').value = p._rowIndex; 
    document.getElementById('modalPetStudentName').textContent = p['ชื่อ-สกุล'] || '-'; 
    document.getElementById('modalPetStudentId').textContent = p['รหัสนักศึกษา'] || '-'; 
    document.getElementById('modalPetType').textContent = p['ประเภทคำร้อง'] || '-'; 
    document.getElementById('modalPetReason').textContent = p['เหตุผลประกอบ'] || '-'; 
    document.getElementById('modalPetStatus').value = p['สถานะ'] || 'รับคำร้อง'; 
    document.getElementById('modalPetNote').value = p['หมายเหตุเจ้าหน้าที่'] || ''; 
    
    togglePetitionNoteRequirement(); 
    
    const mod = document.getElementById('petitionUpdateModal');
    if(mod) mod.style.display = 'flex'; 

    if (p['ประเภทคำร้อง'] && p['ประเภทคำร้อง'].includes('ขอลงทะเบียนเพิ่มชื่อ')) {
        const stdId = p['รหัสนักศึกษา'];
        const statusEl = document.getElementById('modalPetType');
        statusEl.innerHTML = p['ประเภทคำร้อง'] + ' <br><span style="color:#dd6b20; font-size:12px;"><i class="material-icons" style="font-size:12px; vertical-align:middle;">autorenew</i> ระบบกำลังตรวจสอบรายชื่อ</span>';
        
        try {
            const res = await callApi("adminGetLoanInfo", { studentId: stdId, adminId: adminId, token: userToken });
            
            if (res.status === 'found') {
                statusEl.innerHTML = p['ประเภทคำร้อง'] + '<br><span style="color:#fff; background:#e53e3e; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; margin-top:5px;">⚠️ นักศึกษามีชื่อในระบบแล้ว กดปุ่ม "บันทึก" ด้านล่างเพื่อปฏิเสธได้เลย</span>';
                
                document.getElementById('modalPetStatus').value = 'ไม่อนุมัติ';
                document.getElementById('modalPetNote').value = 'ตรวจสอบพบรายชื่อผู้มีสิทธิ์ในระบบเรียบร้อยแล้ว ไม่จำเป็นต้องยื่นคำร้องขอเพิ่มชื่ออีก';
                togglePetitionNoteRequirement();
            } else {
                statusEl.innerHTML = p['ประเภทคำร้อง'] + '<br><span style="color:#fff; background:#2e7d32; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; margin-top:5px;">✅ ตรวจสอบไม่พบชื่อในระบบ สามารถพิจารณาอนุมัติเพิ่มชื่อได้</span>';
            }
        } catch (err) {
            console.error(err);
        }
    }
};

    window.togglePetitionNoteRequirement = () => { 
        const statEl = document.getElementById('modalPetStatus');
        const noteEl = document.getElementById('modalPetNote');
        const astEl = document.getElementById('noteRequiredAsterisk');
        if(!statEl || !noteEl || !astEl) return;
        
        const s = statEl.value; 
        
        noteEl.required = (s === 'ไม่อนุมัติ' || s === 'ยื่นคำร้องไม่สำเร็จ'); 
        astEl.style.display = noteEl.required ? 'inline-block' : 'none'; 
        
        if(s === 'อนุมัติดำเนินการเรียบร้อย') {
            statEl.style.borderColor = '#38a169'; statEl.style.color = '#2f855a';
        }
        else if(s === 'ไม่อนุมัติ' || s === 'ยื่นคำร้องไม่สำเร็จ') {
            statEl.style.borderColor = '#e53e3e'; statEl.style.color = '#c53030';
        }
        else if(s === 'รับคำร้อง') {
            statEl.style.borderColor = '#3182ce'; statEl.style.color = '#2b6cb0';
        }
        else {
            statEl.style.borderColor = '#dd6b20'; statEl.style.color = '#c05621';
        }
    };

const petitionUpdateFormEl = document.getElementById('petitionUpdateForm');
    if(petitionUpdateFormEl) {
        petitionUpdateFormEl.onsubmit = async (e) => { 
            e.preventDefault(); 
            
            const rowIndex = document.getElementById('modalPetRowIndex').value;
            const status = document.getElementById('modalPetStatus').value;
            const note = document.getElementById('modalPetNote').value;
            
            const stdName = document.getElementById('modalPetStudentName').textContent;
            const stdId = document.getElementById('modalPetStudentId').textContent;
            const petType = document.getElementById('modalPetType').textContent;
            
            Swal.fire({
                title: 'ยืนยันการบันทึกสถานะ',
                text: "ต้องการส่งอีเมลแจ้งผลการพิจารณาไปยังนักศึกษาด้วยหรือไม่?",
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: '<i class="material-icons" style="vertical-align: middle; font-size:18px;">send</i> บันทึก & ส่งอีเมล',
                denyButtonText: 'บันทึกอย่างเดียว',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#28a745', 
                denyButtonColor: '#1976D2'     
            }).then(async (result) => {
                if (result.isConfirmed || result.isDenied) {
                    const isSendEmail = result.isConfirmed; 
                    showLoading(isSendEmail ? 'กำลังบันทึกและส่งอีเมลแจ้งเตือน' : 'กำลังบันทึกสถานะ'); 
                    
                    const extraData = JSON.stringify({ 
                        sendEmail: isSendEmail, 
                        stdId: stdId, 
                        stdName: stdName, 
                        petType: petType 
                    });
                    const hiddenNote = note + "||EXTRA||" + extraData;
                    
                    try {
                        const r = await callApi("updatePetitionStatus", {
                            rowIndex: rowIndex, 
                            status: status, 
                            note: hiddenNote, // ส่งแบบซ่อนข้อมูล
                            adminId: adminId, 
                            token: userToken
                        });
                        
                        if(r && r.success) {
                            if (status === 'อนุมัติดำเนินการเรียบร้อย') {
                                const p = adminPetitionsCache.find(x => String(x._rowIndex) === String(rowIndex));
                                if (p && p['ประเภทคำร้อง'] === 'ขอลงทะเบียนปรับปรุงข้อมูลประวัติ (ไม่อยู่ในช่วงระยะเวลาที่กำหนด)') {
                                    const studentId = p['รหัสนักศึกษา'];
                                    if (studentId) {
                                        await callApi("grantSpecialMenuAccess", { studentId: studentId, adminId: adminId, token: userToken });
                                    }
                                }
                            }
                            hideLoading(); 
                            Swal.fire({ icon: 'success', title: 'บันทึกสถานะสำเร็จ', showConfirmButton: false, timer: 1500 });
                            const mod = document.getElementById('petitionUpdateModal');
                            if(mod) mod.style.display = 'none'; 
                            loadAdminPetitions();
                        } else {
                            hideLoading();
                            Swal.fire('ผิดพลาด', r ? r.message : 'ไม่สามารถบันทึกได้', 'error');
                        }
                    } catch(err) {
                        hideLoading();
                        Swal.fire('ข้อผิดพลาด', err.message, 'error');
                    }
                }
            });
        };
    }

    window.downloadFilteredPetitions = () => {
    if (lastFilteredPetitions.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลคำร้องให้ดาวน์โหลด', 'warning');
        return;
    }
    
    const csv = "\uFEFFวันที่ยื่นคำร้อง,รหัสนักศึกษา,ชื่อ-สกุล,อีเมล,ประเภทคำร้อง,เหตุผลประกอบ,สถานะ,หมายเหตุเจ้าหน้าที่\n" + 
    lastFilteredPetitions.map(p => 
        `"${p['วันที่ยื่นคำร้อง'] || ''}","${p['รหัสนักศึกษา'] || ''}","${p['ชื่อ-สกุล'] || ''}","${p['อีเมล'] || ''}","${p['ประเภทคำร้อง'] || ''}","${(p['เหตุผลประกอบ'] || '').replace(/\n/g,' ')}","${p['สถานะ'] || 'รอดำเนินการ'}","${(p['หมายเหตุเจ้าหน้าที่'] || '').replace(/\n/g,' ')}"`
    ).join("\n");
    
    downloadCSV(csv, "petitions.csv");
};
  let loanAllData = [];
    let loanFilteredData = [];
    let loanCurrentPage = 1;
    let loanRowsPerPage = 10;

    window.loadLoanAdminTable = async () => { 
        const tb = document.querySelector('#loanAdminTable tbody');
        if(tb) tb.innerHTML = '<tr><td colspan="7" style="text-align:center;">กำลังโหลดข้อมูล</td></tr>'; 
        try {
            const d = await callApi("getLoanProfilesSummary2569", { adminId: adminId, token: userToken });
            if(checkAuthError(d)) return;

            loanAllData = safeArray(d); 
            filterLoanTable(); 
        } catch(err) {
            console.error(err);
        }
    };

    window.filterLoanTable = () => { 
        const qInput = document.getElementById('loanSearchInput');
        const stInput = document.getElementById('loanStatusFilter');
        if(!qInput || !stInput) return;
        const q = qInput.value.toLowerCase().trim();
        const st = stInput.value;
        loanFilteredData = loanAllData.filter(x => (String(x.studentId).toLowerCase().includes(q) || String(x.name).toLowerCase().includes(q)) && (st === 'all' || x.status === st));
        resetLoanPagination(); 
    };

    window.resetLoanPagination = () => { 
        const rpp = document.getElementById('loanRowsPerPage');
        if(rpp) loanRowsPerPage = parseInt(rpp.value); 
        loanCurrentPage = 1; 
        renderLoanTable(); 
    };

    window.changeLoanPage = (s) => { 
        loanCurrentPage += s; 
        renderLoanTable(); 
    };

    function renderLoanTable() {
        const tb = document.querySelector('#loanAdminTable tbody'); 
        if(!tb) return;
        tb.innerHTML = '';
        
        const infoEl = document.getElementById('loanPageInfo');
        const btnP = document.getElementById('btnLoanPrev');
        const btnN = document.getElementById('btnLoanNext');
        
        if (loanFilteredData.length === 0) { 
            tb.innerHTML = '<tr><td colspan="7" style="text-align:center;">ไม่พบข้อมูล</td></tr>'; 
            if(infoEl) infoEl.textContent = 'หน้า 0 / 0'; 
            return; 
        }
        
        const start = (loanCurrentPage - 1) * loanRowsPerPage; 
        const pageData = loanFilteredData.slice(start, start + loanRowsPerPage);
        
        pageData.forEach((x, i) => { 
            tb.innerHTML += '<tr><td style="text-align:center;">' + (start + i + 1) + '</td><td>' + escapeHTML(x.studentId) + '</td><td>' + escapeHTML(x.name) + '</td><td>' + escapeHTML(x.faculty) + '</td><td style="text-align:center;">' + escapeHTML(String(x.gpa)) + '</td><td style="text-align:center;">' + escapeHTML(String(x.credits)) + '</td><td style="text-align:center;">' + (x.status === 'Submitted' ? '<span style="color:green;font-weight:bold;">ยื่นแล้ว</span>' : '<span style="color:red;">ยังไม่ยื่น</span>') + '</td></tr>'; 
        });
        
        const total = Math.ceil(loanFilteredData.length / loanRowsPerPage);
        if(infoEl) infoEl.textContent = `หน้า ${loanCurrentPage} / ${total} (ทั้งหมด ${loanFilteredData.length} รายการ)`;
        if(btnP) btnP.disabled = (loanCurrentPage === 1);
        if(btnN) btnN.disabled = (loanCurrentPage === total);
    }

function resetAdminVerifyForm() {
    const step1 = document.getElementById('adminVerifyStep1');
    if (step1) step1.style.display = 'block';
    
    const checkIdInput = document.getElementById('adminCheckStudentId');
    if (checkIdInput) {
        checkIdInput.readOnly = false;
        checkIdInput.value = '';
    }
    
    const step2 = document.getElementById('adminVerifyStep2');
    if (step2) step2.style.display = 'none';
    
    const idCardInput = document.getElementById('adminVerifyIdCardInput');
    if (idCardInput) idCardInput.value = '';
}

document.addEventListener("DOMContentLoaded", () => {
    
    const btnAdminCheckVerify = document.getElementById('btnAdminCheckVerify');
    if (btnAdminCheckVerify) {
        btnAdminCheckVerify.onclick = async () => {
            const studentId = document.getElementById('adminCheckStudentId').value.trim();
            if (!studentId || studentId.length !== 11) {
                Swal.fire('แจ้งเตือน', 'กรุณากรอกรหัสนักศึกษาให้ครบ 11 หลัก', 'warning');
                return;
            }

            showLoading('กำลังตรวจสอบรายการจากฐานข้อมูล');
            try {
                const res = await callApi("checkStudentForVerification", { 
                    studentId: studentId, 
                    adminId: adminId, 
                    token: userToken 
                });
                
                if (checkAuthError(res)) { hideLoading(); return; }
                hideLoading();

                if (res.success) {
                    const adminNameDisplay = document.getElementById('verifyPageAdminName');
                    if (adminNameDisplay && currentUser) {
                        adminNameDisplay.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
                    }

                    document.getElementById('adm_ver_studentId').textContent = res.data.studentId || '-';
                    document.getElementById('adm_ver_idCard').textContent = res.data.idCard || '-';
                    document.getElementById('adm_ver_name').textContent = res.data.name || '-';
                    document.getElementById('adm_ver_faculty').textContent = res.data.faculty || 'ไม่ระบุคณะ';
                    document.getElementById('adm_ver_phone').textContent = res.data.phone || 'ไม่พบข้อมูลเบอร์โทร';
                    document.getElementById('adm_ver_email').textContent = res.data.email || 'ไม่พบข้อมูลอีเมล';

                    const profileImgEl = document.getElementById('adm_ver_profileImg');
                    if (profileImgEl) {
                        let imageUrl = 'https://placehold.co/300x400?text=NO+IMAGE';
                        if (res.data.profileImage && res.data.profileImage !== 'undefined') {
                            let imageId = res.data.profileImage;
                            if (imageId.includes('id=')) imageId = imageId.split('id=')[1].split('&')[0];
                            else if (imageId.includes('/d/')) imageId = imageId.split('/d/')[1].split('/')[0];
                            imageUrl = `https://drive.google.com/thumbnail?id=${imageId}&sz=w400`;
                        }
                        profileImgEl.src = imageUrl;
                    }

                    const btnHistory = document.getElementById('btnAdminVerImageHistory');
                    if (btnHistory) {
                        btnHistory.onclick = () => { 
                            if (typeof viewImageHistory === 'function') viewImageHistory(res.data.studentId); 
                            else Swal.fire('แจ้งเตือน', 'ไม่พบฟังก์ชันเรียกดูประวัติรูปภาพ', 'warning');
                        };
                    }

                    const failedCount = parseInt(res.data.failedAttempts) || 0;
                    const failedEl = document.getElementById('adm_ver_failedAttempts');
                    failedEl.textContent = `${failedCount} ครั้ง`;
                    failedEl.style.color = failedCount >= 3 ? '#d32f2f' : '#64748b'; 
                    document.getElementById('adm_ver_lastLogin').textContent = res.data.lastLogin || '-';

                    const statusEl = document.getElementById('adm_ver_accountStatus');
                    const reasonContainer = document.getElementById('adm_ver_suspendReasonContainer');
                    const reasonEl = document.getElementById('adm_ver_suspendReason');
                    const btnUnlock = document.getElementById('btnAdminUnlockAccount');
                    const btnSuspend = document.getElementById('btnAdminSuspendAccount');

                    if (res.data.status === 'Suspended') {
                        statusEl.innerHTML = '<span style="color:#e53e3e;"><i class="material-icons" style="font-size:16px; vertical-align:text-bottom;">block</i> ถูกระงับการใช้งาน</span>';
                        reasonContainer.style.display = 'block';
                        reasonEl.textContent = res.data.suspendReason || 'ไม่มีระบุสาเหตุ';
                        btnUnlock.style.display = 'block';
                        btnSuspend.style.display = 'none';
                    } else {
                        statusEl.innerHTML = '<span style="color:#10b981;"><i class="material-icons" style="font-size:16px; vertical-align:text-bottom;">check_circle</i> ใช้งานปกติ (Active)</span>';
                        reasonContainer.style.display = 'none';
                        btnUnlock.style.display = 'none';
                        btnSuspend.style.display = 'block';
                    }

                    if (btnSuspend) {
                        btnSuspend.onclick = () => {
                            const currentStudentId = res.data.studentId;
                            Swal.fire({
                                title: 'ระบุสาเหตุการระงับบัญชี',
                                html: `
                                    <input id="swal-suspend-reason2" class="swal2-input" placeholder="ระบุสาเหตุการระงับ" style="width: 85%;">
                                    <div style="margin-top: 15px; text-align: left; padding: 0 25px;">
                                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #d32f2f; font-weight: bold; font-size: 14px;">
                                            <input type="checkbox" id="swal-require-survey2" style="width: 18px; height: 18px;" checked>
                                            บังคับให้ทำแบบประเมินความเสี่ยง ก่อนปลดล็อก
                                        </label>
                                    </div>
                                `,
                                showCancelButton: true, confirmButtonText: 'ยืนยันการระงับ', confirmButtonColor: '#d33',
                                preConfirm: () => {
                                    const reason = document.getElementById('swal-suspend-reason2').value.trim();
                                    const reqSurvey = document.getElementById('swal-require-survey2').checked;
                                    if (!reason) { Swal.showValidationMessage('กรุณาระบุสาเหตุ'); return false; }
                                    return reqSurvey ? '[REQ_SURVEY]' + reason : reason;
                                }
                            }).then(async r => { 
                                if (r.isConfirmed) {
                                    showLoading('กำลังตรวจสอบและระงับบัญชี');
                                    try {
                                        // 1. ค้นหา Document ID ภายในระบบก่อน
                                        const searchRes = await callApi("searchUsersBackend", { query: currentStudentId, adminId: adminId, token: userToken });
                                        if (checkAuthError(searchRes)) { hideLoading(); return; }
                                        
                                        const targetUser = Array.isArray(searchRes) ? searchRes.find(u => String(u.studentId).trim() === currentStudentId) : null;
                                        
                                        if (!targetUser || !targetUser.id) {
                                            hideLoading();
                                            Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลอ้างอิงบัญชีในระบบ', 'error');
                                            return;
                                        }

                                        // 2. เรียก API updateUser เพื่อระงับบัญชี
                                        const resUpd = await callApi("updateUser", { 
                                            userId: targetUser.id,           // ใช้ ID ภายในระบบ
                                            status: 'Suspended',             // ปรับสถานะเป็นระงับ
                                            suspendReason: r.value,          // ใส่สาเหตุ
                                            adminId: adminId, 
                                            token: userToken 
                                        });

                                        hideLoading();
                                        if (resUpd.success) {
                                            Swal.fire('สำเร็จ', 'ระงับบัญชีเรียบร้อยแล้ว', 'success');
                                            // กดปุ่มตรวจสอบข้อมูลใหม่เพื่อรีเฟรชหน้าจออัตโนมัติ
                                            document.getElementById('btnAdminCheckVerify').click();
                                        } else {
                                            Swal.fire('ผิดพลาด', resUpd.message || 'ไม่สามารถระงับบัญชีได้', 'error');
                                        }
                                    } catch (err) {
                                        hideLoading();
                                        Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
                                    }
                                }
                            });
                        };
                    }

                    const profileStatusEl = document.getElementById('adm_ver_profileStatus');
                    const updatedAtEl = document.getElementById('adm_ver_updatedAt');
                    if (res.data.hasProfile) {
                        profileStatusEl.innerHTML = '<span style="color:#10b981;">บันทึกประวัติแล้ว</span>';
                        updatedAtEl.textContent = formatDate(res.data.updatedAt);
                    } else {
                        profileStatusEl.innerHTML = '<span style="color:#f59e0b;">ยังไม่บันทึกประวัติ</span>';
                        updatedAtEl.textContent = '-';
                    }

                    const msgVerified = document.getElementById('admAlreadyVerifiedMessage');
                    const formVerify = document.getElementById('adminVerifyIdentityForm');
                    
                    if (res.isVerified) {
                        msgVerified.style.display = 'block';
                        formVerify.style.display = 'none';
                    } else {
                        msgVerified.style.display = 'none';
                        formVerify.style.display = 'block';
                        document.getElementById('adminVerifyIdCardInput').value = '';
                    }

                    document.getElementById('adminVerifyStep1').style.display = 'none';
                    document.getElementById('adminVerifyStep2').style.display = 'block';
                    
                    const btnGoToManageUser = document.getElementById('btnGoToManageUser');
                    if (btnGoToManageUser) {
                        btnGoToManageUser.onclick = () => {
                            showPage('manageUsersSection');
                            document.getElementById('userSearchInput').value = res.data.studentId;
                            document.getElementById('btnSearchUsers').click();
                        };
                    }

                } else {
                    Swal.fire('ไม่พบข้อมูล', res.message, 'error');
                }
            } catch (err) {
                hideLoading();
                Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
            }
        };
    }

    const btnUnlockAcc = document.getElementById('btnAdminUnlockAccount');
    if (btnUnlockAcc) {
        btnUnlockAcc.onclick = async () => {
            const studentId = document.getElementById('adminCheckStudentId').value.trim();
            const suspendReasonEl = document.getElementById('adm_ver_suspendReason');
            const currentReason = suspendReasonEl ? suspendReasonEl.textContent : '';

            if (currentReason.includes('[REQ_SURVEY]')) {
                if (typeof window.showUnlockSurveyModal === 'function') {
                    window.showUnlockSurveyModal(null, studentId, true);
                }
            } else {
                Swal.fire({
                    title: 'ยืนยันการปลดล็อกบัญชี',
                    text: `ต้องการปลดล็อกบัญชีของรหัส ${studentId} เพื่อให้เข้าใช้งานได้ปกติ ใช่หรือไม่`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#28a745', 
                    confirmButtonText: 'ใช่ ปลดล็อกเลย'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        showLoading('กำลังดำเนินการปลดล็อก');
                        try {
                            const res = await callApi("adminUnlockAccount", { studentId: studentId, adminId: currentUser.studentId, token: userToken });
                            hideLoading();
                            if (res.success) {
                                Swal.fire('ปลดล็อกสำเร็จ', res.message, 'success').then(() => document.getElementById('btnAdminCheckVerify').click());
                            } else {
                                showAlert(res.message, 'error');
                            }
                        } catch (err) { hideLoading(); showAlert(err.message, 'error'); }
                    }
                });
            }
        };
    }

    const btnForceReset = document.getElementById('btnAdminForceReset');
    if (btnForceReset) {
        btnForceReset.onclick = async () => {
            const studentId = document.getElementById('adminCheckStudentId').value.trim();
            Swal.fire({
                title: 'ยืนยันการรีเซ็ตความปลอดภัย',
                text: `ต้องการยกเลิกเซสชันเดิมและล้างสถานะการรีเซ็ตรหัสของ ${studentId} ใช่หรือไม่ โดยระบบจะไม่ตั้งรหัสผ่านเป็นเลขบัตรประชาชน`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ยืนยันการรีเซ็ตความปลอดภัย',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#f57c00'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    showLoading('ระบบกำลังรีเซ็ตสถานะความปลอดภัย');
                    try {
                        const res = await callApi("adminForceResetPassword", { 
                            studentId: studentId,
                            adminId: currentUser.studentId,
                            token: userToken
                        });
                        hideLoading();
                        
                        if (res.success) {
                            Swal.fire('รีเซ็ตความปลอดภัยสำเร็จ', res.message, 'success').then(() => {
                                resetAdminVerifyForm();
                            });
                        } else {
                            showAlert(res.message, 'error');
                        }
                    } catch (err) {
                        hideLoading();
                        showAlert(err.message, 'error');
                    }
                }
            });
        };
    }

    // 5. ส่งฟอร์มยืนยันตัวตน (Submit Identity Verification)
    const verifyForm = document.getElementById('adminVerifyIdentityForm');
    if (verifyForm) {
        verifyForm.onsubmit = async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('adminCheckStudentId').value.trim();
            const idCard = document.getElementById('adminVerifyIdCardInput').value.trim();
            
            if (!/^[0-9]{13}$/.test(idCard)) {
                return showAlert('กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง', 'warning');
            }
            
            Swal.fire({
                title: 'ยืนยันการดำเนินการ',
                text: `ต้องการบันทึกยืนยันตัวตนและรีเซ็ตรหัสผ่านให้นักศึกษารหัส ${studentId} ใช่หรือไม่`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ใช่ ดำเนินการ',
                cancelButtonText: 'ยกเลิก'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    showLoading('ระบบกำลังบันทึกและรีเซ็ตรหัสผ่าน');
                    try {
                        const res = await callApi("submitIdentityVerification", { 
                            studentId: studentId, 
                            idCard: idCard,
                            adminId: currentUser.studentId,
                            token: userToken
                        });
                        hideLoading();
                        
                        if (res.success) {
                            Swal.fire('ทำรายการสำเร็จ', res.message, 'success').then(() => {
                                resetAdminVerifyForm();
                            });
                        } else {
                            showAlert(res.message, 'error');
                        }
                    } catch (err) {
                        hideLoading();
                        showAlert(err.message, 'error');
                    }
                }
            });
        };
    }
});

    let currentSpecialLoanStudent = null;

    window.searchForSpecialLoan = async () => { 
        showLoading(); 
        const slInput = document.getElementById('specialLoanSearchInput');
        if(!slInput) return;
        
        try {
            const r = await callApi("searchStudentForSpecialAccess", { studentId: slInput.value.trim(), adminId: adminId, token: userToken });
            if(checkAuthError(r)) { hideLoading(); return; }
            hideLoading(); 
            
            const resArea = document.getElementById('specialLoanResultArea');
            if (r.success) { 
                currentSpecialLoanStudent = r.student; 
                document.getElementById('slo_name').textContent = r.student.name; 
                document.getElementById('slo_id').textContent = r.student.studentId; 
                document.getElementById('slo_faculty').textContent = r.student.faculty || '-'; 
                if(resArea) resArea.style.display = 'flex'; 
            } else { 
                Swal.fire('ไม่พบ', 'ไม่พบข้อมูลนักศึกษานี้ในระบบ', 'error'); 
                if(resArea) resArea.style.display = 'none'; 
            } 
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    window.grantSpecialLoanAccess = async () => { 
        if(!currentSpecialLoanStudent) return;
        
        const loanType = document.getElementById('slo_loanType').value; 
        
        showLoading(); 
        try {
            const res = await callApi("grantSpecialLoanAccess", { 
                studentId: currentSpecialLoanStudent.studentId, 
                loanType: loanType, 
                adminId: adminId, 
                token: userToken 
            });
            if(checkAuthError(res)) { hideLoading(); return; }
            hideLoading(); 
            
            if(res.success) {
                Swal.fire('ทำรายการสำเร็จ', 'ให้สิทธิ์ยื่นกู้นอกรอบเรียบร้อย', 'success'); 
                loadSpecialLoanList(); 
                document.getElementById('specialLoanResultArea').style.display = 'none'; 
                document.getElementById('specialLoanSearchInput').value = ''; 
            } else {
                Swal.fire('แจ้งเตือน', res.message, 'warning'); 
            }
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    window.loadSpecialLoanList = async () => { 
        try {
            const l = await callApi("getSpecialLoanAccessList", { adminId: adminId, token: userToken });
            if(checkAuthError(l)) return;

            const tb = document.querySelector('#specialLoanTable tbody'); 
            if(!tb) return;
            tb.innerHTML = ''; 
            
            const safeL = safeArray(l);
            if (safeL.length === 0) { 
                tb.innerHTML = '<tr><td colspan="6" style="text-align:center;">ไม่มีผู้ได้รับสิทธิ์</td></tr>'; 
                return;
            } 
            
            safeL.forEach((x, i) => { 
                const typeText = x.loanType === 'over' ? 'กู้เกินหลักสูตร' : 'กู้ปกติ (ปี 2569)';
                
                tb.innerHTML += `<tr>
                    <td style="text-align:center;">${i + 1}</td>
                    <td style="font-weight:bold; color:#f57c00;">${escapeHTML(x.studentId)}</td>
                    <td>${escapeHTML(x.name)}</td>
                    <td style="text-align:center;">${typeText}</td>
                    <td>${escapeHTML(formatDate(x.timestamp))}</td>
                    <td style="text-align:center;">
                        <button class="btn btn-danger btn-sm" style="border-radius:20px;" onclick="revokeSpecialLoanAccess(${escapeInlineJsArg(x.studentId)}, ${escapeInlineJsArg(x.loanType)})">ลบสิทธิ์</button>
                    </td>
                </tr>`; 
            }); 
        } catch(err) {
            console.error(err);
        }
    };

    window.revokeSpecialLoanAccess = (id, loanType) => { 
        Swal.fire({
            title: 'ยืนยันลบสิทธิ์',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบสิทธิ์'
        }).then(async r => {
            if (r.isConfirmed) { 
                showLoading(); 
                try {
                    const res = await callApi("revokeSpecialLoanAccess", { studentId: id, loanType: loanType, adminId: adminId, token: userToken });
                    if(checkAuthError(res)) { hideLoading(); return; }
                    hideLoading(); 
                    
                    if (res.success) {
                        Swal.fire('สำเร็จ', res.message, 'success');
                        loadSpecialLoanList();
                    } else {
                        Swal.fire('แจ้งเตือน', res.message, 'warning');
                    }
                } catch(err) {
                    hideLoading();
                    Swal.fire('Error', err.message, 'error');
                }
            } 
        });
    };

    let currentMissingStudent = null;

    window.searchMissingStudent = async () => {
        const searchInput = document.getElementById('missingStudentSearchInput');
        if(!searchInput || !searchInput.value.trim()) return Swal.fire('แจ้งเตือน', 'กรุณาระบุรหัสนักศึกษา 11 หลัก', 'warning');

        showLoading('กำลังตรวจสอบข้อมูลในระบบ');
        try {
            const res = await callApi("searchStudentForMissingList", { studentId: searchInput.value.trim(), adminId: adminId, token: userToken });
            hideLoading();

            const resArea = document.getElementById('missingStudentResultArea');
            if (res.success) {
                currentMissingStudent = res.data;
                document.getElementById('ms_name').textContent = res.data.name;
                document.getElementById('ms_studentId').textContent = res.data.studentId;
                document.getElementById('ms_idCard').textContent = res.data.idCard;
                document.getElementById('ms_faculty').textContent = res.data.faculty;

                document.getElementById('ms_latestYear').value = '';
                document.getElementById('ms_note').value = '';
                resArea.style.display = 'block';
            } else {
                Swal.fire('ไม่พบข้อมูล', res.message, 'error');
                resArea.style.display = 'none';
            }
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    const missingStudentFormEl = document.getElementById('missingStudentForm');
    if (missingStudentFormEl) {
        missingStudentFormEl.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentMissingStudent) return;

            Swal.fire({
                title: 'ยืนยันการบันทึก',
                text: 'ระบบจะทำการสร้างรายการคำร้องในระบบของนักศึกษา ยืนยันการทำรายการหรือไม่',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#28a745'
            }).then(async r => {
                if (r.isConfirmed) {
                    showLoading('ระบบกำลังสร้างคำร้อง');
                    try {
                        const payload = {
                            studentId: currentMissingStudent.studentId,
                            name: currentMissingStudent.name,
                            latestYear: document.getElementById('ms_latestYear').value.trim(),
                            note: document.getElementById('ms_note').value.trim()
                        };

                        const res = await callApi("submitMissingStudentPetition", { ...payload, adminId: adminId, token: userToken });
                        hideLoading();

                        if (res.success) {
                            Swal.fire('ทำรายการสำเร็จ', 'บันทึกข้อมูลและสร้างคำร้องให้นักศึกษาเรียบร้อยแล้ว', 'success');
                            document.getElementById('missingStudentResultArea').style.display = 'none';
                            document.getElementById('missingStudentSearchInput').value = '';
                            loadAdminPetitions(); 
                        } else {
                            Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
                        }
                    } catch(err) {
                        hideLoading();
                        Swal.fire('Error', err.message, 'error');
                    }
                }
            });
        };
    }
    let allAnnouncements = [];

    window.loadAdminAnnouncement = async () => {
        showLoading();
        try {
            const res = await callApi("getAdminAnnList", { adminId: adminId, token: userToken });
            hideLoading();
            if(res.success) {
                allAnnouncements = res.data;
                renderAnnTable();
            }
        } catch(err) { hideLoading(); Swal.fire('Error', err.message, 'error'); }
    };

    window.renderAnnTable = () => {
        const tbody = document.getElementById('annTableBody');
        if(allAnnouncements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#718096; padding: 20px;">ยังไม่มีประวัติการประกาศข้อมูล</td></tr>';
            return;
        }
        

        const todayStr = new Date().toISOString().split('T')[0];

        tbody.innerHTML = allAnnouncements.map(a => {
            const isExpired = (a.endDate < todayStr);
            const statusHtml = a.status === 'เปิดใช้งาน' && !isExpired 
                ? '<span style="background:#c6f6d5; color:#22543d; padding:4px 10px; border-radius:12px; font-size:12px;">ใช้งาน</span>' 
                : (isExpired ? '<span style="background:#fed7d7; color:#742a2a; padding:4px 10px; border-radius:12px; font-size:12px;">หมดอายุ</span>' : '<span style="background:#e2e8f0; color:#4a5568; padding:4px 10px; border-radius:12px; font-size:12px;">ปิดใช้งาน</span>');

            return `
            <tr>
                <td style="font-size:14px;">${a.timestamp.split(' ')[0]}</td>
                <td style="font-weight:bold; color:#2d3748;">${a.title}</td>
                <td>${a.endDate}</td>
                <td>${statusHtml}</td>
                <td>
                    <button class="btn btn-sm" onclick="editAnn(${escapeInlineJsArg(a.id)})" style="background:#edf2f7; color:#1976D2; padding:5px 10px;"><i class="material-icons" style="font-size:16px;">edit</i></button>
                    <button class="btn btn-sm" onclick="deleteAnn(${escapeInlineJsArg(a.id)})" style="background:#fff5f5; color:#e53e3e; padding:5px 10px;"><i class="material-icons" style="font-size:16px;">delete</i></button>
                </td>
            </tr>`;
        }).join('');
    };

    window.openAnnModal = () => {
        document.getElementById('annID').value = '';
        document.getElementById('annTitle').value = '';
        document.getElementById('annContent').value = '';
        document.getElementById('annEndDate').value = '';
        document.getElementById('annStatus').value = 'เปิดใช้งาน';
        document.getElementById('annModalTitle').innerText = 'สร้างประกาศใหม่';
        document.getElementById('annModal').style.display = 'block';
    };

    window.editAnn = (id) => {
        const a = allAnnouncements.find(x => x.id === id);
        if(!a) return;
        document.getElementById('annID').value = a.id;
        document.getElementById('annTitle').value = a.title;
        document.getElementById('annContent').value = a.content;
        document.getElementById('annEndDate').value = a.endDate; 
        document.getElementById('annStatus').value = a.status;
        document.getElementById('annModalTitle').innerText = 'แก้ไขประกาศ';
        document.getElementById('annModal').style.display = 'block';
    };

    window.saveAnnData = async () => {
        const id = document.getElementById('annID').value;
        const title = document.getElementById('annTitle').value.trim();
        const content = document.getElementById('annContent').value.trim();
        const endDate = document.getElementById('annEndDate').value;
        const status = document.getElementById('annStatus').value;

        if(!title || !content || !endDate) return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');

        showLoading('กำลังบันทึก');
        try {
            const res = await callApi("saveAnnData", { id, title, content, endDate, status, adminId, token: userToken });
            hideLoading();
            if(res.success) {
                Swal.fire('สำเร็จ', 'บันทึกประกาศเรียบร้อยแล้ว', 'success');
                document.getElementById('annModal').style.display = 'none';
                loadAdminAnnouncement(); 
            } else Swal.fire('Error', res.message, 'error');
        } catch(err) { hideLoading(); Swal.fire('Error', err.message, 'error'); }
    };

    window.deleteAnn = (id) => {
        Swal.fire({
            title: 'ยืนยันการลบ', text: "ประวัติประกาศนี้จะถูกลบถาวร", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#e53e3e', confirmButtonText: 'ลบข้อมูล'
        }).then(async (res) => {
            if(res.isConfirmed) {
                showLoading('กำลังลบ');
                const r = await callApi("deleteAnnData", { id, adminId, token: userToken });
                hideLoading();
                if(r.success) loadAdminAnnouncement();
                else Swal.fire('Error', r.message, 'error');
            }
        });
    };


    
 

window.loadLoan2569Stats = async () => {
    showLoading('กำลังโหลดข้อมูลสถิติ');
    try {
        const res = await callApi("getLoanDashboardStatsWithFaculty2569", { adminId, token: userToken });
        const container = document.getElementById('facultyStatsContainer');
        container.innerHTML = '';
        
        let grandTotal = 0; let grandSubmitted = 0;
        for (let faculty in res.stats) {
            const data = res.stats[faculty];
            const percent = data.total > 0 ? ((data.submitted / data.total) * 100).toFixed(1) : 0;
            grandTotal += data.total; grandSubmitted += data.submitted;

            container.innerHTML += `
                <div style="background:#fff; padding:20px; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <h4 style="margin:0 0 10px 0;">${faculty}</h4>
                    <div style="font-size:24px; font-weight:700; color:#2b6cb0;">${data.submitted} / ${data.total}</div>
                    <div style="height:8px; background:#edf2f7; border-radius:4px; margin:10px 0;"><div style="width:${percent}%; background:#4299e1; height:100%; border-radius:4px;"></div></div>
                    <small>ยื่นแล้ว ${percent}%</small>
                </div>`;
        }
        
        const totalPercent = grandTotal > 0 ? ((grandSubmitted / grandTotal) * 100).toFixed(1) : 0;
        container.insertAdjacentHTML('afterbegin', `
            <div style="grid-column:1/-1; background:#ebf8ff; padding:20px; border-radius:12px; border-left:5px solid #3182ce;">
                <h3>ภาพรวมทั้งหมด: ${grandSubmitted} / ${grandTotal} (${totalPercent}%)</h3>
            </div>`);
    } catch(e) { Swal.fire('Error', e.message, 'error'); } finally { hideLoading(); }
};


window.downloadSpecialAccessImportFile = () => {
    if (typeof lastFilteredPetitions === 'undefined' || lastFilteredPetitions.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลคำร้องให้ประมวลผล ให้ใช้ตัวกรองเพื่อดึงข้อมูลก่อนครับ', 'warning');
        return;
    }
    
    const targets = lastFilteredPetitions.filter(p => String(p['ประเภทคำร้อง']).includes('ปรับปรุงข้อมูลประวัติ'));
    if (targets.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่พบคำร้อง "ขอลงทะเบียนปรับปรุงข้อมูลประวัติ" ในตารางที่แสดงอยู่', 'warning');
        return;
    }
    
    const csv = "\uFEFFรหัสนักศึกษา,ชื่อ-สกุล,คณะ\n" + 
    targets.map(p => {
        const stdId = p['รหัสนักศึกษา'] || '';
        const stdName = p['ชื่อ-สกุล'] || '';
        const faculty = p['คณะ'] || '-'; 
        
        return `"${stdId}","${stdName}","${faculty}"`;
    }).join("\n");
    
    downloadCSV(csv, "รายชื่อให้สิทธิ์นอกรอบ_สำหรับนำเข้า.csv");
};

window.uploadSpecialAccessFile = function() {
    const fileInput = document.getElementById('specialAccessExcelInput');
    if (!fileInput.files || fileInput.files.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ที่ดาวน์โหลดมาจากหน้าระบบคำร้อง', 'warning');
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    showLoading('กำลังอ่านไฟล์');

    reader.onload = async function(e) {
        try {
            let studentList = [];
            if (file.name.endsWith('.csv')) {
                const text = e.target.result;
                const lines = text.split('\n');
                const headers = lines[0].replace(/["\r]/g, '').split(',');
                const idIdx = headers.findIndex(h => h.includes('รหัส'));
                const nameIdx = headers.findIndex(h => h.includes('ชื่อ'));
                const facIdx = headers.findIndex(h => h.includes('คณะ') || h.includes('faculty'));
                
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    const cols = lines[i].split(',').map(c => c.replace(/["\r]/g, '').trim());
                    if (cols[idIdx]) {
                        studentList.push({ 
                            studentId: cols[idIdx], 
                            name: cols[nameIdx] || '',
                            faculty: (facIdx !== -1 && cols[facIdx]) ? cols[facIdx] : '-'
                        });
                    }
                }
            } else if (typeof XLSX !== 'undefined') { 
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                
                jsonData.forEach(row => {
                    const studentId = row['รหัสนักศึกษา'] || row['studentId'] || Object.values(row)[0];
                    const name = row['ชื่อ-สกุล'] || row['ชื่อ'] || row['name'] || Object.values(row)[1] || '';
                    const faculty = row['คณะ'] || row['faculty'] || '-';
                    
                    if (studentId) {
                        studentList.push({ 
                            studentId: String(studentId).trim(), 
                            name: String(name).trim(),
                            faculty: String(faculty).trim()
                        });
                    }
                });
            } else {
                hideLoading();
                Swal.fire('ผิดพลาด', 'ระบบไม่รองรับไฟล์ Excel กรุณาแปลงเป็น .csv', 'error');
                return;
            }

            if (studentList.length === 0) {
                hideLoading(); Swal.fire('ผิดพลาด', 'ไม่พบรายชื่อในไฟล์', 'error'); return;
            }

            showLoading(`กำลังบันทึก ${studentList.length} รายการเข้าสู่ฐานข้อมูล`);
            const res = await callApi("bulkGrantSpecialAccess", { list: studentList, adminId: adminId, token: userToken });
            hideLoading();
            
            if (res.success) {
                Swal.fire('สำเร็จ', `ให้สิทธิ์นักศึกษาเรียบร้อย ${studentList.length} คน`, 'success');
                fileInput.value = ''; 
                if (typeof loadSpecialAccessList === 'function') loadSpecialAccessList(); 
            } else Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
            
        } catch(err) {
            hideLoading(); Swal.fire('ผิดพลาด', err.message, 'error');
        }
    };
    if (file.name.endsWith('.csv')) reader.readAsText(file, 'UTF-8');
    else reader.readAsArrayBuffer(file);
};
// ฟังก์ชันทำความสะอาดเมนูที่ว่างเปล่า
    function cleanUpEmptyMenus() {
        // 1. ซ่อนเมนูหลัก (หมวดหมู่ที่มี Dropdown) ถ้าเมนูย่อยข้างในถูกซ่อนหมดแล้ว
        const parentMenus = document.querySelectorAll('.sidebar-menu > li.nav-item');
        parentMenus.forEach(parent => {
            const submenuList = parent.querySelector('.submenu-list');
            if (submenuList) {
                // เช็คว่ามีเมนูย่อยตัวไหนที่ยัง "แสดงอยู่" บ้าง
                const visibleSubItems = Array.from(submenuList.querySelectorAll('li a')).filter(a => {
                    // หาค่าการแสดงผล ถ้าโดนซ่อนอยู่ (display: none) จะถูกคัดออก
                    return window.getComputedStyle(a).display !== 'none' && window.getComputedStyle(a.parentElement).display !== 'none';
                });

                if (visibleSubItems.length === 0) {
                    parent.style.display = 'none'; // ซ่อนเมนูหลักถ้าไม่มีเมนูย่อย
                } else {
                    parent.style.display = 'block'; // แสดงถ้ายังมีเมนูย่อย
                }
            }
        });

        // 2. ซ่อนหัวข้อ nav-header (ตัวหนังสือสีเทาๆ) ถ้าไม่มีเมนูอะไรให้กดเลยในหมวดนั้น
        const allItems = Array.from(document.querySelectorAll('.sidebar-menu > *'));
        let currentHeader = null;
        let hasVisibleItems = false;

        allItems.forEach(item => {
            if (item.classList.contains('nav-header')) {
                // ถ้าเจอ Header ใหม่ ให้เช็ค Header ก่อนหน้าก่อน ว่ามีเมนูย่อยไหม ถ้าไม่มีให้ซ่อน
                if (currentHeader && !hasVisibleItems) {
                    currentHeader.style.display = 'none';
                }
                currentHeader = item;
                hasVisibleItems = false; // รีเซ็ตเพื่อเริ่มนับของหมวดใหม่
                currentHeader.style.display = 'block'; // เปิดไว้ก่อน เดี๋ยวเช็คอีกที
            } else if (window.getComputedStyle(item).display !== 'none') {
                // ถ้าเจอเมนูที่แสดงอยู่ใต้ Header นี้ (และไม่ใช่ Header)
                hasVisibleItems = true; 
            }
        });

        // เช็ค Header ตัวสุดท้ายของแถบเมนู
        if (currentHeader && !hasVisibleItems) {
            currentHeader.style.display = 'none';
        }
    }
    // ฟังก์ชันซ่อนหมวดหมู่หลัก หากไม่มีเมนูย่อยให้ใช้งาน
    function hideEmptyMenus() {
        // 1. จัดการซ่อนเมนูหลัก (ที่มี Dropdown)
        const mainMenus = document.querySelectorAll('.sidebar-menu > li.nav-item');
        
        mainMenus.forEach(mainMenu => {
            const submenu = mainMenu.querySelector('.submenu-list');
            if (submenu) {
                const subLinks = submenu.querySelectorAll('a.nav-link');
                let hasVisibleSubMenu = false;

                subLinks.forEach(link => {
                    // เช็คว่าระบบ AdminAccessControl ได้ซ่อนเมนูนี้ไปหรือยัง
                    if (link.style.display !== 'none' && link.parentElement.style.display !== 'none') {
                        hasVisibleSubMenu = true;
                    }
                });

                // ถ้าเมนูย่อยโดนซ่อนหมดเลย ให้ซ่อนเมนูหลัก (ตัวแม่) ไปด้วยเลย
                if (!hasVisibleSubMenu) {
                    mainMenu.style.display = 'none';
                }
            }
        });

        // 2. จัดการซ่อนหัวข้อกลุ่ม (nav-header ที่เป็นตัวหนังสือสีเทาๆ)
        const allElements = document.querySelectorAll('.sidebar-menu > *');
        let currentHeader = null;
        let foundVisibleItemAfterHeader = false;

        allElements.forEach(el => {
            if (el.classList.contains('nav-header')) {
                // ถ้าเจอหัวข้อใหม่ ให้สรุปผลหัวข้อก่อนหน้าก่อนว่าควรซ่อนไหม
                if (currentHeader && !foundVisibleItemAfterHeader) {
                    currentHeader.style.display = 'none';
                }
                currentHeader = el;
                foundVisibleItemAfterHeader = false; 
            } else if (el.style.display !== 'none') {
                // ถ้าเจอเมนูข้างใต้ที่ยังเปิดใช้งานอยู่
                foundVisibleItemAfterHeader = true;
            }
        });
        
        if (currentHeader && !foundVisibleItemAfterHeader) {
            currentHeader.style.display = 'none';
        }
    }
    const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
    let idleTimer;

    function logoutDueToInactivity() {
        sessionStorage.clear();
        
        Swal.fire({
            icon: 'warning',
            title: 'หมดเวลาการเชื่อมต่อ',
            text: 'เซสชันของคุณถูกตัดเนื่องจากไม่มีการใช้งานระบบเป็นเวลานาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
            confirmButtonText: 'กลับไปหน้าเข้าสู่ระบบ',
            confirmButtonColor: '#dc3545',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(() => {
            window.location.replace("index.html");
        });
    }

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(logoutDueToInactivity, IDLE_TIMEOUT_MS);
    }

    const userActivityEvents = [
        'mousemove', 
        'mousedown', 
        'keypress', 
        'DOMMouseScroll', 
        'mousewheel', 
        'touchmove', 
        'MSPointerMove',
        'scroll'
    ];

    userActivityEvents.forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

let currentTransferData = [];
let transferFilteredData = [];
let transferCurrentPage = 1;
let transferRowsPerPage = 10;

async function loadTransferData() {
    showLoading('ระบบกำลังโหลดข้อมูล');
    try {
        const response = await callApi('getTransferRequests', { 
            adminId: adminId,
            token: userToken
        });
        
        if (response && response.success) {
            currentTransferData = response.data || [];
            filterTransferData(); 
        } else {
            throw new Error(response.message || 'ไม่พบข้อมูล');
        }
        hideLoading();
    } catch (error) {
        hideLoading();
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้: ' + error.message, 'error');
        currentTransferData = [];
        filterTransferData();
    }
}

function filterTransferData() {
    const startDateVal = document.getElementById('transferStartDate').value;
    const endDateVal = document.getElementById('transferEndDate').value;
    
    transferFilteredData = currentTransferData;

    if (startDateVal || endDateVal) {
        const startDate = startDateVal ? new Date(startDateVal) : null;
        if (startDate) startDate.setHours(0, 0, 0, 0);

        const endDate = endDateVal ? new Date(endDateVal) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        transferFilteredData = currentTransferData.filter(item => {
            const itemDate = parseTransferDate(item.timestamp);
            if (!itemDate) return true;
            let keep = true;
            if (startDate && itemDate < startDate) keep = false;
            if (endDate && itemDate > endDate) keep = false;
            return keep;
        });
    }
    
    resetTransferPagination();
}

window.resetTransferPagination = () => {
    const rpp = document.getElementById('transferRowsPerPage');
    if (rpp) transferRowsPerPage = parseInt(rpp.value);
    transferCurrentPage = 1;
    renderTransferTable();
};

window.changeTransferPage = (step) => {
    transferCurrentPage += step;
    renderTransferTable();
};

function renderTransferTable() {
    const tbody = document.getElementById('transferDataBody');
    const infoEl = document.getElementById('transferPageInfo');
    const btnPrev = document.getElementById('btnTransferPrev');
    const btnNext = document.getElementById('btnTransferNext');

    if (!tbody) return;
    tbody.innerHTML = '';
    
    // กรณีไม่มีข้อมูล
    if (!transferFilteredData || transferFilteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #888; padding: 40px;">ไม่มีประวัติการแจ้งย้ายสถานศึกษาในช่วงเวลาที่เลือก</td></tr>';
        if (infoEl) infoEl.textContent = 'หน้า 0 / 0';
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
        return;
    }

    // คำนวณหน้าและการแบ่งข้อมูล
    const limit = transferRowsPerPage;
    const totalPages = Math.ceil(transferFilteredData.length / limit) || 1;
    
    if (transferCurrentPage < 1) transferCurrentPage = 1;
    if (transferCurrentPage > totalPages) transferCurrentPage = totalPages;

    const start = (transferCurrentPage - 1) * limit;
    const end = start + limit;
    const pageData = transferFilteredData.slice(start, end);

    // วาดตารางข้อมูลเฉพาะหน้าที่เลือก
    pageData.forEach((item, index) => {
        const actualIndex = start + index + 1;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;">${actualIndex}</td>
            <td>${escapeHTML(item.timestamp || '-')}</td>
            <td>${escapeHTML(item.idCard || '-')}</td>
            <td>${escapeHTML(item.name || '-')}</td>
            <td style="text-align: center;">${escapeHTML(item.level || '-')}</td>
            <td style="text-align: center;">${escapeHTML(item.year || '-')}</td>
            <td style="color: #00897b; font-weight: bold;">${escapeHTML(item.status || '-')}</td>
            <td style="text-align: center;">${escapeHTML(item.instCode || '-')}</td>
            <td>${escapeHTML(item.instName || '-')}</td>
        `;
        tbody.appendChild(tr);
    });

    // อัปเดตข้อความและสถานะปุ่ม เปลี่ยนหน้า
    if (infoEl) infoEl.textContent = `หน้า ${transferCurrentPage} / ${totalPages} (รวม ${transferFilteredData.length} รายการ)`;
    if (btnPrev) btnPrev.disabled = (transferCurrentPage === 1);
    if (btnNext) btnNext.disabled = (transferCurrentPage === totalPages);
}

function parseTransferDate(dateStr) {
    if (!dateStr || dateStr === '-') return null;
    try {
        const parts = dateStr.split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            return new Date(year, month, day);
        }
    } catch (e) {}
    return null;
}

function exportTransferDataExcel() {
    if (!currentTransferData || currentTransferData.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับดาวน์โหลด กรุณาโหลดข้อมูลก่อน', 'warning');
        return;
    }

    const startDateVal = document.getElementById('transferStartDate').value;
    const endDateVal = document.getElementById('transferEndDate').value;
    let dataToExport = currentTransferData;

    if (startDateVal || endDateVal) {
        const startDate = startDateVal ? new Date(startDateVal) : null;
        if (startDate) startDate.setHours(0, 0, 0, 0);

        const endDate = endDateVal ? new Date(endDateVal) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        dataToExport = currentTransferData.filter(item => {
            const itemDate = parseTransferDate(item.timestamp);
            if (!itemDate) return true;
            let keep = true;
            if (startDate && itemDate < startDate) keep = false;
            if (endDate && itemDate > endDate) keep = false;
            return keep;
        });
    }

    if (dataToExport.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลในช่วงวันที่ท่านเลือก', 'info');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "ลำดับ,วันที่แจ้ง,เลขบัตร ปชช.,ชื่อ - นามสกุล,ระดับการศึกษา,ชั้นปี,สถานะ,รหัสสถานศึกษา,ชื่อสถานศึกษา\n";

    dataToExport.forEach((item, index) => {
        const idCardSafe = item.idCard ? `="${item.idCard}"` : '-';
        const instCodeSafe = item.instCode ? `="${item.instCode}"` : '-';
        const row = [
            index + 1,
            `"${item.timestamp || '-'}"`,
            idCardSafe,
            `"${item.name || '-'}"`,
            `"${item.level || '-'}"`,
            `"${item.year || '-'}"`,
            `"${item.status || '-'}"`,
            instCodeSafe,
            `"${item.instName || '-'}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    let fileName = "ข้อมูลย้ายสถานศึกษา";
    if (startDateVal || endDateVal) {
        fileName += `_${startDateVal || 'start'}_ถึง_${endDateVal || 'end'}`;
    } else {
        fileName += `_ทั้งหมด`;
    }
    
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.printPetitionForm = async (rowIndex) => {
    const p = adminPetitionsCache.find(x => x._rowIndex == rowIndex);
    if(!p) return Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลคำร้อง', 'error');

    showLoading('กำลังเตรียมข้อมูลการพิมพ์');
    let phoneNumber = '-';
    try {
        const userRes = await callApi("searchUsersBackend", { query: p['รหัสนักศึกษา'], adminId: adminId, token: userToken });
        const userArray = safeArray(userRes);
        if (userArray && userArray.length > 0) {
            const matchedUser = userArray.find(u => String(u.studentId).trim() === String(p['รหัสนักศึกษา']).trim());
            if (matchedUser && matchedUser.phone) {
                phoneNumber = matchedUser.phone;
            } else if (userArray[0].phone) {
                phoneNumber = userArray[0].phone;
            }
        }
    } catch(e) {
        console.error("Error fetching phone:", e);
    }
    hideLoading();

    const dateObj = new Date(p['วันที่ยื่นคำร้อง']);
    const formattedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
        <html>
        <head>
            <title>พิมพ์ใบคำร้องออนไลน์ - ${p['รหัสนักศึกษา']}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Sarabun', sans-serif; color: #000; padding: 40px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; }
                .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .subtitle { font-size: 16px; color: #555; }
                .content-box { border: 1px solid #ccc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .row { margin-bottom: 12px; font-size: 16px; }
                .label { font-weight: bold; display: inline-block; width: 140px; }
                .value { border-bottom: 1px dotted #999; display: inline-block; width: calc(100% - 150px); padding-left: 10px; }
                .reason-box { background: #f9f9f9; padding: 15px; border: 1px solid #eee; border-radius: 4px; min-height: 100px; white-space: pre-wrap; margin-top: 10px; }
                .signature-section { margin-top: 50px; display: flex; justify-content: flex-end; }
                .signature-box { text-align: center; width: 250px; }
                
                @media print {
                    body { padding: 0; }
                    @page { margin: 2cm; size: A4; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align: right; margin-bottom: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; font-family: 'Sarabun'; cursor: pointer; background: #1976D2; color: #fff; border: none; border-radius: 4px;">🖨️ กดพิมพ์เอกสาร</button>
            </div>

            <div class="header">
                <div class="title">ใบคำร้องออนไลน์ (Online Petition)</div>
                <div class="subtitle">ระบบบริหารงานกองทุนเงินให้กู้ยืมเพื่อการศึกษา มหาวิทยาลัยอุบลราชธานี</div>
            </div>

            <div class="content-box">
                <div class="row">
                    <span class="label">วันที่ยื่นคำร้อง :</span>
                    <span class="value">${formattedDate} เวลา ${formattedTime} น.</span>
                </div>
                <div class="row">
                    <span class="label">รหัสนักศึกษา :</span>
                    <span class="value">${p['รหัสนักศึกษา'] || '-'}</span>
                </div>
                <div class="row">
                    <span class="label">ชื่อ-สกุล :</span>
                    <span class="value">${p['ชื่อ-สกุล'] || '-'}</span>
                </div>
                <div class="row">
                    <span class="label">เบอร์โทรศัพท์ :</span>
                    <span class="value">${phoneNumber}</span>
                </div>
                <div class="row" style="margin-top: 20px;">
                    <span class="label">ความประสงค์ :</span>
                    <span style="font-weight: bold;">${p['ประเภทคำร้อง'] || '-'}</span>
                </div>
            </div>

            <div style="font-weight: bold; font-size: 16px;">เหตุผลประกอบ / รายละเอียดที่แจ้ง :</div>
            <div class="reason-box">${p['เหตุผลประกอบ'] || '-'}</div>

            <div style="margin-top: 30px;">
                <div style="font-weight: bold; font-size: 16px;">ส่วนของเจ้าหน้าที่ (สถานะล่าสุด) :</div>
                <div style="margin-top: 10px;">สถานะ : <b>${p['สถานะ'] || '-'}</b></div>
                <div style="margin-top: 10px;">หมายเหตุเพิ่มเติม : ${p['หมายเหตุเจ้าหน้าที่'] || '-'}</div>
            </div>

            <div class="signature-section">
                <div class="signature-box">
                    <div>(ลงชื่อ) ..............................................................</div>
                    <div style="margin-top: 10px;">( .............................................................. )</div>
                    <div style="margin-top: 5px;">ผู้รับเรื่อง / เจ้าหน้าที่ผู้ตรวจสอบ</div>
                </div>
            </div>
            
            <script>
                window.onload = function() { setTimeout(function(){ window.print(); }, 500); }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.downloadGpaPetitionXls = async () => {
    const statEl = document.getElementById('filterPetStatus');
    const currentStatus = statEl ? statEl.value : 'all';

    showLoading('ระบบกำลังประมวลข้อมูล อาจใช้เวลาสักครู่');
    try {
        const res = await callApi("exportGpaPetitionData", { 
            status: currentStatus,
            statusFilter: currentStatus, 
            adminId: adminId, 
            token: userToken 
        });
        hideLoading();
        
        if (res && res.success) {
            if (res.data.length === 0) {
                let msg = currentStatus === 'all' ? 'ไม่พบข้อมูลคำร้องประเภท "ขอประมวลผลเกรดเฉลี่ยฯ" ในระบบ' : `ไม่พบข้อมูลคำร้องในสถานะ "${currentStatus}"`;
                return Swal.fire('แจ้งเตือน', msg, 'info');
            }

            const excelData = [[
                "ประทับเวลา", "คำนำหน้า", "ชื่อ (ไม่ต้องมีคำนำหน้า)", "นามสกุล", "เลขบัตรประจำตัวประชาชน",
                "รหัสนักศึกษา", "สังกัดคณะ", "สาขา", "ยอดค่าเทอมที่ต้องชำระ\u200bภาคเรียน\u200bที่\u200b 1/2568\u200b (บาท)\u200b\n(หมายเหตุ หากยังไม่ลงทะเบียนเรียน1/2568 อย่าเพิ่งกรอกยื่นความประสงค์กู้ยืม ให้กรอกหลังลงทะเบียนเรียนเรียบร้อยแล้วเท่านั้น)",
                "ผลการเรียนเฉลี่ย (GPAX ไม่ต่ำกว่า 1.50 เท่านั้น)", "ระบุจำนวนหน่วยกิจกรรมทุกด้านที่เป็นประโยชน์ต่อสังคมหรือสาธารณะ ในระบบทะเบียนกิจกรรมนักศึกษาของปีการศึกษา 2567 (เฉพาะ\u200bผู้ที่มีไม่น้อยกว่า 12 หน่วยกิจกรรม หรือ 36 ชั่วโมง เท่านั้นจึงยื่นความประสงค์\u200bขอกู้ยืมได้)"
            ]];

            res.data.forEach(row => {
                let title = "", fName = "", lName = "";
                let fullN = String(row.fullName || '').trim();
                
                if (fullN.startsWith("นาย")) { title = "นาย"; fullN = fullN.substring(3).trim(); }
                else if (fullN.startsWith("นางสาว")) { title = "นางสาว"; fullN = fullN.substring(6).trim(); }
                else if (fullN.startsWith("นาง")) { title = "นาง"; fullN = fullN.substring(3).trim(); }
                
                let parts = fullN.split(/\s+/);
                if (parts.length >= 2) {
                    lName = parts.pop();
                    fName = parts.join(" ");
                } else {
                    fName = fullN;
                }

                let formattedDate = "";
                if (row.timestamp) {
                    const d = new Date(row.timestamp);
                    formattedDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
                }

                excelData.push([
                    formattedDate, title, fName, lName,
                    String(row.idCard || ''), String(row.studentId || ''), row.faculty || '', row.curriculum || '',
                    '', row.gpa || '', row.credits || ''
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, "ไฟล์นำเข้าตรวจสอบคุณสมบัติ ขอประมวลผลรอบ 2.xls", { bookType: "biff8" });
            
        } else {
            Swal.fire('ข้อผิดพลาด', res.message || 'ไม่สามารถดึงข้อมูลได้', 'error');
        }
    } catch (e) {
        hideLoading();
        Swal.fire('ข้อผิดพลาด', e.message, 'error');
    }
};

// ลบชุดฟังก์ชันซ้ำเดิม: ใช้ชุด download/upload ด้านล่างเพียงชุดเดียว

window.downloadSpecialLoanImportFile = async () => {
    const statEl = document.getElementById('filterPetStatus');
    const currentStatus = statEl ? statEl.value : 'all';

    showLoading('กำลังเตรียมไฟล์ข้อมูล');
    try {
        const res = await callApi("exportGpaPetitionData", { statusFilter: currentStatus, adminId: adminId, token: userToken });
        hideLoading();
        
        if (res && res.success && res.data.length > 0) {
            let csvContent = "\uFEFFรหัสนักศึกษา,ชื่อ-สกุล,คณะ,เกรดเฉลี่ย,หน่วยกิต\n";
            res.data.forEach(row => {
                csvContent += `"${row.studentId}","${row.fullName}","${row.faculty}","${row.gpa}","${row.credits}"\n`;
            });
            downloadCSV(csvContent, `รายชื่อยื่นกู้นอกรอบ_${currentStatus}.csv`);
        } else {
            Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลคำร้องตามสถานะที่ท่านเลือก', 'warning');
        }
    } catch (err) {
        hideLoading();
        Swal.fire('Error', err.message, 'error');
    }
};





window.uploadSpecialLoanFile = () => {
    const fileInput = document.getElementById('specialLoanExcelInput');
    if (!fileInput || !fileInput.files[0]) {
        return Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ก่อนกดอัปโหลด', 'warning');
    }
    
    const file = fileInput.files[0];
    const loanType = document.getElementById('bulkLoanType').value;
    const reader = new FileReader();

    showLoading('ระบบกำลังอ่านไฟล์');
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            
            if(jsonData.length === 0) throw new Error("ไฟล์ว่างเปล่า");
            
            const list = [];
            const headers = jsonData[0].map(h => String(h).trim());
            const idIndex = headers.findIndex(k => k.includes('รหัส'));
            const nameIndex = headers.findIndex(k => k.includes('ชื่อ'));

            if(idIndex === -1 || nameIndex === -1) throw new Error("ไม่พบคอลัมน์ 'รหัสนักศึกษา' หรือ 'ชื่อ-สกุล' ในไฟล์");

            for(let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row[idIndex]) {
                    list.push({
                        studentId: String(row[idIndex]).trim(),
                        name: String(row[nameIndex] || '').trim()
                    });
                }
            }

            if(list.length === 0) throw new Error("ไม่พบข้อมูลนักศึกษาในไฟล์");

            Swal.fire({
                title: 'ยืนยันการนำเข้า',
                text: `พบข้อมูล ${list.length} รายการ ต้องการให้สิทธิ์กู้ยืมหรือไม่`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'อัปโหลด',
                confirmButtonColor: '#e65100'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    showLoading('ระบบกำลังบันทึกข้อมูล');
                    const res = await callApi("bulkGrantSpecialLoanAccess", { list: list, loanType: loanType, adminId: adminId, token: userToken });
                    hideLoading();
                    
                    if (res.success) {
                        Swal.fire('สำเร็จ', res.message, 'success');
                        loadSpecialLoanList(); 
                        fileInput.value = '';
                    } else {
                        Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
                    }
                }
            });

        } catch(err) {
            hideLoading();
            Swal.fire('เกิดข้อผิดพลาด', 'รูปแบบไฟล์ไม่ถูกต้อง หรือ ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
};

window.loadFacultyLoanStats = async () => {
    const container = document.getElementById('loanStatsContainer');
    if (!container) return; 

    try {
        const res = await callApi('getLoanStatistics', { adminId: adminId, token: userToken });
        
        if (res.success && res.data && res.data.length > 0) {
            let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; padding: 5px 0;">';
            
            res.data.forEach(item => {
                let theme = {};
                if (item.percent >= 80) {
                    theme = { bg: '#ecfdf5', text: '#059669', grad1: '#10b981', grad2: '#34d399', shadow: 'rgba(16, 185, 129, 0.4)' };
                } else if (item.percent >= 40) {
                    theme = { bg: '#fffbeb', text: '#d97706', grad1: '#f59e0b', grad2: '#fbbf24', shadow: 'rgba(245, 158, 11, 0.4)' };
                } else {
                    theme = { bg: '#fef2f2', text: '#dc2626', grad1: '#ef4444', grad2: '#f87171', shadow: 'rgba(239, 68, 68, 0.4)' };
                }
                
                html += `
                    <div style="background: #ffffff; border: 1px solid #eef2f6; border-radius: 16px; padding: 16px; box-shadow: 0 4px 15px -5px rgba(0,0,0,0.05); transition: transform 0.2s; position: relative; overflow: hidden; cursor: default;" 
                         onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 20px -8px rgba(0,0,0,0.1)';" 
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px -5px rgba(0,0,0,0.05)';">
                        
                        <div style="position: absolute; top: -15px; right: -15px; width: 70px; height: 70px; background: linear-gradient(135deg, ${theme.grad1}22, ${theme.grad2}11); border-radius: 50%; pointer-events: none;"></div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; position: relative; z-index: 1;">
                            <div style="flex: 1; padding-right: 10px;">
                                <div style="display: flex; align-items: flex-start; gap: 6px;">
                                    <span style="background: ${theme.bg}; color: ${theme.text}; padding: 4px; border-radius: 8px; display: inline-flex; margin-top: 2px;">
                                        <i class="material-icons" style="font-size: 14px;">business</i>
                                    </span>
                                    <h4 style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600; line-height: 1.3;">${item.faculty}</h4>
                                </div>
                            </div>
                            <div style="text-align: right; min-width: 50px;">
                                <div style="font-size: 20px; font-weight: 800; color: ${theme.text}; line-height: 1;">
                                    ${item.percent}<span style="font-size: 12px; font-weight: 600;">%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: #f1f5f9; border-radius: 10px; height: 6px; margin-bottom: 16px; overflow: visible; position: relative;">
                            <div style="background: linear-gradient(90deg, ${theme.grad1}, ${theme.grad2}); height: 100%; width: ${item.percent}%; border-radius: 10px; transition: width 1s ease-in-out; box-shadow: 0 0 8px ${theme.shadow};"></div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 12px; border-radius: 10px; border: 1px solid #f1f5f9;">
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">ยื่นคำร้องแล้ว</span>
                                <span style="font-size: 14px; color: #0f172a; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                                    <i class="material-icons" style="font-size: 14px; color: ${theme.grad1};">how_to_reg</i> ${item.submitted}
                                </span>
                            </div>
                            <div style="height: 25px; width: 1px; background: #e2e8f0;"></div>
                            <div style="display: flex; flex-direction: column; text-align: right;">
                                <span style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">มีสิทธิ์ทั้งหมด</span>
                                <span style="font-size: 14px; color: #0f172a; font-weight: 700; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                                    ${item.total} <i class="material-icons" style="font-size: 14px; color: #94a3b8;">groups</i>
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px 20px; background: #f8fafc; border-radius: 16px; border: 2px dashed #cbd5e0;">
                    <i class="material-icons" style="font-size: 40px; color: #a0aec0; margin-bottom: 10px;">folder_off</i>
                    <p style="margin: 0; color: #718096; font-size: 14px;">${res.message || 'ไม่พบข้อมูลสถิติ'}</p>
                </div>
            `;
        }
    } catch (err) {
        container.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 15px; background: #fef2f2; border-radius: 12px; font-size: 14px;">เกิดข้อผิดพลาด: ${escapeHTML(err.message || 'เกิดข้อผิดพลาด')}</div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(typeof window.loadFacultyLoanStats === 'function') {
            window.loadFacultyLoanStats();
        }
    }, 2000); 
});

    const btnGoToManageUser = document.getElementById('btnGoToManageUser');
    if (btnGoToManageUser) {
        btnGoToManageUser.onclick = () => {
            const studentId = document.getElementById('adm_ver_studentId').textContent;
            
            if (!studentId || studentId === '-') {
                return showAlert('ไม่พบรหัสนักศึกษา', 'warning');
            }

            showPage('manageUsersSection');
            
            setTimeout(() => {
                const searchInput = document.getElementById('userSearchInput');
                const searchBtn = document.getElementById('btnSearchUsers');
                
                if (searchInput && searchBtn) {
                    searchInput.value = studentId;
                    searchBtn.click();
                }
            }, 300);
        };
    }

const navAdminSpecialQueueAccess = document.getElementById('navAdminSpecialQueueAccess');
if(navAdminSpecialQueueAccess) {
    navAdminSpecialQueueAccess.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('adminSpecialQueueAccessSection');
        loadSpecialQueueList();
    });
}

async function searchForSpecialQueue() {
    const input = document.getElementById('specialQueueSearchInput');
    const studentId = input.value.trim();
    if (!studentId) return Swal.fire('แจ้งเตือน', 'กรุณาระบุรหัสนักศึกษา', 'warning');

    showLoading('กำลังค้นหา');
    try {
        const payload = { action: 'searchStudentForSpecialQueue', studentId: studentId, adminId: adminId, token: userToken };
        const res = await callApi('searchStudentForSpecialQueue', payload);
        hideLoading();
        
        if (res && res.success) {
            document.getElementById('specialQueueResultArea').style.display = 'flex';
            document.getElementById('sq_name').textContent = res.data.name;
            document.getElementById('sq_id').textContent = res.data.studentId;
            document.getElementById('sq_faculty').textContent = res.data.faculty;
        } else {
            document.getElementById('specialQueueResultArea').style.display = 'none';
            Swal.fire('ไม่พบข้อมูล', res.message || 'ไม่พบรหัสนักศึกษาในระบบ', 'warning');
        }
    } catch (err) {
        hideLoading();
        Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
}

async function grantSpecialQueue() {
    const studentId = document.getElementById('sq_id').textContent;
    if (!studentId || studentId === '-') return;

    showLoading('กำลังบันทึกข้อมูล');
    try {
        const payload = { action: 'grantSpecialQueueAccess', studentId: studentId, adminId: adminId, token: userToken };
        const res = await callApi('grantSpecialQueueAccess', payload);
        hideLoading();
        
        if (res && res.success) {
            Swal.fire('สำเร็จ', res.message, 'success');
            document.getElementById('specialQueueSearchInput').value = '';
            document.getElementById('specialQueueResultArea').style.display = 'none';
            loadSpecialQueueList();
        } else {
            Swal.fire('ข้อผิดพลาด', res.message, 'error');
        }
    } catch (err) {
        hideLoading();
        Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    }
}

async function loadSpecialQueueList() {
    const tbody = document.getElementById('specialQueueListBody');
    if(!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">กำลังโหลด</td></tr>';
    
    try {
        const payload = { action: 'getSpecialQueueAccessList', adminId: adminId, token: userToken };
        const res = await callApi('getSpecialQueueAccessList', payload);
        
        if (res && res.success) {
            if (res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666;">ไม่มีข้อมูลผู้ได้รับสิทธิ์</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            res.data.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:center;">${index + 1}</td>
                    <td style="text-align:center; font-weight:bold; color:#00897b;">${escapeHTML(item.studentId)}</td>
                    <td>${escapeHTML(item.name)}</td>
                    <td>${escapeHTML(item.faculty)}</td>
                    <td>${escapeHTML(item.grantedAt)}</td>
                    <td style="text-align:center;">
                        <button class="btn btn-danger btn-sm" onclick="revokeSpecialQueue(${escapeInlineJsArg(item.studentId)})">
                            <i class="material-icons" style="font-size:16px;">delete</i> ยกเลิกสิทธิ์
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">${escapeHTML(err.message || 'เกิดข้อผิดพลาด')}</td></tr>`;
    }
}

window.revokeSpecialQueue = async function(studentId) {
    const confirm = await Swal.fire({
        title: 'ยืนยันการยกเลิก', text: `ต้องการยกเลิกสิทธิ์จองคิวของ ${studentId}?`, icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ใช่, ยกเลิก'
    });

    if (confirm.isConfirmed) {
        showLoading('กำลังดำเนินการ');
        try {
            const payload = { action: 'revokeSpecialQueueAccess', studentId: studentId, adminId: adminId, token: userToken };
            const res = await callApi('revokeSpecialQueueAccess', payload);
            hideLoading();
            if (res && res.success) {
                Swal.fire('สำเร็จ', res.message, 'success');
                loadSpecialQueueList();
            } else {
                Swal.fire('ข้อผิดพลาด', res.message, 'error');
            }
        } catch (err) { hideLoading(); Swal.fire('ข้อผิดพลาด', err.message, 'error'); }
    }
};

async function uploadSpecialQueueFile() {
    const fileInput = document.getElementById('specialQueueExcelInput');
    if (!fileInput.files || fileInput.files.length === 0) {
        return Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ Excel/CSV ก่อน', 'warning');
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        showLoading('กำลังนำเข้าข้อมูล กรุณารอสักครู่');
        try {
            const base64Data = e.target.result.split(',')[1];
            const payload = {
                action: 'bulkGrantSpecialQueueAccess',
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                content: base64Data,
                adminId: adminId,
                token: userToken
            };

            const res = await callApi('bulkGrantSpecialQueueAccess', payload);
            hideLoading();
            
            if (res && res.success) {
                Swal.fire('สำเร็จ', res.message, 'success');
                fileInput.value = '';
                loadSpecialQueueList();
            } else {
                Swal.fire('ข้อผิดพลาด', res.message, 'error');
            }
        } catch (err) {
            hideLoading();
            Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
        }
    };
    reader.readAsDataURL(file);
}


window.dashBar = null;
window.dashPie = null;

window.loadLoanFacultyStats = async () => {
    const container = document.getElementById('facultyCardsContainer');
    if(container) container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">ระบบกำลังประมวลผลข้อมูลสถิติ กรุณารอสักครู่</div>';
    
    try {
        const res = await callApi("getLoanStatistics", { adminId: adminId, token: userToken });
        if(checkAuthError(res)) return;
        
        if (res && res.success && res.data && res.data.length > 0) {
            const data = res.data;
            
            let grandTotal = 0;
            let grandSubmitted = 0;
            let maxSubmitted = -1;
            let topFacultyName = "-";

            const labels = [];
            const submittedData = [];
            
            data.forEach(item => {
                grandTotal += item.total;
                grandSubmitted += item.submitted;
                
                let shortName = item.faculty.replace('คณะ', '').replace('วิทยาลัย', 'ว.');
                labels.push(shortName);
                submittedData.push(item.submitted);

                if (item.submitted > maxSubmitted) {
                    maxSubmitted = item.submitted;
                    topFacultyName = item.faculty;
                }
            });

            document.getElementById('dashTotal').innerText = grandTotal.toLocaleString();
            document.getElementById('dashSubmitted').innerText = grandSubmitted.toLocaleString();
            document.getElementById('dashTopFac').innerText = topFacultyName;

            if(window.dashBar) window.dashBar.destroy();
            const ctxBar = document.getElementById('chartBar').getContext('2d');
            window.dashBar = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'ยื่นคำร้องแล้ว (คน)',
                        data: submittedData,
                        backgroundColor: '#60a5fa',
                        hoverBackgroundColor: '#2563eb',
                        borderRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { family: 'Sarabun', size: 11 } } },
                        y: { beginAtZero: true, ticks: { font: { family: 'Sarabun' } } }
                    }
                }
            });

            const progressPercent = grandTotal > 0 ? ((grandSubmitted / grandTotal) * 100).toFixed(1) : 0;
            document.getElementById('dashProgressPct').innerText = progressPercent + '%';

            if(window.dashPie) window.dashPie.destroy();
            const ctxPie = document.getElementById('chartPie').getContext('2d');
            window.dashPie = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: ['ยื่นคำร้องแล้ว', 'ยังไม่ยื่น'],
                    datasets: [{
                        data: [grandSubmitted, grandTotal - grandSubmitted],
                        backgroundColor: ['#1976D2', '#e2e8f0'],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { font: { family: 'Sarabun' }, padding: 15, boxWidth: 12 } } }
                }
            });

            if(container) {
                container.innerHTML = '';
                data.sort((a,b) => b.submitted - a.submitted).forEach((item, index) => {
                    const pct = item.percent;
                    
                    let color = '#dc2626'; 
                    if (pct >= 80) color = '#16a34a'; 
                    else if (pct >= 50) color = '#d97706'; 
                    
                    const rankTxt = (index + 1).toString().padStart(2, '0');
                    
                    container.innerHTML += `
                        <div class="fac-card" data-rank="#${rankTxt}" style="border-top: 3px solid ${color};">
                            <div class="fac-pct-badge" style="color: ${color};">${pct}%</div>
                            
                            <div class="fac-name">${escapeHTML(item.faculty)}</div>
                            
                            <div class="fac-stat-row">
                                <div class="fac-stat-box">
                                    <div class="fac-stat-label">จำนวนผู้มีสิทธิ์ทั้งหมด</div>
                                    <div class="fac-stat-val">${item.total.toLocaleString()} <span style="font-size: 11px; font-weight: normal; color: #888;">คน</span></div>
                                </div>
                                <div class="fac-stat-box" style="text-align: right;">
                                    <div class="fac-stat-label">ยื่นคำร้องแล้ว</div>
                                    <div class="fac-stat-val" style="color: ${color};">${item.submitted.toLocaleString()} <span style="font-size: 11px; font-weight: normal; color: #888;">คน</span></div>
                                </div>
                            </div>
                            
                            <div class="fac-bar-bg">
                                <div class="fac-bar-fill" style="width: ${pct}%; background: ${color};"></div>
                            </div>
                        </div>
                    `;
                });
            }
        } else {
            if(container) container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#d32f2f; padding:20px;">ไม่พบข้อมูลสถิติในระบบ</div>`;
        }
    } catch(err) {
        if(container) container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#d32f2f; padding:20px;">เกิดข้อผิดพลาด: ${escapeHTML(err.message || 'เกิดข้อผิดพลาด')}</div>`;
    }
};
window.showUnlockSurveyModal = async (userId, studentId, useAdminVerifyApi = false) => {
    const adminFullName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'ไม่ทราบชื่อ';

    const confirmStep1 = await Swal.fire({
        title: 'ยืนยันการทำรายการ',
        html: `
            <div style="text-align: center; margin-bottom: 15px;">
                <span style="color:#d32f2f; font-size: 15px; font-weight: bold;">
                    บัญชีนี้ถูกระงับด้วยเงื่อนไขความเสี่ยงสูง กรุณาคัดกรองก่อนปลดล็อก
                </span>
            </div>
            <div style="background-color: #fff5f5; border: 1px solid #ffcdd2; border-left: 5px solid #d32f2f; padding: 15px; text-align: left; margin-bottom: 20px; border-radius: 8px;">
                <div style="color:#b71c1c; font-size: 14px; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                    <i class="material-icons" style="font-size: 18px;">admin_panel_settings</i> กรุณาแจ้งผู้มีสิทธิ์อนุมัติเพื่อดำเนินการ
                </div>
                <div style="color: #424242; font-size: 14px; padding-left: 25px; line-height: 1.6;">
                    <div>1. คุณชิดชญา กุจะพันธ์</div>
                    <div>2. คุณฐาปนัทพัฏทฐากร ฉายยิ่งเชี่ยว</div>
                </div>
            </div>
            <div style="font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 15px;">
                ผู้ทำรายการ: <span style="color: #28a745;">${adminFullName}</span>
            </div>
            <div style="font-size: 14px; color: #475569;">
                คลิก "เริ่มคัดกรอง" เพื่อสอบถามข้อมูล 10 ข้อ จากนักศึกษา
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'เริ่มคัดกรอง',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0288d1',
        cancelButtonColor: '#64748b'
    });

    if (!confirmStep1.isConfirmed) return;

    const surveyStep = await Swal.fire({
        title: 'แบบคัดกรองความเสี่ยง',
        html: `
            <div style="text-align: left; font-size: 14px; max-height: 450px; overflow-y: auto; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                <p style="color: #d32f2f; font-weight: bold; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">
                    กรุณาสอบถามนักศึกษาเพื่อประเมินความเสี่ยงของการถูกแฮ็กหรือข้อมูลรั่วไหล
                </p>
                
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 1 :</b> ระบบพบการล็อกอินจากพื้นที่ผิดปกติ/ต่างประเทศ นักศึกษาได้ใช้ VPN หรือเดินทางไปต่างประเทศในช่วงเวลาดังกล่าวหรือไม่?</label><br>
                    <input type="radio" name="q1" value="ใช่" id="q1_yes"> <label for="q1_yes">ใช่ (ทำด้วยตนเอง)</label>
                    <input type="radio" name="q1" value="ไม่ใช่" id="q1_no" style="margin-left: 15px;"> <label for="q1_no">ไม่ใช่ (ถูกล็อกอินจากที่อื่น)</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 2 :</b> นักศึกษาเคยคลิกลิงก์ที่น่าสงสัยจากอีเมล SMS หรือข้อความแชท ที่นำไปสู่หน้าเว็บให้กรอกรหัสผ่านหรือไม่?</label><br>
                    <input type="radio" name="q2" value="เคย" id="q2_yes"> <label for="q2_yes">เคย / ไม่แน่ใจ</label>
                    <input type="radio" name="q2" value="ไม่เคย" id="q2_no" style="margin-left: 15px;"> <label for="q2_no">ไม่เคย</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 3 :</b> รหัสผ่านของระบบ กยศ. เป็นรหัสเดียวกับที่ใช้ในแอปพลิเคชันหรือเว็บไซต์อื่นที่เคยมีข่าวข้อมูลรั่วไหลหรือไม่?</label><br>
                    <input type="radio" name="q3" value="ใช่" id="q3_yes"> <label for="q3_yes">ใช่ (ใช้รหัสผ่านซ้ำ)</label>
                    <input type="radio" name="q3" value="ไม่ใช่" id="q3_no" style="margin-left: 15px;"> <label for="q3_no">ไม่ใช่ (ตั้งแยกเฉพาะ)</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 4 :</b> อุปกรณ์ที่ใช้ล็อกอิน (มือถือ/คอมพิวเตอร์) มีการติดตั้งแอปพลิเคชันเถื่อน หรือมีความเสี่ยงในการติดมัลแวร์ (Malware) หรือไม่?</label><br>
                    <input type="radio" name="q4" value="มี" id="q4_yes"> <label for="q4_yes">มี / ไม่แน่ใจ</label>
                    <input type="radio" name="q4" value="ไม่มี" id="q4_no" style="margin-left: 15px;"> <label for="q4_no">ไม่มี</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 5 :</b> นักศึกษาเคยให้รหัสผ่านแก่ผู้อื่น หรือจ้างบุคคลอื่นให้ดำเนินการเข้าระบบแทนหรือไม่?</label><br>
                    <input type="radio" name="q5" value="เคย" id="q5_yes"> <label for="q5_yes">เคย</label>
                    <input type="radio" name="q5" value="ไม่เคย" id="q5_no" style="margin-left: 15px;"> <label for="q5_no">ไม่เคย</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 6 :</b> นักศึกษาเคยล็อกอินเข้าใช้งานระบบผ่านเครือข่าย Wi-Fi สาธารณะที่ไม่มีการเข้ารหัสความปลอดภัยหรือไม่?</label><br>
                    <input type="radio" name="q6" value="เคย" id="q6_yes"> <label for="q6_yes">เคย</label>
                    <input type="radio" name="q6" value="ไม่เคย" id="q6_no" style="margin-left: 15px;"> <label for="q6_no">ไม่เคย</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 7 :</b> นักศึกษาเคยล็อกอินค้างไว้ในคอมพิวเตอร์สาธารณะ หรืออุปกรณ์ของบุคคลอื่นโดยไม่ได้กดออกจากระบบหรือไม่?</label><br>
                    <input type="radio" name="q7" value="เคย" id="q7_yes"> <label for="q7_yes">เคย</label>
                    <input type="radio" name="q7" value="ไม่เคย" id="q7_no" style="margin-left: 15px;"> <label for="q7_no">ไม่เคย</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 8 :</b> เบอร์โทรศัพท์หรืออีเมลที่ใช้รับรหัสยืนยันตัวตน (OTP) ปัจจุบันมีเพียงนักศึกษาคนเดียวที่สามารถเข้าถึงได้ใช่หรือไม่?</label><br>
                    <input type="radio" name="q8" value="ใช่" id="q8_yes"> <label for="q8_yes">ใช่</label>
                    <input type="radio" name="q8" value="ไม่ใช่" id="q8_no" style="margin-left: 15px;"> <label for="q8_no">ไม่ใช่ (มีคนอื่นเข้าถึงได้)</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 9 :</b> สาเหตุที่บัญชีถูกล็อก เกิดจากนักศึกษากรอกรหัสผ่านผิดหลายครั้งด้วยตนเองใช่หรือไม่?</label><br>
                    <input type="radio" name="q9" value="ใช่" id="q9_yes"> <label for="q9_yes">ใช่ (ลืมรหัสผ่านเอง)</label>
                    <input type="radio" name="q9" value="ไม่ใช่" id="q9_no" style="margin-left: 15px;"> <label for="q9_no">ไม่ใช่ (ถูกผู้อื่นสุ่มรหัส)</label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label><b>ข้อ 10 :</b> นักศึกษาได้ทำการเปลี่ยนรหัสผ่านใหม่ให้มีความปลอดภัย (Strong Password) และสแกนไวรัสในอุปกรณ์เรียบร้อยแล้วใช่หรือไม่?</label><br>
                    <input type="radio" name="q10" value="ใช่" id="q10_yes"> <label for="q10_yes">ดำเนินการแล้ว</label>
                    <input type="radio" name="q10" value="ไม่ใช่" id="q10_no" style="margin-left: 15px;"> <label for="q10_no">ยังไม่ได้ดำเนินการ</label>
                </div>
                
                <div style="margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 15px;">
                    <label style="font-weight: bold; color: #1976D2;">บันทึกข้อสังเกตเพิ่มเติม (ถ้ามี)</label>
                    <textarea id="survey_note" class="modern-input" rows="3" placeholder="ระบุข้อมูลเพิ่มเติม เช่น ยืนยันพิกัดที่พบความเสี่ยง..." style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; margin-top: 5px;"></textarea>
                </div>
            </div>
        `,
        width: '650px',
        showCancelButton: true,
        confirmButtonText: 'วิเคราะห์ผล',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0288d1',
        preConfirm: () => {
            let riskScore = 0;
            for (let i = 1; i <= 10; i++) {
                const checkedEl = document.querySelector(`input[name="q${i}"]:checked`);
                if (!checkedEl) {
                    Swal.showValidationMessage(`กรุณาระบุข้อมูลคัดกรองในข้อที่ ${i}`);
                    return false;
                }
                const val = checkedEl.value;
                if (i === 1 && val === 'ไม่ใช่') riskScore++;
                if (i === 2 && val === 'เคย') riskScore++;
                if (i === 3 && val === 'ใช่') riskScore++;
                if (i === 4 && val === 'มี') riskScore++;
                if (i === 5 && val === 'เคย') riskScore++;
                if (i === 6 && val === 'เคย') riskScore++;
                if (i === 7 && val === 'เคย') riskScore++;
                if (i === 8 && val === 'ไม่ใช่') riskScore++;
                if (i === 9 && val === 'ไม่ใช่') riskScore++;
                if (i === 10 && val === 'ไม่ใช่') riskScore++;
            }
            const note = document.getElementById('survey_note').value;
            return { note: note, riskScore: riskScore };
        }
    });

    if (surveyStep.isConfirmed) {
        const result = surveyStep.value;
        let riskLevel = 'ต่ำ (ตรวจสอบแล้วปลอดภัย)';
        let riskColor = '#28a745';

        // จัดระดับความเสี่ยงจาก 10 คะแนน
        if (result.riskScore >= 6) {
            riskLevel = 'สูง (เข้าข่ายบัญชีถูกแฮ็ก/รหัสรั่วไหล)';
            riskColor = '#d32f2f';
        } else if (result.riskScore >= 3) {
            riskLevel = 'ปานกลาง (มีความเสี่ยงข้อมูลหลุด)';
            riskColor = '#f57c00';
        }

        const confirmUnlock = await Swal.fire({
            title: 'ผลวิเคราะห์ระดับความเสี่ยง',
            html: `
                <div style="font-size: 48px; font-weight: bold; color: ${riskColor}; margin: 10px 0;">
                    ${result.riskScore} <span style="font-size: 24px; color: #666;">/ 10</span>
                </div>
                <div style="font-size: 18px; font-weight: bold; color: ${riskColor}; margin-bottom: 20px;">
                    ระดับความเสี่ยง: ${riskLevel}
                </div>
                <div style="font-size: 14px; color: #555; background: #f8fafc; padding: 10px; border-radius: 8px; text-align: left;">
                    <b>หมายเหตุการคัดกรอง:</b><br>${result.note || '-'}
                </div>
                <hr style="margin: 20px 0; border: 0; border-top: 1px dashed #cbd5e1;">
                <div style="font-size: 16px; font-weight: bold; color: #1e293b;">
                    ยืนยันการปลดล็อกบัญชีเพื่อให้นักศึกษากลับมาใช้งานหรือไม่
                </div>
            `,
            icon: result.riskScore >= 6 ? 'warning' : 'info',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการปลดล็อก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#64748b'
        });

        if (confirmUnlock.isConfirmed) {
            if (useAdminVerifyApi) {
                executeAdminUnlockVerifyPage(studentId);
            } else {
                const finalNote = `[Security Screen] เสี่ยง ${result.riskScore}/10 (${riskLevel}) - ${result.note}`;
                executeStatusUpdate(userId, 'Active', finalNote);
            }
        }
    }
};

window.executeStatusUpdate = async (userId, newStatus, reason) => {
    showLoading('กำลังอัปเดตสถานะบัญชี');
    try {
        const res = await callApi("updateUser", {
            userId: userId,
            status: newStatus,
            suspendReason: reason,
            adminId: adminId,
            token: userToken
        });
        
        if (checkAuthError(res)) { 
            hideLoading(); 
            return; 
        }
        hideLoading();

        if (res.success) {
            Swal.fire('ทำรายการสำเร็จ', 'อัปเดตสถานะบัญชีเรียบร้อยแล้ว', 'success');
            if (typeof loadUsersForAdmin === 'function') loadUsersForAdmin(true);
            if (typeof loadSuspendedUsers === 'function') loadSuspendedUsers();
        } else {
            Swal.fire('ผิดพลาด', res.message, 'error');
        }
    } catch (err) {
        hideLoading();
        Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
    }
};
// ตัวแปรสำหรับจัดการหน้า
let missingProfilesCache = [];
let missingCurrentPage = 1;
let missingRowsPerPage = 50;

// ผูกปุ่มเมนูกับ Section
setupNav('navMissingProfile', 'missingProfileSection', loadMissingProfileUsers);

// โหลดข้อมูลทั้งหมดจากหลังบ้านเพียงครั้งเดียว
async function loadMissingProfileUsers() {
    showLoading('กำลังค้นหาบัญชีที่ยังไม่ลงประวัติ');
    document.getElementById('btnBulkSuspend').style.display = 'none';
    
    try {
        const res = await callApi("getUsersWithoutProfile", { adminId: adminId, token: userToken });
        if (checkAuthError(res)) { hideLoading(); return; }
        hideLoading();

        missingProfilesCache = safeArray(res); 
        missingCurrentPage = 1; 
        renderMissingProfileTable(); 
    } catch (err) {
        hideLoading();
        const tbody = document.querySelector('#missingProfileTable tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">เกิดข้อผิดพลาด: ${escapeHTML(err.message || 'เกิดข้อผิดพลาด')}</td></tr>`;
    }
}

function renderMissingProfileTable() {
    const tbody = document.querySelector('#missingProfileTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    document.getElementById('selectAllMissing').checked = false;
    updateMissingSelection();

    if (missingProfilesCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color: #28a745; font-weight: bold;"><i class="material-icons" style="font-size: 30px; display: block; margin-bottom: 10px;">check_circle</i> ทุกบัญชีในระบบลงทะเบียนประวัติเรียบร้อยแล้ว</td></tr>';
        document.getElementById('missingPageInfo').textContent = 'หน้า 0 / 0';
        document.getElementById('btnMissingPrev').disabled = true;
        document.getElementById('btnMissingNext').disabled = true;
        return;
    }

    const limit = missingRowsPerPage === 10000 ? missingProfilesCache.length : missingRowsPerPage;
    const totalPages = Math.ceil(missingProfilesCache.length / limit) || 1;
    const start = (missingCurrentPage - 1) * limit;
    const pageData = missingProfilesCache.slice(start, start + limit);

    pageData.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="chk-missing" value="${escapeHTML(u.id)}" onchange="updateMissingSelection()" style="transform: scale(1.3); cursor: pointer; accent-color: #e53e3e;">
                </td>
                <td style="font-weight: bold; color: #1976D2;">${escapeHTML(u.studentId)}</td>
                <td>${escapeHTML(u.name)}</td>
                <td>${escapeHTML(u.faculty)}</td>
                <td>${escapeHTML(maskString(u.email, 'email'))}</td>
                <td><span style="color:#e53e3e; font-weight:bold; font-size:12px; background: #fff5f5; padding: 4px 8px; border-radius: 12px;">ไม่มีประวัติ</span></td>
            </tr>`;
    });

    const infoEl = document.getElementById('missingPageInfo');
    const bPrev = document.getElementById('btnMissingPrev');
    const bNext = document.getElementById('btnMissingNext');

    if (infoEl) infoEl.textContent = `หน้า ${missingCurrentPage} / ${totalPages} (รวม ${missingProfilesCache.length} รายการ)`;
    if (bPrev) bPrev.disabled = (missingCurrentPage === 1);
    if (bNext) bNext.disabled = (missingCurrentPage === totalPages);
}

function changeMissingRowsPerPage() {
    const sel = document.getElementById('missingRowsPerPage');
    if (sel) {
        missingRowsPerPage = parseInt(sel.value);
        missingCurrentPage = 1;
        renderMissingProfileTable();
    }
}

function changeMissingPage(step) {
    missingCurrentPage += step;
    renderMissingProfileTable();
}

function toggleAllMissing(source) {
    document.querySelectorAll('.chk-missing').forEach(chk => chk.checked = source.checked);
    updateMissingSelection();
}

function updateMissingSelection() {
    const chks = document.querySelectorAll('.chk-missing');
    const checked = document.querySelectorAll('.chk-missing:checked');
    const sa = document.getElementById('selectAllMissing');
    
    if (sa) sa.checked = (chks.length > 0 && chks.length === checked.length);
    
    const btnSuspend = document.getElementById('btnBulkSuspend');
    const countSpan = document.getElementById('bulkSuspendCount');
    
    if (checked.length > 0) {
        btnSuspend.style.display = 'inline-flex';
        countSpan.textContent = checked.length;
    } else {
        btnSuspend.style.display = 'none';
    }
}

function executeBulkSuspend() {
    const selectedIds = Array.from(document.querySelectorAll('.chk-missing:checked')).map(chk => chk.value);
    if (selectedIds.length === 0) return;

    Swal.fire({
        title: 'ยืนยันระงับบัญชีแบบกลุ่ม',
        html: `คุณกำลังจะระงับการใช้งาน <b>${selectedIds.length}</b> บัญชี เนื่องจากไม่ลงทะเบียนประวัติ<br><br><span style="color:red; font-size:14px;">*บัญชีเหล่านี้จะไม่สามารถเข้าระบบได้จนกว่าแอดมินจะปลดล็อก</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ยืนยันระงับบัญชี',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading('กำลังดำเนินการระงับบัญชี');
            try {
                const res = await callApi("bulkSuspendNoProfileUsers", { 
                    userIds: selectedIds, 
                    adminId: adminId, 
                    token: userToken 
                });
                
                if (checkAuthError(res)) { hideLoading(); return; }
                hideLoading();

                if (res.success) {
                    Swal.fire('สำเร็จ', res.message, 'success');
                    loadMissingProfileUsers(); 
                } else {
                    Swal.fire('ผิดพลาด', res.message, 'error');
                }
            } catch (err) {
                hideLoading();
                Swal.fire('ผิดพลาด', err.message, 'error');
            }
        }
    });
}

const btnAdminSuspendAccount = document.getElementById('btnAdminSuspendAccount');
if (btnAdminSuspendAccount) {
    btnAdminSuspendAccount.onclick = () => {
        const studentIdEl = document.getElementById('adm_ver_studentId');
        if (!studentIdEl) return;
        
        const studentId = studentIdEl.textContent.trim();
        
        Swal.fire({
            title: 'ระบุสาเหตุการระงับบัญชี',
            html: `
                <input id="swal-suspend-reason-ver" class="swal2-input" placeholder="ระบุสาเหตุการระงับ" style="width: 85%;">
                <div style="margin-top: 15px; text-align: left; padding: 0 25px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #d32f2f; font-weight: bold; font-size: 14px;">
                        <input type="checkbox" id="swal-require-survey-ver" style="width: 18px; height: 18px;" checked>
                        บังคับให้ทำแบบสอบถามความเสี่ยง ก่อนปลดล็อก
                    </label>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ระงับบัญชี',
            confirmButtonColor: '#d33',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                const reason = document.getElementById('swal-suspend-reason-ver').value.trim();
                const reqSurvey = document.getElementById('swal-require-survey-ver').checked;
                if (!reason) { 
                    Swal.showValidationMessage('กรุณาระบุสาเหตุการระงับบัญชี'); 
                    return false; 
                }
                return reqSurvey ? '[REQ_SURVEY]' + reason : reason;
            }
        }).then(r => { 
            if (r.isConfirmed) {
                executeAdminSuspendVerifyPage(studentId, r.value);
            }
        });
    };
}


async function executeAdminSuspendVerifyPage(studentId, reason) {
    showLoading('กำลังค้นหาข้อมูลบัญชี');
    try {
        let targetId = null;

        const searchRes = await callApi("searchUsersBackend", { query: studentId, adminId: adminId, token: userToken });
        if (checkAuthError(searchRes)) { hideLoading(); return; }
        
        const usersArray = Array.isArray(searchRes) ? searchRes : (searchRes.data || []);
        const targetUser = usersArray.find(u => String(u.studentId).trim() === String(studentId).trim());
        
        if (targetUser && targetUser.id) {
            targetId = String(targetUser.id).trim();
        }

        if (!targetId) {
            hideLoading();
            Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลบัญชีผู้ใช้งานนี้ในระบบฐานข้อมูล', 'error');
            return;
        }

        showLoading('กำลังบันทึกการระงับบัญชี');
        
        const updateRes = await callApi("updateUser", { 
            userId: targetId, 
            updatedData: { 
                status: 'Suspended', 
                suspendReason: reason 
            }, 
            adminId: adminId, 
            token: userToken 
        });
        
        if (checkAuthError(updateRes)) { hideLoading(); return; }
        hideLoading();
        
        if (updateRes.success) {
            Swal.fire('สำเร็จ', 'ระงับบัญชีเรียบร้อยแล้ว', 'success');
            const checkBtn = document.getElementById('btnAdminCheckVerify');
            if(checkBtn) checkBtn.click(); 
        } else {
            Swal.fire('ผิดพลาด', updateRes.message, 'error');
        }
    } catch(err) {
        hideLoading();
        Swal.fire('Error', err.message, 'error');
    }
}

    let currentAttendanceActId = null;

    window.openAttendanceModal = async (id) => {
        currentAttendanceActId = id;
        showLoading('กำลังโหลดรายชื่อผู้ลงทะเบียน');
        try {
            const list = await callApi("getRegisteredList", { id: id, adminId: adminId, token: userToken });
            hideLoading();
            if(checkAuthError(list)) return;

            const tb = document.getElementById('attendanceTableBody');
            tb.innerHTML = '';
            if(!list || list.length === 0) {
                tb.innerHTML = '<tr><td colspan="4" style="text-align:center;">ไม่มีผู้ลงทะเบียนในรอบนี้</td></tr>';
            } else {
                list.forEach((s, i) => {
                    const isAbsent = (s.status === 'ขาดกิจกรรม');
                    tb.innerHTML += `<tr>
                        <td style="text-align:center;">${i+1}</td>
                        <td style="font-weight:bold;">${escapeHTML(s.studentId)}</td>
                        <td>${escapeHTML(s.name)}</td>
                        <td style="text-align:center;">
                            <input type="checkbox" class="chk-absent" value="${escapeHTML(s.studentId)}" style="transform: scale(1.5); cursor: pointer; accent-color: #e65100;" ${isAbsent ? 'checked' : ''}>
                        </td>
                    </tr>`;
                });
            }
            document.getElementById('attendanceModal').style.display = 'flex';
        } catch(err) {
            hideLoading();
            Swal.fire('Error', err.message, 'error');
        }
    };

    window.submitAttendance = async () => {
        const chks = document.querySelectorAll('.chk-absent:checked');
        const absentIds = Array.from(chks).map(c => c.value);

        showLoading('กำลังบันทึกข้อมูลเช็คชื่อ');
        try {
            const res = await callApi("saveAttendance", {
                activityId: currentAttendanceActId,
                absentStudentIds: absentIds,
                adminId: adminId,
                token: userToken
            });
            hideLoading();
            if(res.success) {
                Swal.fire('สำเร็จ', 'บันทึกสถานะการเข้าร่วมกิจกรรมเรียบร้อยแล้ว', 'success');
                document.getElementById('attendanceModal').style.display = 'none';
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        } catch(e) {
            hideLoading();
            Swal.fire('Error', e.message, 'error');
        }
    };

    window.openWalkInModal = () => { 
    const actSelect = document.getElementById('walkInActId');
    if (actSelect) {
        actSelect.innerHTML = '<option value="">-- เลือกรอบกิจกรรม --</option>';
        const sortedActivities = [...adminActivitiesCache].sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedActivities.forEach(act => {
            if(act.status === 'Hide') return; 
            const dateStr = formatDate(act.date);
            actSelect.innerHTML += `<option value="${escapeHTML(act.id)}">${escapeHTML(act.name)} - วันที่ ${dateStr} (${escapeHTML(act.period)})</option>`;
        });
    }
    const studentInput = document.getElementById('walkInStudentId');
    if (studentInput) {
        studentInput.value = '';
    }
    const modal = document.getElementById('walkInModal');
    if (modal) {
        modal.style.display = 'flex'; 
    }
};

    window.submitWalkIn = async () => {
        const sid = document.getElementById('walkInStudentId').value.trim();
        const aid = document.getElementById('walkInActId').value;
        
        if(!sid) return Swal.fire('แจ้งเตือน','กรุณาระบุรหัสนักศึกษาให้ครบถ้วน','warning');
        if(!aid) return Swal.fire('แจ้งเตือน','กรุณาเลือกรอบกิจกรรมที่ต้องการเพิ่มชื่อ','warning');

        showLoading('กำลังบันทึกนักศึกษาเข้าสู่ระบบ');
        try {
            const res = await callApi("adminRegisterWalkIn", {
                studentId: sid,
                activityId: aid,
                adminId: adminId,
                token: userToken
            });
            hideLoading();
            if(res.success) {
                Swal.fire('ทำรายการสำเร็จ', 'เพิ่มชื่อนักศึกษาเข้าร่วมกิจกรรมและเช็คชื่อ (มาปกติ) เรียบร้อยแล้ว', 'success');
                document.getElementById('walkInModal').style.display = 'none';
                loadActivitiesForAdmin(); 
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        } catch(e) {
            hideLoading();
            Swal.fire('Error', e.message, 'error');
        }
    };

window.uploadGysExcelFile = () => {
    const fileInput = document.getElementById('gysExcelInput');
    const borrowerType = document.getElementById('gysBorrowerType').value; // รับค่าประเภทผู้กู้
    if(!fileInput) return;
    const file = fileInput.files[0]; 
    
    if (!file) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ Excel กยศ. ก่อนกดอัปโหลด', 'warning');
        return;
    }
    
    Swal.fire({
        title: 'กำลังประมวลผลไฟล์', 
        html: `ระบบกำลังบันทึกเป็นกลุ่ม: <b>${borrowerType}</b><br>และคัดแยกข้อมูลที่ซ้ำซ้อน...`,
        allowOutsideClick: false, 
        didOpen: () => { Swal.showLoading() }
    });
    
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const base64Content = e.target.result.split(',')[1];
            const r = await callApi("uploadGysExcelData", {
                fileName: file.name, 
                mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                content: base64Content,
                borrowerType: borrowerType, // ส่งประเภทไปหลังบ้าน
                adminId: adminId, 
                token: userToken
            });
            
            if (r.success) {
                Swal.fire({
                    title: 'นำเข้าข้อมูลสำเร็จ',
                    html: `บันทึกข้อมูลใหม่ (${borrowerType}): <b>${r.insertedCount}</b> รายการ<br>ข้ามข้อมูลที่ซ้ำและมีอยู่แล้ว: <b>${r.duplicateCount}</b> รายการ`,
                    icon: 'success'
                });
                fileInput.value = '';
                await loadGysDashboardData({ refreshAvs: true }); 
            } else {
                Swal.fire('ผิดพลาด', r.message, 'error'); 
            }
        } catch(err) {
            Swal.fire('ข้อผิดพลาดระบบ', err.message, 'error');
        }
    };
    reader.onerror = () => Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้', 'error');
    reader.readAsDataURL(file); 
};

window.gysSummaryCache = [];
window._gysDashboardRequestSeq = 0;

function updateGysFilterOptions_(selectEl, values, prefix, currentValue) {
    if (!selectEl) return;

    const existingAllText = selectEl.options[0] ? selectEl.options[0].text : 'ทั้งหมด';
    selectEl.innerHTML = '';
    selectEl.add(new Option(existingAllText, 'all'));

    (values || []).forEach(value => {
        selectEl.add(new Option(`${prefix}${value}`, String(value)));
    });

    const desired = String(currentValue || 'all');
    selectEl.value = Array.from(selectEl.options).some(opt => opt.value === desired) ? desired : 'all';
}

function adjustHexColor_(hexColor, amount) {
    const safeHex = String(hexColor || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(safeHex)) return hexColor;

    const clamp = v => Math.max(0, Math.min(255, v));
    const r = clamp(parseInt(safeHex.substring(0, 2), 16) + amount);
    const g = clamp(parseInt(safeHex.substring(2, 4), 16) + amount);
    const b = clamp(parseInt(safeHex.substring(4, 6), 16) + amount);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}


window.downloadGysChartImage = function(canvasId, baseFileName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof canvas.toDataURL !== 'function') {
        return Swal.fire('แจ้งเตือน', 'ไม่พบกราฟที่ต้องการดาวน์โหลด', 'warning');
    }

    try {
        const link = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        link.href = canvas.toDataURL('image/png', 1.0);
        link.download = `${baseFileName || 'chart'}_${stamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        Swal.fire('ผิดพลาด', 'ไม่สามารถดาวน์โหลดภาพกราฟได้: ' + err.message, 'error');
    }
};

function registerGysPieDepthPlugin_() {
    if (window._gysPieDepthPluginRegistered || typeof Chart === 'undefined') return;

    Chart.register({
        id: 'gysPieDepth',
        beforeDatasetDraw(chart, args, pluginOptions) {
            if (!pluginOptions || !pluginOptions.enabled) return;
            if (!['pie', 'doughnut'].includes(chart.config.type)) return;
            if (args.index !== 0) return;

            const meta = chart.getDatasetMeta(args.index);
            const dataset = chart.data.datasets[args.index];
            if (!meta || !dataset || !Array.isArray(meta.data)) return;

            const depth = Math.max(4, Number(pluginOptions.depth) || 14);
            const darken = Math.abs(Number(pluginOptions.darken) || 28);
            const ctx = chart.ctx;

            meta.data.forEach((arc, i) => {
                const props = arc.getProps(['x', 'y', 'startAngle', 'endAngle', 'outerRadius', 'innerRadius'], true);
                const fill = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[i] : dataset.backgroundColor;
                const sideFill = adjustHexColor_(fill, -darken);

                ctx.save();
                for (let d = depth; d > 0; d--) {
                    ctx.beginPath();
                    ctx.fillStyle = sideFill;
                    ctx.moveTo(props.x, props.y + d);
                    ctx.arc(props.x, props.y + d, props.outerRadius, props.startAngle, props.endAngle);
                    if (props.innerRadius > 0) {
                        ctx.arc(props.x, props.y + d, props.innerRadius, props.endAngle, props.startAngle, true);
                    } else {
                        ctx.lineTo(props.x, props.y + d);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            });
        }
    });

    Chart.register({
        id: 'gysPieCalloutLabels',
        afterDatasetsDraw(chart, args, pluginOptions) {
            if (!pluginOptions || !pluginOptions.enabled) return;
            if (!['pie', 'doughnut'].includes(chart.config.type)) return;

            const datasetIndex = Number(pluginOptions.datasetIndex || 0);
            const meta = chart.getDatasetMeta(datasetIndex);
            const dataset = chart.data.datasets[datasetIndex];
            if (!meta || !dataset || !Array.isArray(meta.data)) return;

            const ctx = chart.ctx;
            const labels = chart.data.labels || [];
            const values = Array.isArray(dataset.data) ? dataset.data.map(v => Number(v || 0)) : [];
            const total = values.reduce((sum, value) => sum + value, 0);
            const lineColor = pluginOptions.lineColor || '#1e3a8a';
            const textColor = pluginOptions.textColor || '#0f172a';
            const valueColor = pluginOptions.valueColor || '#334155';
            const lineWidth = Number(pluginOptions.lineWidth || 2);
            const armLength = Number(pluginOptions.armLength || 22);
            const horizontalLength = Number(pluginOptions.horizontalLength || 44);
            const startOffset = Number(pluginOptions.startOffset || 10);

            ctx.save();
            meta.data.forEach((arc, i) => {
                const value = Number(values[i] || 0);
                if (value <= 0) return;

                const props = arc.getProps(['x', 'y', 'startAngle', 'endAngle', 'outerRadius'], true);
                const angle = (props.startAngle + props.endAngle) / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const startX = props.x + cos * (props.outerRadius + startOffset);
                const startY = props.y + sin * (props.outerRadius + startOffset);
                const elbowX = props.x + cos * (props.outerRadius + armLength);
                const elbowY = props.y + sin * (props.outerRadius + armLength);
                const isRightSide = cos >= 0;
                const endX = elbowX + (isRightSide ? horizontalLength : -horizontalLength);
                const endY = elbowY;
                const percent = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
                const mainLabel = String(labels[i] || '');
                const valueLabel = `${value.toLocaleString()} คน (${percent}%)`;

                ctx.beginPath();
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = lineWidth;
                ctx.moveTo(startX, startY);
                ctx.lineTo(elbowX, elbowY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                ctx.fillStyle = textColor;
                ctx.font = '700 13px Sarabun';
                ctx.textAlign = isRightSide ? 'left' : 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(mainLabel, endX + (isRightSide ? 6 : -6), endY - 2);

                ctx.fillStyle = valueColor;
                ctx.font = '500 12px Sarabun';
                ctx.textBaseline = 'top';
                ctx.fillText(valueLabel, endX + (isRightSide ? 6 : -6), endY + 2);
            });
            ctx.restore();
        }
    });

    window._gysPieDepthPluginRegistered = true;
}

function registerGysBarValuePlugin_() {
    if (window._gysBarValuePluginRegistered || typeof Chart === 'undefined') return;

    Chart.register({
        id: 'gysBarValueLabels',
        afterDatasetsDraw(chart, args, pluginOptions) {
            if (!pluginOptions || !pluginOptions.enabled) return;
            if (chart.config.type !== 'bar') return;

            const ctx = chart.ctx;
            const datasets = Array.isArray(chart.data.datasets) ? chart.data.datasets : [];
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || meta.hidden || !Array.isArray(meta.data)) return;

                meta.data.forEach((bar, index) => {
                    const rawValue = Array.isArray(dataset.data) ? dataset.data[index] : null;
                    const value = Number(rawValue || 0);
                    if (!Number.isFinite(value) || value < 0) return;

                    const facultyTotal = datasets.reduce((sum, ds) => {
                        const val = Array.isArray(ds.data) ? Number(ds.data[index] || 0) : 0;
                        return sum + (Number.isFinite(val) ? val : 0);
                    }, 0);
                    const percent = facultyTotal > 0 ? ((value / facultyTotal) * 100).toFixed(1) : '0.0';

                    const props = bar.getProps(['x', 'y', 'base'], true);
                    const barHeight = Math.abs((props.base || 0) - (props.y || 0));

                    ctx.save();
                    ctx.textAlign = 'center';

                    ctx.fillStyle = pluginOptions.valueColor || '#0f172a';
                    ctx.font = pluginOptions.valueFont || '700 12px Sarabun';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(`${value.toLocaleString()} คน`, props.x, props.y - 18);
                    ctx.font = pluginOptions.percentFont || '600 11px Sarabun';
                    ctx.fillText(`${percent}%`, props.x, props.y - 4);

                    if (pluginOptions.showSeriesLabel !== false && barHeight >= 34) {
                        ctx.fillStyle = pluginOptions.seriesColor || '#ffffff';
                        ctx.font = pluginOptions.seriesFont || '600 10px Sarabun';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(String(dataset.label || ''), props.x, props.base - 12);
                    }

                    ctx.restore();
                });
            });
        }
    });

    window._gysBarValuePluginRegistered = true;
}

function renderGysBorrowerComparisonCharts_(res, requestedFilters = {}) {
    if (typeof Chart === 'undefined') return;

    const barCanvas = document.getElementById('gysYearCompareChart');
    const noteEl = document.getElementById('gysChartFilterNote');
    if (!barCanvas) return;

    const oldBarChart = (typeof Chart.getChart === 'function') ? Chart.getChart(barCanvas) : window.gysYearCompareChartInstance;
    if (oldBarChart && typeof oldBarChart.destroy === 'function') oldBarChart.destroy();
    window.gysYearCompareChartInstance = null;

    const termLabel = requestedFilters.term && requestedFilters.term !== 'all'
        ? `ภาคเรียนที่ ${requestedFilters.term}`
        : 'ทุกภาคการศึกษา';
    const yearLabel = requestedFilters.year && requestedFilters.year !== 'all'
        ? `ปีการศึกษา ${requestedFilters.year}`
        : 'ทุกปีการศึกษา';
    if (noteEl) {
        noteEl.textContent = `กราฟแท่งนี้สรุปข้อมูลตามตัวกรอง ${yearLabel} · ${termLabel} โดยแสดงรายเก่าและรายใหม่แบบคู่กันแยกตามทุกคณะ พร้อมจำนวนและสัดส่วนเปอร์เซ็นต์บนแท่งกราฟ`;
    }

    const facultyRows = Array.isArray(res && res.summaryData)
        ? res.summaryData.filter(row => row && row.isSpecialLiving !== true)
        : [];

    const facultyMap = {};
    facultyRows.forEach(row => {
        const facultyName = String(row.faculty || 'ไม่ระบุคณะ').trim() || 'ไม่ระบุคณะ';
        if (!facultyMap[facultyName]) {
            facultyMap[facultyName] = { faculty: facultyName, oldCount: 0, newCount: 0, totalCount: 0 };
        }

        const count = Number(row.count || 0);
        if (String(row.borrowerType) === 'รายเก่า') facultyMap[facultyName].oldCount += count;
        if (String(row.borrowerType) === 'รายใหม่') facultyMap[facultyName].newCount += count;
        facultyMap[facultyName].totalCount += count;
    });

    const facultyChartData = Object.values(facultyMap).sort((a, b) => b.totalCount - a.totalCount);

    if (facultyChartData.length === 0) {
        const ctx = barCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, barCanvas.width, barCanvas.height);
            ctx.save();
            ctx.font = '14px Sarabun';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText('ไม่พบข้อมูลกราฟตามเงื่อนไขที่เลือก', barCanvas.width / 2, barCanvas.height / 2);
            ctx.restore();
        }
        return;
    }

    const barLabels = facultyChartData.map(item => String(item.faculty || '').replace(/^คณะ/, ''));
    const oldCounts = facultyChartData.map(item => Number(item.oldCount || 0));
    const newCounts = facultyChartData.map(item => Number(item.newCount || 0));
    const totals = facultyChartData.map(item => Number(item.totalCount || 0));

    registerGysBarValuePlugin_();

    window.gysYearCompareChartInstance = new Chart(barCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [
                {
                    label: 'รายเก่า',
                    data: oldCounts,
                    backgroundColor: '#f59e0b',
                    borderColor: '#d97706',
                    borderWidth: 1.5,
                    borderRadius: 8,
                    maxBarThickness: 34
                },
                {
                    label: 'รายใหม่',
                    data: newCounts,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1.5,
                    borderRadius: 8,
                    maxBarThickness: 34
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 10, padding: 18 } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const idx = ctx.dataIndex;
                            const value = Number(ctx.raw || 0);
                            const total = Number(totals[idx] || 0);
                            const pct = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
                            return `${ctx.dataset.label}: ${value.toLocaleString()} คน (${pct}%)`;
                        },
                        footer: (items) => {
                            const idx = items && items.length ? items[0].dataIndex : -1;
                            if (idx < 0) return '';
                            return `รวมทั้งคณะ: ${Number(totals[idx] || 0).toLocaleString()} คน`;
                        }
                    }
                },
                gysBarValueLabels: {
                    enabled: true,
                    valueColor: '#0f172a',
                    seriesColor: '#ffffff',
                    valueFont: '700 12px Sarabun',
                    percentFont: '600 11px Sarabun',
                    seriesFont: '600 10px Sarabun',
                    showSeriesLabel: true
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 35,
                        minRotation: 35,
                        font: { size: 11 }
                    },
                    title: { display: true, text: 'คณะ / สังกัด' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: 'จำนวนผู้กู้ยืม (คน)' }
                }
            }
        }
    });
}

window.renderGysDashboardData = (res, requestedFilters = {}) => {
    if (!res || !res.success) return;

    window.gysSummaryCache = Array.isArray(res.summaryData) ? res.summaryData : [];

    const totalStudentsEl = document.getElementById('gysTotalStudents');
    const totalAmountEl = document.getElementById('gysTotalAmount');
    const oldCountEl = document.getElementById('gysOldCount');
    const newCountEl = document.getElementById('gysNewCount');

    if (totalStudentsEl) totalStudentsEl.textContent = Number(res.grandTotalStudents || 0).toLocaleString();
    if (totalAmountEl) totalAmountEl.textContent = Number(res.grandTotalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
    if (oldCountEl) oldCountEl.textContent = Number(res.totalOld || 0).toLocaleString();
    if (newCountEl) newCountEl.textContent = Number(res.totalNew || 0).toLocaleString();

    renderGysBorrowerComparisonCharts_(res, requestedFilters);

    updateGysFilterOptions_(
        document.getElementById('gysFilterYear'),
        res.years,
        'ปีการศึกษา ',
        requestedFilters.year
    );
    updateGysFilterOptions_(
        document.getElementById('gysFilterTerm'),
        res.terms,
        'ภาคการศึกษา ',
        requestedFilters.term
    );

    const selectedType = String(requestedFilters.type || 'all');
    const specialCountEl = document.getElementById('gysSpecialCount');
    const specialAmountEl = document.getElementById('gysSpecialAmount');

    // ช่องบันทึกจะแสดงยอดเดิมเฉพาะเมื่อเลือกประเภทผู้กู้ชัดเจน
    if (specialCountEl && specialAmountEl) {
        if (selectedType === 'รายเก่า' || selectedType === 'รายใหม่') {
            const count = Number(res.specialCount || 0);
            specialCountEl.value = count > 0 ? count : '';
            specialAmountEl.value = count > 0 ? (count * 18000).toLocaleString() : '';
        } else {
            specialCountEl.value = '';
            specialAmountEl.value = '';
        }
    }

    const tb = document.querySelector('#gysSummaryTable tbody');
    if (!tb) return;

    tb.innerHTML = '';
    if (window.gysSummaryCache.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#999;">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>';
        return;
    }

    window.gysSummaryCache.forEach((row, i) => {
        const isSpecial = row.isSpecialLiving === true;
        const facStyle = isSpecial ? 'color:#d32f2f; font-weight:bold;' : '';
        const typeStyle = isSpecial ? 'color:#d32f2f; font-weight:bold;' : '';
        const typeText = isSpecial
            ? `${escapeHTML(row.borrowerType)} (เฉพาะค่าครองชีพ)`
            : escapeHTML(row.borrowerType);

        tb.innerHTML += `<tr>
            <td style="text-align:center; ${facStyle}">${i + 1}</td>
            <td style="${facStyle}">${escapeHTML(row.faculty)}</td>
            <td style="text-align:center; ${typeStyle}">${typeText}</td>
            <td style="text-align:center; ${facStyle}">${Number(row.count || 0).toLocaleString()}</td>
            <td style="text-align:right; padding-right:20px; font-weight:bold; ${facStyle}">
                ${Number(row.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
            </td>
        </tr>`;
    });
};

window.loadGysDashboardData = async (options = {}) => {
    const year = document.getElementById('gysFilterYear') ? document.getElementById('gysFilterYear').value : 'all';
    const term = document.getElementById('gysFilterTerm') ? document.getElementById('gysFilterTerm').value : 'all';
    const type = document.getElementById('gysFilterType') ? document.getElementById('gysFilterType').value : 'all';
    const requestId = ++window._gysDashboardRequestSeq;

    const silent = options && options.silent === true;
    if (!silent) showLoading('กำลังประมวลผลข้อมูลสรุป');

    try {
        const res = await callApi("getGysDashboardSummary", {
            adminId: adminId,
            token: userToken,
            year: year,
            term: term,
            type: type
        });

        // ป้องกัน response เก่ากลับมาทับค่าหลังผู้ใช้เปลี่ยนตัวกรองเร็ว ๆ
        if (requestId !== window._gysDashboardRequestSeq) return;
        if (checkAuthError(res)) return;

        if (res && res.success) {
            window.renderGysDashboardData(res, { year, term, type });
        } else if (res) {
            Swal.fire('ผิดพลาด', res.message || 'ไม่สามารถโหลดข้อมูลสรุปได้', 'error');
        }

        // โหลดรายการ AVS เฉพาะตอนเข้าหน้าครั้งแรก/หลังอัปโหลด ไม่ยิงซ้ำทุกครั้งที่เปลี่ยนตัวกรอง
        if (options && options.refreshAvs === true && typeof window.loadAvsDates === 'function') {
            window.loadAvsDates(true);
        }
    } catch(err) {
        console.error(err);
        if (!silent) Swal.fire('ผิดพลาด', err.message, 'error');
    } finally {
        if (!silent && requestId === window._gysDashboardRequestSeq) hideLoading();
    }
};

window.saveGysSpecialLiving = async () => {
    const year = document.getElementById('gysFilterYear') ? document.getElementById('gysFilterYear').value : 'all';
    const term = document.getElementById('gysFilterTerm') ? document.getElementById('gysFilterTerm').value : 'all';
    const borrowerType = document.getElementById('gysFilterType') ? document.getElementById('gysFilterType').value : 'all';
    const countInput = document.getElementById('gysSpecialCount');
    const count = countInput ? parseInt(countInput.value, 10) : 0;

    if(year === 'all' || term === 'all') {
        return Swal.fire(
            'แจ้งเตือน',
            'กรุณาเลือกปีการศึกษาและภาคการศึกษาก่อนบันทึกยอดค่าครองชีพ',
            'warning'
        );
    }

    if(borrowerType !== 'รายเก่า' && borrowerType !== 'รายใหม่') {
        return Swal.fire(
            'แจ้งเตือน',
            'กรุณาเลือกตัวกรองประเภทผู้กู้เป็น “เฉพาะรายเก่า” หรือ “เฉพาะรายใหม่” ก่อนบันทึก เพื่อให้ระบบแยกยอดไม่ทับกัน',
            'warning'
        );
    }

    if(!Number.isFinite(count) || count <= 0) {
        return Swal.fire('แจ้งเตือน', 'กรุณาระบุจำนวนผู้กู้ที่มากกว่า 0 คน', 'warning');
    }

    const confirmResult = await Swal.fire({
        title: 'ยืนยันการบันทึกข้อมูล',
        html: `คุณกำลังบันทึกยอดผู้กู้ยืมเฉพาะค่าครองชีพ <b>${borrowerType}</b> จำนวน <b>${count.toLocaleString()}</b> คน<br><br>` +
              `<div style="margin: 15px 0; padding: 15px; background: #e3f2fd; border-radius: 8px; border: 1px solid #90caf9;">` +
              `<span style="color:#1976D2; font-size:17px; font-weight:bold;">ปีการศึกษา ${escapeHTML(year)} · ภาคเรียนที่ ${escapeHTML(term)} · ${escapeHTML(borrowerType)}</span></div>` +
              `<span style="color:#d32f2f; font-size:14px; font-weight:bold;">ระบบจะแยกยอดตามประเภทผู้กู้ ไม่ใช้ยอดรายเก่าและรายใหม่ทับกัน</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ยืนยันการบันทึก',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) return;

    showLoading('กำลังบันทึกยอดค่าครองชีพ');
    try {
        const res = await callApi("saveGysSpecialLivingCount", {
            year: year,
            term: term,
            borrowerType: borrowerType,
            count: count,
            adminId: adminId,
            token: userToken
        });

        if(checkAuthError(res)) return;

        if(res && res.success) {
            // Backend ส่ง summary ล่าสุดกลับมาใน request เดียว แสดงผลได้ทันทีโดยไม่ต้องกดรีเฟรช
            if (res.dashboard && res.dashboard.success) {
                window.renderGysDashboardData(res.dashboard, {
                    year: year,
                    term: term,
                    type: borrowerType
                });
            } else {
                // fallback เฉพาะกรณี backend บันทึกสำเร็จแต่สร้าง summary ใน response เดียวไม่สำเร็จ
                await window.loadGysDashboardData({ silent: true });
            }

            hideLoading();
            Swal.fire({
                title: 'สำเร็จ',
                text: res.message,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            hideLoading();
            Swal.fire('ผิดพลาด', (res && res.message) || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    } catch(err) {
        hideLoading();
        Swal.fire('Error', err.message, 'error');
    }
};

window.downloadGysSummary = async () => {
    const year = document.getElementById('gysFilterYear') ? document.getElementById('gysFilterYear').value : 'all';
    
    showLoading('ระบบกำลังสร้างไฟล์ Excel');
    try {
        const res = await callApi("getGysSummaryExport", { year: year, adminId: adminId, token: userToken });
        if(checkAuthError(res)) { hideLoading(); return; }
        hideLoading();
        
        if(res.success) {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(res.aoa);

            ws['!merges'] = [
                { s: {r: 0, c: 0}, e: {r: 0, c: 12} }, 
                { s: {r: 1, c: 0}, e: {r: 2, c: 0} },  
                { s: {r: 1, c: 1}, e: {r: 1, c: 6} },  
                { s: {r: 1, c: 7}, e: {r: 1, c: 12} }, 
                { s: {r: res.aoa.length - 1, c: 0}, e: {r: res.aoa.length - 1, c: 12} } 
            ];
            
            ws['!cols'] = [
                { wpx: 250 }, 
                { wpx: 120 }, { wpx: 120 }, { wpx: 120 }, { wpx: 120 }, { wpx: 120 }, { wpx: 120 },
                { wpx: 120 }, { wpx: 120 }, { wpx: 120 }, { wpx: 120 }, { wpx: 120 }, { wpx: 120 }
            ];

            for (let cellAddress in ws) {
                if (cellAddress[0] === '!') continue; 
                let cell = ws[cellAddress];
                if (cell.t === 'n') { 
                    cell.z = '#,##0'; 
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, "สรุปยอดเงินกู้ยืม");
            XLSX.writeFile(wb, res.fileName);
        } else {
            Swal.fire('ผิดพลาด', res.message, 'error');
        }
    } catch(err) {
        hideLoading();
        Swal.fire('Error', err.message, 'error');
    }
};

// ฟังก์ชันดึงวันที่นำเข้าข้อมูล เพื่อใส่ใน Dropdown ตัวเลือกการโหลดไฟล์ AVS
window._gysAvsDatesLoaded = false;

window.loadAvsDates = async (force = false) => {
    if (window._gysAvsDatesLoaded && !force) return;

    try {
        const res = await callApi("getGysAvsDates", { adminId: adminId, token: userToken });
        if (res && res.success) {
            const sel = document.getElementById('avsDateSelect');
            if (sel) {
                const current = sel.value;
                sel.innerHTML = '<option value="">-- เลือกวันที่นำเข้าข้อมูล --</option>';
                if (res.dates.length === 0) {
                    sel.innerHTML = '<option value="">-- ไม่มีข้อมูล --</option>';
                } else {
                    res.dates.forEach(d => {
                        const [yyyy, mm, dd] = d.split('-');
                        const thYear = parseInt(yyyy, 10) + 543;
                        sel.innerHTML += `<option value="${d}">ข้อมูลนำเข้าเมื่อ: ${dd}/${mm}/${thYear}</option>`;
                    });
                    if (Array.from(sel.options).some(opt => opt.value === current)) sel.value = current;
                }
            }
            window._gysAvsDatesLoaded = true;
        }
    } catch(err) {
        console.error("โหลดรายการ AVS ไม่สำเร็จ:", err);
    }
};

window.downloadAvsReport = async () => {
    const dateSel = document.getElementById('avsDateSelect');
    const targetDate = dateSel ? dateSel.value : '';
    
    if (!targetDate) {
        return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันที่ที่มีการนำเข้าข้อมูลก่อนดาวน์โหลดไฟล์ AVS', 'warning');
    }
    
    showLoading('กำลังสร้างไฟล์ AVS ในรูปแบบตาราง');
    try {
        const res = await callApi("getGysAvsExport", { date: targetDate, adminId: adminId, token: userToken });
        if (checkAuthError(res)) { hideLoading(); return; }
        hideLoading();
        
        if (res.success) {
            const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
            const d = new Date();
            const currentDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
            
            const row1 = ["ชื่อรายงาน", "รายการโอนเงินค่าเล่าเรียน", "", "", "", "", "", "", "", ""];
            const row2 = ["วันที่เรียกรายงาน", currentDate, "", "", "", "", "", "", "", ""];
            const row3 = ["", "", "", "", "", "", "", "", "", ""];
            const headers = [
              "ที่", "เลขประจำตัวประชาชน", "ชื่อ นามสกุล", "", "", 
              "รวมยอดค่าเล่าเรียนตามที่ลงทะเบียนจริง (บาท)", "", "", 
              "ยอดค่าเล่าเรียนที่ผู้กู้เบิก (บาท)", "รหัสนักศึกษา"
            ];
            
            const dataRows = res.data.map(item => [
              item.no,
              item.citizenId,
              item.name,
              "", "", 
              item.tuitionReal,
              "", "", 
              item.withdraw,
              item.studentId
            ]);
            
            const finalData = [row1, row2, row3, headers, ...dataRows];
            const ws = XLSX.utils.aoa_to_sheet(finalData);
            
            ws['!cols'] = [
              {wch: 5},  {wch: 20}, {wch: 25}, {wch: 5}, {wch: 5},
              {wch: 25}, {wch: 5},  {wch: 5},  {wch: 20}, {wch: 15}
            ];
            
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = 0; R <= range.e.r; ++R) {
              for (let C = 0; C <= range.e.c; ++C) {
                let cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if (!ws[cellRef]) continue; 
                
                if (R >= 4 && (C === 5 || C === 8)) {
                   if(ws[cellRef].t === 'n') {
                     ws[cellRef].z = "#,##0.00"; 
                   }
                }
              }
            }
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "AVS Report");
            XLSX.writeFile(wb, `AVS_DSL_${targetDate}.xlsx`);
        } else {
            Swal.fire('ผิดพลาด', res.message, 'warning');
        }
    } catch(err) {
        hideLoading();
        Swal.fire('Error', err.message, 'error');
    }
};



// v2.0.7: externalized legacy HTML event handlers for strict CSP.
document.addEventListener('DOMContentLoaded', function () {
  (function(el){ if(el) el.addEventListener("click", function(event){ showPage('suspendSystemSection') }); })(document.getElementById("_sec_evt_1"));
  (function(el){ if(el) el.addEventListener("click", function(event){ showPage('section-admin-verify') }); })(document.getElementById("_sec_evt_2"));
  (function(el){ if(el) el.addEventListener("click", function(event){ resetAdminVerifyForm() }); })(document.getElementById("_sec_evt_3"));
  (function(el){ if(el) el.addEventListener("mouseover", function(event){ this.style.background='#f8fafc'; this.style.color='#334155'; }); })(document.getElementById("_sec_evt_3"));
  (function(el){ if(el) el.addEventListener("mouseout", function(event){ this.style.background='#ffffff'; this.style.color='#64748b'; }); })(document.getElementById("_sec_evt_3"));
  (function(el){ if(el) el.addEventListener("click", function(event){ loadAdminImageReport(true) }); })(document.getElementById("_sec_evt_6"));
  (function(el){ if(el) el.addEventListener("click", function(event){ searchImageReport() }); })(document.getElementById("_sec_evt_7"));
  (function(el){ if(el) el.addEventListener("change", function(event){ filterImageReport() }); })(document.getElementById("imageStatusFilter"));
  (function(el){ if(el) el.addEventListener("change", function(event){ changeImageReportRowsPerPage() }); })(document.getElementById("imgRowsPerPage"));
  (function(el){ if(el) el.addEventListener("click", function(event){ prevImagePage() }); })(document.getElementById("imgBtnPrev"));
  (function(el){ if(el) el.addEventListener("click", function(event){ nextImagePage() }); })(document.getElementById("imgBtnNext"));
  (function(el){ if(el) el.addEventListener("click", function(event){ openWalkInModal() }); })(document.getElementById("_sec_evt_12"));
  (function(el){ if(el) el.addEventListener("click", function(event){ openAddActivityModal() }); })(document.getElementById("_sec_evt_13"));
  (function(el){ if(el) el.addEventListener("click", function(event){ switchAdminTab('current') }); })(document.getElementById("btnTabCurrent"));
  (function(el){ if(el) el.addEventListener("click", function(event){ switchAdminTab('history') }); })(document.getElementById("btnTabHistory"));
  (function(el){ if(el) el.addEventListener("click", function(event){ searchForSpecialLoan() }); })(document.getElementById("_sec_evt_16"));
  (function(el){ if(el) el.addEventListener("click", function(event){ grantSpecialLoanAccess() }); })(document.getElementById("_sec_evt_17"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadSpecialLoanFile() }); })(document.getElementById("_sec_evt_18"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('attendanceModal').style.display='none' }); })(document.getElementById("_sec_evt_19"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('attendanceModal').style.display='none' }); })(document.getElementById("_sec_evt_20"));
  (function(el){ if(el) el.addEventListener("click", function(event){ submitAttendance() }); })(document.getElementById("_sec_evt_21"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('walkInModal').style.display='none' }); })(document.getElementById("_sec_evt_22"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('walkInModal').style.display='none' }); })(document.getElementById("_sec_evt_23"));
  (function(el){ if(el) el.addEventListener("click", function(event){ submitWalkIn() }); })(document.getElementById("_sec_evt_24"));
  (function(el){ if(el) el.addEventListener("click", function(event){ searchForSpecialQueue() }); })(document.getElementById("_sec_evt_25"));
  (function(el){ if(el) el.addEventListener("click", function(event){ grantSpecialQueue() }); })(document.getElementById("_sec_evt_26"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadSpecialQueueFile() }); })(document.getElementById("_sec_evt_27"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('createQueueBulkModal').style.display='flex' }); })(document.getElementById("_sec_evt_28"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('createQueueSingleModal').style.display='flex' }); })(document.getElementById("_sec_evt_29"));
  (function(el){ if(el) el.addEventListener("click", function(event){ switchQueueTab('current') }); })(document.getElementById("tabQueueCurrent"));
  (function(el){ if(el) el.addEventListener("click", function(event){ switchQueueTab('history') }); })(document.getElementById("tabQueueHistory"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('createQueueBulkModal').style.display='none' }); })(document.getElementById("_sec_evt_32"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('createQueueBulkModal').style.display='none' }); })(document.getElementById("_sec_evt_33"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('createQueueSingleModal').style.display='none' }); })(document.getElementById("_sec_evt_34"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('createQueueSingleModal').style.display='none' }); })(document.getElementById("_sec_evt_35"));
  (function(el){ if(el) el.addEventListener("change", function(event){ updateTimeOptions() }); })(document.getElementById("searchQDate"));
  (function(el){ if(el) el.addEventListener("click", function(event){ printQueueList() }); })(document.getElementById("_sec_evt_37"));
  (function(el){ if(el) el.addEventListener("click", function(event){ unlockSelectedSuspended() }); })(document.getElementById("btnUnlockSelectedSuspended"));
  (function(el){ if(el) el.addEventListener("click", function(event){ deleteSelectedSuspended() }); })(document.getElementById("btnDeleteSelectedSuspended"));
  (function(el){ if(el) el.addEventListener("click", function(event){ loadSuspendedUsers() }); })(document.getElementById("_sec_evt_40"));
  (function(el){ if(el) el.addEventListener("click", function(event){ toggleAllSuspended(this) }); })(document.getElementById("selectAllSuspended"));
  (function(el){ if(el) el.addEventListener("click", function(event){ runDuplicateCheck() }); })(document.getElementById("_sec_evt_42"));
  (function(el){ if(el) el.addEventListener("click", function(event){ filterDuplicateResults() }); })(document.getElementById("_sec_evt_43"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadExcelFile() }); })(document.getElementById("_sec_evt_44"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadGPAExcelFile() }); })(document.getElementById("_sec_evt_45"));
  (function(el){ if(el) el.addEventListener("keyup", function(event){ filterLoanTable() }); })(document.getElementById("loanSearchInput"));
  (function(el){ if(el) el.addEventListener("change", function(event){ filterLoanTable() }); })(document.getElementById("loanStatusFilter"));
  (function(el){ if(el) el.addEventListener("change", function(event){ resetLoanPagination() }); })(document.getElementById("loanRowsPerPage"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changeLoanPage(-1) }); })(document.getElementById("btnLoanPrev"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changeLoanPage(1) }); })(document.getElementById("btnLoanNext"));
  (function(el){ if(el) el.addEventListener("click", function(event){ searchMissingStudent() }); })(document.getElementById("_sec_evt_51"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('missingStudentResultArea').style.display='none' }); })(document.getElementById("_sec_evt_52"));
  (function(el){ if(el) el.addEventListener("click", function(event){ searchLoanForAdmin() }); })(document.getElementById("_sec_evt_53"));
  (function(el){ if(el) el.addEventListener("change", function(event){ calcAdminLoanTotal() }); })(document.getElementById("adm_checkLiving"));
  (function(el){ if(el) el.addEventListener("change", function(event){ toggleAdminTuition() }); })(document.getElementById("adm_checkTuition"));
  (function(el){ if(el) el.addEventListener("input", function(event){ calcAdminLoanTotal() }); })(document.getElementById("adm_inputTuition"));
  (function(el){ if(el) el.addEventListener("click", function(event){ deleteLoanAsAdmin() }); })(document.getElementById("btnAdminDelete"));
  (function(el){ if(el) el.addEventListener("click", function(event){ saveLoanAsAdmin() }); })(document.getElementById("_sec_evt_58"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadAdminReport() }); })(document.getElementById("_sec_evt_59"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadOverExcel() }); })(document.getElementById("_sec_evt_60"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadOverGpa() }); })(document.getElementById("_sec_evt_61"));
  (function(el){ if(el) el.addEventListener("keyup", function(event){ filterOverTable() }); })(document.getElementById("overSearchInput"));
  (function(el){ if(el) el.addEventListener("change", function(event){ filterOverTable() }); })(document.getElementById("overStatusFilter"));
  (function(el){ if(el) el.addEventListener("change", function(event){ resetOverPagination() }); })(document.getElementById("overRowsPerPage"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadOverReport() }); })(document.getElementById("_sec_evt_65"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changeOverPage(-1) }); })(document.getElementById("btnOverPrev"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changeOverPage(1) }); })(document.getElementById("btnOverNext"));
  (function(el){ if(el) el.addEventListener("click", function(event){ executeBulkSuspend() }); })(document.getElementById("btnBulkSuspend"));
  (function(el){ if(el) el.addEventListener("change", function(event){ changeMissingRowsPerPage() }); })(document.getElementById("missingRowsPerPage"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changeMissingPage(-1) }); })(document.getElementById("btnMissingPrev"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changeMissingPage(1) }); })(document.getElementById("btnMissingNext"));
  (function(el){ if(el) el.addEventListener("click", function(event){ toggleAllMissing(this) }); })(document.getElementById("selectAllMissing"));
  (function(el){ if(el) el.addEventListener("click", function(event){ window.print() }); })(document.getElementById("_sec_evt_73"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadGysExcelFile() }); })(document.getElementById("_sec_evt_74"));
  (function(el){ if(el) el.addEventListener("input", function(event){ document.getElementById('gysSpecialAmount').value = this.value ? (this.value * 18000).toLocaleString() : '' }); })(document.getElementById("gysSpecialCount"));
  (function(el){ if(el) el.addEventListener("click", function(event){ saveGysSpecialLiving() }); })(document.getElementById("_sec_evt_76"));
  (function(el){ if(el) el.addEventListener("change", function(event){ loadGysDashboardData({silent:true}) }); })(document.getElementById("gysFilterYear"));
  (function(el){ if(el) el.addEventListener("change", function(event){ loadGysDashboardData({silent:true}) }); })(document.getElementById("gysFilterTerm"));
  (function(el){ if(el) el.addEventListener("change", function(event){ loadGysDashboardData({silent:true}) }); })(document.getElementById("gysFilterType"));
  (function(el){ if(el) el.addEventListener("click", function(event){ loadGysDashboardData() }); })(document.getElementById("_sec_evt_80"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadGysSummary() }); })(document.getElementById("_sec_evt_81"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadAvsReport() }); })(document.getElementById("_sec_evt_82"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadGysChartImage('gysYearCompareChart', 'gys_faculty_bar_chart') }); })(document.getElementById("_sec_evt_83"));
  (function(el){ if(el) el.addEventListener("click", function(event){ loadTransferData() }); })(document.getElementById("_sec_evt_84"));
  (function(el){ if(el) el.addEventListener("click", function(event){ exportTransferDataExcel() }); })(document.getElementById("_sec_evt_85"));
  (function(el){ if(el) el.addEventListener("change", function(event){ resetTransferPagination() }); })(document.getElementById("transferRowsPerPage"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changeTransferPage(-1) }); })(document.getElementById("btnTransferPrev"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changeTransferPage(1) }); })(document.getElementById("btnTransferNext"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadResignFile() }); })(document.getElementById("_sec_evt_89"));
  (function(el){ if(el) el.addEventListener("click", function(event){ exportResignCSV() }); })(document.getElementById("_sec_evt_90"));
  (function(el){ if(el) el.addEventListener("click", function(event){ printResignList() }); })(document.getElementById("_sec_evt_91"));
  (function(el){ if(el) el.addEventListener("click", function(event){ openAnnModal() }); })(document.getElementById("_sec_evt_92"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('annModal').style.display='none' }); })(document.getElementById("_sec_evt_93"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('annModal').style.display='none' }); })(document.getElementById("_sec_evt_94"));
  (function(el){ if(el) el.addEventListener("click", function(event){ saveAnnData() }); })(document.getElementById("_sec_evt_95"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadGpaPetitionXls() }); })(document.getElementById("_sec_evt_96"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadSpecialLoanImportFile() }); })(document.getElementById("_sec_evt_97"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadSpecialAccessImportFile() }); })(document.getElementById("_sec_evt_98"));
  (function(el){ if(el) el.addEventListener("click", function(event){ downloadFilteredPetitions() }); })(document.getElementById("_sec_evt_99"));
  (function(el){ if(el) el.addEventListener("click", function(event){ loadAdminPetitions() }); })(document.getElementById("_sec_evt_100"));
  (function(el){ if(el) el.addEventListener("keyup", function(event){ if(event.key === 'Enter') filterAdminPetitions() }); })(document.getElementById("petSearchInput"));
  (function(el){ if(el) el.addEventListener("click", function(event){ filterAdminPetitions() }); })(document.getElementById("_sec_evt_102"));
  (function(el){ if(el) el.addEventListener("change", function(event){ resetPetPage() }); })(document.getElementById("filterPetType"));
  (function(el){ if(el) el.addEventListener("change", function(event){ resetPetPage() }); })(document.getElementById("filterPetStatus"));
  (function(el){ if(el) el.addEventListener("click", function(event){ openBulkPetitionModal() }); })(document.getElementById("_sec_evt_105"));
  (function(el){ if(el) el.addEventListener("change", function(event){ resetPetPage() }); })(document.getElementById("petRowsPerPage"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changePetPage(-1) }); })(document.getElementById("btnPetPrev"));
  (function(el){ if(el) el.addEventListener("click", function(event){ changePetPage(1) }); })(document.getElementById("btnPetNext"));
  (function(el){ if(el) el.addEventListener("click", function(event){ toggleAllPetitions(this) }); })(document.getElementById("selectAllPetitions"));
  (function(el){ if(el) el.addEventListener("click", function(event){ saveAdminMenuSettings() }); })(document.getElementById("_sec_evt_110"));
  (function(el){ if(el) el.addEventListener("click", function(event){ searchForSpecialAccess() }); })(document.getElementById("_sec_evt_111"));
  (function(el){ if(el) el.addEventListener("click", function(event){ grantSpecialAccess() }); })(document.getElementById("btnGrantAccess"));
  (function(el){ if(el) el.addEventListener("click", function(event){ uploadSpecialAccessFile() }); })(document.getElementById("_sec_evt_113"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('userModal').style.display='none' }); })(document.getElementById("_sec_evt_114"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('userModal').style.display='none' }); })(document.getElementById("_sec_evt_115"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('adminProfileModal').style.display='none' }); })(document.getElementById("_sec_evt_116"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('adminProfileModal').style.display='none' }); })(document.getElementById("_sec_evt_117"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('petitionUpdateModal').style.display='none' }); })(document.getElementById("_sec_evt_118"));
  (function(el){ if(el) el.addEventListener("change", function(event){ togglePetitionNoteRequirement() }); })(document.getElementById("modalPetStatus"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('petitionUpdateModal').style.display='none' }); })(document.getElementById("_sec_evt_120"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('bulkPetitionUpdateModal').style.display='none' }); })(document.getElementById("_sec_evt_121"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('bulkPetitionUpdateModal').style.display='none' }); })(document.getElementById("_sec_evt_122"));
  (function(el){ if(el) el.addEventListener("click", function(event){ submitBulkPetitionUpdate() }); })(document.getElementById("_sec_evt_123"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('addActivityModal').style.display='none' }); })(document.getElementById("_sec_evt_124"));
  (function(el){ if(el) el.addEventListener("change", function(event){ toggleQuotaInput('Morning') }); })(document.getElementById("checkMorning"));
  (function(el){ if(el) el.addEventListener("change", function(event){ toggleQuotaInput('Afternoon') }); })(document.getElementById("checkAfternoon"));
  (function(el){ if(el) el.addEventListener("change", function(event){ toggleQuotaInput('Evening') }); })(document.getElementById("checkEvening"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('addActivityModal').style.display='none' }); })(document.getElementById("_sec_evt_128"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('editActivityModal').style.display='none' }); })(document.getElementById("_sec_evt_129"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('editActivityModal').style.display='none' }); })(document.getElementById("_sec_evt_130"));
  (function(el){ if(el) el.addEventListener("click", function(event){ window.closeQueueModal() }); })(document.getElementById("_sec_evt_131"));
  (function(el){ if(el) el.addEventListener("click", function(event){ window.closeQueueModal() }); })(document.getElementById("_sec_evt_132"));
  (function(el){ if(el) el.addEventListener("click", function(event){ triggerPrintFromPreview() }); })(document.getElementById("_sec_evt_133"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('printPreviewModal').style.display='none' }); })(document.getElementById("_sec_evt_134"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('lightboxModal').style.display='none' }); })(document.getElementById("_sec_evt_135"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('imageHistoryModal').style.display='none' }); })(document.getElementById("_sec_evt_136"));
  (function(el){ if(el) el.addEventListener("click", function(event){ document.getElementById('imageHistoryModal').style.display='none' }); })(document.getElementById("_sec_evt_137"));
});
