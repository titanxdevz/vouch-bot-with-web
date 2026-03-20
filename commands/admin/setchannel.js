
const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { GuildSettings } = require('../../utils/database');
const { successReply, errorReply } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set the vouch or log channel.')
    .addStringOption(option => option.setName('type').setDescription('The type of channel to set').setRequired(true).addChoices({ name: 'Vouch', value: 'vouch' }, { name: 'Log', value: 'log' }))
    .addChannelOption(option => option.setName('channel').setDescription('The channel to set').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  aliases: ['setchannel'],
  guildOnly: true,
  adminOnly: true,
  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    const key = type === 'vouch' ? 'vouch_channel_id' : 'log_channel_id';
    GuildSettings.update(interaction.guild.id, key, channel.id);

    await interaction.editReply(successReply('Channel Set', `The ${type} channel has been set to ${channel}.`));
  },
  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const [type, channelArg] = args;
    if (!['vouch', 'log'].includes(type)) {
      return message.reply(errorReply('Invalid Type', 'You must specify either `vouch` or `log`.'));
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(channelArg);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply(errorReply('Invalid Channel', 'You must mention a valid text channel or provide its ID.'));
    }

    const key = type === 'vouch' ? 'vouch_channel_id' : 'log_channel_id';
    GuildSettings.update(message.guild.id, key, channel.id);

    await message.reply(successReply('Channel Set', `The ${type} channel has been set to ${channel}.`));
  },
};
