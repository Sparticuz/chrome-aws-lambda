const { handler } = require('../amazon/handlers/index');
const events = require("../events/example.com.json");

handler(events).then(() => console.log("done"));
