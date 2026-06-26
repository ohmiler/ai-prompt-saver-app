# Deploy AI Prompt Saver App to Hostinger VPS (Ubuntu 24.04 LTS)

เอกสารนี้อธิบายขั้นตอน deploy โปรเจค **AI Prompt Saver App** ขึ้น **Hostinger VPS ที่ใช้ Ubuntu 24.04 LTS** แบบเป็นลำดับสำหรับมือใหม่

แนวทางที่ใช้ในเอกสารนี้คือ:

- ใช้ Hostinger Connector หรือ SSH terminal เพื่อเข้า VPS
- รัน Next.js เป็น Node.js server ด้วย `npm run start`
- ใช้ PM2 ช่วยให้แอปทำงานต่อหลังปิด terminal หรือ restart เครื่อง
- ใช้ Nginx เป็น reverse proxy จาก domain ไปหาแอปที่รันอยู่ในเครื่อง
- ใช้ Prisma + SQLite โดยเก็บ database ไว้บน VPS
- ใช้ HTTPS ด้วย Certbot เพราะ session cookie ของแอปเป็น secure cookie ใน production

> หมายเหตุ: คำสั่งทั้งหมดในเอกสารนี้ให้รันบน VPS Ubuntu 24.04 LTS ไม่ใช่บนเครื่อง Windows local

---

## 1. ภาพรวมการทำงานหลัง deploy

หลัง deploy แล้ว flow จะเป็นแบบนี้:

```text
ผู้ใช้เปิด https://your-domain.com
        |
        v
Nginx รับ request ที่ port 80/443
        |
        v
ส่งต่อไปที่ Next.js บน 127.0.0.1:3000
        |
        v
Next.js อ่าน/เขียนข้อมูลผ่าน Prisma ไปที่ SQLite database
```

เราจะไม่เปิด Next.js port `3000` ให้ผู้ใช้เข้าโดยตรง แต่ให้ Nginx เป็นด่านหน้าแทน

---

## 2. สิ่งที่ต้องเตรียมก่อนเริ่ม

ควรมีสิ่งเหล่านี้ก่อน deploy:

1. Hostinger VPS ที่ติดตั้ง Ubuntu 24.04 LTS แล้ว
2. Domain ที่จะใช้กับเว็บ เช่น `example.com`
3. DNS ของ domain ชี้ `A record` มาที่ IP ของ VPS แล้ว
4. โปรเจคถูก push ขึ้น GitHub หรือ Git provider แล้ว
5. Hostinger Connector หรือ SSH terminal ที่สามารถรันคำสั่งบน VPS ได้

ถ้ายังไม่มี domain สามารถ deploy แอปก่อนได้ แต่การ login ใน production ควรทดสอบผ่าน HTTPS เท่านั้น เพราะ cookie ของระบบ auth ถูกตั้งค่าเป็น secure cookie

---

## 3. เข้า VPS ด้วย Hostinger Connector หรือ SSH

ถ้าใช้ Hostinger Connector ให้เปิด terminal ของ VPS จาก connector แล้วรันคำสั่งตามเอกสารนี้ได้เลย

ถ้าใช้ SSH แบบปกติ:

```bash
ssh root@YOUR_VPS_IP
```

เปลี่ยน `YOUR_VPS_IP` เป็น IP จริงของ VPS

---

## 4. อัปเดตระบบและติดตั้งเครื่องมือพื้นฐาน

