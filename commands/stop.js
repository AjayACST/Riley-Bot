const play = require("./playSong");
const { Metrics, clientRedis } = require("../utils/utils");
const waitSong = require("./waitSong");

function stop(msg, serverQueue, player, client) {
  Metrics.increment("boombox.stop");
  if (!msg.member.voice.channel) {
    return msg.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  }
  if (!serverQueue) {
    return msg.channel.send("There is no song currently playing to stop!");
  }
  serverQueue.songs = [];
  clientRedis.set(
    `guild_${msg.guild.id}`,
    JSON.stringify(serverQueue),
    "EX",
    86400
  );
  waitSong(null, null, null, null, null, true);
  play(msg.guild, null, null, null, msg, player, client);
}

module.exports = stop;
