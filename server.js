const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const app = express();

app.use(bodyParser.json());
app.use(express.static('.'));

// Data login akan kita isi di Render nanti lewat Environment Variables
const EMAIL_A = process.env.EMAIL_A;
const PASS_A = process.env.PASS_A;

app.post('/get-code', async (req, res) => {
    const numB = req.body.number;
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    const page = await browser.newPage();
    
    try {
        // 1. Login ke PinjemWA
        await page.goto('https://pinjemwa.com/login');
        await page.type('input[name="email"]', EMAIL_A);
        await page.type('input[name="password"]', PASS_A);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        // 2. Buka menu Device
        await page.goto('https://pinjemwa.com/user/devices');
        
        // 3. Cari dan klik tombol Pairing Code
        await page.waitForSelector('button');
        const btns = await page.$$('button');
        for (let b of btns) {
            let t = await page.evaluate(el => el.innerText, b);
            if (t.includes('Pairing Code')) { 
                await b.click(); 
                break; 
            }
        }

        // 4. Masukkan nomor User B
        await page.waitForSelector('input[placeholder*="62812"]');
        await page.type('input[placeholder*="62812"]', numB);
        
        const startBtns = await page.$$('button');
        for (let b of startBtns) {
            let t = await page.evaluate(el => el.innerText, b);
            if (t.includes('Mulai Pairing')) { 
                await b.click(); 
                break; 
            }
        }

        // 5. Tunggu sistem web lama memproses kode (sekitar 7 detik)
        await new Promise(r => setTimeout(r, 7000));
        
        // 6. Ambil kodenya dari layar
        const code = await page.evaluate(() => {
            const e = document.querySelector('.text-primary.font-bold');
            return e ? e.innerText : null;
        });

        res.json({ success: !!code, code: code });
    } catch (e) {
        res.json({ success: false, message: e.message });
    } finally {
        await browser.close();
    }
});

// Port untuk Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
