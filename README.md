# <p align="center"> <img src="https://img.icons8.com/bubbles/100/discord-new-logo.png" width="100" height="100"/> <br> <b>VouchBot</b> — <i>Expert Discord Vouching System</i> </p>

<p align="center">
  <img src="https://img.shields.io/badge/Discord-JS-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

---

## 🌟 **Overview**

**VouchBot** is a high-performance, feature-rich Discord bot designed to manage vouches, testimonials, and user reputations with ease. Built with **Discord.js v14** and powered by a **Web Dashboard**, it provides a seamless experience for both administrators and community members.

Whether you're running a marketplace, a freelancing hub, or a gaming community, **VouchBot** ensures credibility through its robust vouching mechanism and visual profile cards.

---

## 🚀 **Key Features**

- 🗳️ **Trustworthy Vouching**: Easily vouch for users with custom comments.
- 🖼️ **Dynamic Vouch Cards**: Beautifully generated images for vouches using `@napi-rs/canvas`.
- 📊 **Web Dashboard**: Manage your profile, view server statistics, and configure the bot via a sleek web interface.
- 🏆 **Leaderboards**: Track top-vouched users either globally or within your server.
- 🔒 **Discord OAuth2**: Secure login system integrated with Discord for the dashboard.
- ⚙️ **Fully Customizable**: Flexible configuration via `.env` and `config.js`.

---

## 🛠️ **Installation Guide**

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v16.x or higher)
- [npm](https://www.npmjs.com/) (installed with Node)
- A Discord Bot Token (from [Discord Developer Portal](https://discord.com/developers/applications))

### **1. Clone the Repository**
```bash
git clone https://github.com/titanxdevz/vouch-bot-with-web.git
cd vouch-bot-with-web
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Configure Environment Variables**
Create a `.env` file in the root directory and add the following:
```env
TOKEN=your_bot_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
CALLBACK_URL=http://localhost:3000/callback
MAIN_SERVER_ID=your_main_server_id
DEV_LOG_CHANNEL_ID=your_log_channel_id
DEV_IDS=id1,id2
PORT=3000
```

### **4. Start the Bot**
```bash
npm start
```

---

## 📑 **Available Commands**

### **User Commands**

| Command | Description |
| :--- | :--- |
| `-vouch <user>` | Give a vouch to a specific user. |
| `-vouches <user>` | View all vouches for a user. |
| `-profile [user]` | Check a user's reputation profile. |
| `-leaderboard` | View the top-rated users. |
| `-help` | Get a list of all commands. |
| `-ping` | Test the bot's latency. |

### **Admin Commands**

| Command | Description |
| :--- | :--- |
| `-setup` | Full interactive initialization of the bot's settings. |
| `-settings` | View or adjust current server configuration. |
| `-setprefix <prefix>` | Change the bot's command prefix. |
| `-setchannel <#channel>` | Designate a channel for vouch notifications. |
| `-blacklist <user>` | Prevent a user from using the bot. |
| `-removevouch <id>` | Delete a specific vouch by its ID. |
| `-resetvouches <user>` | Clear all vouches for a specific member. |
| `-autorole <role>` | Automatically assign a role based on vouch count. |

---

## 🔗 **Useful Links**

<div align="center">
  <a href="https://discord.gg/aJHcQvrdxe">
    <img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  </a>
  &nbsp;
  <a href="https://youtube.com/@titanxdev">
    <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" />
  </a>
</div>

---

## 📜 **License**

This project is licensed under the **MIT License**. Feel free to use and modify it as you see fit!

---

<p align="center">
  Developed with ❤️ by <a href="https://youtube.com/@titanxdev">TitanXDev</a>
</p>