รันคำสั่งนี้บน VPS:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git nginx ufw
```

ความหมายแบบง่าย:

- `curl` ใช้ดาวน์โหลด installer หรือไฟล์จาก internet
- `git` ใช้ clone โปรเจคจาก GitHub
- `nginx` ใช้รับ traffic จาก domain แล้วส่งต่อเข้า Next.js
- `ufw` ใช้ตั้ง firewall

---

## 5. ติดตั้ง Node.js

โปรเจคนี้ใช้ Next.js 16.2.9 ซึ่งต้องใช้ Node.js `>=20.9.0`

แนะนำให้ใช้ Node.js 22 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

ตรวจสอบ version:

```bash
node -v
npm -v
```

ควรเห็น Node เป็น version 22.x หรืออย่างน้อย 20.9.0 ขึ้นไป

---

## 6. ติดตั้ง PM2

PM2 คือ process manager ที่ช่วยรัน Next.js ค้างไว้บน VPS

```bash
sudo npm install -g pm2
pm2 -v
```

---

## 7. เตรียมโฟลเดอร์สำหรับแอป

ในตัวอย่างนี้จะวางแอปไว้ที่:

```text
/var/www/ai-prompt-saver-app
```

สร้างโฟลเดอร์และให้ user ปัจจุบันเป็นเจ้าของ:

```bash
sudo mkdir -p /var/www/ai-prompt-saver-app
sudo chown -R $USER:$USER /var/www/ai-prompt-saver-app
```

---

## 8. Clone โปรเจคจาก Git

ไปที่โฟลเดอร์ `/var/www`:

```bash
cd /var/www
```

Clone repo:

```bash
git clone YOUR_REPOSITORY_URL ai-prompt-saver-app
```

ตัวอย่าง:

```bash
git clone https://github.com/YOUR_USERNAME/ai-prompt-saver-app.git ai-prompt-saver-app
```

เข้าโฟลเดอร์โปรเจค:

```bash
cd /var/www/ai-prompt-saver-app
```

ตรวจสอบไฟล์:

```bash
ls
```

ควรเห็นไฟล์เช่น `package.json`, `app`, `lib`, `prisma`

---

## 9. สร้างไฟล์ environment บน VPS

สร้างไฟล์ `.env`:

```bash
nano .env
```

ใส่ค่าต่อไปนี้:

```ini
DATABASE_URL="file:./prod.db"
AUTH_COOKIE_NAME="prompt_saver_session"
```

กด `Ctrl + O`, กด `Enter`, แล้วกด `Ctrl + X` เพื่อบันทึกและออกจาก nano

ความหมาย:

- `DATABASE_URL="file:./prod.db"` ให้ Prisma ใช้ SQLite database ที่ `prisma/prod.db`
- `AUTH_COOKIE_NAME` คือชื่อ cookie สำหรับ session login

> อย่า commit ไฟล์ `.env` ขึ้น Git เพราะเป็นไฟล์ config เฉพาะเครื่อง server

---

## 10. ติดตั้ง dependencies

รัน:

```bash
npm ci
```

ถ้าไม่มี `package-lock.json` ให้ใช้:

```bash
npm install
```

แต่โปรเจคนี้มี `package-lock.json` แล้ว จึงควรใช้ `npm ci`

---

## 11. เตรียม Prisma และ SQLite database

Generate Prisma client:

```bash
npm run db:generate
```

สร้างหรืออัปเดต schema ใน SQLite:

```bash
npm run db:push
```

ตรวจสอบว่า database ถูกสร้าง:

```bash
ls prisma
```

ควรเห็นไฟล์ `prod.db`

> สำคัญ: ไฟล์ `prisma/prod.db` คือ database production ของแอป ควร backup ไฟล์นี้เป็นระยะ

---

## 12. Build แอปสำหรับ production

รัน:

```bash
npm run build
```

ถ้า build สำเร็จ จะมี output จาก Next.js และสร้างโฟลเดอร์ `.next`

ถ้า build ไม่ผ่าน ให้หยุดแก้ error ก่อน อย่าเพิ่ง start production

---

## 13. Start แอปด้วย PM2

รันคำสั่งนี้จาก root ของโปรเจค:

```bash
pm2 start npm --name ai-prompt-saver -- run start -- -H 127.0.0.1 -p 3000
```

ความหมาย:

- `ai-prompt-saver` คือชื่อ process ใน PM2
- `-H 127.0.0.1` ให้ Next.js รับ request จากในเครื่อง VPS เท่านั้น
- `-p 3000` ให้ Next.js รันที่ port 3000

ตรวจสอบสถานะ:

```bash
pm2 status
```

ดู log:

```bash
pm2 logs ai-prompt-saver --lines 50
```

ทดสอบจากใน VPS:

```bash
curl -I http://127.0.0.1:3000
```

ถ้าเห็น HTTP response แปลว่า Next.js ทำงานแล้ว

---

## 14. ตั้ง PM2 ให้รันเองหลัง reboot

รัน:

```bash
pm2 startup
```

PM2 จะแสดงคำสั่ง `sudo ...` ออกมา 1 บรรทัด ให้ copy คำสั่งนั้นไปรันตามที่ PM2 บอก

จากนั้นบันทึก process ปัจจุบัน:

```bash
pm2 save
```

ต่อไปถ้า VPS restart แอปจะกลับมารันเอง

---

## 15. ตั้งค่า Nginx reverse proxy

สร้าง config:

```bash
sudo nano /etc/nginx/sites-available/ai-prompt-saver
```

ใส่ config นี้ โดยเปลี่ยน `your-domain.com` เป็น domain จริง:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;

        proxy_buffering off;
    }
}
```

