const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwqjVfXhsYTam3mVPjEaxZTr_0kC1LG1yazYhr90tKibmDA0aNhLhtKwXLRv6GA1XA/exec";

async function callApi(actionName, payloadData = {}) {
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({ action: actionName, ...payloadData })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    }
}
