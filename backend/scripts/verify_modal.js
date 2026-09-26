const fs = require('fs');

const html = fs.readFileSync('backend/public/index.html', 'utf8');
const js = fs.readFileSync('backend/public/app.js', 'utf8');
const css = fs.readFileSync('backend/public/styles.css', 'utf8');

console.log('--- HTML CHECKS ---');
console.log('1. modal-fixed-price-badge exists:', html.includes('id="modal-fixed-price-badge"'));
console.log('2. modal-history-card exists:', html.includes('id="modal-history-card"'));
console.log('3. modal-product-history exists:', html.includes('id="modal-product-history"'));
console.log('4. modal-video-card exists:', html.includes('id="modal-video-card"'));
console.log('5. modal-youtube-player exists:', html.includes('id="modal-youtube-player"'));
console.log('6. inquiry-form removed:', !html.includes('id="inquiry-form"'));
console.log('7. "संपर्क करें" inquiry removed:', !html.includes('संपर्क करें'));

console.log('\n--- JS CHECKS ---');
console.log('8. extractYouTubeEmbedUrl exists:', js.includes('function extractYouTubeEmbedUrl'));
console.log('9. getDefaultCraftVideo exists:', js.includes('function getDefaultCraftVideo'));
console.log('10. getDefaultCraftHistory exists:', js.includes('function getDefaultCraftHistory'));
console.log('11. fixed price badge translation key (en):', js.includes("fixed_price_badge: 'Fixed Price'"));
console.log('12. fixed price badge translation key (hi):', js.includes("fixed_price_badge: 'निश्चित मूल्य'"));
console.log('13. fixed price badge translation key (bn):', js.includes("fixed_price_badge: 'নির্দিষ্ট মূল্য'"));
console.log('14. closeProductModal clears video player:', js.includes("player.src = ''"));

console.log('\n--- CSS CHECKS ---');
console.log('15. .fixed-price-pill styling exists:', css.includes('.fixed-price-pill'));
console.log('16. .product-history-card styling exists:', css.includes('.product-history-card'));
console.log('17. .product-video-card styling exists:', css.includes('.product-video-card'));
console.log('18. .youtube-player-wrap styling exists:', css.includes('.youtube-player-wrap'));

console.log('\n--- YOUTUBE PARSER TEST ---');
function extractYouTubeEmbedUrl(url) {
  if (!url) return '';
  url = String(url).trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  let videoId = '';
  if (match && match[1]) {
    videoId = match[1];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    videoId = url;
  }
  if (!videoId) return '';
  return 'https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&modestbranding=1';
}

console.log('watch?v= ->', extractYouTubeEmbedUrl('https://www.youtube.com/watch?v=kYv9qQ-mRCE'));
console.log('youtu.be/ ->', extractYouTubeEmbedUrl('https://youtu.be/kYv9qQ-mRCE'));
console.log('shorts/   ->', extractYouTubeEmbedUrl('https://www.youtube.com/shorts/kYv9qQ-mRCE'));
console.log('embed/    ->', extractYouTubeEmbedUrl('https://www.youtube.com/embed/kYv9qQ-mRCE'));
console.log('raw id    ->', extractYouTubeEmbedUrl('kYv9qQ-mRCE'));

