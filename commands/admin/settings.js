const {
  SlashCommandBuilder,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const { GuildSettings } = require('../../utils/database');
const { stars, errorReply, successReply } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');

function generateSettingsReply(settings) {
  const headerBlock = [
    `## 🛠️ Server Settings Configuration`,
    `**Server:** \`${settings.guild_id}\``,
  ].join('\n');

  const channelsBlock = [
    `**__Core Channels__**`,
    `**Vouch:** ${settings.vouch_channel_id ? `<#${settings.vouch_channel_id}>` : '`Not Set`'}`,
    `**Logs:** ${settings.log_channel_id ? `<#${settings.log_channel_id}>` : '`Not Set`'}`,
  ].join('\n');

  const limitsBlock = [
    `**__Limits & Ages__**`,
    `**Cooldown:** \`${settings.vouch_cooldown_hours} hours\``,
    `**Daily Limit:** \`${settings.max_vouches_per_day || 'Unlimited'}\``,
    `**Min Account Age:** \`${settings.min_account_age_days} days\``,
    `**Min Server Age:** \`${settings.min_server_age_days} days\``,
  ].join('\n');

  const policyBlock = [
    `**__Policies__**`,
    `**Require Comment:** ${settings.require_comment ? '✅ Yes' : '🔴 No'}`,
    `**Allowed Roles:** ${settings.allowed_roles.length > 0 ? settings.allowed_roles.map(r => `<@&${r}>`).join(', ') : '`Everyone`'}`,
    `**Blocked Roles:** ${settings.blocked_roles.length > 0 ? settings.blocked_roles.map(r => `<@&${r}>`).join(', ') : '`None`'}`,
  ].join('\n');

  let autoRoleBlock = `**__Reputation Rewards__**\n`;
  const autoRoles = Object.entries(settings.auto_roles);
  if (autoRoles.length > 0) {
    autoRoleBlock += autoRoles.map(([t, r]) => `> \`${t}\` vouches → <@&${r}>`).join('\n');
  } else {
    autoRoleBlock += '> No auto-roles configured.';
  }

  const footerBlock = `-# Vouch Bot  •  System Administration  •  Current Version: 1.0.0`;

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(channelsBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(limitsBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(policyBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(autoRoleBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerBlock));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View or update server settings.')
    .addStringOption(option =>
      option
        .setName('key')
        .setDescription('The setting to update')
        .addChoices(
          { name: 'Vouch Channel', value: 'vouch_channel_id' },
          { name: 'Log Channel', value: 'log_channel_id' },
          { name: 'Cooldown', value: 'vouch_cooldown_hours' },
          { name: 'Daily Limit', value: 'max_vouches_per_day' },
          { name: 'Account Age', value: 'min_account_age_days' },
          { name: 'Server Age', value: 'min_server_age_days' },
          { name: 'Require Comment', value: 'require_comment' },
          { name: 'Reset', value: 'reset' }
        )
    )
    .addStringOption(option =>
      option.setName('value').setDescription('The new value for the setting')
    ),
  aliases: ['settings'],
  guildOnly: true,
  adminOnly: true,

  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const key = interaction.options.getString('key');
    const value = interaction.options.getString('value');

    if (!key) {
      const settings = GuildSettings.ensure(interaction.guild.id);
      return interaction.editReply(generateSettingsReply(settings));
    }

    if (key === 'reset') {
      GuildSettings.set.run(null, null, 0, 0, 0, 0, 0, '[]', '[]', '{}', null, null, interaction.guild.id);
      return interaction.editReply(successReply('Settings Reset', 'All settings have been reset to their defaults.'));
    }

    if (!value) {
      return interaction.editReply(errorReply('Missing Value', 'You must provide a value to update the setting.'));
    }

    let processedValue = value;
    if (['vouch_cooldown_hours', 'max_vouches_per_day', 'min_account_age_days', 'min_server_age_days'].includes(key)) {
      processedValue = parseInt(value);
      if (isNaN(processedValue)) return interaction.editReply(errorReply('Invalid Value', 'The value for this setting must be a number.'));
    } else if (key === 'require_comment') {
      processedValue = ['true', '1', 'yes', 'on'].includes(value.toLowerCase()) ? 1 : 0;
    } else if (['vouch_channel_id', 'log_channel_id'].includes(key)) {
      const channel = interaction.guild.channels.cache.get(value.replace(/<#|>/g, ''));
      if (!channel || channel.type !== ChannelType.GuildText)
        return interaction.editReply(errorReply('Invalid Channel', 'The provided value is not a valid text channel.'));
      processedValue = channel.id;
    }

    GuildSettings.update(interaction.guild.id, key, processedValue);
    interaction.editReply(successReply('Setting Updated', `The \`${key}\` setting has been updated to \`${processedValue}\`.`));
  },

  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const [key, ...valueParts] = args;
    const value = valueParts.join(' ');

    if (!key) {
      const settings = GuildSettings.ensure(message.guild.id);
      return message.reply(generateSettingsReply(settings));
    }

    if (key === 'reset') {
      GuildSettings.set.run(null, null, 0, 0, 0, 0, 0, '[]', '[]', '{}', null, null, message.guild.id);
      return message.reply(successReply('Settings Reset', 'All settings have been reset to their defaults.'));
    }

    if (!value) {
      return message.reply(errorReply('Missing Value', 'You must provide a value to update the setting.'));
    }

    let processedValue = value;
    if (['vouch_cooldown_hours', 'max_vouches_per_day', 'min_account_age_days', 'min_server_age_days'].includes(key)) {
      processedValue = parseInt(value);
      if (isNaN(processedValue)) return message.reply(errorReply('Invalid Value', 'The value for this setting must be a number.'));
    } else if (key === 'require_comment') {
      processedValue = ['true', '1', 'yes', 'on'].includes(value.toLowerCase()) ? 1 : 0;
    } else if (['vouch_channel_id', 'log_channel_id'].includes(key)) {
      const channel = message.guild.channels.cache.get(value.replace(/<#|>/g, ''));
      if (!channel || channel.type !== ChannelType.GuildText)
        return message.reply(errorReply('Invalid Channel', 'The provided value is not a valid text channel.'));
      processedValue = channel.id;
    }

    GuildSettings.update(message.guild.id, key, processedValue);
    message.reply(successReply('Setting Updated', `The \`${key}\` setting has been updated to \`${processedValue}\`.`));
  },
};
