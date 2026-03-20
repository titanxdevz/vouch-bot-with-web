
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Vouches } = require('../../utils/database');
const { successReply, errorReply, infoReply } = require('../../utils/builders');
const { isManager } = require('../../utils/permissions');
const { sendDevLog } = require('../../utils/devLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetvouches')
    .setDescription('Reset all vouches for a user in this server.')
    .addUserOption(option => option.setName('user').setDescription('The user to reset').setRequired(true)),
  aliases: ['resetvouches'],
  guildOnly: true,
  adminOnly: true,
  async execute(interaction, client) {
    if (!isManager(client, interaction.member)) {
      return interaction.reply({ content: 'You must have the Manage Guild permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.editReply({ ...infoReply('Confirm Reset', `Are you sure you want to reset all vouches for ${target}? This action cannot be undone.`), components: [row] });

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'You cannot control this confirmation.', ephemeral: true });

      if (i.customId === 'confirm') {
        const result = Vouches.reset.run(target.id, interaction.guild.id);
        await i.update({ ...successReply('Vouches Reset', `Successfully reset ${result.changes} vouches for ${target}.`), components: [] });
        sendDevLog(client, { type: 'admin', title: 'Vouches Reset', body: `**User:** ${target.tag} (${target.id})\n**Guild:** ${interaction.guild.name} (${interaction.guild.id})\n**Moderator:** ${interaction.user.tag} (${interaction.user.id})` });
      } else {
        await i.update({ content: 'Reset cancelled.', components: [] });
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({ content: 'Reset confirmation timed out.', components: [] });
      }
    });
  },
  async prefixExecute(message, args, client) {
    if (!isManager(client, message.member)) {
      return message.reply({ content: 'You must have the Manage Guild permission to use this command.' });
    }

    const target = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!target) {
      return message.reply(errorReply('Invalid User', 'You must mention a user or provide a valid user ID.'));
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    const confirmMessage = await message.reply({ ...infoReply('Confirm Reset', `Are you sure you want to reset all vouches for ${target}? This action cannot be undone.`), components: [row] });

    const collector = confirmMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) return i.reply({ content: 'You cannot control this confirmation.', ephemeral: true });

      if (i.customId === 'confirm') {
        const result = Vouches.reset.run(target.id, message.guild.id);
        await i.update({ ...successReply('Vouches Reset', `Successfully reset ${result.changes} vouches for ${target}.`), components: [] });
        sendDevLog(client, { type: 'admin', title: 'Vouches Reset', body: `**User:** ${target.tag} (${target.id})\n**Guild:** ${message.guild.name} (${message.guild.id})\n**Moderator:** ${message.author.tag} (${message.author.id})` });
      } else {
        await i.update({ content: 'Reset cancelled.', components: [] });
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        confirmMessage.edit({ content: 'Reset confirmation timed out.', components: [] });
      }
    });
  },
};
