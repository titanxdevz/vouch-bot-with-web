
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { infoReply } = require('../../utils/builders');
const { isDev } = require('../../utils/permissions');

const GUILDS_PER_PAGE = 10;

function generateGuildListReply(client, page) {
  const guilds = [...client.guilds.cache.values()];
  const maxPage = Math.ceil(guilds.length / GUILDS_PER_PAGE) - 1;
  const startIndex = page * GUILDS_PER_PAGE;
  const currentGuilds = guilds.slice(startIndex, startIndex + GUILDS_PER_PAGE);

  let description = `**Page ${page + 1} of ${maxPage + 1}**\n\n`;
  if (currentGuilds.length > 0) {
    description += currentGuilds.map(g => `• **${g.name}** (${g.id}) - ${g.memberCount} members`).join('\n');
  } else {
    description = 'No guilds found.';
  }

  return { reply: infoReply('Guild List', description), maxPage };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guildlist')
    .setDescription('View the list of guilds the bot is in.')
    .addIntegerOption(option => option.setName('page').setDescription('The page to view')),
  aliases: ['guildlist'],
  devOnly: true,
  guildOnly: false,
  async execute(interaction, client) {
    if (!isDev(client, interaction.user.id)) {
      return interaction.reply({ content: 'You must be a bot developer to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    let page = interaction.options.getInteger('page') ? interaction.options.getInteger('page') - 1 : 0;

    const { reply, maxPage } = generateGuildListReply(client, page);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('first').setLabel('«').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('prev').setLabel('‹').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('next').setLabel('›').setStyle(ButtonStyle.Primary).setDisabled(page >= maxPage),
      new ButtonBuilder().setCustomId('last').setLabel('»').setStyle(ButtonStyle.Primary).setDisabled(page >= maxPage)
    );

    const message = await interaction.editReply({ ...reply, components: [row] });
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'You cannot control this pagination.', ephemeral: true });

      if (i.customId === 'first') page = 0;
      if (i.customId === 'prev') page = Math.max(0, page - 1);
      if (i.customId === 'next') page = Math.min(maxPage, page + 1);
      if (i.customId === 'last') page = maxPage;

      const { reply: newReply, maxPage: newMaxPage } = generateGuildListReply(client, page);
      
      row.components[0].setDisabled(page === 0);
      row.components[1].setDisabled(page === 0);
      row.components[2].setDisabled(page >= newMaxPage);
      row.components[3].setDisabled(page >= newMaxPage);

      await i.update({ ...newReply, components: [row] });
    });

    collector.on('end', () => {
        row.components.forEach(c => c.setDisabled(true));
        message.edit({ components: [row] }).catch(() => {});
    });
  },
  async prefixExecute(message, args, client) {
    if (!isDev(client, message.author.id)) {
      return message.reply({ content: 'You must be a bot developer to use this command.' });
    }

    const page = args[0] ? parseInt(args[0]) - 1 : 0;
    const { reply } = generateGuildListReply(client, page);

    await message.reply(reply);
  },
};
