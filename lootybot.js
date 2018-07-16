require('dotenv').config({
  path: __dirname + '/.env'
});

if (!process.env.DISCORD_TOKEN ||
  !process.env.PREFIX ||
  !process.env.MONGO_URI) {
    console.log('ERROR: Missing environment variables');
    process.exit(1);
  }

  // VendorEngrams.XYZ variables that will update based on DLC
  const maxLight = '380';
  const maxVendorId = 21;

  // Load up the discord.js library
  const Discord = require("discord.js");
  var request = require('request');
  var cron = require('node-cron');
  var mongoStorage = require('mongodb').MongoClient;

  var dbSubscriptions;

  const client = new Discord.Client();

  client.on("ready", () => {
    // This event will run if the bot starts, and logs in, successfully.

    mongoStorage.connect(process.env.MONGO_URI, function(err, db) {
      if (!err) {
        console.log('Connected to :' + process.env.MONGO_URI);
      } else {
        console.log('Failed to connect to :' + process.env.MONGO_URI);
        process.exit();
      }
      db.createCollection('subscriptions', function(err, collection) {});
      dbSubscriptions = db.collection('subscriptions');
    });

    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client.user.setActivity('Use \!lootyhelp');
  });

  client.on("message", message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if(message.author.bot) return;

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if(message.content.indexOf(process.env.PREFIX) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Let's go with a few common example commands! Feel free to delete or change those.

    /*if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{});
    // And we get the bot to say the thing:
    message.channel.send(sayMessage);
  }*/

  // Display usage
  if(command == "lootyhelp") {
    message.author.send("*Hi! I can send you DMs on Discord when specific vendors have " + maxLight + " Light Level gear available.* \n\n\
    Use one of the following commands: \n\n\
    **!lootylist** - Displays the list of subscribed vendors. \n\
    **!lootysub <Vendor ID>** - Subscribes to notifications when that vendor has " + maxLight + " Light Level gear.\n\
    ex. !lootysub 0 - Subscribes to notifications for Devrim Kay. \n\
    **!lootyunsub <Vendor ID>** - Unsubscribes from notifications for that vendor. \n\
    ex. !lootyunsub 0 - Unsubscribes from notifications for Devrim Kay. \n\
    **!lootyunsuball** - Unsubscribes from **ALL** vendor notifications. \n\n\
    **Vendor IDs:** \n\n\
    0 - Devrim Kay (EDZ/EDZ Tokens)\n\
    1 - MIDA Mini-Tool (IO/Legendary Shards)\n\
    2 - Sloane (Titan/Arcology Tokens)\n\
    3 - Failsafe (Nessus/Nessus Tokens)\n\
    4 - Asher Mir (IO/IO Tokens)\n\
    5 - Man 'O War (IO/Legendary Shards)\n\
    7 - Drang (IO/Legendary Shards)\n\
    8 - Zavala (Tower/Vanguard Tokens)\n\
    9 - Lord Shaxx (Tower/Crucible Tokens)\n\
    10 - Banshee-44 (Tower/Gunsmith Materials)\n\
    11 - Ikora Rey (Tower/Vanguard Research Tokens)\n\
    12 - Benedict 99-40 (Tower/Emperor Calus Tokens)\n\
    13 - Lakshmi-2 (Tower/Future War Cult Tokens)\n\
    14 - Executor Hideo (Tower/New Monarchy Tokens)\n\
    15 - Arach Jalaal (Tower/Dead Orbit Tokens)\n\
    16 - The Emissary (Spire/Trials Tokens)\n\
    17 - Lord Saladin (Tower/Iron Banner Tokens)\n\
    19 - Ana Bray (Mars/Mars Tokens)\n\
    20 - IKELOS_HC_V1.0.1 (Mars/Legendary Shards)\n\
    21 - Braytech RWP Mk. II (Mars/Legendary Shards)\n");
  }

  if(command == "lootylist") {
    if (args.length > 0) {
      message.author.send("Too many arguments!");
    }
    else {
      const userid = message.author.id;
      var replyText = "You are subscribed to notifications from the following vendors:\n\n"

      dbSubscriptions.find({
        'userid': userid
      }).sort({ vendorid: 1 }).toArray(function(err, items) {
        if (items.length == 0) {
          message.reply('You have no vendor subscriptions.');
        }
        else {
          var i;
          for (i = 0; i < items.length; i++) {
              replyText += items[i].vendorid + " - " + getVendorName(items[i].vendorid) + "\n"
              //console.log('Subscribed to vendor ' + items[i].vendorid);
          }
          message.author.send(replyText);
        }
      });
    }
  }

  if(command == "lootysub") {

    const userid = message.author.id;
    const vendorid = parseInt(args[0]);

    if (args.length > 1) {
      message.author.send("Too many arguments. Please specify a vendor ID to subscribe to notifications.");
    }
    else if (args.length < 1) {
      message.author.send("Please specify a vendor ID to subscribe to notifications.");
    }
    else if (isNaN(args[0]) || vendorid < 0 || vendorid > maxVendorId) {
      message.author.send("Invalid vendor ID!");
    }
    else {
      dbSubscriptions.findOne({
        'userid': userid,
        'vendorid': vendorid
      }, function(err, result) {
        if (result != null) {
            message.author.send('You have already subscribed to notifications for ID ' + vendorid + ' - ' + getVendorName(vendorid) + '.');
        } else {
          var record = {
            'vendorid': vendorid,
            'userid': userid
          };
          dbSubscriptions.insert(record, {
            w: 1
          }, function(err, result) {
            if (err) {
              message.author.send('Something went wrong and I failed to add your subscription to the database. Yikes!');
              console.log('ERROR ADDING SUBSCRIPTION TO DB: ' + err);
            }
            else {
                message.author.send('You are now subscribed to notifications for ID ' + vendorid + ' - ' + getVendorName(vendorid) + '.');
            }
          });
        }
      });
    }
  }

  if(command == "lootyunsub") {

    const userid = message.author.id;
    const vendorid = parseInt(args[0]);

    if (args.length > 1) {
      message.author.send("Too many arguments. Please specify a vendor ID to unsubscribe from notifications.");
    }
    else if (args.length < 1) {
      message.author.send("Please specify a vendor ID to unsubscribe from notifications.");
    }
    else if (isNaN(args[0]) || vendorid < 0 || vendorid > 21) {
      message.author.send("Invalid vendor ID!");
    }
    else {

      dbSubscriptions.findOne({
        'userid': userid,
        'vendorid': vendorid
      }, function(err, result) {
        if (result == null) {
            message.author.send('You are not currently subscribed to notifications for ID ' + vendorid + ' - ' + getVendorName(vendorid) + '.');
        } else {
          dbSubscriptions.deleteOne({
            '_id': result._id
          }, function(err, results) {
            if (err){
              message.author.send('Something went wrong and I failed to remove your subscription to the database. Yikes!');
              console.log('ERROR REMOVING SUBSCRIPTION FROM DB: ' + err);
            }
              message.author.send('You are now unsubscribed from notifications for ID ' + vendorid + ' - ' + getVendorName(vendorid) + '.');
              //console.log('Removed vendor ' + vendorid + ' subscription for ' + message.author.username + '(' + userid + ')');
          });
        }
      });
    }
  }

  if(command == "lootyunsuball") {
    if (args.length > 0) {
      message.author.send("Too many arguments!");
    }
    else {

      const userid = message.author.id;

      dbSubscriptions.deleteMany({
        'userid': userid
      }, function(err, results) {
        if (err){
          message.author.send('Something went wrong and I failed to remove your subscription(s) from the database. Yikes!');
          console.log('ERROR REMOVING SUBSCRIPTIONS FROM DB: ' + err);
        }
          message.author.send('You are now unsubscribed from all notifications. *Thank you, come again!*');
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

cron.schedule('2-59/5 * * * *', function() {

  var minutesUntilRefresh = updateNextRefresh();
  console.log("Minutes until next refresh: " + minutesUntilRefresh);

  getVendorDrops(function(err, result) {
    if (!err) {
      var vendorDrops = result;
      //console.log(vendorDrops);

      function looper(i) {
        if (i < vendorDrops.length) {
          if (vendorDrops[i].type == 3) { // Type 3 specifies liekly dropping max light level gear
            var vendorId = vendorDrops[i].vendor;
            dbSubscriptions.find({
              'vendorid': vendorId
            }).toArray(function(err, items) {
              if (err) {
                  console.log('ERROR FINDING SUBSCRIPTION IN DB: ' + err);
              }
              else if (items.length == 0) {
                looper(i+1);
              } else {
                var vendorName = getVendorName(vendorId);
                //console.log(items);
                //console.log(vendorId);
                //console.log(vendorName);
                var dmText = vendorName + " has " + maxLight + " light level packages available for the next " + minutesUntilRefresh + " minutes. *Hurry up!*";

                for (var j = 0; j < items.length; j++) {
                  client.fetchUser(items[j].userid).then(user => {user.send(dmText)});
                }
                looper(i+1);
              }
            });
          } else {
            looper(i+1);
          }
        }
      }
      looper(0);
    }
  });
});

function updateNextRefresh() {
  var currentMinutes = new Date().getMinutes();

  if (currentMinutes < 30) {
    var minutesUntilRefresh = 30 - currentMinutes;
    return minutesUntilRefresh;
  }
  else {
    var minutesUntilRefresh = 60 - currentMinutes;
    return minutesUntilRefresh;
  }
}

function getVendorDrops(callback) {
  request({
    uri: 'https://api.vendorengrams.xyz/getVendorDrops',
    method: "GET",
    headers: {
      'Content-Type': 'application/json'
    }
  }, function(err, response, body) {
    if (!err && response.statusCode == 200) {
      var drops = JSON.parse(body);
      callback(null, drops);
    }
    else {
      console.log('Failed to return vendor drop info: ' + JSON.stringify(response));
      callback(true);
    }
  });
}

function getVendorName(id) {
  switch(id) {
    case 0:
    return "Devrim Kay (EDZ/EDZ Tokens)";
    break;
    case 1:
    return "MIDA Mini-Tool (IO/Legendary Shards)";
    break;
    case 2:
    return "Sloane (Titan/Arcology Tokens)";
    break;
    case 3:
    return "Failsafe (Nessus/Nessus Tokens)";
    break;
    case 4:
    return "Asher Mir (IO/IO Tokens)";
    break;
    case 5:
    return "Man 'O War (IO/Legendary Shards)";
    break;
    case 7:
    return "Drang (IO/Legendary Shards)";
    break;
    case 8:
    return "Zavala (Tower/Vanguard Tokens)";
    break;
    case 9:
    return "Lord Shaxx (Tower/Crucible Tokens)";
    break;
    case 10:
    return "Banshee-44 (Tower/Gunsmith Materials)";
    break;
    case 11:
    return "Ikora Rey (Tower/Vanguard Research Tokens)";
    break;
    case 12:
    return "Benedict 99-40 (Tower/Emperor Calus Tokens)";
    break;
    case 13:
    return "Lakshmi-2 (Tower/Future War Cult Tokens)";
    break;
    case 14:
    return "Executor Hideo (Tower/New Monarchy Tokens)";
    break;
    case 15:
    return "Arach Jalaal (Tower/Dead Orbit Okens)";
    break;
    case 16:
    return "The Emissary (Spire/Trials Tokens)";
    break;
    case 17:
    return "Lord Saladin (Tower/Iron Banner Tokens)";
    break;
    case 19:
    return "Ana Bray (Mars/Mars Tokens)";
    break;
    case 20:
    return "IKELOS_HC_V1.0.1 (Mars/Legendary Shards)";
    break;
    case 21:
    return "Braytech RWP Mk. II (Mars/Legendary Shards)";
    break;
    default:
    return "Unknown Vendor";
  }
}
