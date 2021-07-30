import discord
from discord.ext import commands

import os

TOKEN = os.environ.get("DISCORD_TOKEN")
intents = discord.Intents.default()
intents.members = True
bot = commands.Bot(command_prefix="?", intents=intents)


@bot.event
async def on_ready():
    print("ログインしました")


@bot.event
async def on_voice_state_update(member, before, after):
    if member.bot == False and member.guild.system_channel:
        if before.channel != after.channel:
            RoomID = member.guild.system_channel.id
            embed = discord.Embed(
                color=member.color
            )
            embed.set_author(name=member.name + 'がVCに入室',
                            icon_url=member.avatar_url)
            embed.add_field(name="参加チャンネル", value="<#" +
                            str(after.channel.id) + ">")
            embed.add_field(name="参加者", value="<@!" + str(member.id) + ">")

            if after.channel is not None:
                await bot.get_channel(int(RoomID)).send(embed=embed)

    elif member.guild.system_channel is None:
        member.guild.owner.send('サーバー：' + member.guild.name + 'のシステムチャンネルが設定されていないため、VC入退室通知を送信することができません。')


if __name__ == "__main__":
    bot.run(TOKEN)
