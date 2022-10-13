import {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'

import {
  JsonDB,
  Config
} from 'node-json-db'
var db = new JsonDB(new Config("galaxy", true, false, '/'))

import prettyMilliseconds from 'pretty-ms'

let TOKEN = process.env['token']
let CLIENT_ID = '850950666020061234'
let channelId = '1030121767009796180'
let roleId = '1030184453525491752'
let regentime = 1.44e+7

//(4 hours) 1.44e+7 

const commandadd = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Add an enemy')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Enemy username')
      .setRequired(true))
  .addBooleanOption(option =>
    option.setName('dead')
      .setDescription('Main planet dead')
      .setRequired(true))

const commandcolony = new SlashCommandBuilder()
  .setName('colony')
  .setDescription('Add a colony')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Enemy username')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('x')
      .setDescription('Colony X')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('y')
      .setDescription('Colony Y')
      .setRequired(true))
  .addBooleanOption(option =>
    option.setName('dead')
      .setDescription('Colony dead')
      .setRequired(true))

const commandkill = new SlashCommandBuilder()
  .setName('dead')
  .setDescription('Mark planet as killed')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Enemy username')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('planet')
      .setDescription('Planet #')
      .setRequired(true))
  .addBooleanOption(option =>
    option.setName('dead')
      .setDescription('Planet dead state')
      .setRequired(true))

const commandremove = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove enemy')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Enemy username')
      .setRequired(true))

const commandremovecolony = new SlashCommandBuilder()
  .setName('removecolony')
  .setDescription('Remove colony')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Enemy username')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('planet')
      .setDescription('Planet #')
      .setRequired(true))

const enemy = new SlashCommandBuilder()
  .setName('enemy')
  .setDescription('List single enemy')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Enemy username')
      .setRequired(true))

const commands = [{
  name: 'all',
  description: 'Lists all enemies',
},
  commandadd,
  commandcolony,
  commandkill,
  commandremove,
  commandremovecolony,
  enemy
]

const rest = new REST({
  version: '10'
}).setToken(TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.')

    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands
    })

    console.log('Successfully reloaded application (/) commands.')
  } catch (error) {
    console.error(error)
  }
})()

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
  setInterval(async function() {
    try {
      let data = await db.getData(`/players`)
      for (let name in data) {
        let entry = data[name]
        for (let [index, planet] of entry.planets.entries()) {
          if (!planet.deleted) {
            if (planet.reload <= Date.now() && planet.reload !== 0) {
              entry.planets[index] = {
                x: planet.x,
                y: planet.y,
                dead: false,
                reload: 0
              }
              db.push(`/players/${name}`, entry)
              let channel = await client.channels.fetch(channelId)
              channel.send('<@&' + roleId + '> Planet regenerated!');
              channel.send({
                embeds: [await playerembed(name)]
              });
            }
          }
        }
      }
    } catch (error) {

    }
  }, 1000)
})

async function playerembed(name) {
  let entry = await db.getData(`/players/${name}`)
  let embed = new EmbedBuilder()
    .setTitle(name)
  let deadc = 0
  let deadcolor = false
  for (let [index, planet] of entry.planets.entries()) {
    if (!planet.deleted) {
      let sdead = '(ALIVE)'
      if (planet.dead === true) {
        deadc++
        sdead = `(DEAD) (${prettyMilliseconds(planet.reload - Date.now())})`
      }
      if (index === 0) {
        embed.addFields({
          name: `Main #0`,
          value: `${sdead}`
        })
      } else {
        embed.addFields({
          name: `Colony #${index}`,
          value: `${planet.x}, ${planet.y} ${sdead}`,
        })
      }
    }
  }
  if (deadc === entry.planets.length) {
    embed.setColor(0xff1100)
  } else if (deadc === 0) {
    embed.setColor(0x00ff00)
  } else {
    embed.setColor(0xffff00)
  }
  return embed
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  if (interaction.commandName === 'all') {
    try {
      let data = await db.getData(`/players`)
      let embeds = []
      for (let name in data) {
        embeds.push(await playerembed(name))
      }

      interaction.reply({
        embeds: embeds
      })
    } catch (error) {
      interaction.reply('No enemies!')
      return
    }
  }
  if (interaction.commandName === 'add') {
    let name = interaction.options.getString('name')
    let dead = interaction.options.getBoolean('dead')
    let reload = 0
    if (dead === true) {
      reload = Date.now() + regentime
    }
    db.push(`/players/${name}`, {
      planets: [{
        dead: dead,
        reload: reload
      }]
    })
    await interaction.reply('New enemy added!')
    await interaction.followUp({
      embeds: [await playerembed(name)]
    })
  }
  if (interaction.commandName === 'colony') {
    let name = interaction.options.getString('name')
    let x = interaction.options.getInteger('x')
    let y = interaction.options.getInteger('y')
    let dead = interaction.options.getBoolean('dead')
    let sdead = '(ALIVE)'
    let reload = 0
    if (dead === true) {
      dead = '(DEAD)'
      reload = Date.now() + regentime
    }
    try {
      let data = await db.getData(`/players/${name}`)
      data.planets.push({
        x: x,
        y: y,
        dead: dead,
        reload: reload
      })
      db.push(`/players/${name}`, data)
      await interaction.reply('New colony added!')
      await interaction.followUp({
        embeds: [await playerembed(name)]
      })
    } catch (error) {
      await interaction.reply('Enemy does not exist!')
    }
  }
  if (interaction.commandName === 'dead') {
    let name = interaction.options.getString('name')
    let planet = interaction.options.getInteger('planet')
    let dead = interaction.options.getBoolean('dead')
    try {
      let data = await db.getData(`/players/${name}`)
      if (data.planets[planet]) {
        let reload = 0
        if (dead === true) {
          dead = '(DEAD)'
          reload = Date.now() + regentime
        }
        data.planets[planet] = {
          x: data.planets[planet].x,
          y: data.planets[planet].y,
          dead: dead,
          reload: reload
        }
        db.push(`/players/${name}`, data)
        await interaction.reply('Planet state set!')
        await interaction.followUp({
          embeds: [await playerembed(name)]
        })
      } else {
        await interaction.reply('Planet does not exist!')
      }
    } catch (error) {
      await interaction.reply('Enemy does not exist!')
    }
  }
  if (interaction.commandName === 'remove') {
    let name = interaction.options.getString('name')
    try {
      await db.delete(`${name}`)
      await interaction.reply('Removed enemy!')
    } catch (error) {
      await interaction.reply('Enemy does not exist!')
    }
  }
  if (interaction.commandName === 'removecolony') {
    let name = interaction.options.getString('name')
    let planet = interaction.options.getInteger('planet')
    if (planet !== 0) {
      try {
        let data = await db.getData(`/players/${name}`)
        if (data.planets[planet]) {
          data.planets[planet] = {
            deleted: true
          }
          db.push(`/players/${name}`, data)
          await interaction.reply('Deleted planet!')
          await interaction.followUp({
            embeds: [await playerembed(name)]
          })
        } else {
          await interaction.reply('Planet does not exist!')
        }
      } catch (error) {
        await interaction.reply('Enemy does not exist!')
      }
    } else {
      await interaction.reply('Cannot remove main planet!')
    }
  }
  if (interaction.commandName === 'enemy') {
    let name = interaction.options.getString('name')
    try {
      await interaction.reply({
        embeds: [await playerembed(name)]
      })
    } catch (error) {
      await interaction.reply('Enemy does not exist!')
    }
  }
})

client.login(TOKEN)