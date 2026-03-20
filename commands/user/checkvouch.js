
const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const { Vouches } = require('../../utils/database');
const { stars, formatDate, timeAgo, errorReply } = require('../../utils/builders');

async function buildVouchComponents(vouch, giver, receiver) {
  const headerBlock = [
    `## 🧾 Vouch Details: #${vouch.id}`,
    `**Rating:** ${stars(vouch.rating)}`,
    `**Date:** ${formatDate(vouch.created_at)} (${timeAgo(vouch.created_at)})`,
  ].join('\n');

  const participantsBlock = [
    `**__Participants__**`,
    `**From:** ${giver.tag} (\`${giver.id}\`)`,
    `**To:** ${receiver.tag} (\`${receiver.id}\`)`,
  ].join('\n');

  const commentBlock = [
    `**__Comment__**`,
    `> ${vouch.comment || '*No comment provided.*'}`,
  ].join('\n');

  const extraBlock = [
    `**__Metadata__**`,
    `**Guild ID:** \`${vouch.guild_id}\``,
  ].join('\n');

  const footerBlock = `-# Vouch Bot  •  Reputation System  •  Developed by Ansh4Real`;

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(participantsBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(commentBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(extraBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerBlock));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkvouch')
    .setDescription('Check a specific vouch by its ID.')
    .addIntegerOption(option =>
      option.setName('id').setDescription('The ID of the vouch to check').setRequired(true)
    ),
  aliases: ['checkvouch'],
  guildOnly: false,

  async execute(interaction, client) {
    await interaction.deferReply();
    const vouchId = interaction.options.getInteger('id');
    const vouch = Vouches.get(vouchId);

    if (!vouch) {
      return interaction.editReply(errorReply('Vouch Not Found', `No vouch found with ID ${vouchId}.`));
    }

    const [giver, receiver] = await Promise.all([
      client.users.fetch(vouch.giver_id).catch(() => ({ tag: 'Unknown User', id: vouch.giver_id })),
      client.users.fetch(vouch.receiver_id).catch(() => ({ tag: 'Unknown User', id: vouch.receiver_id })),
    ]);

    const reply = await buildVouchComponents(vouch, giver, receiver);
    await interaction.editReply(reply);
  },

  async prefixExecute(message, args, client) {
    const vouchId = parseInt(args[0]);
    if (isNaN(vouchId)) {
      return message.reply(errorReply('Invalid ID', 'You must provide a valid vouch ID.'));
    }

    const vouch = Vouches.get(vouchId);
    if (!vouch) {
      return message.reply(errorReply('Vouch Not Found', `No vouch found with ID ${vouchId}.`));
    }

    const [giver, receiver] = await Promise.all([
      client.users.fetch(vouch.giver_id).catch(() => ({ tag: 'Unknown User', id: vouch.giver_id })),
      client.users.fetch(vouch.receiver_id).catch(() => ({ tag: 'Unknown User', id: vouch.receiver_id })),
    ]);

    const reply = await buildVouchComponents(vouch, giver, receiver);
    await message.reply(reply);
  },
};
