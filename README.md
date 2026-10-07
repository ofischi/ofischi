# OFISCHI — Ürün Kataloğu ve Fiyat Listesi

Yayındaki site: https://ofishci.com

## Klasör yapısı

```
index.html                     Sayfa iskeleti (sadece CSS/JS dosyalarını bağlar)
ofischi_logo_transparent.png   Logo
css/
  ana.css                      Genel site stilleri
  yonetim.css                  Yönetim paneli stilleri
  yonetim-duzeltme.css         Yönetim paneli son düzeltmeleri
  tailwind.css                 Derlenmiş Tailwind sınıfları
js/                            Sırayla yüklenen klasik betikler (ortak global kapsam; sıra önemlidir)
  01-cekirdek.js               React kısayolları, depolama yardımcıları
  02-guvenlik.js               Girdi koruması, veri temizleme, sabit kategori eşleme
  03-temalar.js                Renk temaları, para birimleri
  04-pencereler.js             Cam tasarımlı onay/uyarı pencereleri, sayı kutusu
  05-veri-urunler.js           Hazır ürün verisi ve kapak görselleri (katalog içeriği)
  06-veri-modeli.js            Varsayılan veri, fiyat/ürün normalleştirme
  07-depolama.js               localStorage + IndexedDB kalıcı kayıt
  08-ceviri.js                 TR/EN çeviri
  09-ikonlar.js                Simgeler
  10-fiyat-motoru.js           Web ve PDF için ortak fiyat/kur hesapları
  11-pdf-veri.js               PDF veri ve görsel hazırlama
  12-pdf-font.js               Gömülü PDF fontu
  13-pdf-motor.js              PDF temel çizim fonksiyonları ve sayfa düzeni
  14-pdf-fiyat-listesi.js      Fiyat listesi PDF'i
  15-pdf-katalog.js            Fiyatsız katalog PDF'i (4 şablon)
  16-pdf-onizleme.js           PDF ön izleme penceresi
  17-uygulama-bilesenleri.js   Yardımcı arayüz bileşenleri
  18-yonetim-pin.js            Yönetici PIN (hash) işlemleri
  19-uygulama.js               Ana uygulama (site + yönetim paneli)
  20-baslat.js                 Uygulamayı başlatır
urunler/
  kapak/                       Kategori kapak görselleri (PDF kategori kapakları)
  vip-makam-takimlari/         Her kategorinin ürün fotoğrafları
  makam-takimlari/
  ...                          (24 kategori klasörü)
```

Not: Betikler `index.html` içinde 01 → 20 sırasıyla yüklenir; yeni dosya eklerken sırayı koruyun.

## Dosya adları

- `<ürün-kodu>-1.webp`, `-2.webp` … : ürün galerisi (ilki kapak fotoğrafıdır)
- `<ürün-kodu>-p1.webp`, `-p2.webp` … : model / parça fotoğrafları (Müdür, Şef, Misafir vb.)
- Adın sonundaki `w` (ör. `-1w.webp`): beyaz zeminli fotoğraf; sitede kırpılmadan gösterilir.

Fotoğrafların tamamı 2026 kataloğu ve 2026-2 TL fiyat listesinden alınmıştır. Fiyatlar TL, KDV hariçtir.
