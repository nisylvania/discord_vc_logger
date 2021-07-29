import discord
from discord.ext import commands, tasks

TOKEN = ""
intents = discord.Intents.default()
intents.members = True
bot = commands.Bot(command_prefix="?", intents=intents)
First = True
prev_vc_members = {}


def get_members() -> dict:
    current_vc_members = {}
    guilds = bot.guilds
    vc = []
    for guild in guilds:
        if guild.name == "Amang Legends":
            print(guild.channels)
            for channel in guild.channels:
                if type(channel) == discord.channel.VoiceChannel:
                    vc.append(channel)
    for voicechannel in vc:
        print(voicechannel.name)
        print(voicechannel.members)
        members = []
        for m in voicechannel.members:
            members.append(m.name)
        current_vc_members[voicechannel.name] = members
    return current_vc_members


@bot.event
async def on_ready():
    print("ログインしました")


@tasks.loop(seconds=2.0)
async def vclogger():
    global First
    current_vc_members = get_members()
    if First:
        First = False
        prev_vc_members = current_vc_members
        return 0




@bot.command()
async def get_member(message):
    guilds = bot.guilds
    vc = []
    for guild in guilds:
        if guild.name == "Amang Legends":
            print(guild.channels)
            for channel in guild.channels:
                # print(type(channel))
                if type(channel) == discord.channel.VoiceChannel:
                    vc.append(channel)
    print(vc)
    for voicechannel in vc:
        print(voicechannel.name)
        print(voicechannel.members)

    # print(guilds)

    # client = discord.Client()
    # for guild in client.guilds:
    #     for channel in guild.channels:
    #         print(channel)
    # channels = discord.Client().get_all_channels()
    # print(channels.gi_yieldfrom)

    # for channel in channels:
    #     print(channel)
    # print(channnels)


if __name__ == "__main__":
    bot.run(TOKEN)
