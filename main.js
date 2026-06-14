
  window.Swal = Swal.mixin({
    confirmButtonText: 'ตกลง',
    cancelButtonText: 'ยกเลิก'
});

function escapeHTML(str) {
    if(typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

async function getClientIp() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); 
    try {
        const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        return data.ip;
    } catch (e) {
        clearTimeout(timeoutId);
        return "Unknown IP (Blocked/Timeout)"; 
    }
}

function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        iconElement.textContent = 'visibility';
        iconElement.style.color = 'var(--secondary-color)';
    } else {
        input.type = 'password';
        iconElement.textContent = 'visibility_off';
        iconElement.style.color = '#999';
    }
}

function validateThaiIdCard(id) {
    if (id.length !== 13 || !/^\d{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseFloat(id.charAt(i)) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseFloat(id.charAt(12));
}

function showLoading(customMessage) { 
    const defaultMsg = 'ระบบกำลังประมวลผล กรุณารอสักครู่';
    document.getElementById('loaderText').textContent = customMessage || defaultMsg; 
    document.getElementById('customLoader').style.display = 'flex'; 
}

function hideLoading() { 
    document.getElementById('customLoader').style.display = 'none'; 
}

function showAlert(message, type = 'success') {
    Swal.fire({
        icon: type,
        title: type === 'success' ? 'สำเร็จ' : 'แจ้งเตือน',
        text: message,
        confirmButtonColor: 'var(--secondary-color)',
        confirmButtonText: 'ตกลง', 
        timer: type === 'success' ? 2000 : undefined
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    const activeSection = document.getElementById(sectionId);
    activeSection.classList.add('active');
    activeSection.style.display = 'block';
    window.scrollTo(0, 0);
}

// ผูก Event ทันทีที่โหลดหน้าเว็บเสร็จ
document.addEventListener("DOMContentLoaded", () => {

    document.getElementById('showSignup').addEventListener('click', (e) => { 
        e.preventDefault(); 
        document.getElementById('signupForm').reset();
        showSection('signupSection'); 
    });

    document.getElementById('showLogin').addEventListener('click', (e) => { 
        e.preventDefault(); 
        showSection('loginSection'); 
    });

    document.getElementById('showResetPassword').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('resetPasswordForm').reset();
        document.getElementById('resetStep2Area').style.display = 'none';
        document.getElementById('btnVerifyIdentity').style.display = 'block';
        document.getElementById('resetStudentId').readOnly = false;
        document.getElementById('resetPhone').readOnly = false;
        document.getElementById('resetIdCard').readOnly = false; 
        document.getElementById('resetStudentId').parentElement.style.opacity = '1';
        document.getElementById('resetPhone').parentElement.style.opacity = '1';
        document.getElementById('resetIdCard').parentElement.style.opacity = '1'; 
        showSection('resetPasswordSection');
    });

    document.getElementById('backToLoginFromReset').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('loginSection');
    });

    document.getElementById('toggleSignupPassword').addEventListener('click', function () {
        const passwordInput = document.getElementById('signupPassword');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? 'visibility_off' : 'visibility';
    });
    
    document.getElementById('toggleLoginPassBtn').addEventListener('click', function() {
        const loginPassInput = document.getElementById('loginPassword');
        const loginEyeIcon = document.getElementById('loginEyeIcon');
        if (loginPassInput.type === 'password') {
            loginPassInput.type = 'text'; 
            loginEyeIcon.textContent = 'visibility'; 
        } else {
            loginPassInput.type = 'password'; 
            loginEyeIcon.textContent = 'visibility_off'; 
        }
    });

    // ปุ่มดูรหัสผ่านตอนรีเซ็ต
    document.getElementById('btnToggleResetNew')?.addEventListener('click', function() {
        togglePasswordVisibility('resetNewPassword', this);
    });

    document.getElementById('btnToggleResetConfirm')?.addEventListener('click', function() {
        togglePasswordVisibility('resetConfirmPassword', this);
    });

    // ---------------------------------------------
    // จัดการ Form Submit
    // ---------------------------------------------

    document.getElementById('btnVerifyIdentity').addEventListener('click', async () => {
        const studentId = document.getElementById('resetStudentId').value.trim();
        const phone = document.getElementById('resetPhone').value.trim();
        const idCard = document.getElementById('resetIdCard').value.trim();
        
        if (!studentId || !phone || !idCard) {
            showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning'); return;
        }
        if (!validateThaiIdCard(idCard)) {
            showAlert('เลขประจำตัวประชาชนไม่ถูกต้องตามรูปแบบ', 'warning'); return;
        }
        if (!/^\d{10}$/.test(phone)) {
            showAlert('หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก', 'warning'); return;
        }
        
        const btnVerify = document.getElementById('btnVerifyIdentity');
        btnVerify.disabled = true;
        showLoading('ระบบกำลังตรวจสอบข้อมูลยืนยันตัวตน');
        
        try {
            const res = await callApi("verifyUserForReset", { studentId, phone, idCard });
            hideLoading();
            btnVerify.disabled = false;
            if (res.success) {
                showAlert('ข้อมูลถูกต้อง กรุณาตั้งรหัสผ่านใหม่', 'success');
                document.getElementById('resetStudentId').readOnly = true;
                document.getElementById('resetPhone').readOnly = true;
                document.getElementById('resetIdCard').readOnly = true;
                document.getElementById('resetStudentId').parentElement.style.opacity = '0.7';
                document.getElementById('resetPhone').parentElement.style.opacity = '0.7';
                document.getElementById('resetIdCard').parentElement.style.opacity = '0.7';
                document.getElementById('btnVerifyIdentity').style.display = 'none';
                document.getElementById('resetStep2Area').style.display = 'block';
                document.getElementById('resetNewPassword').required = true;
                document.getElementById('resetConfirmPassword').required = true;
            } else {
                showAlert(res.message, 'error');
            }
        } catch(err) {
            hideLoading(); btnVerify.disabled = false; showAlert(err.message, 'error');
        }
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnLoginSubmit');
        btnSubmit.disabled = true;
        showLoading('กำลังตรวจสอบข้อมูลเข้าสู่ระบบ');
        const id = document.getElementById('loginStudentId').value.trim();
        const pass = document.getElementById('loginPassword').value;
        const clientIp = await getClientIp(); 
        
        try {
            const res = await callApi("login", { studentId: id, password: pass, ipAddress: clientIp });
            hideLoading();
            btnSubmit.disabled = false;
            
            if (res.success) {
                sessionStorage.setItem('ubu_student_id', res.user.studentId);
                sessionStorage.setItem('ubu_token', res.user.token);
                sessionStorage.setItem('ubu_role', res.user.role);
                sessionStorage.setItem('ubu_user_data', JSON.stringify(res.user));
                
                Swal.fire({
                    icon: 'success',
                    title: 'เข้าสู่ระบบสำเร็จ',
                    text: 'คลิกปุ่มด้านล่างเพื่อเข้าสู่ระบบ',
                    showConfirmButton: true,
                    confirmButtonText: 'เข้าสู่หน้าหลัก <i class="material-icons" style="vertical-align: middle; font-size: 16px;">arrow_forward</i>',
                    confirmButtonColor: 'var(--secondary-color)',
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = res.user.role === 'admin' ? 'View_Admin.html' : 'View_User.html';
                    }
                });
            } else {
                if (res.isSuspended) {
                    Swal.fire({
                        icon: 'error',
                        title: 'บัญชีถูกระงับการใช้งาน',
                        html: `<p style="color:red; font-weight:bold;">${escapeHTML(res.message)}</p>
                               <p style="font-size:14px; margin-top:10px;">กรุณาติดต่อเจ้าหน้าที่ กยศ. มหาวิทยาลัยอุบลราชธานี</p>`,
                        confirmButtonText: 'รับทราบ',
                        confirmButtonColor: '#dc3545'
                    });
                } else if (res.isUnauthorizedAdmin) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'ปฏิเสธการเข้าถึง',
                        text: 'อีเมลของท่านไม่ได้รับอนุญาตให้ใช้สิทธิ์แอดมิน',
                        confirmButtonText: 'ปิดหน้าต่าง'
                    });
                } else {
                    showAlert(res.message, 'error');
                }
            }
        } catch(err) {
            hideLoading(); btnSubmit.disabled = false; showAlert(err.message, 'error');
        }
    });

    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSignupSubmit');
        btnSubmit.disabled = true;
        showLoading('กำลังบันทึกข้อมูลลงทะเบียน');
        const data = {
            studentId: document.getElementById('signupStudentId').value.trim(),
            password: document.getElementById('signupPassword').value,
            prefix: document.getElementById('signupPrefix').value,
            firstName: document.getElementById('signupFirstName').value.trim(),
            lastName: document.getElementById('signupLastName').value.trim(),
            gmail: document.getElementById('signupGmail').value.trim(),
            faculty: document.getElementById('signupFaculty').value,
            phone: document.getElementById('signupPhone').value.trim()
        };
        try {
            const res = await callApi("signUp", { userData: data });
            hideLoading();
            btnSubmit.disabled = false;
            if (res.success) {
                Swal.fire({
                    icon: 'success', title: 'ลงทะเบียนสำเร็จ',
                    text: 'กรุณาเข้าสู่ระบบด้วยรหัสนักศึกษาและรหัสผ่านที่คุณตั้งไว้',
                    confirmButtonColor: 'var(--secondary-color)'
                }).then(() => {
                    document.getElementById('signupForm').reset();
                    document.getElementById('loginStudentId').value = data.studentId;
                    showSection('loginSection');
                });
            } else {
                showAlert(res.message, 'error');
            }
        } catch(err) {
            hideLoading(); btnSubmit.disabled = false; showAlert(err.message, 'error'); 
        }
    });

    document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (document.getElementById('resetStep2Area').style.display === 'none') {
            document.getElementById('btnVerifyIdentity').click(); return;
        }
        const studentId = document.getElementById('resetStudentId').value;
        const phone = document.getElementById('resetPhone').value;
        const idCard = document.getElementById('resetIdCard').value; 
        const newPass = document.getElementById('resetNewPassword').value;
        const confirmPass = document.getElementById('resetConfirmPassword').value;
        if (newPass !== confirmPass) { showAlert('รหัสผ่านยืนยันไม่ตรงกัน', 'error'); return; }
        if (newPass.length < 6) { showAlert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning'); return; }
        
        const btnReset = document.getElementById('btnResetSubmit');
        btnReset.disabled = true;
        showLoading('กำลังเปลี่ยนรหัสผ่าน');
        try {
            const res = await callApi("resetPassword", { studentId, phone, idCard, newPassword: newPass });
            hideLoading();
            btnReset.disabled = false;
            if (res.success) {
                Swal.fire({ icon: 'success', title: 'เปลี่ยนรหัสผ่านสำเร็จ', confirmButtonColor: 'var(--secondary-color)' })
                .then(() => {
                    document.getElementById('resetPasswordForm').reset();
                    document.getElementById('loginStudentId').value = studentId;
                    showSection('loginSection');
                });
            } else {
                showAlert(res.message, 'error');
            }
        } catch(err) {
            hideLoading(); btnReset.disabled = false; showAlert(err.message, 'error');
        }
    });

});


