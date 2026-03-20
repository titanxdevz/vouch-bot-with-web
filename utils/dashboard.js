const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const SQLiteStore = require('connect-sqlite3')(session);
const nunjucks = require('nunjucks');
const path = require('path');
const axios = require('axios');
const { Vouches, GuildSettings, Blacklist } = require('./database');
const { isManager } = require('./permissions');

function startDashboard(client, port = 3000) {
    const app = express();

    // ── Nunjucks Configuration ───────────────────────────────────────────────
    nunjucks.configure(path.join(__dirname, '../dashboard/views'), {
        autoescape: true,
        express: app,
        noCache: true
    });
    app.set('view engine', 'njk');

    // ── Middleware ──────────────────────────────────────────────────────────
    app.use(express.static(path.join(__dirname, '../dashboard/public')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(session({
        store: new SQLiteStore({ dir: './data', db: 'sessions.db' }),
        secret: process.env.SESSION_SECRET || 'vouch-bot-cyber-secret-99',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
    }));

    app.use(passport.initialize());
    app.use(passport.session());
 
    app.use((req, res, next) => {
        if (req.user && !req.user.avatarUrl) {
            if (req.user.avatar) {
                req.user.avatarUrl = `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png?size=256`;
            } else {
                req.user.avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(parseInt(req.user.discriminator) || 0) % 5}.png`;
            }
        }
        next();
    });

    // ── Passport Discord Setup ──────────────────────────────────────────────
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    passport.use(new DiscordStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET, // USER MUST ADD THIS
        callbackURL: process.env.CALLBACK_URL || `http://localhost:${port}/callback`,
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        // Construct Avatar URL
        if (profile.avatar) {
            profile.avatarUrl = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`;
        } else {
            profile.avatarUrl = `https://cdn.discordapp.com/embed/avatars/${profile.discriminator % 5}.png`;
        }
        profile.accessToken = accessToken;
        process.nextTick(() => done(null, profile));
    }));

    // ── Auth Helpers ───────────────────────────────────────────────────────
    const checkAuth = (req, res, next) => {
        if (req.isAuthenticated()) return next();
        res.redirect('/login');
    };

    // ── Core Routes ────────────────────────────────────────────────────────

    // Home / Insights
    app.get('/', async (req, res) => {
        const stats = {
            total_guilds: client.guilds.cache.size,
            total_users: client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0),
            total_vouches: Vouches.countAll().count,
            vouches_7d: Vouches.countSince(Math.floor(Date.now() / 1000) - 7 * 24 * 3600).count
        };

        const recentVouchesRaw = Vouches.getPage(null, 'received', null, 0, 10);
        const recent = await Promise.all(recentVouchesRaw.map(async v => {
            const giver = await client.users.fetch(v.giver_id).catch(() => null);
            const receiver = await client.users.fetch(v.receiver_id).catch(() => null);
            return {
                ...v,
                giver_tag: giver ? giver.tag : 'Unknown User',
                receiver_tag: receiver ? receiver.tag : 'Unknown User'
            };
        }));

        const topUsersRaw = Vouches.getLeaderboard(null, 5);
        const top = await Promise.all(topUsersRaw.map(async u => {
            const user = await client.users.fetch(u.receiver_id).catch(() => null);
            return {
                ...u,
                username: user ? user.username : 'Unknown User'
            };
        }));

        res.render('index', { 
            page: 'index',
            user: req.user, 
            stats, 
            recent, 
            top 
        });
    });

    // Login/Logout
    app.get('/login', passport.authenticate('discord'));
    app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));
    app.get('/logout', (req, res) => {
        req.logout(() => res.redirect('/'));
    });

    // User Lookup
    app.get('/lookup', async (req, res) => {
        const query = req.query.query;
        let target = null;

        if (query) {
            let user = null;
            if (/^\d{17,19}$/.test(query)) {
                user = await client.users.fetch(query).catch(() => null);
            } else {
                user = client.users.cache.find(u => u.username.toLowerCase() === query.toLowerCase() || u.tag.toLowerCase() === query.toLowerCase());
            }

            if (user) {
                const stats = Vouches.getStats(user.id);
                const recentRaw = Vouches.getRecent(user.id, null, 5);
                const recent = await Promise.all(recentRaw.map(async v => {
                    const giver = await client.users.fetch(v.giver_id).catch(() => null);
                    return {
                        ...v,
                        giver_tag: giver ? giver.tag : 'Unknown User',
                        date: new Date(v.created_at * 1000).toLocaleDateString()
                    };
                }));

                const isBlacklisted = Blacklist.get(user.id, client.config.mainServerId); // Global check vs main server

                target = {
                    id: user.id,
                    username: user.username,
                    avatar: user.displayAvatarURL({ dynamic: true, size: 256 }),
                    stats,
                    recent,
                    isBlacklisted: !!isBlacklisted
                };
            }
        }

        res.render('lookup', { 
            page: 'lookup',
            user: req.user,
            query,
            target
        });
    });

    // Vouch Submit Page
    app.get('/vouch', checkAuth, async (req, res) => {
        const userGuilds = req.user.guilds.filter(g => client.guilds.cache.has(g.id));
        res.render('vouch', { 
            page: 'vouch',
            user: req.user,
            userGuilds,
            success: req.query.success,
            error: req.query.error
        });
    });

    app.post('/vouch', checkAuth, async (req, res) => {
        const { receiver_query, guild_id, rating, comment } = req.body;
        
        try {
            // Find receiver
            let receiver = null;
            if (/^\d{17,19}$/.test(receiver_query)) {
                receiver = await client.users.fetch(receiver_query).catch(() => null);
            } else {
                receiver = client.users.cache.find(u => u.tag === receiver_query || u.username === receiver_query);
            }

            if (!receiver) return res.redirect('/vouch?error=Receiver not found in network.');
            if (receiver.id === req.user.id) return res.redirect('/vouch?error=You cannot vouch for yourself.');
            
            const guild = client.guilds.cache.get(guild_id);
            if (!guild) return res.redirect('/vouch?error=Invalid server selected.');

            // Add vouch to DB
            Vouches.add.run(receiver.id, req.user.id, guild_id, parseInt(rating), comment);
            
            res.redirect('/vouch?success=true');
        } catch (error) {
            res.redirect('/vouch?error=System failure documenting record.');
        }
    });

    // Admin Page
    app.get('/admin', checkAuth, async (req, res) => {
        const managedGuilds = req.user.guilds.filter(g => {
            const botIsIn = client.guilds.cache.has(g.id);
            const perms = BigInt(g.permissions);
            const isManager = g.owner || (perms & 0x20n) || (perms & 0x8n); // Owner, Manage Guild, or Admin
            return botIsIn && isManager;
        });

        if (managedGuilds.length === 0) return res.redirect('/?error=Unauthorized');

        const guildId = req.query.guildId || managedGuilds[0].id;
        const activeGuild = client.guilds.cache.get(guildId);
        
        if (!activeGuild) return res.redirect('/admin');

        const settings = GuildSettings.ensure(activeGuild.id);
        const channels = activeGuild.channels.cache
            .filter(c => c.isTextBased())
            .map(c => ({ id: c.id, name: c.name }));

        res.render('admin', {
            page: 'admin',
            user: req.user,
            isAdmin: true,
            guild: activeGuild,
            settings,
            channels,
            managedGuilds
        });
    });

    app.get('/select-server', checkAuth, async (req, res) => {
        const managedGuilds = req.user.guilds.filter(g => {
            const botIsIn = client.guilds.cache.has(g.id);
            const perms = BigInt(g.permissions);
            const isManager = g.owner || (perms & 0x20n) || (perms & 0x8n);
            return botIsIn && isManager;
        }).map(g => {
            const guild = client.guilds.cache.get(g.id);
            return {
                id: g.id,
                name: g.name,
                icon: guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
            };
        });

        res.render('select-server', {
            page: 'select-server',
            user: req.user,
            managedGuilds
        });
    });

    app.post('/admin/update', checkAuth, async (req, res) => {
        const { guild_id, vouch_channel_id, log_channel_id, vouch_cooldown_hours, min_account_age_days, require_comment } = req.body;
        
        const discordUserGuild = req.user.guilds.find(g => g.id === guild_id);
        if (!discordUserGuild) return res.redirect('/');
        
        const perms = BigInt(discordUserGuild.permissions);
        const isManager = discordUserGuild.owner || (perms & 0x20n) || (perms & 0x8n);
        if (!isManager) return res.redirect('/');
 
        const guild = client.guilds.cache.get(guild_id);
        if (!guild) return res.redirect('/admin');

        GuildSettings.update(guild_id, 'vouch_channel_id', vouch_channel_id);
        GuildSettings.update(guild_id, 'log_channel_id', log_channel_id);
        GuildSettings.update(guild_id, 'vouch_cooldown_hours', parseInt(vouch_cooldown_hours));
        GuildSettings.update(guild_id, 'min_account_age_days', parseInt(min_account_age_days));
        GuildSettings.update(guild_id, 'require_comment', require_comment === 'on' ? 1 : 0);

        res.redirect(`/admin?guildId=${guild_id}&success=true`);
    });

    // ── Original API (Compatibility) ─────────────────────────────────────────
    app.get('/api/stats', async (req, res) => {
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
        res.json({
            stats: {
                total_guilds: totalGuilds,
                total_users: totalUsers,
                total_vouches: Vouches.countAll().count,
                vouches_7d: Vouches.countSince(Math.floor(Date.now() / 1000) - 7 * 24 * 3600).count
            }
        });
    });

    app.listen(port, () => {
        console.log(`\n\x1b[36m[ DASHBOARD ]\x1b[0m High-end interface operational at http://localhost:${port}`);
        console.log(`\x1b[35m[ AUTHENTICATION ]\x1b[0m Ensure Redirect URI is: http://localhost:${port}/callback\n`);
    });
}

module.exports = { startDashboard };
