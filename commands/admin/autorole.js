
const { SlashCommandBuilder } = require('discord.js');
const { GuildSettings } = require('../../utils/database');
const { successReply, errorReply, infoReply } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Manage automatic role assignments based on vouch count.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add or update an auto-role threshold.')
        .addIntegerOption(option => option.setName('threshold').setDescription('The number of vouches required').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('The role to assign').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an auto-role threshold.')
        .addIntegerOption(option => option.setName('threshold').setDescription('The threshold to remove').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all auto-role thresholds.')),
  aliases: ['autorole'],
  guildOnly: true,
  adminOnly: true,
  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const settings = GuildSettings.ensure(interaction.guild.id);

    if (subcommand === 'add') {
      const threshold = interaction.options.getInteger('threshold');
      const role = interaction.options.getRole('role');

      if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.editReply(errorReply('Invalid Role', 'I cannot assign this role. It may be managed by an integration or be higher than my highest role.'));
      }

      settings.auto_roles[threshold] = role.id;
      GuildSettings.update(interaction.guild.id, 'auto_roles', JSON.stringify(settings.auto_roles));
      await interaction.editReply(successReply('Auto-role Added', `Users who reach ${threshold} vouches will now receive the ${role} role.`));
    } else if (subcommand === 'remove') {
      const threshold = interaction.options.getInteger('threshold');
      if (!settings.auto_roles[threshold]) {
        return interaction.editReply(errorReply('Not Found', `There is no auto-role configured for a threshold of ${threshold} vouches.`));
      }
      delete settings.auto_roles[threshold];
      GuildSettings.update(interaction.guild.id, 'auto_roles', JSON.stringify(settings.auto_roles));
      await interaction.editReply(successReply('Auto-role Removed', `The auto-role for ${threshold} vouches has been removed.`));
    } else if (subcommand === 'list') {
      const description = Object.keys(settings.auto_roles).length > 0
        ? Object.entries(settings.auto_roles).map(([t, r]) => `• **${t} vouches** -> <@&${r}>`).join('\n')
        : 'No auto-roles configured.';
      await interaction.editReply(infoReply('Auto-role Thresholds', description));
    }
  },
  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const [subcommand, ...subcommandArgs] = args;
    const settings = GuildSettings.ensure(message.guild.id);

    if (subcommand === 'add') {
      const threshold = parseInt(subcommandArgs[0]);
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(subcommandArgs[1]);

      if (isNaN(threshold) || !role) {
        return message.reply(errorReply('Invalid Arguments', 'Usage: `!autorole add <threshold> <@role>`'));
      }

      if (role.managed || role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply(errorReply('Invalid Role', 'I cannot assign this role. It may be managed by an integration or be higher than my highest role.'));
      }

      settings.auto_roles[threshold] = role.id;
      GuildSettings.update(message.guild.id, 'auto_roles', JSON.stringify(settings.auto_roles));
      await message.reply(successReply('Auto-role Added', `Users who reach ${threshold} vouches will now receive the ${role} role.`));
    } else if (subcommand === 'remove') {
      const threshold = parseInt(subcommandArgs[0]);
      if (isNaN(threshold)) {
        return message.reply(errorReply('Invalid Arguments', 'Usage: `!autorole remove <threshold>`'));
      }

      if (!settings.auto_roles[threshold]) {
        return message.reply(errorReply('Not Found', `There is no auto-role configured for a threshold of ${threshold} vouches.`));
      }
      delete settings.auto_roles[threshold];
      GuildSettings.update(message.guild.id, 'auto_roles', JSON.stringify(settings.auto_roles));
      await message.reply(successReply('Auto-role Removed', `The auto-role for ${threshold} vouches has been removed.`));
    } else if (subcommand === 'list') {
      const description = Object.keys(settings.auto_roles).length > 0
        ? Object.entries(settings.auto_roles).map(([t, r]) => `• **${t} vouches** -> <@&${r}>`).join('\n')
        : 'No auto-roles configured.';
      await message.reply(infoReply('Auto-role Thresholds', description));
    } else {
        message.reply(errorReply('Invalid Subcommand', 'Valid subcommands are `add`, `remove`, and `list`.'));
    }
  },
};
