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
    if member.bot == False:
        if before.channel != after.channel:
            RoomID = member.guild.system_channel.id
            embed = discord.Embed(
                title="VC入室通知",
                color=member.color
            )
            embed.set_thumbnail(url=member.avatar_url)
            embed.add_field(name="参加チャンネル", value="<#" +
                            str(after.channel.id) + ">")
            embed.add_field(name="参加者", value="<@!" + str(member.id) + ">")

            if after.channel is not None:
                await bot.get_channel(int(RoomID)).send(embed=embed)


if __name__ == "__main__":
    bot.run(TOKEN)
