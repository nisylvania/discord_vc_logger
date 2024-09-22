const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, GuildMemberManager, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder, DMChannel } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.GuildPresences], partials: [Partials.Channel] });
require('dotenv').config();
const moment = require('moment');
const mysql = require('mysql2/promise');
let clientSql;

const createConnection = async () => {
    clientSql = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DB
    })
}

const getEntering = async (id) => {
    await createConnection()
    const [rows, fields] = await clientSql.execute(`select * from entering WHERE uid='${id}'`)
    await clientSql.end()
    return rows
}

const registerEntering = async (id, date, channelID, messageID) => {
    await createConnection()
    const [result, filelds] = await clientSql.query(`INSERT INTO entering VALUES ('${id}', '${date}', '${channelID}', '${messageID}')`)
    await clientSql.end()
    return result
}

const deleteEntering = async (id) => {
    await createConnection()
    const [result, filelds] = await clientSql.query(`DELETE from entering WHERE uid='${id}'`)
    await clientSql.end()
    return result
}

const getGuild = async (guildID) => {
    await createConnection()
    const [rows, fields] = await clientSql.execute(`select * from guild WHERE guildID='${guildID}'`)
    await clientSql.end()
    return rows
}

const registerGuild = async (guildID, channelID, vc_entry, vc_exit, vc_streaming, guildName) => {
    await createConnection()
    const [result, filelds] = await clientSql.query(`INSERT INTO guild VALUES ('${guildID}', '${channelID}', '${vc_entry}', '${vc_exit}', '${vc_streaming}', '${guildName}')`)
    await clientSql.end()
    return result
}

const updateGuild = async (guildID, channelID, vc_entry, vc_exit, vc_streaming, guildName) => {
    await createConnection()
    const [result, filelds] = await clientSql.query(`UPDATE guild SET channelID='${channelID}', vc_entry='${vc_entry}', vc_exit='${vc_exit}', vc_streaming='${vc_streaming}', guildName='${guildName}' WHERE guildID='${guildID}'`)
    await clientSql.end()
    return result
}

const send_vc_notify = async (voicestate, is_exit, entry, exit) => { //入室・退室の送信関数
    const displayColor = voicestate.member.displayColor;
    const displayName = voicestate.member.displayName;
    const id = voicestate.member.id;
    const ChannelName = voicestate.channel.name;
    const guildID = voicestate.guild.id;
    const displayAvatarURL = voicestate.member.displayAvatarURL();
    const ChannelMemberSize = voicestate.channel.members.size;
    const Embed = new EmbedBuilder();
    const date = moment(new Date());
    let staying_time_text;

    Embed.setColor(displayColor);

    if (is_exit == false && entry == true) { //VC Entryを付与されているVC入室時の処理　つまり新規送信
        const guild = await getGuild(guildID);
        const channelID = guild[0].channelID;

        let author = {
            name: "VC入室",
            iconURL: displayAvatarURL
        }

        Embed.setTitle(displayName + "が" + ChannelName + "に入室しました");
        Embed.setAuthor(author);
        Embed.setDescription("現在の参加者数は" + String(ChannelMemberSize) + "人です");
        Embed.setFooter({ text: date.format('Y/M/D H:mm:ss') });
        const message = await voicestate.guild.channels.resolve(channelID)?.send({ embeds: [Embed] }).catch(console.error);
        await registerEntering(id, date, channelID, message.id); //ユーザID，入室日時，メッセージIDを格納→在室時間の判定に使用
    }
    else if (is_exit == false && entry == false) { //VC Entryを付与されていないVC入室時の処理　つまりDB登録のみ
        await registerEntering(id, date, 0, 0); //ユーザID，入室日時，メッセージを格納→在室時間の判定に使用
    }
    else if (is_exit == true && (exit == true && entry == true) || (exit == true && entry == false)) { //VC Exitを付与されているVC退室時の処理　つまり新規送信
        const entering = await getEntering(id);
        const guild = await getGuild(guildID);
        const channelID = guild[0].channelID;

        if (entering.length > 0) {
            const staying_time = moment.duration(date.diff(moment(entering[0].date))) //在室時間を計算
            staying_time_text = '(在室時間: ' + staying_time.hours() + '時間' + ('00' + staying_time.minutes()).slice(-2) + '分' + ('00' + staying_time.seconds()).slice(-2) + '秒)'; //在室時間を文章化
        } else {
            staying_time_text = '(在室時間不明)';
        }

        let author = {
            name: "VC退室",
            iconURL: displayAvatarURL
        }

        Embed.setTitle(displayName + "が" + ChannelName + "から退室しました");
        Embed.setAuthor(author);
        await deleteEntering(id);
        Embed.setDescription("現在の参加者数は" + String(ChannelMemberSize) + "人です");
        Embed.setFooter({ text: date.format('Y/M/D H:mm:ss') + staying_time_text });
        await voicestate.guild.channels.resolve(channelID)?.send({ embeds: [Embed] }).catch(console.error);
    }
    else if (is_exit == true && entry == true && exit == false) { //VC Exitを付与されていないがVC Entryを付与されている，VC退室時の処理　つまり編集
        const entering = await getEntering(id);

        if (entering.length > 0) {
            const staying_time = moment.duration(date.diff(moment(entering[0].date))) //在室時間を計算
            staying_time_text = '(在室時間: ' + staying_time.hours() + '時間' + ('00' + staying_time.minutes()).slice(-2) + '分' + ('00' + staying_time.seconds()).slice(-2) + '秒)'; //在室時間を文章化
            const messageID = entering[0].messageID;
            const channelID = entering[0].channelID;
            const message = await voicestate.guild.channels.resolve(channelID)?.messages.fetch(messageID);
            const Embed = EmbedBuilder.from(message.embeds[0]).setFooter({ text: moment(entering[0].date).format('Y/M/D H:mm:ss') + staying_time_text });
            await deleteEntering(id);
            await message.edit({ embeds: [Embed] }).catch(console.error);
        }
    }
}