เปิดใช้งาน config:

```bash
sudo ln -s /etc/nginx/sites-available/ai-prompt-saver /etc/nginx/sites-enabled/
```

ตรวจสอบว่า config ถูกต้อง:

```bash
sudo nginx -t
```

ถ้าขึ้นว่า syntax ok ให้ reload Nginx:

```bash
sudo systemctl reload nginx
```

---

## 16. ตั้งค่า firewall

อนุญาต SSH ก่อน เพื่อไม่ให้หลุดจาก VPS:

```bash
sudo ufw allow OpenSSH
```

อนุญาต Nginx ทั้ง HTTP และ HTTPS:

```bash
sudo ufw allow "Nginx Full"
```

เปิด firewall:

```bash
sudo ufw enable
```

ตรวจสอบ:

```bash
sudo ufw status
```

---

## 17. เปิดใช้งาน HTTPS ด้วย Certbot

ติดตั้ง Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

ขอ SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

ทำตามคำถามบนหน้าจอ

ทดสอบ auto-renew:

```bash
sudo certbot renew --dry-run
```

หลังจากขั้นตอนนี้ควรเข้าเว็บด้วย:

```text
https://your-domain.com
```

> สำคัญมาก: โปรเจคนี้ตั้ง session cookie เป็น `secure` ใน production ดังนั้น login ควรทดสอบผ่าน HTTPS ไม่ใช่ HTTP หรือ IP ตรง ๆ

---

## 18. ทดสอบหลัง deploy

เปิด browser แล้วทดสอบตามนี้:

1. เข้า `https://your-domain.com`
2. ถ้ายังไม่ login ควรถูกพาไปหน้า `/login`
3. Register user ใหม่
4. Logout
5. Login กลับเข้ามา
6. Create prompt
7. Edit prompt
8. Delete prompt
9. Search จาก title
10. Search จาก content
11. Filter ด้วย category

ถ้าทุกข้อผ่าน แปลว่า deploy สำเร็จ

---

## 19. วิธี deploy อัปเดตครั้งถัดไป

เมื่อมี code ใหม่ push ขึ้น Git แล้ว ให้เข้า VPS และรัน:

```bash
cd /var/www/ai-prompt-saver-app
```

Backup database ก่อน:

```bash
cp prisma/prod.db "prisma/prod.db.backup-$(date +%Y%m%d-%H%M%S)"
```

ดึง code ล่าสุด:

```bash
git pull
```

ติดตั้ง dependencies ตาม lockfile:

```bash
npm ci
```

อัปเดต Prisma:

```bash
npm run db:generate
npm run db:push
```

Build ใหม่:

```bash
npm run build
```

Restart แอป:

```bash
pm2 restart ai-prompt-saver
```

ดู log:

```bash
pm2 logs ai-prompt-saver --lines 50
```

---

## 20. วิธี backup database

เพราะโปรเจคนี้ใช้ SQLite ข้อมูล production จะอยู่ที่:

```text
/var/www/ai-prompt-saver-app/prisma/prod.db
```

Backup แบบง่าย:

```bash
cd /var/www/ai-prompt-saver-app
cp prisma/prod.db "prisma/prod.db.backup-$(date +%Y%m%d-%H%M%S)"
```

ดูไฟล์ backup:

```bash
ls prisma/*.backup-*
```

ควร download backup ออกมานอก VPS เป็นระยะ เช่น เก็บไว้ในเครื่อง local หรือ object storage

---

## 21. คำสั่งที่ใช้ตรวจสอบปัญหาบ่อย ๆ

