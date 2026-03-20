
const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const { Vouches, Blacklist, Cooldowns, DailyCounts, GuildSettings } = require('../../utils/database');
const { infoReply, stars, timeAgo, formatDuration, errorReply } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');

async function buildVouchCheckComponents(client, target, guildId) {
  const receivedVouches = Vouches.getPage(target.id, 'received', guildId, 0, 100);
  const blacklistStatus = Blacklist.get(target.id, guildId);
  const dailyCount = DailyCounts.get(target.id, guildId, new Date().toISOString().slice(0, 10))?.count || 0;
  const activeCooldowns = Cooldowns.getAllForGiver(target.id, guildId);
  const settings = GuildSettings.ensure(guildId);

  const headerBlock = [
    `## 🔍 Vouch Check: ${target.username}`,
    `**User ID:** \`${target.id}\``,
    `**Account Date:** ${target.createdAt.toLocaleDateString()}`,
  ].join('\n');

  let historyBlock = `**__Recent History (Server Only)__**\n`;
  if (receivedVouches.length > 0) {
    historyBlock += receivedVouches.map(v => `> ID \`${v.id}\` | ${stars(v.rating)} from <@${v.giver_id}> ${timeAgo(v.created_at)}`).join('\n');
  } else {
    historyBlock += '> No vouches found on this server.';
  }

  const statusBlock = [
    `**__Current Status__**`,
    `**Blacklist:** ${blacklistStatus ? `🚫 Blacklisted by <@${blacklistStatus.blacklisted_by}>` : '✅ Clear'}`,
    `**Daily Count:** \`${dailyCount}\` / \`${settings.max_vouches_per_day || '∞'}\``,
  ].join('\n');

  let cooldownBlock = `**__Active Cooldowns__**\n`;
  const now = Math.floor(Date.now() / 1000);
  const validCDs = activeCooldowns.map(cd => {
    const remaining = (cd.last_vouch + settings.vouch_cooldown_hours * 3600) - now;
    if (remaining > 0) return `> With <@${cd.receiver_id}> for ${formatDuration(remaining)}`;
    return null;
  }).filter(Boolean);

  if (validCDs.length > 0) {
    cooldownBlock += validCDs.join('\n');
  } else {
    cooldownBlock += '> No active cooldowns.';
  }

  const footerBlock = `-# Vouch Bot  •  Admin Inspection Tool  •  Developed by Ansh4Real`;

  const container = new ContainerBuilder()
    .setAccentColor(blacklistStatus ? 0xed4245 : 0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(historyBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(statusBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(cooldownBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerBlock));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouchcheck')
    .setDescription("Check a user's full vouch status in this server.")
    .addUserOption(option =>
      option.setName('user').setDescription('The user to check').setRequired(true)
    ),
  aliases: ['vouchcheck'],
  guildOnly: true,
  adminOnly: true,

  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const reply = await buildVouchCheckComponents(client, target, interaction.guild.id);
    await interaction.editReply(reply);
  },

  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) {
      return message.reply(errorReply('Invalid User', 'You must mention a user or provide a valid user ID.'));
    }

    const reply = await buildVouchCheckComponents(client, target, message.guild.id);
    await message.reply(reply);
  },
};
