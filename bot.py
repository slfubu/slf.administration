import datetime
import os

def main():
    print(f"บอทเริ่มทำงานเมื่อ: {datetime.datetime.now()}")
    
    # ตัวอย่างการดึงค่า Token จาก GitHub Secrets มาใช้งาน
    api_token = os.getenv('BOT_TOKEN')
    if api_token:
        print("ตรวจสอบพบ Token พร้อมทำงาน!")
    else:
        print("ไม่พบ Token")
        
    # --- ใส่โค้ดการทำงานของบอทคุณตรงนี้ ---

if __name__ == "__main__":
    main()