const send_st_notify = async (voicestate) => { //画面共有開始の送信関数
    const displayColor = voicestate.member.displayColor;
    const displayName = voicestate.member.displayName;
    const ChannelName = voicestate.channel.name;
    const guildID = voicestate.guild.id;
    const displayAvatarURL = voicestate.member.displayAvatarURL();
    const Embed = new EmbedBuilder();
    const date = moment(new Date()).format('Y/M/D H:mm:ss');
    const guild = await getGuild(guildID);
    const channelID = guild[0].channelID;

    Embed.setColor(displayColor);
    let author = {
        name: "VC画面共有",
        iconURL: displayAvatarURL
    }
    Embed.setTitle(displayName + "が" + ChannelName + "で画面共有を開始しました");
    Embed.setAuthor(author);
    Embed.setFooter({ text: date })
    voicestate.guild.channels.resolve(channelID)?.send({ embeds: [Embed] }).catch(console.error);
}

client.on('voiceStateUpdate', async (oldState, newState) => { //ボイスチャット関係のイベントで発火
    if (newState && oldState) {
        const guild = await getGuild(newState.guild.id);
        const entry = guild[0].vc_entry;
        const exit = guild[0].vc_exit;
        const streaming = guild[0].vc_streaming;

        if (oldState.channelId === null && newState.channelId != null) { //VC入室時
            const roles = newState.member.roles.cache;
            const roles2 = roles.map((role) => (role.name));

            const is_bot = newState.member.user.bot;
            if (!is_bot && roles2.includes(entry)) {
                send_vc_notify(newState, false, true, false);
            }
            else if (!is_bot && roles2.includes(exit)) {
                send_vc_notify(newState, false, false, true);
            }
        }
        else if (oldState.channelId != null && newState.channelId === null) { //VC退室時
            const roles = oldState.member.roles.cache;
            const roles2 = roles.map((role) => (role.name));

            const is_bot = oldState.member.user.bot;
            if (!is_bot && roles2.includes(exit) && roles2.includes(entry)) { //VC Exitを付与されていてかつVC Entryを付与されている
                send_vc_notify(oldState, true, true, true);
            }
            else if (!is_bot && !roles2.includes(exit) && roles2.includes(entry)) { //VC Exitを付与されていないがVC Entryを付与されている
                send_vc_notify(oldState, true, true, false);
            }
            else if (!is_bot && roles2.includes(exit) && !roles2.includes(entry)) { //VC Exitを付与されているがVC Entryを付与されていない
                send_vc_notify(oldState, true, false, true);
            }
        }
        else if (oldState.channelId == newState.channelId && oldState.streaming == false && newState.streaming == true) { //画面共有開始時
            const roles = newState.member.roles.cache;
            const roles2 = roles.map((role) => (role.name));

            const is_bot = newState.member.user.bot;
            if (!is_bot && roles2.includes(streaming)) {
                send_st_notify(newState);
            }
        }
        else if (oldState.channelId !== newState.channelId) {//VC移動時(入室通知)
            const roles = newState.member.roles.cache;
            const roles2 = roles.map((role) => (role.name));

            const is_bot = newState.member.user.bot;
            if (!is_bot && roles2.includes(exit) && roles2.includes(entry)) { //VC Exitを付与されていてかつVC Entryを付与されている
                send_vc_notify(oldState, true, true, true);
            }
            else if (!is_bot && !roles2.includes(exit) && roles2.includes(entry)) { //VC Exitを付与されていないがVC Entryを付与されている
                send_vc_notify(oldState, true, true, false);
            }
            else if (!is_bot && roles2.includes(exit) && !roles2.includes(entry)) { //VC Exitを付与されているがVC Entryを付与されていない
                send_vc_notify(oldState, true, false, true);
            }
            if (!is_bot && roles2.includes(entry)) {
                send_vc_notify(newState, false, true, false);
            }
        }
    }
})

