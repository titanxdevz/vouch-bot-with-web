
const { PermissionsBitField } = require('discord.js');

function isDev(client, userId) {
  return client.config.devIds.includes(userId);
}

function isAdmin(client, member) {
  if (!member) return false;
  return isDev(client, member.id) || member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function isManager(client, member) {
  if (!member) return false;
  return isAdmin(client, member) || member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

function hasAllowedRole(member, roleIds) {
  if (!member || !roleIds || roleIds.length === 0) return true;
  return member.roles.cache.some(role => roleIds.includes(role.id));
}

function hasBlockedRole(member, roleIds) {
  if (!member || !roleIds || roleIds.length === 0) return false;
  return member.roles.cache.some(role => roleIds.includes(role.id));
}

module.exports = { isDev, isAdmin, isManager, hasAllowedRole, hasBlockedRole };
