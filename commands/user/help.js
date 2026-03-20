const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  AttachmentBuilder,
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { isDev } = require('../../utils/permissions');

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRoundRect(ctx, x, y, w, h, r, fill, stroke, strokeWidth = 1) {
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
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.stroke(); }
  ctx.restore();
}

// Diamond shape drawn with canvas lines (replaces unicode diamond)
function drawDiamond(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Small 4-point star drawn with canvas lines (replaces unicode sparkle)
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

// Small filled circle (replaces unicode bullet/dot)
function drawDot(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Banner Generator
// ─────────────────────────────────────────────────────────────────────────────

async function createHelpBanner(botUser, options = {}) {
  const W = 1000;
  const H = 340;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const theme = options.color || '#5865F2';
  const pink = '#eb459e';
  const cyan = '#58c8f2';

  // --- Deep space background ---
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#07071a');
  bg.addColorStop(0.45, '#0e0c1e');
  bg.addColorStop(1, '#060614');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // --- Star field (plain dots, no unicode) ---
  const stars = [
    [80, 30, 1.5], [200, 15, 1], [340, 50, 1.2], [500, 20, 1], [620, 40, 1.5],
    [780, 10, 1], [880, 55, 1.2], [950, 30, 1], [140, 90, 1], [450, 80, 1.5],
    [700, 70, 1.2], [830, 100, 1], [30, 200, 1], [960, 180, 1.5], [870, 290, 1],
    [50, 300, 1.2], [370, 310, 1], [600, 320, 1], [730, 290, 1.2], [250, 270, 1],
  ];
  stars.forEach(([x, y, r]) => {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // --- Glow orbs ---
  const orb1 = ctx.createRadialGradient(160, H / 2, 0, 160, H / 2, 300);
  orb1.addColorStop(0, hexToRgba(theme, 0.22));
  orb1.addColorStop(1, hexToRgba(theme, 0));
  ctx.fillStyle = orb1; ctx.fillRect(0, 0, W, H);

  const orb2 = ctx.createRadialGradient(W - 180, 60, 0, W - 180, 60, 240);
  orb2.addColorStop(0, hexToRgba(pink, 0.16));
  orb2.addColorStop(1, hexToRgba(pink, 0));
  ctx.fillStyle = orb2; ctx.fillRect(0, 0, W, H);

  const orb3 = ctx.createRadialGradient(W - 80, H - 60, 0, W - 80, H - 60, 160);
  orb3.addColorStop(0, hexToRgba(cyan, 0.12));
  orb3.addColorStop(1, hexToRgba(cyan, 0));
  ctx.fillStyle = orb3; ctx.fillRect(0, 0, W, H);

  // --- Grid ---
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.022)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 55) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();

  // --- Diagonal accent lines ---
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(260, 0); ctx.lineTo(W, H - 120); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(W, H - 80); ctx.stroke();
  ctx.restore();

  // --- Top + bottom accent bars ---
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, theme); bar.addColorStop(0.45, pink); bar.addColorStop(1, cyan);
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 5);
  ctx.fillRect(0, H - 5, W, 5);

  // --- Outer glassy card ---
  drawRoundRect(ctx, 28, 20, W - 56, H - 40, 20, 'rgba(255,255,255,0.035)', 'rgba(255,255,255,0.07)', 1.2);

  // --- Left avatar panel ---
  drawRoundRect(ctx, 46, 36, 230, H - 72, 14, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.06)', 1);

  // --- Avatar ---
  const avatarX = 161, avatarY = 145, avatarR = 72;

  ctx.save();
  ctx.shadowColor = theme; ctx.shadowBlur = 40;
  const ring = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
  ring.addColorStop(0, theme); ring.addColorStop(0.5, pink); ring.addColorStop(1, cyan);
  ctx.strokeStyle = ring; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR + 9, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR + 16, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  try {
    const avatar = await loadImage(botUser.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.drawImage(avatar, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
  } catch {
    const fallback = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
    fallback.addColorStop(0, '#1a1a3a'); fallback.addColorStop(1, '#2a1a3a');
    ctx.fillStyle = fallback;
    ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
  }
  ctx.restore();

  // Status dot (drawn, no unicode)
  ctx.save();
  ctx.shadowColor = '#57f287'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#57f287';
  ctx.beginPath(); ctx.arc(avatarX + 52, avatarY + 52, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#07071a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();

  // Bot name under avatar (ASCII only)
  const botName = (botUser.username || 'Vouch Bot').toUpperCase();
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.fillText(botName, avatarX, 248);

  // Online pill — text uses ASCII
  drawRoundRect(ctx, avatarX - 38, 257, 76, 22, 11, 'rgba(87,242,135,0.15)', 'rgba(87,242,135,0.3)', 1);
  // Draw small dot manually before "ONLINE"
  drawDot(ctx, avatarX - 18, 268, 4, '#57f287');
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#57f287';
  ctx.textAlign = 'center';
  ctx.fillText('ONLINE', avatarX + 6, 272);

  ctx.textAlign = 'left';

  // --- Vertical divider ---
  const divX = 296;
  const divG = ctx.createLinearGradient(divX, 40, divX, H - 40);
  divG.addColorStop(0, 'rgba(255,255,255,0)');
  divG.addColorStop(0.3, 'rgba(255,255,255,0.15)');
  divG.addColorStop(0.7, 'rgba(255,255,255,0.15)');
  divG.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = divG; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(divX, 40); ctx.lineTo(divX, H - 40); ctx.stroke();

  // --- Right text panel ---
  const tx = 322;

  // Eyebrow — draw small diamond before text
  drawDiamond(ctx, tx + 6, 62, 5, 'rgba(255,255,255,0.4)');
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.fillText('DISCORD BOT', tx + 18, 67);

  // Title
  const titleGrad = ctx.createLinearGradient(tx, 75, tx + 500, 155);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.5, '#d4d8ff');
  titleGrad.addColorStop(1, '#a5b4fc');
  ctx.font = 'bold 62px sans-serif';
  ctx.fillStyle = titleGrad;
  ctx.shadowBlur = 18; ctx.shadowColor = hexToRgba(theme, 0.35);
  ctx.fillText('HELP MENU', tx, 148);
  ctx.shadowBlur = 0;

  // Underline bar
  const underline = ctx.createLinearGradient(tx, 155, tx + 370, 155);
  underline.addColorStop(0, theme);
  underline.addColorStop(0.5, pink);
  underline.addColorStop(1, 'rgba(88,200,242,0)');
  ctx.fillStyle = underline;
  ctx.fillRect(tx, 158, 370, 3);

  // Subtitle — ASCII dots as separators
  const subGrad = ctx.createLinearGradient(tx, 165, tx + 320, 195);
  subGrad.addColorStop(0, theme); subGrad.addColorStop(1, pink);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = subGrad;
  ctx.fillText('REPUTATION  -  SECURITY  -  ROLES', tx, 188);

  // Description lines — draw small diamond before each
  const descLines = [
    'Track and manage member reputation with precision.',
    'Advanced vouch system with role-based rewards.',
    'Select a category below to explore commands.',
  ];
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  descLines.forEach((line, i) => {
    const ly = 218 + i * 23;
    drawDiamond(ctx, tx + 7, ly - 4, 4, hexToRgba(theme, 0.7));
    ctx.fillText(line, tx + 20, ly);
  });

  // Version badge
  drawRoundRect(ctx, tx, 288, 110, 24, 12, 'rgba(88,101,242,0.2)', 'rgba(88,101,242,0.5)', 1);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = hexToRgba(theme, 0.9);
  ctx.fillText('v2.0  STABLE', tx + 12, 304);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillText('DEVELOPED BY  Ansh4Real', tx + 130, 304);

  // --- Far right decorative dots ---
  const dotCols = [theme, pink, cyan, 'rgba(255,255,255,0.15)'];
  for (let i = 0; i < 4; i++) {
    drawDot(ctx, W - 52, 88 + i * 32, 5 - i * 0.6, dotCols[i]);
  }

  // Drawn stars (no unicode)
  drawStar4(ctx, W - 85, 52, 11, 'rgba(255,255,255,0.4)');
  drawStar4(ctx, W - 125, 78, 7, hexToRgba(theme, 0.55));
  drawStar4(ctx, W - 68, H - 52, 8, hexToRgba(pink, 0.45));

  // --- Corner brackets ---
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(28, 48); ctx.lineTo(28, 28); ctx.lineTo(60, 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 28, 48); ctx.lineTo(W - 28, 28); ctx.lineTo(W - 60, 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, H - 48); ctx.lineTo(28, H - 28); ctx.lineTo(60, H - 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 28, H - 48); ctx.lineTo(W - 28, H - 28); ctx.lineTo(W - 60, H - 28); ctx.stroke();
  ctx.restore();

  return canvas.toBuffer('image/png');
}

// ─────────────────────────────────────────────────────────────────────────────
// Help Command
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Explore bot commands and features.')
    .addStringOption(option =>
      option.setName('command').setDescription('Get detailed info on a specific command')
    ),
  aliases: ['help'],
  guildOnly: false,
  async execute(interaction, client) {
    await interaction.deferReply();
    const commandName = interaction.options.getString('command');
    await handleHelp(interaction, client, interaction.user, commandName);
  },
  async prefixExecute(message, args, client) {
    const commandName = args[0];
    await handleHelp(message, client, message.author, commandName);
  },
};

async function handleHelp(source, client, user, commandName) {
  const { commands } = client;

  if (commandName) {
    const command =
      commands.get(commandName.toLowerCase()) ||
      commands.find(c => c.aliases && c.aliases.includes(commandName.toLowerCase()));

    if (!command) {
      const reply = { content: 'Invalid command provided.', flags: MessageFlags.Ephemeral };
      return source.reply ? source.reply(reply) : source.editReply(reply);
    }

    const container = new ContainerBuilder()
      .setAccentColor(0x5865F2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Command: ${command.data.name}**`))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**Description:** ${command.data.description}\n` +
        `**Aliases:** ${command.aliases ? command.aliases.join(', ') : 'None'}\n` +
        `**Cooldown:** ${command.cooldown || 3}s`
      ));

    const reply = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return source.editReply ? source.editReply(reply) : source.reply(reply);
  }

  // Generate banner
  const imageBuffer = await createHelpBanner(client.user);
  const attachment = new AttachmentBuilder(imageBuffer, { name: 'help-banner.png' });

  // Select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder('Select a command category...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('User Commands').setValue('user')
        .setDescription('Commands available to all members').setEmoji('👤'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Admin Commands').setValue('admin')
        .setDescription('Management and setup commands').setEmoji('🛡️')
    );

  if (isDev(client, user.id)) {
    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Developer Commands').setValue('dev')
        .setDescription('Restricted bot owner commands').setEmoji('⚙️')
    );
  }

  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Raw MediaGallery (type 12) — embeds image INSIDE the container at top
  const mediaGallery = {
    type: 12,
    items: [{ media: { url: 'attachment://help-banner.png' } }],
  };

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addMediaGalleryComponents(mediaGallery)
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      '**Vouch Bot - Help Menu**\n\n' +
      'Experience professional reputation tracking with advanced security and seamless role integration.\n\n' +
      '> `/vouch @user` — Vouch for a member\n' +
      '> `/profile @user` — View reputation profile\n' +
      '> `/setup` — Configure the bot\n' +
      '> `/leaderboard` — Top vouched members\n\n' +
      '*Use the dropdown below to explore all available commands.*'
    ))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(row);

  const reply = {
    components: [container],
    files: [attachment],
    flags: MessageFlags.IsComponentsV2,
  };

  const message = source.editReply ? await source.editReply(reply) : await source.reply(reply);

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000,
  });

  collector.on('collect', async i => {
    if (i.user.id !== user.id)
      return i.reply({ content: 'Only the command user can interact with this.', flags: MessageFlags.Ephemeral });

    const category = i.values[0];
    let categoryCommands, categoryTitle, categoryEmoji;

    if (category === 'user') {
      categoryCommands = commands.filter(c => !c.devOnly && !c.adminOnly);
      categoryTitle = 'User Commands'; categoryEmoji = '👤';
    } else if (category === 'admin') {
      categoryCommands = commands.filter(c => c.adminOnly);
      categoryTitle = 'Admin Commands'; categoryEmoji = '🛡️';
    } else if (category === 'dev') {
      categoryCommands = commands.filter(c => c.devOnly);
      categoryTitle = 'Developer Commands'; categoryEmoji = '⚙️';
    }

    const commandList =
      categoryCommands.size > 0
        ? categoryCommands.map(c => `> **/${c.data.name}**\n> ${c.data.description}`).join('\n\n')
        : '> No commands found in this category.';

    const updatedRow = new ActionRowBuilder().addComponents(StringSelectMenuBuilder.from(selectMenu));

    const updateContainer = new ContainerBuilder()
      .setAccentColor(0x5865F2)
      .addMediaGalleryComponents(mediaGallery)
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${categoryEmoji} ${categoryTitle}**`))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(commandList))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addActionRowComponents(updatedRow);

    await i.update({ components: [updateContainer], files: [attachment] });
  });

  collector.on('end', () => {
    const disabledMenu = StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
    const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);

    const expiredContainer = new ContainerBuilder()
      .setAccentColor(0x5865F2)
      .addMediaGalleryComponents(mediaGallery)
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        '**Vouch Bot - Help Menu**\n\n' +
        'This menu has expired. Run the command again to browse commands.'
      ))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addActionRowComponents(disabledRow);

    if (message.edit) message.edit({ components: [expiredContainer] }).catch(() => { });
  });
}