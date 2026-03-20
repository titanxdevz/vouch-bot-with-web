
const { SlashCommandBuilder } = require('discord.js');
const { GuildSettings } = require('../../utils/database');
const { successReply, errorReply } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Set the bot\'s prefix for this server.')
    .addStringOption(option => option.setName('prefix').setDescription('The new prefix').setRequired(true)),
  aliases: ['setprefix'],
  guildOnly: true,
  adminOnly: true,
  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const newPrefix = interaction.options.getString('prefix');
    if (newPrefix.length > 5) {
      return interaction.editReply(errorReply('Prefix Too Long', 'The prefix cannot be longer than 5 characters.'));
    }

    GuildSettings.update(interaction.guild.id, 'prefix', newPrefix);

    await interaction.editReply(successReply('Prefix Set', `The bot\'s prefix has been set to \`${newPrefix}\`.`));
  },
  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const newPrefix = args[0];
    if (!newPrefix) {
      return message.reply(errorReply('Invalid Prefix', 'You must provide a new prefix.'));
    }

    if (newPrefix.length > 5) {
      return message.reply(errorReply('Prefix Too Long', 'The prefix cannot be longer than 5 characters.'));
    }

    GuildSettings.update(message.guild.id, 'prefix', newPrefix);

    await message.reply(successReply('Prefix Set', `The bot\'s prefix has been set to \`${newPrefix}\`.`));
  },
};