ดูสถานะ PM2:

```bash
pm2 status
```

ดู log แอป:

```bash
pm2 logs ai-prompt-saver --lines 100
```

Restart แอป:

```bash
pm2 restart ai-prompt-saver
```

ดูสถานะ Nginx:

```bash
sudo systemctl status nginx
```

ตรวจ config Nginx:

```bash
sudo nginx -t
```

ดู error log ของ Nginx:

```bash
sudo tail -n 100 /var/log/nginx/error.log
```

ทดสอบ Next.js จากใน VPS:

```bash
curl -I http://127.0.0.1:3000
```

ทดสอบ domain จากใน VPS:

```bash
curl -I http://your-domain.com
```

---

## 22. Troubleshooting

### เปิดเว็บแล้วเจอ 502 Bad Gateway

สาเหตุที่พบบ่อย:

- Next.js ยังไม่รัน
- PM2 process crash
- Nginx proxy ไปผิด port

เช็ก:

```bash
pm2 status
pm2 logs ai-prompt-saver --lines 100
curl -I http://127.0.0.1:3000
sudo nginx -t
```

### Login แล้วเด้งกลับเหมือนไม่ติด session

ให้เช็กว่าคุณเข้าเว็บผ่าน HTTPS แล้วหรือยัง:

```text
https://your-domain.com
```

ใน production แอปตั้ง cookie เป็น secure cookie จึงต้องใช้ HTTPS

### `npm run build` ไม่ผ่าน

ให้ลองรัน:

```bash
npm run lint
npm run test
npm run build
```

อ่าน error บรรทัดแรก ๆ แล้วแก้ก่อน restart PM2

### Prisma หา database ไม่เจอ

เช็กไฟล์ `.env`:

```bash
cat .env
```

ควรมี:

```ini
DATABASE_URL="file:./prod.db"
AUTH_COOKIE_NAME="prompt_saver_session"
```

จากนั้นรัน:

```bash
npm run db:generate
npm run db:push
```

### PM2 หายหลัง reboot

ให้รันใหม่:

```bash
pm2 startup
pm2 save
```

อย่าลืม copy คำสั่ง `sudo ...` ที่ PM2 แสดงออกมาไปรันด้วย

---

## 23. Checklist สรุปแบบสั้น

ใช้ checklist นี้ตอน deploy จริง:

```text
[ ] VPS เป็น Ubuntu 24.04 LTS
[ ] Domain A record ชี้มาที่ IP ของ VPS
[ ] ติดตั้ง curl, git, nginx, ufw แล้ว
[ ] ติดตั้ง Node.js 22 แล้ว
[ ] ติดตั้ง PM2 แล้ว
[ ] Clone repo ไปที่ /var/www/ai-prompt-saver-app
[ ] สร้าง .env บน VPS แล้ว
[ ] รัน npm ci แล้ว
[ ] รัน npm run db:generate แล้ว
[ ] รัน npm run db:push แล้ว
[ ] รัน npm run build ผ่านแล้ว
[ ] Start แอปด้วย PM2 แล้ว
[ ] ตั้ง PM2 startup + save แล้ว
[ ] ตั้ง Nginx reverse proxy แล้ว
[ ] เปิด firewall สำหรับ OpenSSH และ Nginx Full แล้ว
[ ] ติดตั้ง HTTPS ด้วย Certbot แล้ว
[ ] ทดสอบ register/login/logout/prompt CRUD/search/filter แล้ว
```

---

## 24. หมายเหตุเรื่อง SQLite ใน production

SQLite เหมาะกับโปรเจคนี้ในช่วงเริ่มต้น เพราะ deploy ง่ายและมีไฟล์ database เพียงไฟล์เดียว

แต่ควรจำไว้ว่า:

- ต้อง backup `prisma/prod.db` เป็นประจำ
- ไม่ควรรัน PM2 แบบหลาย instance หรือ cluster mode กับ SQLite
- ถ้ามีผู้ใช้เยอะขึ้นมาก ควรพิจารณาย้ายไป PostgreSQL

สำหรับการ deploy บน VPS เครื่องเดียว ให้รัน PM2 แบบ 1 process ตามเอกสารนี้ก็เพียงพอสำหรับการเริ่มต้น
