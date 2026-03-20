
const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const { Vouches } = require('../../utils/database');
const { formatDuration } = require('../../utils/builders');
const { isDev } = require('../../utils/permissions');
const { version } = require('../../config');
const djsVersion = require('discord.js').version;

async function buildDevStatsComponents(client) {
  const totalGuilds = client.guilds.cache.size;
  const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  const totalVouches = Vouches.countAll().count;
  const vouches24h = Vouches.countSince(Math.floor(Date.now() / 1000) - 24 * 3600).count;
  const vouches7d = Vouches.countSince(Math.floor(Date.now() / 1000) - 7 * 24 * 3600).count;
  const top5Guilds = Vouches.getTopGuilds(5);

  const uptime = formatDuration(process.uptime());
  const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

  const headerBlock = [
    `## 📊 Bot Performance Metrics`,
    `**Uptime:** \`${uptime}\``,
    `**Memory:** \`${memoryUsage} MB\``,
  ].join('\n');

  const countsBlock = [
    `**__Global Network__**`,
    `**Guilds:** \`${totalGuilds}\``,
    `**Users:** \`${totalUsers.toLocaleString()}\``,
    `**Vouches:** \`${totalVouches.toLocaleString()}\``,
  ].join('\n');

  const velocityBlock = [
    `**__Vouch Velocity__**`,
    `**Last 24h:** \`+${vouches24h}\``,
    `**Last 7d:** \`+${vouches7d}\``,
  ].join('\n');

  let topGuildsBlock = `**__Top Infrastructure Hubs__**\n`;
  if (top5Guilds.length > 0) {
    topGuildsBlock += top5Guilds
      .map((g, i) => `> **#${i + 1}** ${client.guilds.cache.get(g.guild_id)?.name || 'Unknown'} - \`${g.vouch_count}\``)
      .join('\n');
  } else {
    topGuildsBlock += '> No active vouch data found.';
  }

  const softwareBlock = [
    `**__Software Stack__**`,
    `**Node.js:** \`${process.version}\``,
    `**discord.js:** \`v${djsVersion}\``,
    `**Bot Version:** \`v${version}\``,
  ].join('\n');

  const footerBlock = `-# Vouch Bot Developer Utilities  •  Real-time Instrumentation  •  Managed by Ansh4Real`;

  const container = new ContainerBuilder()
    .setAccentColor(0x34495e)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(countsBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(velocityBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(topGuildsBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(softwareBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerBlock));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('devstats')
    .setDescription('View detailed statistics about the bot.'),
  aliases: ['devstats'],
  devOnly: true,
  guildOnly: false,

  async execute(interaction, client) {
    if (!isDev(client, interaction.user.id)) {
      return interaction.reply({ content: 'You must be a bot developer to use this command.', ephemeral: true });
    }

    await interaction.deferReply();
    const reply = await buildDevStatsComponents(client);
    await interaction.editReply(reply);
  },

  async prefixExecute(message, args, client) {
    if (!isDev(client, message.author.id)) {
      return message.reply({ content: 'You must be a bot developer to use this command.' });
    }

    const reply = await buildDevStatsComponents(client);
    await message.reply(reply);
  },
};
