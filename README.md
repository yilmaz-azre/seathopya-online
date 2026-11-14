# Seathopya Online

Empires of Seathopya — tek dosya oyun + oda sunucusu.

## Çalıştırma

```
npm install
npm start
```

Tarayıcıda `http://localhost:3000` aç.

## Nasıl oynanır

1. İki oyuncu da aynı adresi açar (yerel ağda `http://<bilgisayar-ip>:3000`).
2. Biri **Oda Oluştur** der, 4 harfli kodu arkadaşına verir.
3. Diğeri **Odaya Katıl** ile kodu girer.
4. Host **Oyunu Başlat** der.

Oyun file:// üzerinden açılırsa çok oyunculu çalışmaz; sunucu adresi kullanılmalı.

## Render

`render.yaml` hazır: Web Service, Node runtime, `npm install` / `npm start`.
