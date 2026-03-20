
const { SlashCommandBuilder } = require('discord.js');
const { Vouches } = require('../../utils/database');
const { successReply, errorReply } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removevouch')
    .setDescription('Remove a specific vouch by its ID.')
    .addIntegerOption(option => option.setName('id').setDescription('The ID of the vouch to remove').setRequired(true)),
  aliases: ['removevouch'],
  guildOnly: true,
  adminOnly: true,
  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const vouchId = interaction.options.getInteger('id');
    const vouch = Vouches.get(vouchId);

    if (!vouch || vouch.guild_id !== interaction.guild.id) {
      return interaction.editReply(errorReply('Vouch Not Found', `No vouch found with ID ${vouchId} in this server.`));
    }

    Vouches.remove.run(vouchId);

    await interaction.editReply(successReply('Vouch Removed', `Vouch ID ${vouchId} has been removed.`));
  },
  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const vouchId = parseInt(args[0]);
    if (isNaN(vouchId)) {
      return message.reply(errorReply('Invalid ID', 'You must provide a valid vouch ID.'));
    }

    const vouch = Vouches.get(vouchId);

    if (!vouch || vouch.guild_id !== message.guild.id) {
      return message.reply(errorReply('Vouch Not Found', `No vouch found with ID ${vouchId} in this server.`));
    }

    Vouches.remove.run(vouchId);

    await message.reply(successReply('Vouch Removed', `Vouch ID ${vouchId} has been removed.`));
  },
};
