/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Command  : /vouch                                           ║
 * ║  Desc     : Vouch for a user with rating and comment         ║
 * ║  Developer: Ansh4Real                                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// [ Imports ]
// ─────────────────────────────────────────────────────────────────────────────

const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  BaseInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { GuildSettings, Vouches, Cooldowns, DailyCounts, Blacklist } = require('../../utils/database');
const { errorReply, stars, formatDuration } = require('../../utils/builders');
const { sendDevLog } = require('../../utils/devLog');
const { hasAllowedRole, hasBlockedRole } = require('../../utils/permissions');

// ─────────────────────────────────────────────────────────────────────────────
// [ Helper: is this an interaction or a message? ]
// ─────────────────────────────────────────────────────────────────────────────

const isInteraction = (src) => src instanceof BaseInteraction;


async function processVouch(client, guild, giverMember, giver, target, rating, comment) {
  const settings = GuildSettings.ensure(guild.id);

  if (target.id === giver.id)
    return { ok: false, reason: 'You cannot vouch for yourself.' };
  if (target.bot)
    return { ok: false, reason: 'You cannot vouch for a bot.' };

  if (Blacklist.get(giver.id, guild.id))
    return { ok: false, reason: 'You are blacklisted from vouching in this server.' };
  if (Blacklist.get(target.id, guild.id))
    return { ok: false, reason: 'This user is blacklisted and cannot receive vouches.' };

  if (!hasAllowedRole(giverMember, settings.allowed_roles))
    return { ok: false, reason: 'You do not have the required role to vouch.' };
  if (hasBlockedRole(giverMember, settings.blocked_roles))
    return { ok: false, reason: 'You have a role that prevents you from vouching.' };

  if (settings.vouch_cooldown_hours > 0) {
    const cooldown = Cooldowns.get(giver.id, target.id, guild.id);
    if (cooldown) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = (cooldown.last_vouch + settings.vouch_cooldown_hours * 3600) - now;
      if (remaining > 0)
        return { ok: false, reason: `You are on cooldown. You can vouch again in ${formatDuration(remaining)}.` };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  if (settings.max_vouches_per_day > 0) {
    const daily = DailyCounts.get(giver.id, guild.id, today);
    if (daily && daily.count >= settings.max_vouches_per_day)
      return { ok: false, reason: 'You have reached your daily vouch limit.' };
  }

  if (settings.min_account_age_days > 0) {
    const age = (Date.now() - target.createdAt) / (1000 * 60 * 60 * 24);
    if (age < settings.min_account_age_days)
      return { ok: false, reason: `The target account must be at least ${settings.min_account_age_days} day(s) old.` };
  }

  const targetMember = await guild.members.fetch(target.id).catch(() => null);
  if (settings.min_server_age_days > 0 && targetMember) {
    const age = (Date.now() - targetMember.joinedAt) / (1000 * 60 * 60 * 24);
    if (age < settings.min_server_age_days)
      return { ok: false, reason: `The user must be in the server for at least ${settings.min_server_age_days} day(s).` };
  }

  if (settings.require_comment && !comment)
    return { ok: false, reason: 'A comment is required to vouch in this server.' };

  const vouch = Vouches.add.run(target.id, giver.id, guild.id, rating, comment);
  Cooldowns.set.run(giver.id, target.id, guild.id);
  DailyCounts.increment.run(giver.id, guild.id, today);

  // Auto-role logic
  const { total } = Vouches.getStats(target.id, guild.id);
  for (const threshold in settings.auto_roles) {
    if (total >= parseInt(threshold)) {
      const roleId = settings.auto_roles[threshold];
      const role = guild.roles.cache.get(roleId);
      if (role && targetMember && !targetMember.roles.cache.has(roleId)) {
        await targetMember.roles.add(role).catch(console.error);
      }
    }
  }

  return { ok: true, id: vouch.lastInsertRowid };
}

// ─────────────────────────────────────────────────────────────────────────────
// [ Reply Helper ]
// ─────────────────────────────────────────────────────────────────────────────

async function send(src, payload) {
  if (isInteraction(src)) return src.editReply(payload);
  return src.reply(payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// [ Vouch Handler ]
// ─────────────────────────────────────────────────────────────────────────────

async function handleVouch(client, src, user, target, rating, comment) {
  const result = await processVouch(client, src.guild, src.member, user, target, rating, comment);

  if (!result.ok) {
    return send(src, errorReply('Vouch Failed', result.reason));
  }

  const { total, average } = Vouches.getStats(target.id, src.guild.id);

  // ── Success container ────────────────────────────────────────────────────
  const container = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Vouch Recorded')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**__Vouch Summary__**\n` +
        `**Recipient:** ${target}\n` +
        `**Giver:** ${user}\n` +
        `**Rating:** ${stars(rating)}\n` +
        `**Score:** \`${rating}/5\``
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**__Comment__**\n> ${comment || '*No comment provided.*'}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${target.username} now has **${total}** vouches  |  Average: **${average.toFixed(2)} / 5**`
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Vouch Bot  •  Reputation System  •  Developed by Ansh4Real`
      )
    );

  const reply = { components: [container], flags: MessageFlags.IsComponentsV2 };
  await send(src, reply);

  const settings = GuildSettings.ensure(src.guild.id);

  // ── Vouch channel mirror ─────────────────────────────────────────────────
  if (settings.vouch_channel_id && settings.vouch_channel_id !== src.channel?.id) {
    const vouchChannel = await client.channels.fetch(settings.vouch_channel_id).catch(() => null);
    if (vouchChannel) await vouchChannel.send(reply).catch(() => { });
  }

  // ── Log channel ──────────────────────────────────────────────────────────
  if (settings.log_channel_id) {
    const logChannel = await client.channels.fetch(settings.log_channel_id).catch(() => null);
    if (logChannel) {
      const logContainer = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## New Vouch Log')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Vouch ID:** \`#${result.id}\`\n` +
            `**Recipient:** ${target.username} (\`${target.id}\`)\n` +
            `**Giver:** ${user.username} (\`${user.id}\`)\n` +
            `**Rating:** ${rating}/5\n` +
            `**Comment:** ${comment || 'N/A'}`
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# Recorded at <t:${Math.floor(Date.now() / 1000)}:F>`
          )
        );

      await logChannel.send({
        components: [logContainer],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => { });
    }
  }

  // ── Dev log ──────────────────────────────────────────────────────────────
  sendDevLog(client, {
    type: 'vouch',
    title: 'Vouch Recorded',
    body: `**Vouch ID:** ${result.id} | **Guild:** ${src.guild.name} (\`${src.guild.id}\`)`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// [ Command Export ]
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Vouch for a user.')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to vouch for').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('rating').setDescription('Rating from 1 to 5').setMinValue(1).setMaxValue(5)
    )
    .addStringOption(option =>
      option.setName('comment').setDescription('A comment for the vouch')
    ),
  aliases: ['vouch'],
  guildOnly: true,
  cooldown: 5,

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const rating = interaction.options.getInteger('rating') || 5;
    const comment = interaction.options.getString('comment') || null;
    await handleVouch(client, interaction, interaction.user, target, rating, comment);
  },

  async prefixExecute(message, args, client) {
    const target =
      message.mentions.users.first() ||
      (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);

    if (!target)
      return message.reply(errorReply('Invalid User', 'You must mention a user or provide a valid user ID.'));

    const ratingArg = args.find(a => !isNaN(parseInt(a)) && parseInt(a) >= 1 && parseInt(a) <= 5);
    const rating = ratingArg ? parseInt(ratingArg) : 5;
    const comment = args
      .filter(a => a !== `<@${target.id}>` && a !== `<@!${target.id}>` && a !== target.id && a !== ratingArg)
      .join(' ') || null;

    await handleVouch(client, message, message.author, target, rating, comment);
  },
};