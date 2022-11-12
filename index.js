import {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  InteractionType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import qs from 'querystring';
import fs from 'fs';

import * as dotenv from 'dotenv';
dotenv.config()

import fetch from 'node-fetch';

import {
  JsonDB,
  Config
} from 'node-json-db';
var db = new JsonDB(new Config('galaxy', true, false, '/'));
var dbc = new JsonDB(new Config('universe', true, false, '/'));

import prettyMilliseconds from 'pretty-ms';

let TOKEN = process.env['token'];
let CLIENT_ID = '850950666020061234';
let channelId = '1015199101194870884';
let roleId = '1030193259009544333';
let regentime = 1.44e7;

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
    option
    .setName('name')
    .setDescription('Enemy username')
    .setRequired(true)
    .setAutocomplete(true)
  )
  .addIntegerOption(option =>
    option
    .setName('x')
    .setDescription('Colony X')
    .setRequired(true)
  )
  .addIntegerOption(option =>
    option
    .setName('y')
    .setDescription('Colony Y')
    .setRequired(true)
  )
  .addBooleanOption(option =>
    option
    .setName('dead')
    .setDescription('Colony dead')
    .setRequired(true)
  )
  .addStringOption(option =>
    option
    .setName('note')
    .setDescription('Note')
    .setRequired(false)
  );

const commandkill = new SlashCommandBuilder()
  .setName('dead')
  .setDescription('Mark planet as killed')
  .addStringOption(option =>
    option
    .setName('name')
    .setDescription('Enemy username')
    .setRequired(true)
    .setAutocomplete(true)
  )
  .addIntegerOption(option =>
    option
    .setName('planet')
    .setDescription('Planet #')
    .setRequired(true)
  )
  .addBooleanOption(option =>
    option
    .setName('dead')
    .setDescription('Planet dead state')
    .setRequired(true)
  );

const commandremovecolony = new SlashCommandBuilder()
  .setName('removecolony')
  .setDescription('Remove colony')
  .addStringOption(option =>
    option
    .setName('name')
    .setDescription('Enemy username')
    .setRequired(true)
    .setAutocomplete(true)
  )
  .addIntegerOption(option =>
    option
    .setName('planet')
    .setDescription('Planet #')
    .setRequired(true)
  );

const commandremove = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove enemy')
  .addStringOption(option =>
    option
    .setName('name')
    .setDescription('Enemy username')
    .setRequired(true)
    .setAutocomplete(true)
  );

const enemy = new SlashCommandBuilder()
  .setName('enemy')
  .setDescription('List single enemy')
  .addStringOption(option =>
    option
    .setName('name')
    .setDescription('Enemy username')
    .setRequired(true)
    .setAutocomplete(true)
  );

const nuke = new SlashCommandBuilder()
  .setName('nuke')
  .setDescription('Clear all enemies')
  .addStringOption(option =>
    option
    .setName('confirm')
    .setDescription('Are you sure? (YES)')
    .setRequired(true)
  );

const commandautofill = new SlashCommandBuilder()
  .setName('autofill')
  .setDescription('Auto fill clan users')
  .addStringOption(option =>
    option
    .setName('name')
    .setDescription('Clan username')
    .setRequired(true)
  );

const commandfetchcoords = new SlashCommandBuilder()
  .setName('fetchcoords')
  .setDescription('Auto fill clan users')
  .addStringOption(option =>
    option
    .setName('name')
    .setDescription('Clan username')
    .setRequired(true)
  );

const commandnote = new SlashCommandBuilder()
  .setName('note')
  .setDescription('Add/edit planet note')
  .addStringOption(option =>
    option
    .setName('name')
    .setDescription('Enemy username')
    .setRequired(true)
    .setAutocomplete(true)
  )
  .addIntegerOption(option =>
    option
    .setName('planet')
    .setDescription('Planet #')
    .setRequired(true)
  )
  .addStringOption(option =>
    option
    .setName('note')
    .setDescription('Note')
    .setRequired(true)
  );


