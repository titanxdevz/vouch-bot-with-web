
const { SlashCommandBuilder } = require('discord.js');
const { infoReply, errorReply } = require('../../utils/builders');
const { isDev } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('devlog')
    .setDescription('Show the last N dev log entries.')
    .addIntegerOption(option => option.setName('lines').setDescription('The number of lines to show (1-20)').setMinValue(1).setMaxValue(20)),
  aliases: ['devlog'],
  devOnly: true,
  guildOnly: false,
  async execute(interaction, client) {
    if (!isDev(client, interaction.user.id)) {
      return interaction.reply({ content: 'You must be a bot developer to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    if (!client.config.devLogChannelId) {
      return interaction.editReply(errorReply('No Log Channel', 'The dev log channel has not been configured.'));
    }

    const lines = interaction.options.getInteger('lines') || 10;

    try {
      const channel = await client.channels.fetch(client.config.devLogChannelId);
      const messages = await channel.messages.fetch({ limit: lines });
      const description = messages.map(m => `**[<t:${Math.floor(m.createdTimestamp / 1000)}:T>]** ${m.components[0].components[0].text}`).join('\n');
      await interaction.editReply(infoReply('Dev Log', description));
    } catch (error) {
      await interaction.editReply(errorReply('Error Fetching Log', 'Could not fetch the dev log. Please check the channel ID and my permissions.'));
    }
  },
  async prefixExecute(message, args, client) {
    if (!isDev(client, message.author.id)) {
      return message.reply({ content: 'You must be a bot developer to use this command.' });
    }

    if (!client.config.devLogChannelId) {
      return message.reply(errorReply('No Log Channel', 'The dev log channel has not been configured.'));
    }

    const lines = args[0] ? parseInt(args[0]) : 10;

    try {
      const channel = await client.channels.fetch(client.config.devLogChannelId);
      const messages = await channel.messages.fetch({ limit: lines });
      const description = messages.map(m => `**[<t:${Math.floor(m.createdTimestamp / 1000)}:T>]** ${m.components[0].components[0].text}`).join('\n');
      await message.reply(infoReply('Dev Log', description));
    } catch (error) {
      await message.reply(errorReply('Error Fetching Log', 'Could not fetch the dev log. Please check the channel ID and my permissions.'));
    }
  },
};
