/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Command  : /ping                                            ║
 * ║  Desc     : Displays bot latency with a styled canvas card   ║
 * ║  Developer: Ansh4Real                                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// [ Imports ]
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ─────────────────────────────────────────────────────────────────────────────
// [ Canvas Helpers ]
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRoundRect(ctx, x, y, w, h, r, fill, stroke, sw = 1) {
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
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
  ctx.restore();
}

function drawStar4(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(cx, cy);
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

function drawDot(ctx, cx, cy, r, color, glow) {
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 14; }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Latency colour thresholds
function latencyColor(ms) {
  if (ms <= 80) return '#57f287'; // green
  if (ms <= 200) return '#fee75c'; // yellow
  return '#ed4245';                // red
}

function latencyLabel(ms) {
  if (ms <= 80) return 'EXCELLENT';
  if (ms <= 200) return 'MODERATE';
  return 'HIGH';
}

// ─────────────────────────────────────────────────────────────────────────────
// [ Canvas Card Generator ]
// ─────────────────────────────────────────────────────────────────────────────

async function createPingCard(botUser, latency, apiLatency) {
  const W = 900;
  const H = 320;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const theme = '#5865F2';
  const pink = '#eb459e';
  const cyan = '#58c8f2';
  const lcCol = latencyColor(latency);
  const acCol = latencyColor(apiLatency);

  // ── Background ─────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#07071a');
  bg.addColorStop(0.5, '#0e0c1e');
  bg.addColorStop(1, '#060614');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Glow orbs ──────────────────────────────────────────────────────────────
  [[180, H / 2, theme, 0.2, 280], [W - 160, 55, pink, 0.15, 220], [W - 60, H - 55, cyan, 0.12, 150]].forEach(([x, y, c, a, rad]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, hexToRgba(c, a)); g.addColorStop(1, hexToRgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });

  // Extra glow from latency color (bottom left)
  const lcGlow = ctx.createRadialGradient(420, H, 0, 420, H, 260);
  lcGlow.addColorStop(0, hexToRgba(lcCol, 0.12));
  lcGlow.addColorStop(1, hexToRgba(lcCol, 0));
  ctx.fillStyle = lcGlow; ctx.fillRect(0, 0, W, H);

  // ── Grid ───────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 55) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();

  // ── Star field ─────────────────────────────────────────────────────────────
  [[80, 25, 1.2], [190, 12, 1], [350, 45, 1.4], [530, 18, 1], [660, 38, 1.3], [810, 8, 1], [900, 50, 1.2], [140, 85, 1], [430, 75, 1.3], [720, 65, 1.1], [860, 95, 1], [940, 280, 1.3], [60, 295, 1.1]].forEach(([x, y, r]) => {
    ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });

  // ── Accent bars ────────────────────────────────────────────────────────────
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, theme); bar.addColorStop(0.45, pink); bar.addColorStop(1, cyan);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 5);
  ctx.fillRect(0, H - 5, W, 5);

  // ── Outer glassy card ──────────────────────────────────────────────────────
  drawRoundRect(ctx, 28, 20, W - 56, H - 40, 20, 'rgba(255,255,255,0.035)', 'rgba(255,255,255,0.07)', 1.2);

  // ── Corner brackets ────────────────────────────────────────────────────────
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(28, 52); ctx.lineTo(28, 28); ctx.lineTo(62, 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 28, 52); ctx.lineTo(W - 28, 28); ctx.lineTo(W - 62, 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, H - 52); ctx.lineTo(28, H - 28); ctx.lineTo(62, H - 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 28, H - 52); ctx.lineTo(W - 28, H - 28); ctx.lineTo(W - 62, H - 28); ctx.stroke();
  ctx.restore();

  // ── Left avatar panel ──────────────────────────────────────────────────────
  drawRoundRect(ctx, 46, 36, 210, H - 72, 14, 'rgba(255,255,255,0.045)', 'rgba(255,255,255,0.06)', 1);

  const avatarX = 151, avatarY = 138, avatarR = 66;

  // Ring
  ctx.save();
  ctx.shadowColor = lcCol; ctx.shadowBlur = 36;
  const ring = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
  ring.addColorStop(0, theme); ring.addColorStop(0.5, pink); ring.addColorStop(1, cyan);
  ctx.strokeStyle = ring; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR + 8, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR + 15, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Avatar image
  ctx.save();
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  try {
    const img = await loadImage(botUser.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(img, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
  } catch {
    ctx.fillStyle = '#1a1a3a'; ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
  }
  ctx.restore();

  // Status dot
  drawDot(ctx, avatarX + 48, avatarY + 48, 9, '#57f287', true);
  ctx.save(); ctx.strokeStyle = '#07071a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(avatarX + 48, avatarY + 48, 9, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

  // Bot name
  const name = (botUser.username || 'Vouch Bot').toUpperCase();
  ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.textAlign = 'center'; ctx.fillText(name, avatarX, 232);

  // PONG label pill
  drawRoundRect(ctx, avatarX - 32, 240, 64, 20, 10, hexToRgba(theme, 0.2), hexToRgba(theme, 0.5), 1);
  ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = hexToRgba(theme, 0.95);
  ctx.fillText('PONG!', avatarX, 254);
  ctx.textAlign = 'left';

  // ── Vertical divider ───────────────────────────────────────────────────────
  const divX = 276;
  const divG = ctx.createLinearGradient(divX, 40, divX, H - 40);
  divG.addColorStop(0, 'rgba(255,255,255,0)'); divG.addColorStop(0.3, 'rgba(255,255,255,0.14)');
  divG.addColorStop(0.7, 'rgba(255,255,255,0.14)'); divG.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = divG; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(divX, 40); ctx.lineTo(divX, H - 40); ctx.stroke();

  // ── Right panel text ───────────────────────────────────────────────────────
  const tx = 304;

  // Eyebrow
  ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillText('NETWORK DIAGNOSTICS', tx, 66);

  // Title
  const titleG = ctx.createLinearGradient(tx, 70, tx + 460, 140);
  titleG.addColorStop(0, '#ffffff'); titleG.addColorStop(0.55, '#d4d8ff'); titleG.addColorStop(1, '#a5b4fc');
  ctx.font = 'bold 58px sans-serif'; ctx.fillStyle = titleG;
  ctx.shadowBlur = 18; ctx.shadowColor = hexToRgba(theme, 0.3);
  ctx.fillText('PING CHECK', tx, 138);
  ctx.shadowBlur = 0;

  // Title underline bar
  const ul = ctx.createLinearGradient(tx, 144, tx + 360, 144);
  ul.addColorStop(0, theme); ul.addColorStop(0.5, pink); ul.addColorStop(1, 'rgba(88,200,242,0)');
  ctx.fillStyle = ul; ctx.fillRect(tx, 147, 360, 3);

  // ── Metric cards ───────────────────────────────────────────────────────────
  const metrics = [
    { label: 'BOT LATENCY', value: `${latency}ms`, sub: latencyLabel(latency), color: lcCol, x: tx },
    { label: 'API LATENCY', value: `${apiLatency}ms`, sub: latencyLabel(apiLatency), color: acCol, x: tx + 200 },
    { label: 'UPTIME', value: '99.9%', sub: 'STABLE', color: cyan, x: tx + 400 },
  ];

  metrics.forEach(({ label, value, sub, color, x }) => {
    // Card bg
    drawRoundRect(ctx, x, 162, 175, 90, 12, 'rgba(255,255,255,0.05)', hexToRgba(color, 0.3), 1);

    // Colored top stripe
    const stripe = ctx.createLinearGradient(x, 162, x + 175, 162);
    stripe.addColorStop(0, hexToRgba(color, 0.6)); stripe.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = stripe; ctx.fillRect(x + 1, 162, 173, 3);
    // Top-left dot
    drawDot(ctx, x + 14, 176, 5, color, false);

    // Label
    ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText(label, x + 26, 180);

    // Value
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = hexToRgba(color, 0.6);
    ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = color;
    ctx.fillText(value, x + 12, 218);
    ctx.restore();

    // Sub-label
    ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillText(sub, x + 12, 238);
  });

  // ── Latency progress bar (bot latency) ─────────────────────────────────────
  const barY = 268;
  const barW = 545;
  const barH = 8;
  const fill = Math.min(latency / 400, 1);

  // Track
  drawRoundRect(ctx, tx, barY, barW, barH, 4, 'rgba(255,255,255,0.08)', null);

  // Fill gradient
  const bfG = ctx.createLinearGradient(tx, barY, tx + barW * fill, barY);
  bfG.addColorStop(0, lcCol); bfG.addColorStop(1, hexToRgba(lcCol, 0.5));
  ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = lcCol;
  drawRoundRect(ctx, tx, barY, barW * fill, barH, 4, bfG, null);
  ctx.restore();

  // Bar label
  ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fillText(`RESPONSE TIME - ${latency}ms / 400ms`, tx, barY - 6);

  // ── Developer watermark ────────────────────────────────────────────────────
  ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillText('DEVELOPED BY  Ansh4Real', tx, H - 26);

  // ── Decorative right side ──────────────────────────────────────────────────
  [theme, pink, cyan, 'rgba(255,255,255,0.14)'].forEach((c, i) => drawDot(ctx, W - 50, 86 + i * 30, 4.5 - i * 0.5, c, false));
  drawStar4(ctx, W - 82, 50, 10, 'rgba(255,255,255,0.38)');
  drawStar4(ctx, W - 118, 74, 7, hexToRgba(theme, 0.5));
  drawStar4(ctx, W - 65, H - 50, 8, hexToRgba(pink, 0.4));

  return canvas.toBuffer('image/png');
}

// ─────────────────────────────────────────────────────────────────────────────
// [ Command Export ]
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Check the bot's latency."),
  aliases: ['ping'],
  guildOnly: false,

  async execute(interaction, client) {
    await interaction.deferReply();
    const sent = await interaction.fetchReply();
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    const buffer = await createPingCard(client.user, latency, apiLatency);
    const attachment = new AttachmentBuilder(buffer, { name: 'ping.png' });

    await interaction.editReply({ files: [attachment] });
  },

  async prefixExecute(message, args, client) {
    const sent = await message.reply('Checking latency...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    const buffer = await createPingCard(client.user, latency, apiLatency);
    const attachment = new AttachmentBuilder(buffer, { name: 'ping.png' });

    await sent.edit({ content: null, files: [attachment] });
  },
};