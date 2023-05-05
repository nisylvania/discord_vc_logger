const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, GuildMemberManager, PermissionsBitField } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates], partials: [Partials.Channel] });
require('dotenv').config();
const moment = require('moment');

const send_vc_notify = (voicestate, is_exit) => {
    const displayColor = voicestate.member.displayColor;
    const displayName = voicestate.member.displayName;
    const ChannelName = voicestate.channel.name;
    const displayAvatarURL = voicestate.member.displayAvatarURL();
    const ChannelMemberSize = voicestate.channel.members.size;
    const Embed = new EmbedBuilder();
    const date = moment(new Date()).format('Y/M/D H:mm:ss');

    Embed.setColor(displayColor);
    if (is_exit == false) {
        let author = {
            name: "VC入室",
            iconURL: displayAvatarURL
        }
        Embed.setTitle(displayName + "が" + ChannelName + "に入室しました");
        Embed.setAuthor(author);
    }
    else if (is_exit == true) {
        let author = {
            name: "VC退室",
            iconURL: displayAvatarURL
        }
        Embed.setTitle(displayName + "が" + ChannelName + "から退室しました");
        Embed.setAuthor(author);
    }
    Embed.setDescription("現在の参加者数は" + String(ChannelMemberSize) + "人です")
    Embed.setFooter({ text: date })
    voicestate.guild.systemChannel.send({ embeds: [Embed] }).catch(console.error);
}

const send_st_notify = (voicestate) => {
    const displayColor = voicestate.member.displayColor;
    const displayName = voicestate.member.displayName;
    const ChannelName = voicestate.channel.name;
    const displayAvatarURL = voicestate.member.displayAvatarURL();
    const Embed = new EmbedBuilder();
    const date = moment(new Date()).format('Y/M/D H:mm:ss');

    Embed.setColor(displayColor);
    let author = {
        name: "VC画面共有",
        iconURL: displayAvatarURL
    }
    Embed.setTitle(displayName + "が" + ChannelName + "で画面共有を開始しました");
    Embed.setAuthor(author);
    Embed.setFooter({ text: date })
    voicestate.guild.systemChannel.send({ embeds: [Embed] }).catch(console.error);
}

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState && oldState) {

        if (oldState.channelId === null && newState.channelId != null) {
            const roles = newState.member.roles.cache;
            const roles2 = roles.map((role) => (role.name));
            const members = newState.channel.members;
            const members2 = members.map((member) => (member.user.tag));
            const is_bot = newState.member.user.bot;
            if (!is_bot && roles2.includes('VC Entry') && roles2.filter(item => roles2.includes(item) && members2.includes(item)).length <= 0) {
                send_vc_notify(newState, false);
            }
        }
        else if (oldState.channelId != null && newState.channelId === null) {
            const roles = oldState.member.roles.cache;
            const roles2 = roles.map((role) => (role.name));
            const members = oldState.channel.members;
            const members2 = members.map((member) => (member.user.tag));
            const is_bot = oldState.member.user.bot;
            if (!is_bot && roles2.includes('VC Exit') && roles2.filter(item => roles2.includes(item) && members2.includes(item)).length <= 0) {
                send_vc_notify(oldState, true);
            }
        }
        else if (oldState.channelId != null && newState.channelId != null && oldState.streaming == false && newState.streaming == true) {
            const roles = newState.member.roles.cache;
            const roles2 = roles.map((role) => (role.name));
            const members = newState.channel.members;
            const members2 = members.map((member) => (member.user.tag));
            const is_bot = newState.member.user.bot;
            if (!is_bot && roles2.includes('VC Streaming') && roles2.filter(item => roles2.includes(item) && members2.includes(item)).length <= 0) {
                send_st_notify(newState);
            }
        }
    }
})

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        await interaction.reply({ content: 'これからはあなたのVC入室時に通知します！', ephemeral: true });
    }
    if (interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {

        const entry = interaction.guild.roles.cache.find(role => role.name === 'VC Entry');
        const exit = interaction.guild.roles.cache.find(role => role.name === 'VC Exit');
        const streaming = interaction.guild.roles.cache.find(role => role.name === 'VC Streaming');

        if (!entry) {
            interaction.guild.roles.create({ name: 'VC Entry' });
        }
        if (!exit) {
            interaction.guild.roles.create({ name: 'VC Exit' });
        }
        if (!streaming) {
            interaction.guild.roles.create({ name: 'VC Streaming' });
        }

        if (interaction.commandName === 'entry' && interaction.options.getBoolean('boolean') == true) {
            interaction.member.roles.add(entry);
            await interaction.reply({ content: 'これからはあなたのVC入室時に通知します！', ephemeral: true });
        }
        else if (interaction.commandName === 'entry' && interaction.options.getBoolean('boolean') == false) {
            interaction.member.roles.remove(entry);
            if (!interaction.replied) {
                await interaction.reply({ content: 'これからはあなたのVC入室時に通知しません！', ephemeral: true });
            }
        }
        else if (interaction.commandName === 'exit' && interaction.options.getBoolean('boolean') == true) {
            interaction.member.roles.add(exit);
            if (!interaction.replied) {
                await interaction.reply({ content: 'これからはあなたのVC退室時に通知します！', ephemeral: true });
            }
        }
        else if (interaction.commandName === 'exit' && interaction.options.getBoolean('boolean') == false) {
            interaction.member.roles.remove(exit);
            if (!interaction.replied) {
                await interaction.reply({ content: 'これからはあなたのVC退室時に通知しません！', ephemeral: true });
            }
        }
        else if (interaction.commandName === 'streaming' && interaction.options.getBoolean('boolean') == true) {
            interaction.member.roles.add(streaming);
            if (!interaction.replied) {
                await interaction.reply({ content: 'これからはあなたのVC画面共有時に通知します！', ephemeral: true });
            }
        }
        else if (interaction.commandName === 'streaming' && interaction.options.getBoolean('boolean') == false) {
            interaction.member.roles.remove(streaming);
            if (!interaction.replied) {
                await interaction.reply({ content: 'これからはあなたのVC画面共有時に通知しません！', ephemeral: true });
            }
        }
    }
    else {
        await interaction.reply({ content: 'このBotにロールを管理する権限がないようです！', ephemeral: true });
    }
});

