var cron = require('node-cron')

// “At minute 0 past every hour on every 3rd day-of-week.”
// "Job executado a toda hora às quartas"
const exp = '0 */1 * * */3'

cron.schedule(exp, function() {
    // scrap new items and update patches
})