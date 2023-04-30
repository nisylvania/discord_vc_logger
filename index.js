const { Client, Intents, MessageEmbed } = require('discord.js')
const client = new Client({ intents: Object.keys(Intents.FLAGS) })
require('dotenv').config();
const moment = require('moment');

const send_vc_notify = (voicestate, is_exit) => {
    const displayColor = voicestate.member.displayColor;
    const displayName = voicestate.member.displayName;
    const ChannelName = voicestate.channel.name;
    const displayAvatarURL = voicestate.member.displayAvatarURL();
    const ChannelMemberSize = voicestate.channel.members.size;
    const Embed = new MessageEmbed();
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
    const Embed = new MessageEmbed();
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

client.on('voiceStateUpdate', (oldState, newState) => {
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
            if (!is_bot && (roles2.includes('VC Entry') || roles2.includes('VC Exit')) && roles2.filter(item => roles2.includes(item) && members2.includes(item)).length <= 0) {
                send_st_notify(newState);
            }
        }
    }
})

client.once('ready', () => {
    console.log('ログインしました。');
})

client.login(process.env.DISCODE_TOKEN);