import {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'

import fs from 'fs'

import {
  JsonDB,
  Config
} from 'node-json-db'
var db = new JsonDB(new Config("galaxy", true, false, '/'))

import prettyMilliseconds from 'pretty-ms'

let TOKEN = process.env['token']
let CLIENT_ID = '850950666020061234'
let channelId = '1015199101194870884'
let roleId = '1030193259009544333'
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
      .setRequired(true)
      .setAutocomplete(true))
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
      .setRequired(true)
      .setAutocomplete(true))
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
      .setRequired(true)
      .setAutocomplete(true))

const commandremovecolony = new SlashCommandBuilder()
  .setName('removecolony')
  .setDescription('Remove colony')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Enemy username')
      .setRequired(true)
      .setAutocomplete(true))
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
      .setRequired(true)
      .setAutocomplete(true))

const nuke = new SlashCommandBuilder()
  .setName('nuke')
  .setDescription('Clear all enemies')
  .addStringOption(option =>
    option.setName('confirm')
      .setDescription('Are you sure? (YES)')
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
  enemy,
  nuke
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
          if (planet.reload <= Date.now() && planet.reload !== 0) {
            entry.planets[index] = {
              x: planet.x,
              y: planet.y,
              dead: false,
              reload: 0
            }
            db.push(`/players/${name}`, entry)
            let channel = await client.channels.fetch(channelId)
            //<@&' + roleId + '> 
            channel.send('Planet regenerated!');
            channel.send({
              embeds: [await playerembed(name)]
            });
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
  if (!interaction.isAutocomplete()) return
  if (interaction.channel.id !== '1015199101194870884') return
  let focusedValue = interaction.options.getFocused();
  let choices = Object.keys(await db.getData(`/players`))
  let filtered = choices.filter(choice => choice.startsWith(focusedValue));
  await interaction.respond(
    filtered.map(choice => ({ name: choice, value: choice })),
  );
})


client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return
  if (interaction.channel.id !== '1015199101194870884') return

  if (interaction.commandName === 'all') {
    try {
      let data = await db.getData(`/players`)
      let embeds = []
      for (let name in data) {
        embeds.push(await playerembed(name))
      }

      let chunkSize = 10;
      for (let i = 0; i < embeds.length; i += chunkSize) {
        let chunk = embeds.slice(i, i + chunkSize);
        if (i < chunkSize) {
          await interaction.reply({
            embeds: chunk
          })
        } else {
          await interaction.followUp({
            embeds: chunk
          })
        }
      }
    } catch (error) {
      await interaction.reply('No enemies!')
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
    let reload = 0
    if (dead === true) {
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
        let reload = Date.now() + regentime
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
      await db.delete(`/players/${name}`)
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
          data.planets.splice(planet, 1)
          db.push(`/players/${name}`, data)
          await interaction.reply('Removed planet!')
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
  if (interaction.commandName === 'nuke') {
    if (interaction.options.getString('confirm') === 'YES') {
      fs.copyFile('galaxy.json', `./backups/${Date.now()}.json`, (err) => {
        if (err) throw err;
      });
      await db.delete(`/players`)
      await interaction.reply('Enemy list cleared! (backup was saved on server side)')
    }
  }
})

client.login(TOKEN)
