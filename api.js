const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzUOViP1Y5PoFW8QMuRWkXkWS9Hojmo_FLEojvTwj2WxfbtE8WAibtiMMFIaRc1s5Ws/exec";
const API_SECRET_KEY = "UBU_FUND_SECURE_X92K_2026!";

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
                api_secret: API_SECRET_KEY,
                ...payloadData 
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw new Error("500 Internal Server Error");
    }
}
