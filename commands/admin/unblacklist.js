
const { SlashCommandBuilder } = require('discord.js');
const { Blacklist } = require('../../utils/database');
const { successReply, errorReply } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('Unblacklist a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to unblacklist').setRequired(true)),
  aliases: ['unblacklist'],
  guildOnly: true,
  adminOnly: true,
  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user');
    const blacklistEntry = Blacklist.get(target.id, interaction.guild.id);

    if (!blacklistEntry) {
      return interaction.editReply(errorReply('Not Blacklisted', 'This user is not blacklisted.'));
    }

    Blacklist.remove.run(target.id, interaction.guild.id);

    await interaction.editReply(successReply('User Unblacklisted', `${target} has been unblacklisted.`));
  },
  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const target = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!target) {
      return message.reply(errorReply('Invalid User', 'You must mention a user or provide a valid user ID.'));
    }

    const blacklistEntry = Blacklist.get(target.id, message.guild.id);

    if (!blacklistEntry) {
      return message.reply(errorReply('Not Blacklisted', 'This user is not blacklisted.'));
    }

    Blacklist.remove.run(target.id, message.guild.id);

    await message.reply(successReply('User Unblacklisted', `${target} has been unblacklisted.`));
  },
};
