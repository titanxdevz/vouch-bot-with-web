/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Command  : /profile                                         ║
 * ║  Desc     : View a user's vouch profile (Components V2)      ║
 * ║  Developer: Ansh4Real                                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const db = require('../../utils/database');
const { stars, timeAgo } = require('../../utils/builders');
const { BAN, STAR } = require('../../utils/emoji');

const Vouches = db.Vouches;

function getBlacklist(userId, guildId) {
  const B = db.Blacklist;
  if (!B || typeof B.get !== 'function') return null;
  return B.get(userId, guildId);
}

function ratingLabel(avg) {
  if (avg >= 4.5) return 'Excellent';
  if (avg >= 3.5) return 'Good';
  if (avg >= 2.5) return 'Average';
  if (avg >= 1.5) return 'Poor';
  return 'Very Poor';
}

function ratingBar(distribution) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
  const bars = [5, 4, 3, 2, 1].map(star => {
    const count = distribution[star] || 0;
    const pct = Math.round((count / total) * 10);
    const filled = '█'.repeat(pct);
    const empty = '░'.repeat(10 - pct);
    return `${star}${STAR}  ${filled}${empty}  ${count}`;
  });
  return bars.join('\n');
}

async function buildProfileComponents(target, scope, guildId) {
  const gId = scope === 'server' ? guildId : null;
  const stats = Vouches.getStats(target.id, gId);

  const recentVouches = Vouches.getRecent(target.id, gId, 5);
  const distribution = Vouches.getRatingDistribution(target.id, gId);
  const weeklyVouches = Vouches.getWeeklyCount
    ? Vouches.getWeeklyCount(target.id, gId)
    : 0;
  const leaderboardRank = Vouches.getLeaderboardRank
    ? Vouches.getLeaderboardRank(target.id, gId)
    : '?';
  const isBlacklisted = scope === 'server' && guildId
    ? !!getBlacklist(target.id, guildId)
    : false;

  const scopeLabel = scope === 'global' ? 'Global' : 'Server';
  const createdDate = target.createdAt.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  let headerText = `## ${target.username}'s ${scopeLabel} Profile`;
  if (isBlacklisted) headerText += `  ${BAN} **BLACKLISTED**`;

  const headerBlock = [
    headerText,
    `**ID:** \`${target.id}\``,
    `**Registration Date:** ${createdDate}`,
    `**Display Name:** \`${target.displayName || target.username}\``,
  ].join('\n');

  const avgDisplay = stats.total > 0
    ? `${stats.average.toFixed(2)} / 5  —  ${ratingLabel(stats.average)}`
    : 'N/A';

  const vouchInfoBlock = [
    `**__Vouch Information__**`,
    `**Positive:** ${stats.total}`,
    `**Rating:** ${avgDisplay}`,
    `**Stars:** ${stats.total > 0 ? stars(stats.average) : 'No rating yet'}`,
    `**Leaderboard:** #${leaderboardRank}`,
    `**Last 7 Days:** ${weeklyVouches}`,
  ].join('\n');

  const distBlock = stats.total > 0
    ? `**__Rating Distribution__**\n\`\`\`\n${ratingBar(distribution)}\n\`\`\``
    : null;

  let recentBlock = `**__Recent Vouches__**\n`;
  if (recentVouches.length > 0) {
    recentBlock += recentVouches.map(v => {
      const comment = v.comment
        ? v.comment.substring(0, 60) + (v.comment.length > 60 ? '...' : '')
        : 'No comment';
      return `> ${stars(v.rating)}  ${timeAgo(v.created_at)}\n> *${comment}*`;
    }).join('\n\n');
  } else {
    recentBlock += '> No vouches yet.';
  }

  const badgesBlock = [
    `**__Badges__**`,
    `> No badges`,
  ].join('\n');

  const footerBlock = `-# Vouch Bot  •  Reputation System  •  Developed by Ansh4Real`;

  const container = new ContainerBuilder()
    .setAccentColor(isBlacklisted ? 0xed4245 : 0x5865F2)

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerBlock)
    )

    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
    )

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(vouchInfoBlock)
    );

  if (distBlock) {
    container
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(distBlock)
      );
  }

  container
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
    )

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(recentBlock)
    )

    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
    )

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(badgesBlock)
    )

    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )

    // Footer
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(footerBlock)
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Open Web Dashboard')
      .setStyle(ButtonStyle.Link)
      .setURL(require('../../config').dashboardUrl)
  );

  return {
    components: [container, row],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("View a user's vouch profile.")
    .addUserOption(option =>
      option.setName('user').setDescription('The user to view')
    )
    .addStringOption(option =>
      option
        .setName('scope')
        .setDescription('Global or server profile')
        .addChoices(
          { name: 'Global', value: 'global' },
          { name: 'Server', value: 'server' }
        )
    ),
  aliases: ['profile'],
  guildOnly: false,

  async execute(interaction, client) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const scope = interaction.options.getString('scope') || 'server';
    const guildId = interaction.guild?.id ?? null;

    const reply = await buildProfileComponents(target, scope, guildId);
    await interaction.editReply(reply);
  },

  async prefixExecute(message, args, client) {
    const target =
      message.mentions.users.first() ||
      (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) ||
      message.author;

    const scope = args.includes('global') ? 'global' : 'server';
    const guildId = message.guild?.id ?? null;

    const reply = await buildProfileComponents(target, scope, guildId);
    await message.reply(reply);
  },
};