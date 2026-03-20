
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { GuildSettings } = require('../../utils/database');
const { successReply, errorReply, infoReply } = require('../../utils/builders');
const { isDev } = require('../../utils/permissions');
const { sendDevLog } = require('../../utils/devLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forcereset')
    .setDescription('Forcibly reset all settings for a specific guild.')
    .addStringOption(option => option.setName('guildid').setDescription('The ID of the guild to reset').setRequired(true)),
  aliases: ['forcereset'],
  devOnly: true,
  guildOnly: false,
  async execute(interaction, client) {
    if (!isDev(client, interaction.user.id)) {
      return interaction.reply({ content: 'You must be a bot developer to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const guildId = interaction.options.getString('guildid');
    const guild = await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return interaction.editReply(errorReply('Invalid Guild', 'I am not in a guild with that ID.'));
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirm Reset').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.editReply({ ...infoReply('Confirm Force Reset', `Are you sure you want to reset all settings for **${guild.name}**? This action cannot be undone.`), components: [row] });

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'You cannot control this confirmation.', ephemeral: true });

      if (i.customId === 'confirm') {
        GuildSettings.set.run(null, null, 0, 0, 0, 0, 0, '[]', '[]', '{}', null, null, guild.id);
        await i.update({ ...successReply('Guild Reset', `Successfully reset all settings for **${guild.name}**.` ), components: [] });
        sendDevLog(client, { type: 'admin', title: 'Guild Force Reset', body: `**Guild:** ${guild.name} (${guild.id})\n**Developer:** ${interaction.user.tag} (${interaction.user.id})` });
      } else {
        await i.update({ content: 'Force reset cancelled.', components: [] });
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({ content: 'Force reset confirmation timed out.', components: [] });
      }
    });
  },
  async prefixExecute(message, args, client) {
    if (!isDev(client, message.author.id)) {
      return message.reply({ content: 'You must be a bot developer to use this command.' });
    }

    const guildId = args[0];
    if (!guildId) {
      return message.reply(errorReply('Invalid Guild ID', 'You must provide a guild ID to reset.'));
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      return message.reply(errorReply('Invalid Guild', 'I am not in a guild with that ID.'));
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirm Reset').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    const confirmMessage = await message.reply({ ...infoReply('Confirm Force Reset', `Are you sure you want to reset all settings for **${guild.name}**? This action cannot be undone.`), components: [row] });

    const collector = confirmMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: 'You cannot control this confirmation.', ephemeral: true });

      if (i.customId === 'confirm') {
        GuildSettings.set.run(null, null, 0, 0, 0, 0, 0, '[]', '[]', '{}', null, null, guild.id);
        await i.update({ ...successReply('Guild Reset', `Successfully reset all settings for **${guild.name}**.` ), components: [] });
        sendDevLog(client, { type: 'admin', title: 'Guild Force Reset', body: `**Guild:** ${guild.name} (${guild.id})\n**Developer:** ${message.author.tag} (${message.author.id})` });
      } else {
        await i.update({ content: 'Force reset cancelled.', components: [] });
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        confirmMessage.edit({ content: 'Force reset confirmation timed out.', components: [] });
      }
    });
  },
};
