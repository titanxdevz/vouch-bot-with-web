
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const { GuildSettings } = require('../../utils/database');
const { isManager } = require('../../utils/permissions');

function generateSetupReply(settings) {
  const headerBlock = [
    `## ⚙️ Vouch Bot Configuration`,
    `**Server:** \`${settings.guild_id}\``,
  ].join('\n');

  const channelsBlock = [
    `**__Channels__**`,
    `**Vouch:** ${settings.vouch_channel_id ? `<#${settings.vouch_channel_id}>` : '`Not Set`'}`,
    `**Logs:** ${settings.log_channel_id ? `<#${settings.log_channel_id}>` : '`Not Set`'}`,
  ].join('\n');

  const constraintsBlock = [
    `**__Rules & Constraints__**`,
    `**Cooldown:** \`${settings.vouch_cooldown_hours} hours\``,
    `**Daily Limit:** \`${settings.max_vouches_per_day || 'Unlimited'}\``,
    `**Min Account Age:** \`${settings.min_account_age_days} days\``,
    `**Require Comment:** ${settings.require_comment ? '✅ Yes' : '❌ No'}`,
  ].join('\n');

  const footerBlock = `-# Vouch Bot  •  Industrial Reputation System  •  Developed by Ansh4Real`;

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(channelsBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(constraintsBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerBlock));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Interactively set up the vouch bot for this server.'),
  aliases: ['setup'],
  guildOnly: true,
  adminOnly: true,

  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const settings = GuildSettings.ensure(interaction.guild.id);
    let currentSettings = { ...settings };

    const reply = generateSetupReply(currentSettings);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('set_vouch_channel').setLabel('Vouch Channel').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('set_log_channel').setLabel('Log Channel').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('set_cooldown').setLabel('Cooldown').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_daily_limit').setLabel('Daily Limit').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('toggle_require_comment').setLabel('Require Comment').setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('save').setLabel('Save Changes').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel').setLabel('Discard').setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.editReply({ ...reply, components: [...reply.components, row, row2] });
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'You cannot control this setup.', ephemeral: true });

      await i.deferUpdate();

      const askForChannel = async (channelType) => {
        const filter = m => m.author.id === i.user.id;
        const promptMsg = await i.followUp({ content: `Please mention the channel you want to set as the ${channelType} channel, or send its ID.`, ephemeral: true });
        const collected = await i.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
        if (!collected) return i.followUp({ content: 'No channel provided.', ephemeral: true });
        const channel = collected.first().mentions.channels.first() || i.guild.channels.cache.get(collected.first().content);
        if (channel && channel.type === ChannelType.GuildText) {
          currentSettings[`${channelType}_channel_id`] = channel.id;
        } else {
          i.followUp({ content: 'Invalid channel provided.', ephemeral: true });
        }
        collected.first().delete().catch(() => {});
        promptMsg.delete().catch(() => {});
      };

      const askForNumber = async (settingName, prompt) => {
        const filter = m => m.author.id === i.user.id && !isNaN(parseInt(m.content));
        const promptMsg = await i.followUp({ content: prompt, ephemeral: true });
        const collected = await i.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
        if (!collected) return i.followUp({ content: 'No value provided.', ephemeral: true });
        currentSettings[settingName] = Math.max(0, parseInt(collected.first().content));
        collected.first().delete().catch(() => {});
        promptMsg.delete().catch(() => {});
      };

      switch (i.customId) {
        case 'set_vouch_channel':
          await askForChannel('vouch');
          break;
        case 'set_log_channel':
          await askForChannel('log');
          break;
        case 'set_cooldown':
          await askForNumber('vouch_cooldown_hours', 'Please enter the vouch cooldown in hours.');
          break;
        case 'set_daily_limit':
          await askForNumber('max_vouches_per_day', 'Please enter the maximum number of vouches a user can give per day.');
          break;
        case 'toggle_require_comment':
          currentSettings.require_comment = !currentSettings.require_comment;
          break;
        case 'save':
          GuildSettings.set.run(
            currentSettings.vouch_channel_id,
            currentSettings.log_channel_id,
            currentSettings.min_account_age_days,
            currentSettings.min_server_age_days,
            currentSettings.require_comment ? 1 : 0,
            currentSettings.vouch_cooldown_hours,
            currentSettings.max_vouches_per_day,
            JSON.stringify(currentSettings.allowed_roles),
            JSON.stringify(currentSettings.blocked_roles),
            JSON.stringify(currentSettings.auto_roles),
            i.user.id,
            Math.floor(Date.now() / 1000),
            i.guild.id
          );
          await interaction.editReply({ content: '✅ Settings have been saved successfully.', components: [] });
          collector.stop();
          return;
        case 'cancel':
          await interaction.editReply({ content: '❌ Setup cancelled. Changes were not saved.', components: [] });
          collector.stop();
          return;
      }

      const newReply = generateSetupReply(currentSettings);
      await interaction.editReply({ ...newReply, components: [...newReply.components, row, row2] });
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({ content: '⏰ Setup session timed out.', components: [] });
      }
    });
  },

  async prefixExecute(message, args, client) {
    await message.reply('Please use the `/setup` slash command for a premium interactive setup experience.');
  },
};