client.once('ready', () => {
    console.log('ログインしました。');
    console.log('当Botが参加しているサーバー：' + client.guilds.cache.map(guild => guild.name));

    const entry = new SlashCommandBuilder()
        .setName('entry')
        .setDescription('VC入室時に通知を鳴らすかを設定します。コマンドの実行はあなたにしか見えません。')
        .addBooleanOption(option =>
            option.setName('boolean')
                .setDescription('VC入室時に通知を鳴らすか')
                .setRequired(true)
        );

    const exit = new SlashCommandBuilder()
        .setName('exit')
        .setDescription('VC退室時に通知を鳴らすかを設定します。コマンドの実行はあなたにしか見えません。')
        .addBooleanOption(option =>
            option.setName('boolean')
                .setDescription('VC退室時に通知を鳴らすか')
                .setRequired(true)
        );

    const streaming = new SlashCommandBuilder()
        .setName('streaming')
        .setDescription('VCにて画面共有をした際に通知を鳴らすかを設定します。コマンドの実行はあなたにしか見えません。')
        .addBooleanOption(option =>
            option.setName('boolean')
                .setDescription('VC画面共有時に通知を鳴らすか')
                .setRequired(true)
        );

    const commands = [entry, exit, streaming];
    const { REST, Routes } = require("discord.js");
    const rest = new REST({ version: '10' }).setToken(process.env.DISCODE_TOKEN)
    async function main() {
        await rest.put(
            Routes.applicationCommands(process.env.DISCODE_ID),
            { body: commands }
        )
    }
    main().catch(err => console.log(err))

})

client.login(process.env.DISCODE_TOKEN);