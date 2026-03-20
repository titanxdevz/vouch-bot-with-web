const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

async function createCard(title, subtitle, user, options = {}) {
  const W = 900;
  const H = 280;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const themeColor = options.color || '#5865F2';

  // ── Background ──────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d0d1a');
  bg.addColorStop(0.5, '#12101f');
  bg.addColorStop(1, '#0a0a14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Ambient glow blobs ───────────────────────────────────────────────────────
  const glow1 = ctx.createRadialGradient(180, 140, 0, 180, 140, 260);
  glow1.addColorStop(0, hexToRgba(themeColor, 0.18));
  glow1.addColorStop(1, hexToRgba(themeColor, 0));
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(720, 60, 0, 720, 60, 200);
  glow2.addColorStop(0, 'rgba(235, 69, 158, 0.14)');
  glow2.addColorStop(1, 'rgba(235, 69, 158, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  const glow3 = ctx.createRadialGradient(840, 230, 0, 840, 230, 130);
  glow3.addColorStop(0, 'rgba(88, 200, 242, 0.10)');
  glow3.addColorStop(1, 'rgba(88, 200, 242, 0)');
  ctx.fillStyle = glow3;
  ctx.fillRect(0, 0, W, H);

  // ── Grid lines ───────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  // ── Top + bottom accent bars ─────────────────────────────────────────────────
  const accentBar = ctx.createLinearGradient(0, 0, W, 0);
  accentBar.addColorStop(0, themeColor);
  accentBar.addColorStop(0.5, '#eb459e');
  accentBar.addColorStop(1, '#58c8f2');
  ctx.fillStyle = accentBar;
  ctx.fillRect(0, 0, W, 4);
  ctx.fillStyle = accentBar;
  ctx.fillRect(0, H - 4, W, 4);

  // ── Glassy card panel ────────────────────────────────────────────────────────
  drawRoundRect(ctx, 40, 22, W - 80, H - 44, 18, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)');

  // ── Avatar ───────────────────────────────────────────────────────────────────
  if (user) {
    const avatarX = 130;
    const avatarY = H / 2;
    const avatarR = 74;

    ctx.save();
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 32;
    const ringGrad = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
    ringGrad.addColorStop(0, themeColor);
    ringGrad.addColorStop(0.5, '#eb459e');
    ringGrad.addColorStop(1, '#58c8f2');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    try {
      const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.drawImage(avatar, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    } catch {
      ctx.fillStyle = '#2c2f50';
      ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    }
    ctx.restore();
  }

  // ── Vertical divider ─────────────────────────────────────────────────────────
  const divX = 244;
  const divGrad = ctx.createLinearGradient(divX, 50, divX, H - 50);
  divGrad.addColorStop(0, 'rgba(255,255,255,0)');
  divGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  divGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 50);
  ctx.lineTo(divX, H - 50);
  ctx.stroke();

  // ── Text ─────────────────────────────────────────────────────────────────────
  const textX = 272;

  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.letterSpacing = '3px';
  ctx.fillText('VOUCH SYSTEM', textX, 78);
  ctx.letterSpacing = '0px';

  const titleGrad = ctx.createLinearGradient(textX, 90, textX + 440, 150);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.6, '#c9ceff');
  titleGrad.addColorStop(1, '#a5b4fc');
  ctx.font = 'bold 56px sans-serif';
  ctx.fillStyle = titleGrad;
  ctx.shadowBlur = 12;
  ctx.shadowColor = 'rgba(255,255,255,0.15)';
  ctx.fillText(title.toUpperCase(), textX, 150);
  ctx.shadowBlur = 0;

  const subGrad = ctx.createLinearGradient(textX, 158, textX + 360, 188);
  subGrad.addColorStop(0, themeColor);
  subGrad.addColorStop(1, '#eb459e');
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = subGrad;
  ctx.letterSpacing = '2px';
  ctx.fillText(subtitle.toUpperCase(), textX, 186);
  ctx.letterSpacing = '0px';

  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('DEVELOPED BY Ansh4Real', textX, 222);
  ctx.letterSpacing = '0px';

  // ── Decorative right dots + sparkles ─────────────────────────────────────────
  const dotColors = [themeColor, '#eb459e', '#58c8f2', 'rgba(255,255,255,0.15)'];
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(W - 58, 78 + i * 30, 5 - i * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = dotColors[i];
    ctx.fill();
  }
  drawSparkle(ctx, W - 88, 44, 10, 'rgba(255,255,255,0.45)');
  drawSparkle(ctx, W - 130, 68, 6, hexToRgba(themeColor, 0.6));

  return canvas.toBuffer('image/png');
}

async function createHelpBanner(botUser, options = {}) {
  return createCard('Help Menu', 'Select a category below', botUser, options);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function drawRoundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore();
}

function drawSparkle(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((Math.PI / 2) * i);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.2, -size * 0.2, size, 0);
    ctx.quadraticCurveTo(size * 0.2, size * 0.2, 0, size);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.2, -size, 0);
    ctx.quadraticCurveTo(-size * 0.2, -size * 0.2, 0, -size);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

module.exports = { createCard, createHelpBanner };