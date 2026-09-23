const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxuTtIeM1E-ytVOTDbVSo7k3I0Dox-SeMRZczzsuB9lzE-WMeU1g_KB0foUTgdEqkuDHQ/exec";

const API_TIMEOUT_MS = 45000;
const _apiInFlight = new Map();
const _apiMemoryCache = new Map();

function isReadOnlyAction_(actionName) {
    return /^(get|search|check|verify|adminGet)/i.test(String(actionName || ''));
}

function getApiCacheTtl_(actionName) {
    const a = String(actionName || '');

    if (/Export|CSV|Download/i.test(a)) return 0;

    const exact = {
        getStudentMenuPermissions: 120000,
        getSystemMenuSettings: 120000,
        getProfile: 120000,
        getProfileSummaries: 120000,
        getStudentImageReport: 120000,
        getDashboardStats: 60000,
        getActivities: 60000,
        getStudentActivityHistory: 60000,
        getProfileImageHistory: 60000,
        getSuspendedUsers: 60000,
        getQueueSlotOptions: 60000,
        getQueueSlots: 30000,
        getMyQueue: 30000,
        getAdminPetitions: 45000,
        getResignAdminData: 45000,
        getTransferRequests: 45000,
        getLoanProfilesSummary2569: 60000,
        getOverLoanProfilesSummary: 60000,
        getLoanDashboardStats2569: 60000,
        getOverLoanDashboardStats: 60000,
        getLoanStatistics: 60000,
        getGysDashboardSummary: 60000,
        getGysAvsDates: 120000,
        getAdminAnnList: 120000,
        checkStudentEligibility2569: 60000,
        checkStudentOverEligibility: 60000,
        checkStudentResignStatus: 60000,
        checkTransferStatus: 60000
    };
    if (exact[a] != null) return exact[a];

    if (/^search/i.test(a)) return 15000;
    if (/^(check|verify)/i.test(a)) return 15000;
    if (/^get/i.test(a) || /^adminGet/i.test(a)) return 45000;
    return 0;
}

function stablePayloadKey_(actionName, payloadData) {
    const ordered = {};
    Object.keys(payloadData || {}).sort().forEach(k => {
        ordered[k] = payloadData[k];
    });
    return `${actionName}:${JSON.stringify(ordered)}`;
}

function cloneApiValue_(value) {
    if (value == null || typeof value !== 'object') return value;
    try {
        if (typeof structuredClone === 'function') return structuredClone(value);
    } catch (_) {}
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_) {
        return value;
    }
}

function clearApiCache(actionName) {
    if (!actionName) {
        _apiMemoryCache.clear();
        return;
    }
    const prefix = String(actionName) + ':';
    for (const key of _apiMemoryCache.keys()) {
        if (key.startsWith(prefix)) _apiMemoryCache.delete(key);
    }
}

function getCachedApiValue_(requestKey) {
    const cached = _apiMemoryCache.get(requestKey);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        _apiMemoryCache.delete(requestKey);
        return null;
    }
    return cloneApiValue_(cached.value);
}

function setCachedApiValue_(requestKey, value, ttlMs) {
    if (!ttlMs || ttlMs <= 0) return;
    _apiMemoryCache.set(requestKey, {
        value: cloneApiValue_(value),
        expiresAt: Date.now() + ttlMs
    });
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

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (parseError) {
            console.error("Invalid API response:", raw.slice(0, 300));
            throw new Error("รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง");
        }

        if (parsed && parsed.fatal === true) {
            throw new Error(parsed.message || "ระบบหลังบ้านประมวลผลไม่สำเร็จ");
        }

        return parsed;
    } catch (error) {
        if (error && error.name === 'AbortError') {
            throw new Error("การเชื่อมต่อใช้เวลานานเกินกำหนด กรุณาลองทำรายการใหม่");
        }
        console.error("API Error:", actionName, error);
        if (error instanceof Error && error.message && !error.message.startsWith("HTTP Error")) {
            throw error;
        }
        throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
        clearTimeout(timeoutId);
    }
}

async function callApi(actionName, payloadData = {}, options = {}) {
    const readOnly = isReadOnlyAction_(actionName);
    const forceRefresh = options && options.forceRefresh === true;
    const requestKey = stablePayloadKey_(actionName, payloadData);

    if (readOnly) {
        const ttlMs = getApiCacheTtl_(actionName);

        if (!forceRefresh && ttlMs > 0) {
            const cached = getCachedApiValue_(requestKey);
            if (cached !== null) return cached;
        }

        if (_apiInFlight.has(requestKey)) {
            return _apiInFlight.get(requestKey);
        }

        const requestPromise = executeApiRequest_(actionName, payloadData)
            .then(result => {
                if (ttlMs > 0) setCachedApiValue_(requestKey, result, ttlMs);
                return cloneApiValue_(result);
            })
            .finally(() => _apiInFlight.delete(requestKey));

        _apiInFlight.set(requestKey, requestPromise);
        return requestPromise;
    }

    const result = await executeApiRequest_(actionName, payloadData);

    if (!result || result.success !== false) {
        clearApiCache();
    }
    return result;
}

function apiPrefetch(actionName, payloadData = {}) {
    if (!isReadOnlyAction_(actionName)) return Promise.resolve(null);
    return callApi(actionName, payloadData)
        .catch(error => {
            console.warn("API prefetch skipped:", actionName, error && error.message ? error.message : error);
            return null;
        });
}

function apiRefresh(actionName, payloadData = {}) {
    return callApi(actionName, payloadData, { forceRefresh: true });
}
