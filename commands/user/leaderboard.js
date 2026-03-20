
const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const { Vouches } = require('../../utils/database');
const { stars } = require('../../utils/builders');

async function buildLeaderboardComponents(client, scope, guild, limit) {
  const guildId = scope === 'server' ? guild.id : null;
  const leaderboard = Vouches.getLeaderboard(guildId, limit);

  const scopeLabel = scope === 'global' ? 'Global' : 'Server';
  const guildName = scope === 'server' ? guild.name : 'All Servers';

  let headerText = `## 🏆 Vouch Leaderboard`;
  const headerBlock = [
    headerText,
    `**Scope:** \`${scopeLabel}\``,
    `**Region:** \`${guildName}\``,
    `**Showing Top:** \`${limit}\` users`,
  ].join('\n');

  let listBlock = `**__Top Reputation Holders__**\n`;
  if (leaderboard.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const lines = await Promise.all(
      leaderboard.map(async (entry, index) => {
        const user = await client.users.fetch(entry.receiver_id).catch(() => ({ username: 'Unknown User', id: entry.receiver_id }));
        const medal = index < 3 ? medals[index] : `**#${index + 1}**`;
        return `${medal} **${user.username}** (\`${user.id}\`)\n> ${stars(entry.average_rating)}  **${entry.total_vouches}** vouches`;
      })
    );
    listBlock += lines.join('\n\n');
  } else {
    listBlock += '> No vouches recorded yet.';
  }

  const footerBlock = `-# Vouch Bot  •  Leaderboard updated ${new Date().toLocaleTimeString()}  •  Developed by Ansh4Real`;

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerBlock));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the vouch leaderboard.')
    .addStringOption(option =>
      option.setName('scope').setDescription('The scope of the leaderboard').addChoices(
        { name: 'Server', value: 'server' },
        { name: 'Global', value: 'global' }
      )
    )
    .addIntegerOption(option =>
      option.setName('limit').setDescription('The number of users to show (3-20)').setMinValue(3).setMaxValue(20)
    ),
  aliases: ['lb'],
  guildOnly: false,

  async execute(interaction, client) {
    await interaction.deferReply();
    const scope = interaction.options.getString('scope') || 'server';
    const limit = interaction.options.getInteger('limit') || 10;
    const reply = await buildLeaderboardComponents(client, scope, interaction.guild, limit);
    await interaction.editReply(reply);
  },

  async prefixExecute(message, args, client) {
    const scope = args.includes('global') ? 'global' : 'server';
    const limit = parseInt(args.find(arg => !isNaN(parseInt(arg)))) || 10;
    const reply = await buildLeaderboardComponents(client, scope, message.guild, limit);
    await message.reply(reply);
  },
};
