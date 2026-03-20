
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { infoReply, successReply, errorReply } = require('../../utils/builders');
const { isDev } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement to the main server.')
    .addStringOption(option => option.setName('message').setDescription('The message to announce').setRequired(true)),
  aliases: ['announce'],
  devOnly: true,
  guildOnly: false,
  async execute(interaction, client) {
    if (!isDev(client, interaction.user.id)) {
      return interaction.reply({ content: 'You must be a bot developer to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const announcement = interaction.options.getString('message');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Send').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.editReply({ ...infoReply('Confirm Announcement', `**Message:**\n${announcement}`), components: [row] });

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'You cannot control this confirmation.', ephemeral: true });

      if (i.customId === 'confirm') {
        try {
          const mainGuild = await client.guilds.fetch(client.config.mainServerId);
          const channel = mainGuild.systemChannel || mainGuild.channels.cache.find(c => c.type === 'GUILD_TEXT');
          await channel.send(infoReply('Announcement', announcement));
          await i.update({ ...successReply('Announcement Sent', 'The announcement has been sent successfully.'), components: [] });
        } catch (error) {
          await i.update({ ...errorReply('Failed to Send', 'Could not send the announcement. Please check the main server ID and my permissions.'), components: [] });
        }
      } else {
        await i.update({ content: 'Announcement cancelled.', components: [] });
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({ content: 'Announcement confirmation timed out.', components: [] });
      }
    });
  },
  async prefixExecute(message, args, client) {
    if (!isDev(client, message.author.id)) {
      return message.reply({ content: 'You must be a bot developer to use this command.' });
    }

    const announcement = args.join(' ');
    if (!announcement) {
      return message.reply(errorReply('Invalid Message', 'You must provide a message to announce.'));
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Send').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );

    const confirmMessage = await message.reply({ ...infoReply('Confirm Announcement', `**Message:**\n${announcement}`), components: [row] });

    const collector = confirmMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: 'You cannot control this confirmation.', ephemeral: true });

      if (i.customId === 'confirm') {
        try {
          const mainGuild = await client.guilds.fetch(client.config.mainServerId);
          const channel = mainGuild.systemChannel || mainGuild.channels.cache.find(c => c.type === 'GUILD_TEXT');
          await channel.send(infoReply('Announcement', announcement));
          await i.update({ ...successReply('Announcement Sent', 'The announcement has been sent successfully.'), components: [] });
        } catch (error) {
          await i.update({ ...errorReply('Failed to Send', 'Could not send the announcement. Please check the main server ID and my permissions.'), components: [] });
        }
      } else {
        await i.update({ content: 'Announcement cancelled.', components: [] });
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        confirmMessage.edit({ content: 'Announcement confirmation timed out.', components: [] });
      }
    });
  },
};