client.on("interactionCreate", async (interaction) => { //コマンド実行で発火
    if (!interaction.isChatInputCommand()) return;

    const guild = await getGuild(interaction.guild.id);

    if (interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles) && (interaction.commandName === 'entry' || interaction.commandName === 'exit' || interaction.commandName === 'streaming') && guild.length > 0) {
        const entry_db = guild[0].vc_entry;
        const exit_db = guild[0].vc_exit;
        const streaming_db = guild[0].vc_streaming;

        let entry = interaction.guild.roles.cache.find(role => role.name === entry_db);
        let exit = interaction.guild.roles.cache.find(role => role.name === exit_db);
        let streaming = interaction.guild.roles.cache.find(role => role.name === streaming_db);

        if (!entry) {
            entry = interaction.guild.roles.create({ name: entry_db });
        }
        if (!exit) {
            exit = interaction.guild.roles.create({ name: exit_db });
        }
        if (!streaming) {
            streaming = interaction.guild.roles.create({ name: streaming_db });
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
    else if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles) && (interaction.commandName === 'entry' || interaction.commandName === 'exit' || interaction.commandName === 'streaming') && guild.length > 0) {
        await interaction.reply({ content: 'このBotにロールを管理する権限がないようです！', ephemeral: true });
    }
    else if ((interaction.commandName === 'entry' || interaction.commandName === 'exit' || interaction.commandName === 'streaming') && guild.length === 0) {
        await interaction.reply({ content: 'このサーバは登録されていません！/registerコマンドで登録してください！', ephemeral: true });
    }

    else if (interaction.commandName === 'register' && guild.length === 0) { //サーバ登録
        const channelID = interaction.options.getChannel('channel').id;
        const vc_entry = interaction.options.getRole('vc_entry').name;
        const vc_exit = interaction.options.getRole('vc_exit').name;
        const vc_streaming = interaction.options.getRole('vc_streaming').name;

        await registerGuild(interaction.guild.id, channelID, vc_entry, vc_exit, vc_streaming, interaction.guild.name);

        if (!interaction.replied) {
            await interaction.reply({ content: 'サーバを登録しました！', ephemeral: true });
        }
    }
    else if (interaction.commandName === 'register' && guild.length > 0) { //サーバ更新
        const channelID = interaction.options.getChannel('channel').id;
        const vc_entry = interaction.options.getRole('vc_entry').name;
        const vc_exit = interaction.options.getRole('vc_exit').name;
        const vc_streaming = interaction.options.getRole('vc_streaming').name;

        await updateGuild(interaction.guild.id, channelID, vc_entry, vc_exit, vc_streaming, interaction.guild.name);

        if (!interaction.replied) {
            await interaction.reply({ content: 'サーバ登録を更新しました！', ephemeral: true });
        }
    }
});