const commands = [{
    name: 'all',
    description: 'Lists all enemies'
  }, {
    name: 'attackable',
    description: 'Lists all attackable enemies'
  }, {
    name: 'test',
    description: 'uwu'
  },
  commandcolony,
  commandkill,
  commandremovecolony,
  enemy,
  nuke,
  commandautofill,
  commandnote,
  commandadd,
  commandremove,
  commandfetchcoords,
];

const rest = new REST({
  version: '10'
}).setToken(TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// let response = await fetch(`https://api.galaxylifegame.net/users/name?name=${'3Cheese'}`)
// let data = await response.json()
// console.log(data.Online)

// response = await fetch(`https://api.galaxylifegame.net/alliances/get?name=${'furry femboy club'}`)
// data = await response.json()
// console.log(data.Members)

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  setInterval(async function() {
    try {
      let data = await db.getData(`/players`);
      for (let name in data) {
        let pingattackable = 0;
        let entry = data[name];
        let memberResponse = await fetch(`https://api.galaxylifegame.net/users/name?name=${name}`);
        let memberData = await memberResponse.json();
        entry.online = memberData.Online;
        for (let [index, planet] of entry.planets.entries()) {
          if (entry.online === true) {
            entry.planets[index].dead = false;
            entry.planets[index].reload = -1;
          }
          if (entry.online === false && planet.reload === -1) {
            entry.planets[index].dead = false;
            entry.planets[index].reload = 0;
            pingattackable += 1;
          }
          if (planet.reload <= Date.now() && planet.reload > 0) {
            entry.planets[index].dead = false;
            entry.planets[index].reload = 0;
            pingattackable += 1;
          }
        }
        try {
          await db.getData(`/players`)
          db.push(`/players/${name}`, entry)
          if (pingattackable === 1) {
            let channel = await client.channels.fetch(channelId);
            //<@&' + roleId + '>
            channel.send('Planet attackable!');
            channel.send({
              embeds: [await playerembed(name)]
            });
          } else if (pingattackable > 1) {
            let channel = await client.channels.fetch(channelId);
            //<@&' + roleId + '>
            channel.send('Planets attackable!');
            channel.send({
              embeds: [await playerembed(name)]
            });
          }
        } catch (error) {}
      }
    } catch (error) {}
  }, 60000);
});

function stringstuff(input) {
  var i = 0;
  var letter = 0;
  var lowBits = 0;
  var output = new String();
  for (i = 0; i < input.length;) {
    letter = input.charCodeAt(i);
    if (letter >= 32 && letter < 128) {
      lowBits = (letter ^ i + 3) & 31;
      letter = letter & 4294967264 | lowBits;
    }
    output += String.fromCharCode(letter);
    i++;
  }
  return output;
}