document.addEventListener("DOMContentLoaded", async () => {
    sessionStorage.removeItem('ubu_student_id');
    sessionStorage.removeItem('ubu_token');

    try {
        const res = await callApi("getPublicAnnouncement", {});
        if(res && res.success && res.data && res.data.length > 0) {
            let combinedHtml = ''; 
            const accentColors = ['#2563eb', '#ea580c', '#16a34a', '#dc2626', '#7c3aed'];
            
            res.data.forEach((ann, index) => {
                const themeColor = accentColors[index % accentColors.length];
                combinedHtml += `
                    <div style="background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 16px; border-left: 6px solid ${themeColor}; text-align: left;">
                        <h4 style="margin: 0; color: #1e293b;">${escapeHTML(ann.title)}</h4>
                        <div style="font-size: 15px; color: #475569; padding-top: 12px;">${escapeHTML(ann.content).replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            });

            Swal.fire({
                html: `<div style="background: #f8fafc; padding: 24px; max-height: 55vh; overflow-y: auto;">${combinedHtml}</div>`,
                showConfirmButton: true, confirmButtonText: 'ปิดประกาศนี้',
                width: '800px', padding: '0',
            });
        }
    } catch(e) {
        console.error("ไม่สามารถดึงประกาศได้:", e);
    }
});
