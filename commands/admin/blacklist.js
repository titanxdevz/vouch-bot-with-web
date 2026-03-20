
const { SlashCommandBuilder } = require('discord.js');
const { Blacklist } = require('../../utils/database');
const { successReply, errorReply } = require('../../utils/builders');
const { isManager, isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist a user from vouching.')
    .addUserOption(option => option.setName('user').setDescription('The user to blacklist').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for the blacklist')),
  aliases: ['blacklist'],
  guildOnly: true,
  adminOnly: true,
  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (target.id === client.user.id) {
      return interaction.editReply(errorReply('Invalid Target', 'You cannot blacklist the bot.'));
    }

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (targetMember && isAdmin(client, targetMember)) {
      return interaction.editReply(errorReply('Invalid Target', 'You cannot blacklist an administrator.'));
    }

    Blacklist.add.run(target.id, interaction.guild.id, reason, interaction.user.id);

    await interaction.editReply(successReply('User Blacklisted', `${target} has been blacklisted.`));
  },
  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const target = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!target) {
      return message.reply(errorReply('Invalid User', 'You must mention a user or provide a valid user ID.'));
    }

    if (target.id === client.user.id) {
      return message.reply(errorReply('Invalid Target', 'You cannot blacklist the bot.'));
    }

    const targetMember = await message.guild.members.fetch(target.id).catch(() => null);
    if (targetMember && isAdmin(client, targetMember)) {
      return message.reply(errorReply('Invalid Target', 'You cannot blacklist an administrator.'));
    }

    const reason = args.slice(1).join(' ') || null;
    Blacklist.add.run(target.id, message.guild.id, reason, message.author.id);

    await message.reply(successReply('User Blacklisted', `${target} has been blacklisted.`));
  },
};
