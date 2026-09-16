const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxuTtIeM1E-ytVOTDbVSo7k3I0Dox-SeMRZczzsuB9lzE-WMeU1g_KB0foUTgdEqkuDHQ/exec";

const API_TIMEOUT_MS = 45000;
const _apiInFlight = new Map();

function isReadOnlyAction_(actionName) {
    return /^(get|search|check|export|verify)/i.test(String(actionName || ''));
}

function stablePayloadKey_(actionName, payloadData) {
    const ordered = {};
    Object.keys(payloadData || {}).sort().forEach(k => {
        const v = payloadData[k];
        // ไม่ใส่ token ใน key ที่แสดงใน console ใด ๆ แต่ยังใช้แยก request ภายในหน่วยความจำ
        ordered[k] = v;
    });
    return `${actionName}:${JSON.stringify(ordered)}`;
}

async function executeApiRequest_(actionName, payloadData = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            redirect: 'follow',
            cache: 'no-store',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: actionName,
                ...payloadData
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                sessionStorage.clear();
                window.location.replace("index.html");
                return;
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const raw = await response.text();
        if (!raw) throw new Error("เซิร์ฟเวอร์ไม่ส่งข้อมูลตอบกลับ");

        try {
            return JSON.parse(raw);
        } catch (parseError) {
            console.error("Invalid API response:", raw.slice(0, 300));
            throw new Error("รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง");
        }
    } catch (error) {
        if (error && error.name === 'AbortError') {
            throw new Error("การเชื่อมต่อใช้เวลานานเกินกำหนด กรุณาลองทำรายการใหม่");
        }
        console.error("API Error:", error);
        if (error instanceof Error && error.message && !error.message.startsWith("HTTP Error")) {
            throw error;
        }
        throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
        clearTimeout(timeoutId);
    }
}

async function callApi(actionName, payloadData = {}) {
    const readOnly = isReadOnlyAction_(actionName);

    if (!readOnly) {
        return executeApiRequest_(actionName, payloadData);
    }

    // ถ้าหน้าเว็บเผลอยิง request อ่านข้อมูลเดียวกันพร้อมกัน ให้แชร์ Promise เดียวกัน
    // ลดโหลด Apps Script โดยไม่ cache ค่าหลัง request เสร็จ จึงไม่ทำให้ข้อมูลค้าง
    const requestKey = stablePayloadKey_(actionName, payloadData);
    if (_apiInFlight.has(requestKey)) {
        return _apiInFlight.get(requestKey);
    }

    const requestPromise = executeApiRequest_(actionName, payloadData)
        .finally(() => _apiInFlight.delete(requestKey));

    _apiInFlight.set(requestKey, requestPromise);
    return requestPromise;
}