async function playerembed(name, c) {
  let entry;
  if (c) {
    entry = await dbc.getData(`/players/${name}`);
  } else {
    entry = await db.getData(`/players/${name}`);
  }
  let sonline = '(OFFLINE)';
  if (entry.online === true) {
    sonline = `(ONLINE)`;
  }
  let embed = new EmbedBuilder().setTitle(`${name} ${sonline}`);
  let deadc = 0;
  let deadcolor = false;
  for (let [index, planet] of entry.planets.entries()) {
    let sdead = '(ALIVE)';
    if (planet.dead === true) {
      deadc++;
      sdead = `(DEAD) (${prettyMilliseconds(planet.reload - Date.now())})`;
    }
    let snote = '';
    if (planet.note) {
      snote = ` (${planet.note})`;
    }
    if (index === 0) {
      embed.addFields({
        name: `Main #0`,
        value: `${sdead}${snote}`,
        inline: true
      });
    } else {
      embed.addFields({
        name: `Colony #${index}`,
        value: `${planet.x}, ${planet.y} ${sdead}${snote}`,
        inline: true
      });
    }
  }
  if (entry.online === true) {
    embed.setColor(0xff1100);
  } else if (deadc < entry.planets.length) {
    embed.setColor(0x00ff00);
  } else {
    embed.setColor(0xffff00);
  }
  return embed;
}

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isAutocomplete()) return;
    if (interaction.channel.id !== '1015199101194870884') return;
    let focusedValue = interaction.options.getFocused().toLowerCase();
    let choices = Object.keys(await db.getData(`/players`));
    let filtered = choices.filter(choice =>
      choice.toLowerCase().startsWith(focusedValue)
    );
    await interaction.respond(
      filtered.map(choice => ({
        name: choice,
        value: choice
      }))
    );
  } catch (error) {}
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.channel.id !== '1015199101194870884' && interaction.channel.id !== '1040972677155926036') return;

  if (interaction.commandName === 'all') {
    try {
      let data = await db.getData(`/players`);
      let embeds = [];
      for (let name in data) {
        embeds.push(await playerembed(name));
      }

      let chunkSize = 10;
      for (let i = 0; i < embeds.length; i += chunkSize) {
        let chunk = embeds.slice(i, i + chunkSize);
        if (i < chunkSize) {
          await interaction.reply({
            embeds: chunk
          });
        } else {
          await interaction.followUp({
            embeds: chunk
          });
        }
      }
    } catch (error) {
      await interaction.reply('No enemies!');
      return;
    }
  }
  if (interaction.commandName === 'add') {
    let name = interaction.options.getString('name')
    let dead = interaction.options.getBoolean('dead')
    try {
      let memberResponse = await fetch(
        `https://api.galaxylifegame.net/users/name?name=${name}`
      );
      let memberData = await memberResponse.json();
      db.push(`/players/${name}`, {
        online: memberData.Online,
        planets: [{
          dead: false,
          reload: 0
        }]
      });
      await interaction.reply('Enemy added!');
      await interaction.followUp({
        embeds: [await playerembed(name)]
      });
    } catch (error) {
      await interaction.reply('Enemy not found!');
    }
  }
  if (interaction.commandName === 'colony') {
    let name = interaction.options.getString('name');
    let x = interaction.options.getInteger('x');
    let y = interaction.options.getInteger('y');
    let dead = interaction.options.getBoolean('dead');
    let note = interaction.options.getString('note');
    let reload = 0;
    if (dead === true) {
      reload = Date.now() + regentime;
    }
    try {
      let data = await db.getData(`/players/${name}`);
      data.planets.push({
        x: x,
        y: y,
        dead: dead,
        reload: reload,
        note: note
      });
      db.push(`/players/${name}`, data);
      await interaction.reply('New colony added!');
      await interaction.followUp({
        embeds: [await playerembed(name)]
      });
    } catch (error) {
      await interaction.reply('Enemy does not exist!');
    }
  }
  if (interaction.commandName === 'dead') {
    let name = interaction.options.getString('name');
    let planet = interaction.options.getInteger('planet');
    let dead = interaction.options.getBoolean('dead');
    try {
      let data = await db.getData(`/players/${name}`);
      if (data.planets[planet]) {
        let reload = Date.now() + regentime;
        data.planets[planet] = {
          x: data.planets[planet].x,
          y: data.planets[planet].y,
          dead: dead,
          reload: reload
        };
        db.push(`/players/${name}`, data);
        await interaction.reply('Planet state set!');
        await interaction.followUp({
          embeds: [await playerembed(name)]
        });
      } else {
        await interaction.reply('Planet does not exist!');
      }
    } catch (error) {
      await interaction.reply('Enemy does not exist!');
    }
  }
  if (interaction.commandName === 'removecolony') {
    let name = interaction.options.getString('name');
    let planet = interaction.options.getInteger('planet');
    if (planet !== 0) {
      try {
        let data = await db.getData(`/players/${name}`);
        if (data.planets[planet]) {
          data.planets.splice(planet, 1);
          db.push(`/players/${name}`, data);
          await interaction.reply('Removed planet!');
          await interaction.followUp({
            embeds: [await playerembed(name)]
          });
        } else {
          await interaction.reply('Planet does not exist!');
        }
      } catch (error) {
        await interaction.reply('Enemy does not exist!');
      }
    } else {
      await interaction.reply('Cannot remove main planet!');
    }
  }
  if (interaction.commandName === 'remove') {
    try {
      let name = interaction.options.getString('name');
      await db.delete(`/players/${name}`);
      await interaction.reply('Enemy removed!');
    } catch (error) {
      await interaction.reply('Enemy not found!');
    }
  }
  if (interaction.commandName === 'enemy') {
    let name = interaction.options.getString('name');
    try {
      await interaction.reply({
        embeds: [await playerembed(name)]
      });
    } catch (error) {
      await interaction.reply('Enemy not found!');
    }
  }
  if (interaction.commandName === 'nuke') {
    if (interaction.options.getString('confirm') === 'YES') {
      await fs.copyFile('galaxy.json', `${Date.now()}.json`, err => {
        if (err) throw err;
      });
      await db.delete(`/players`);
      await interaction.reply(
        'Enemy list cleared! (backup was saved on server side)'
      );
    }
  }
  if (interaction.commandName === 'autofill') {
    let name = interaction.options.getString('name');
    try {
      let clanResponse = await fetch(`https://api.galaxylifegame.net/alliances/get?name=${name}`);
      let clanData = await clanResponse.json();
      await interaction.reply('Adding members...');
      for (let member of clanData.Members) {
        let memberResponse = await fetch(
          `https://api.galaxylifegame.net/users/name?name=${member.Name}`
        );
        let memberData = await memberResponse.json();
        db.push(`/players/${member.Name}`, {
          online: memberData.Online,
          planets: [{
            dead: false,
            reload: 0
          }]
        });
      }
      let data = await db.getData(`/players`);
      let embeds = [];
      for (let name in data) {
        embeds.push(await playerembed(name));
      }

      await interaction.followUp('Clan members added!');

      let chunkSize = 10;
      for (let i = 0; i < embeds.length; i += chunkSize) {
        let chunk = embeds.slice(i, i + chunkSize);
        if (i < chunkSize) {
          await interaction.followUp({
            embeds: chunk
          });
        } else {
          await interaction.followUp({
            embeds: chunk
          });
        }
      }
    } catch (error) {
      await interaction.reply('Unable to fetch clan!');
    }
  }
  if (interaction.commandName === 'attackable') {
    try {
      let data = await db.getData(`/players`);
      let embeds = [];
      for (let name in data) {
        let isaplanetalive = false;
        let entry = data[name];
        if (entry.online === false) {
          for (let planet of entry.planets) {
            if (planet.dead === false) {
              isaplanetalive = true;
            }
          }
        }
        if (isaplanetalive === true) {
          embeds.push(await playerembed(name));
        }
      }

      if (embeds.length > 0) {
        let chunkSize = 10;
        for (let i = 0; i < embeds.length; i += chunkSize) {
          let chunk = embeds.slice(i, i + chunkSize);
          if (i < chunkSize) {
            await interaction.reply({
              embeds: chunk
            });
          } else {
            await interaction.followUp({
              embeds: chunk
            });
          }
        }
      } else {
        await interaction.reply('No attackable enemies!');
      }
    } catch (error) {
      await interaction.reply('No enemies!');
      return;
    }
  }
  if (interaction.commandName === 'note') {
    let name = interaction.options.getString('name');
    let planet = interaction.options.getInteger('planet');
    let note = interaction.options.getString('note');
    try {
      let data = await db.getData(`/players/${name}`);
      if (data.planets[planet]) {
        data.planets[planet].note = note;
        db.push(`/players/${name}`, data);
        await interaction.reply('Set planet note!');
        await interaction.followUp({
          embeds: [await playerembed(name)]
        });
      } else {
        await interaction.reply('Planet does not exist!');
      }
    } catch (error) {
      await interaction.reply('Enemy does not exist!');
    }
  }
  if (interaction.commandName === 'test') {
    // Create the modal
    const modal = new ModalBuilder()
      .setCustomId('myModal')
      .setTitle('My Modal');

    // Add components to modal

    // Create the text input components
    const favoriteColorInput = new TextInputBuilder()
      .setCustomId('favoriteColorInput')
      // The label is the prompt the user sees for this input
      .setLabel("What's your favorite color?")
      // Short means only a single line of text
      .setStyle(TextInputStyle.Short);

    const hobbiesInput = new TextInputBuilder()
      .setCustomId('hobbiesInput')
      .setLabel("What's some of your favorite hobbies?")
      // Paragraph means multiple lines of text.
      .setStyle(TextInputStyle.Paragraph);

    // An action row only holds one text input,
    // so you need one action row per text input.
    const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
    const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);

    // Add inputs to the modal
    modal.addComponents(firstActionRow, secondActionRow);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
  if (interaction.commandName === 'fetchcoords' && interaction.user.id === '469520953999753216') {
    let reqObject = {
      uid: '233701',
      sig: '6459a5845e08fe2371c49d7aa801c160',
      data: '',
      platform: 'phoenix',
      version: '1.1.20',
      flash_version: 'WIN 34,0,0,267',
      site: ''
    }

    let name = interaction.options.getString('name');
    try {
      let clanResponse = await fetch(`https://api.galaxylifegame.net/alliances/get?name=${name}`);
      let clanData = await clanResponse.json();
      await interaction.reply('Adding members...');
      for (let member of clanData.Members) {
        let memberResponse = await fetch(
          `https://api.galaxylifegame.net/users/name?name=${member.Name}`
        );
        let dataObject = {
          "packetData": {
            "cmdList": [{
              "cmdMls": 116171,
              "cmdCount": 36,
              "cmdName": "obtainUniverse",
              "cmdData": {
                "attack": "0",
                "planetId": "1",
                "targetAccountId": member.Id
              }
            }],
            "packetCount": 21,
            "role": 2,
            "sync": 6,
            "packetMls": 116199,
            "version": "1.22.1"
          },
          "packetType": "cmdList"
        }
        reqObject.data = stringstuff(JSON.stringify(dataObject))
        let coordsResponse = await fetch("https://lb.galaxylifeserver.net/star/game", {
          "headers": {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "authorization": "Bearer no_use_rn",
            "content-type": "application/x-www-form-urlencoded",
            "sec-fetch-dest": "embed",
            "sec-fetch-mode": "no-cors",
            "sec-fetch-site": "cross-site",
            "x-requested-with": "ShockwaveFlash/34.0.0.267"
          },
          "referrer": "https://cdn.galaxylifegame.net/",
          "referrerPolicy": "strict-origin-when-cross-origin",
          "body": qs.stringify(reqObject),
          "method": "POST",
          "mode": "cors"
        });
        let coordsServerData = await coordsResponse.json()
        let coordsData = JSON.parse(stringstuff(coordsServerData.data)).list[0].cmdData.Universe[0].Profile[5].Planets;
        let memberData = await memberResponse.json();
        dbc.push(`/players/${member.Name}`, {
          online: memberData.Online,
          planets: [{
            dead: false,
            reload: 0
          }]
        });
        let entry = await dbc.getData(`/players/${member.Name}`);
        for (let i = 0; i < coordsData.length; i++) {
          if (coordsData[i].capital !== 1) {
            entry.planets.push({
              dead: false,
              x: coordsData[i].sku.split(':')[0],
              y: coordsData[i].sku.split(':')[1],
              reload: 0,
              note: `sb${coordsData[i].HQLevel}`
            })
          }
        }
        dbc.push(`/players/${name}`, entry)
      }
      let data = await dbc.getData(`/players`);
      let embeds = [];
      for (let name in data) {
        embeds.push(await playerembed(name, true));
      }

      await interaction.followUp('Clan members added!');

      let chunkSize = 10;
      for (let i = 0; i < embeds.length; i += chunkSize) {
        let chunk = embeds.slice(i, i + chunkSize);
        if (i < chunkSize) {
          await interaction.followUp({
            embeds: chunk
          });
        } else {
          await interaction.followUp({
            embeds: chunk
          });
        }
      }
      await fs.copyFile('universe.json', `${name} all coords ${Date.now()}.json`, err => {
        if (err) throw err;
      });
      await dbc.delete(`/players`);
    } catch (error) {
      await interaction.reply('Unable to fetch clan!');
    }


  }
});

client.login(TOKEN);