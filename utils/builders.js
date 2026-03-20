
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

const COLORS = {
  primary: 0x5865F2,
  success: 0x57F287,
  error: 0xED4245,
  warn: 0xFEE75C,
  gold: 0xF1C40F
};

const { STAR, VERIFIED } = require('./emoji');

function stars(rating, max = 5) {
  const rounded = Math.round(rating);
  return STAR.repeat(rounded) + '☆'.repeat(max - rounded);
}

function formatDate(unixTs) {
  if (!unixTs) return 'N/A';
  return `<t:${unixTs}:F>`;
}

function timeAgo(unixTs) {
  if (!unixTs) return 'N/A';
  return `<t:${unixTs}:R>`;
}

function formatDuration(seconds) {
  if (seconds === 0) return '0 seconds';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  return [d > 0 ? `${d}d` : '', h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', s > 0 ? `${s}s` : ''].filter(Boolean).join(' ');
}

function createBaseReply(title, desc, color) {
  const container = new ContainerBuilder().setAccentColor(color);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`));
  if (desc) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(desc));
  }
  return container;
}

function errorReply(title, desc) {
  const container = createBaseReply(title, desc, COLORS.error);
  return { components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true };
}

function successReply(title, desc, footer) {
  const container = createBaseReply(title, desc, COLORS.success);
  if (footer) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
  }
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function infoReply(title, desc, footer, color = COLORS.primary) {
  const container = createBaseReply(title, desc, color);
  if (footer) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
  }
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function ratingBar(distArray) {
  const maxCount = Math.max(...distArray.map(d => d.count), 1);
  const barChar = '█';
  const emptyChar = '░';
  const barLength = 8;

  return distArray.map(item => {
    const filled = Math.round((item.count / maxCount) * barLength);
    const empty = barLength - filled;
    const bar = barChar.repeat(filled) + emptyChar.repeat(empty);
    return `${item.rating}★ ${bar} ${item.count}`;
  }).join('\n');
}

module.exports = { stars, formatDate, timeAgo, formatDuration, errorReply, successReply, infoReply, ratingBar, COLORS };
