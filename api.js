const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz12gLInHJqme8YB9b29eZKn81XoDjkPpEfHyYXKkAOS3dw6f_d8NnexTKDbIUGQs08/exec";

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
                return { success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const responseText = await response.text();
        
        try {
            return JSON.parse(responseText);
        } catch (jsonError) {
            console.error("เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็น JSON. ข้อความที่ได้คือ:", responseText);
            throw new Error("ระบบหลังบ้านทำงานผิดพลาด (ไม่ได้ส่งค่ากลับมาเป็น JSON)");
        }

    } catch (error) {
        console.error("API Error:", error);
        throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ ลองใหม่อีกครั้ง");
    }
}
