
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

const { Vouches } = require('../../utils/database');
const { stars, timeAgo } = require('../../utils/builders');

const VOUCHES_PER_PAGE = 5;

function generateVouchesReply(target, type, scope, vouches, page, maxPage) {
  const scopeLabel = scope === 'global' ? 'Global' : 'Server';
  const typeLabel = type === 'received' ? 'Received' : 'Given';

  const headerBlock = [
    `## ${target.username}'s ${scopeLabel} ${typeLabel} Vouches`,
    `**Page:** \`${page + 1}\` / \`${maxPage + 1}\``,
    `**Type:** \`${typeLabel}\``,
  ].join('\n');

  let listBlock = `**__Vouch History__**\n`;
  if (vouches.length > 0) {
    listBlock += vouches
      .map(v => {
        const userText = type === 'received' ? `from <@${v.giver_id}>` : `to <@${v.receiver_id}>`;
        const comment = v.comment
          ? v.comment.substring(0, 100) + (v.comment.length > 100 ? '...' : '')
          : 'No comment';
        return `> ID \`${v.id}\` | ${stars(v.rating)} ${userText} ${timeAgo(v.created_at)}\n> *${comment}*`;
      })
      .join('\n\n');
  } else {
    listBlock += '> No vouches found.';
  }

  const footerBlock = `-# Vouch Bot  •  Page ${page + 1} of ${maxPage + 1}  •  Developed by Ansh4Real`;

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listBlock))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerBlock));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouches')
    .setDescription("View a user's vouches.")
    .addUserOption(option =>
      option.setName('user').setDescription('The user to view')
    )
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Received or given vouches')
        .addChoices(
          { name: 'Received', value: 'received' },
          { name: 'Given', value: 'given' }
        )
    )
    .addStringOption(option =>
      option
        .setName('scope')
        .setDescription('Global or server vouches')
        .addChoices(
          { name: 'Global', value: 'global' },
          { name: 'Server', value: 'server' }
        )
    ),
  aliases: ['vouches'],
  guildOnly: false,

  async execute(interaction, client) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const type = interaction.options.getString('type') || 'received';
    const scope = interaction.options.getString('scope') || 'server';
    const guildId = scope === 'server' ? interaction.guild.id : null;

    let page = 0;
    const totalVouches = Vouches.getCount(target.id, type, guildId);
    const maxPage = Math.max(0, Math.floor((totalVouches - 1) / VOUCHES_PER_PAGE));

    const vouches = Vouches.getPage(target.id, type, guildId, page, VOUCHES_PER_PAGE);
    const reply = generateVouchesReply(target, type, scope, vouches, page, maxPage);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('first').setLabel('«').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('prev').setLabel('‹').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('next').setLabel('›').setStyle(ButtonStyle.Primary).setDisabled(page >= maxPage),
      new ButtonBuilder().setCustomId('last').setLabel('»').setStyle(ButtonStyle.Primary).setDisabled(page >= maxPage)
    );

    const message = await interaction.editReply({ ...reply, components: [...reply.components, row] });

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'You cannot control this pagination.', ephemeral: true });

      if (i.customId === 'first') page = 0;
      if (i.customId === 'prev') page = Math.max(0, page - 1);
      if (i.customId === 'next') page = Math.min(maxPage, page + 1);
      if (i.customId === 'last') page = maxPage;

      const newVouches = Vouches.getPage(target.id, type, guildId, page, VOUCHES_PER_PAGE);
      const newReply = generateVouchesReply(target, type, scope, newVouches, page, maxPage);

      row.components[0].setDisabled(page === 0);
      row.components[1].setDisabled(page === 0);
      row.components[2].setDisabled(page >= maxPage);
      row.components[3].setDisabled(page >= maxPage);

      await i.update({ ...newReply, components: [...newReply.components, row] });
    });

    collector.on('end', () => {
      row.components.forEach(c => c.setDisabled(true));
      interaction.editReply({ components: [...reply.components, row] }).catch(() => {});
    });
  },

  async prefixExecute(message, args, client) {
    const target =
      message.mentions.users.first() ||
      (args[0] && !['received', 'given', 'global', 'server'].includes(args[0])
        ? await client.users.fetch(args[0]).catch(() => null)
        : null) ||
      message.author;
    const type = args.includes('given') ? 'given' : 'received';
    const scope = args.includes('global') ? 'global' : 'server';
    const guildId = scope === 'server' ? message.guild.id : null;

    const totalVouches = Vouches.getCount(target.id, type, guildId);
    const maxPage = Math.max(0, Math.floor((totalVouches - 1) / VOUCHES_PER_PAGE));

    const vouches = Vouches.getPage(target.id, type, guildId, 0, VOUCHES_PER_PAGE);
    const reply = generateVouchesReply(target, type, scope, vouches, 0, maxPage);

    await message.reply(reply);
  },
};