client.on('guildScheduledEventUpdate', async (oldGuildScheduledEvent, newGuildScheduledEvent) => { //イベントアップデート時に発火

    if (newGuildScheduledEvent && oldGuildScheduledEvent) {

        if (oldGuildScheduledEvent.status === 1 && newGuildScheduledEvent.status === 2 && (newGuildScheduledEvent.entityType === 1 || newGuildScheduledEvent.entityType === 2)) { //ステージやVCでのイベント開始時
            const Embed = new EmbedBuilder();
            const Row = new ActionRowBuilder();
            const Button = new ButtonBuilder();
            const date = moment(new Date());
            const guildID = newGuildScheduledEvent.guildId;
            const ChannelID = newGuildScheduledEvent.channelId;
            const ChannelName = newGuildScheduledEvent.channel.name;
            const name = newGuildScheduledEvent.name;
            const description = newGuildScheduledEvent.description;
            const author = {
                name: "イベント開始"
            }
            const guild = await getGuild(guildID);
            const sendChannelID = guild[0].channelID;

            Embed.setColor("ff6347");
            Embed.setTitle("「" + name + "」が開始されました！");
            description ? Embed.setDescription(description) : "";
            Embed.setAuthor(author);
            Embed.setFooter({ text: date.format('Y/M/D H:mm:ss') });

            Button.setLabel('参加する');
            Button.setStyle(ButtonStyle.Link);
            Button.setURL("https://discord.com/channels/" + guildID + "/" + ChannelID);

            Row.addComponents(Button);

            await newGuildScheduledEvent.guild.channels.resolve(sendChannelID)?.send({ content: "@everyone", embeds: [Embed], components: [Row] }).catch(console.error);
        }
        else if (oldGuildScheduledEvent.status === 1 && newGuildScheduledEvent.status === 2 && (newGuildScheduledEvent.entityType === 3)) { //ステージやVC以外でのイベント開始時
            const Embed = new EmbedBuilder();
            const date = moment(new Date());
            const guildID = newGuildScheduledEvent.guildId;
            const location = newGuildScheduledEvent.entityMetadata.location;
            const name = newGuildScheduledEvent.name;
            const description = newGuildScheduledEvent.description;
            const guild = await getGuild(guildID);
            const sendChannelID = guild[0].channelID;

            const author = {
                name: "イベント開始"
            }

            Embed.setColor("ff6347");
            Embed.setTitle("「" + name + "」が開始されました！");
            description ? Embed.setDescription("場所：" + location + "\n" + description) : "場所：" + location;
            Embed.setAuthor(author);
            Embed.setFooter({ text: date.format('Y/M/D H:mm:ss') });

            await newGuildScheduledEvent.guild.channels.resolve(sendChannelID)?.send({ content: "@everyone", embeds: [Embed] }).catch(console.error);
        }
    }
});

client.once('ready', () => { //Bot準備完了時に発火
    console.log('ログインしました。');

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

    const register = new SlashCommandBuilder()
        .setName('register')
        .setDescription('サーバを登録し，通知を送信するチャンネルやロール名を設定します。コマンドの実行はあなたにしか見えません。')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('通知を送信するチャンネル')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('vc_entry')
                .setDescription('入室時に通知を送信するロール')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('vc_exit')
                .setDescription('退室時に通知を送信するロール')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('vc_streaming')
                .setDescription('画面共有時に通知を送信するロール')
                .setRequired(true)
        );

    const commands = [entry, exit, streaming, register];
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