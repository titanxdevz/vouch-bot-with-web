
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { COLORS } = require('./builders');

const TYPE_COLORS = {
  error: COLORS.error,
  join: COLORS.success,
  leave: COLORS.warn,
  info: COLORS.primary,
  vouch: COLORS.primary,
  admin: 0xFF69B4, // Pink
  warn: COLORS.warn
};

async function sendDevLog(client, { type, title, body }) {
  if (!client.config.devLogChannelId) return;

  try {
    const channel = await client.channels.fetch(client.config.devLogChannelId);
    if (!channel || !channel.isTextBased()) return;

    const container = new ContainerBuilder()
      .setAccentColor(TYPE_COLORS[type] || COLORS.primary)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**[${type.toUpperCase()}] ${title}**`))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (body) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body.substring(0, 1900)));
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now() / 1000)}:F>`));

    await channel.send({ 
      components: [container], 
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] } 
    });
  } catch (error) {
    console.error('Failed to send dev log:', error);
  }
}

module.exports = { sendDevLog };
