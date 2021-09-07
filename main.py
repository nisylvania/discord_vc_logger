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
    if member.bot == False and member.guild.system_channel and after.channel is not None and before.channel is None: # 入室について
        for role in member.roles:
            if role.name == "VC Entry":
                if before.channel != after.channel:
                    RoomID = member.guild.system_channel.id
                    embed = discord.Embed(
                        title=member.display_name + "が" + after.channel.name + 'に入室しました！',
                        description="現在の参加者数は" + str(len(after.channel.members)) + "人です。",
                        color=member.color
                        )
                    embed.set_author(name="VC入室",
                                    icon_url=member.avatar_url)
                    await bot.get_channel(int(RoomID)).send(embed=embed)
    
    elif member.bot == False and member.guild.system_channel and after.channel is None and before.channel is not None: # 退室について
        for role in member.roles:
            if role.name == "VC Exit":
                if before.channel != after.channel:
                    RoomID = member.guild.system_channel.id
                    embed = discord.Embed(
                        title=member.display_name + "が" + before.channel.name + 'から退室しました！',
                        description="現在の参加者数は" + str(len(before.channel.members)) + "人です。",
                        color=member.color
                        )
                    embed.set_author(name="VC退室",
                                    icon_url=member.avatar_url)
                    await bot.get_channel(int(RoomID)).send(embed=embed)
                break

    elif member.guild.system_channel is None:
        await member.guild.owner.send(
            'サーバー：' + member.guild.name + 'のシステムチャンネルが設定されていないため、VC入退室通知を送信することができません。')


if __name__ == "__main__":
    bot.run(TOKEN)