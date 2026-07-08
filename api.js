const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx8P1S_dRnQW0Hn7soCHMf_4mJgJXKGsCaejUnmH5jjRqFcQ90TMUm3FJszc8K6ZNoaSQ/exec";

async function callApi(actionName, payloadData = {}) {
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({ 
                action: actionName, 
                ...payloadData 
            })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                sessionStorage.clear();
                window.location.replace("index.html");
                return;
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ ลองใหม่อีกครั้ง");
    }
}
