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
        // Student
        getStudentMenuPermissions: 180000,
        getProfile: 180000,
        getActivities: 90000,
        getStudentActivityHistory: 90000,
        getQueueSlots: 60000,
        getMyQueue: 60000,
        getMyPetitions: 90000,
        checkStudentEligibility2569: 90000,
        checkStudentOverEligibility: 90000,
        checkStudentResignStatus: 90000,
        checkTransferStatus: 90000,

        // Admin
        getSystemMenuSettings: 180000,
        getDashboardStats: 90000,
        getSuspendedUsers: 90000,
        getSuperAdminDetails: 180000,
        getProfileSummaries: 180000,
        getStudentImageReport: 180000,
        getProfileImageHistory: 90000,
        getQueueSlotOptions: 120000,
        getLoanDashboardStats2569: 90000,
        getLoanProfilesSummary2569: 120000,
        getOverLoanDashboardStats: 90000,
        getOverLoanProfilesSummary: 120000,
        getResignDashboardStats: 90000,
        getResignAdminData: 90000,
        getSpecialAccessList: 120000,
        getAdminPetitions: 90000,
        getSpecialLoanAccessList: 120000,
        getAdminAnnList: 180000,
        getTransferRequests: 90000,
        getLoanDashboardStatsWithFaculty2569: 90000,
        getLoanStatistics: 90000,
        getSpecialQueueAccessList: 120000,
        getUsersWithoutProfile: 120000,
        getGysDashboardSummary: 90000,
        getGysAvsDates: 180000
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
        if (k === 'token') return;
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
    if (!cached) return undefined;
    if (cached.expiresAt <= Date.now()) {
        _apiMemoryCache.delete(requestKey);
        return undefined;
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
            if (cached !== undefined) return cached;
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
            return undefined;
        });
}

function apiRefresh(actionName, payloadData = {}) {
    return callApi(actionName, payloadData, { forceRefresh: true });
}

const _apiPreloadStatus = {
    running: false, total: 0, completed: 0, failed: 0, startedAt: 0, finishedAt: 0
};

function normalizePreloadTasks_(tasks) {
    const seen = new Set();
    const normalized = [];
    (Array.isArray(tasks) ? tasks : []).forEach(task => {
        if (!task || !task.action) return;
        const action = String(task.action);
        const payload = task.payload || {};
        if (!isReadOnlyAction_(action)) return;
        const key = stablePayloadKey_(action, payload);
        if (seen.has(key)) return;
        seen.add(key);
        normalized.push({ action, payload });
    });
    return normalized;
}

async function apiPreloadQueue(tasks, options = {}) {
    const queue = normalizePreloadTasks_(tasks);
    if (!queue.length) return { total: 0, completed: 0, failed: 0 };

    const concurrency = Math.max(1, Math.min(Number(options.concurrency) || 2, 3));
    const gapMs = Math.max(0, Number(options.gapMs) || 80);

    Object.assign(_apiPreloadStatus, {
        running: true, total: queue.length, completed: 0, failed: 0,
        startedAt: Date.now(), finishedAt: 0
    });

    let cursor = 0;
    async function worker() {
        while (cursor < queue.length) {
            const task = queue[cursor++];
            const result = await apiPrefetch(task.action, task.payload);
            if (result === undefined) _apiPreloadStatus.failed++;
            else _apiPreloadStatus.completed++;
            if (gapMs > 0 && cursor < queue.length) {
                await new Promise(resolve => setTimeout(resolve, gapMs));
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));
    _apiPreloadStatus.running = false;
    _apiPreloadStatus.finishedAt = Date.now();
    return { ..._apiPreloadStatus };
}

function scheduleApiPreload(tasks, options = {}) {
    const startDelayMs = Math.max(0, Number(options.startDelayMs) || 250);
    const run = () => apiPreloadQueue(tasks, options).catch(err => {
        console.warn('Background preload stopped:', err);
    });

    setTimeout(() => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(run, { timeout: 1200 });
        } else {
            run();
        }
    }, startDelayMs);
}

function getApiPreloadStatus() {
    return { ..._apiPreloadStatus };
}

function isApiCached(actionName, payloadData = {}) {
    return getCachedApiValue_(stablePayloadKey_(actionName, payloadData)) !== undefined;
}
