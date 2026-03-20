
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const { Blacklist } = require('../../utils/database');
const { timeAgo } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');

const USERS_PER_PAGE = 5;

async function generateBlacklistReply(client, guildId, page) {
  const blacklist = Blacklist.list(guildId, USERS_PER_PAGE, page * USERS_PER_PAGE);
  const total = Blacklist.count(guildId).count;
  const maxPage = Math.max(0, Math.ceil(total / USERS_PER_PAGE) - 1);

  const headerBlock = [
    `## 🚫 Blacklisted Users`,
    `**Page:** \`${page + 1}\` / \`${maxPage + 1}\``,
    `**Total Blocked:** \`${total}\``,
  ].join('\n');

  let listBlock = `**__Banned from Reputation System__**\n`;
  if (blacklist.length > 0) {
    const lines = await Promise.all(
      blacklist.map(async entry => {
        const user = await client.users.fetch(entry.user_id).catch(() => ({ tag: 'Unknown User' }));
        return `> **${user.tag}** (\`${entry.user_id}\`)\n> By: <@${entry.blacklisted_by}> ${timeAgo(entry.created_at)}\n> Reason: *${entry.reason || 'No reason provided'}*`;
      })
    );
    listBlock += lines.join('\n\n');
  } else {
    listBlock += '> No users are blacklisted in this server.';
  }

  const footerBlock = `-# Vouch Bot  •  Page ${page + 1} of ${maxPage + 1}  •  Developed by Ansh4Real`;

  const container = new ContainerBuilder()
    .setAccentColor(0xed4245)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerBlock));

  return { components: [container], flags: MessageFlags.IsComponentsV2, maxPage };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklistview')
    .setDescription('View the list of blacklisted users.')
    .addIntegerOption(option =>
      option.setName('page').setDescription('The page to view').setMinValue(1)
    ),
  aliases: ['blacklistview'],
  guildOnly: true,
  adminOnly: true,

  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();
    let page = interaction.options.getInteger('page') ? interaction.options.getInteger('page') - 1 : 0;

    const { components, flags, maxPage } = await generateBlacklistReply(client, interaction.guild.id, page);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('first').setLabel('«').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('prev').setLabel('‹').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('next').setLabel('›').setStyle(ButtonStyle.Primary).setDisabled(page >= maxPage),
      new ButtonBuilder().setCustomId('last').setLabel('»').setStyle(ButtonStyle.Primary).setDisabled(page >= maxPage)
    );

    const message = await interaction.editReply({ components: [...components, row], flags });
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'You cannot control this pagination.', ephemeral: true });

      if (i.customId === 'first') page = 0;
      if (i.customId === 'prev') page = Math.max(0, page - 1);
      if (i.customId === 'next') page = Math.min(maxPage, page + 1);
      if (i.customId === 'last') page = maxPage;

      const { components: newComponents, maxPage: newMaxPage } = await generateBlacklistReply(client, interaction.guild.id, page);

      row.components[0].setDisabled(page === 0);
      row.components[1].setDisabled(page === 0);
      row.components[2].setDisabled(page >= newMaxPage);
      row.components[3].setDisabled(page >= newMaxPage);

      await i.update({ components: [...newComponents, row] });
    });

    collector.on('end', () => {
      row.components.forEach(c => c.setDisabled(true));
      interaction.editReply({ components: [...components, row] }).catch(() => {});
    });
  },

  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const page = parseInt(args[0]) ? parseInt(args[0]) - 1 : 0;
    const { components, flags } = await generateBlacklistReply(client, message.guild.id, page);
    await message.reply({ components, flags });
  },
};
