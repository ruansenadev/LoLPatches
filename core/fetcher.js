const pupp = require('puppeteer')
const path = require('path')
const fs = require('fs')

const baseURL = 'https://br.leagueoflegends.com/pt-br/news/game-updates'
const d = new Date()

const errorsDir = 'erros'
const patchesDir = 'patches'

var localATTS = {items:[]}
var lastATT
var ATTS

function createLog(e, frag='') {
	fs.mkdir(path.join(patchesDir, errorsDir), {recursive: true}, (err) => {
		if(err) throw err;
		let logFile = d.toLocaleDateString().replace(/\//g, '_').concat('_fetch_log.txt')
		fs.appendFile(path.join(patchesDir, errorsDir, logFile), `(${new Date().toLocaleTimeString()}): \r\n${frag?" - "+frag:""}\r\n${e}\r\n🔚🔚🔚🔚\r\n`, 'utf8', (err) => {
			if(err) throw err;
			console.log('Error, log: ' + path.join(patchesDir, errorsDir, logFile))
		})
	})
}

exports.fetch = async function(callback = (data, message) => {
	console.log(message)
	return data
}) {
	fs.mkdir(patchesDir, {recursive: true}, (err) => {
		if(err) throw err;
		fs.readFile(path.join(patchesDir, "data.json"), 'utf-8', (err, data) => {
            if(err) {
                console.log('No local file, gonna fetch all..')
            } else {
                localATTS = JSON.parse(data)
                lastATT = localATTS.items[0]
            }
        })
	})
    const brow = await pupp.launch({ headless: false })
	const [pagina] = await brow.pages()
	await pagina.goto(baseURL, { timeout: 90000 }).catch(e => {createLog(e, 'Page request')})
    const LOAD = "[class*='LoadMoreButton']"
	try {
		await pagina.$eval('body', (body) => {
			let content = body.querySelector("[class*='Body']")
			body.appendChild(content)
			body.querySelector('#___gatsby').remove()

			body.querySelector('ol').querySelector('li:nth-child(2) button').click()
		}).catch(e => {createLog(e, "Page formatting")})

        // recursive async fx
		async function fetcher() {
			// timeout for receive ajax
			await pagina.waitFor(5000)

			let agg = await pagina.$$eval('a', (atts) =>
				atts.reduce((prevs, att) => {
					if(!(/teamfight|tft/i.test(att.querySelector('h2').innerText))) {
						let autor = att.querySelector("[class*='Author']")
						prevs.push({
							url: att.href,
							img: att.querySelector('img').src,
							titulo: att.querySelector('h2').innerText.match(/\d+.\d*[a-z]*/)[0],
							autor: autor ? autor.innerText : '',
							data: att.querySelector('time').dateTime,
						})
					}
					att.remove()
					return prevs
				}, [])
			).catch(e => createLog(e, 'Preview patch scraping'))
			if (lastATT) {
				for (let i = 0; i < agg.length; i++) {
					if (agg[i].data === lastATT.data) {
						agg = agg.slice(0, i)
						break
						// found last patch date so slice it and return new ones
					}
				}
				return agg
			}
			if ((await pagina.$(LOAD)) == null) {
				// fetching has ended
				return agg
			} else {
				await pagina.click(LOAD)
				await pagina.waitForSelector('a')
				// prepare and fetch more data
				return agg.concat(await fetcher())
			}
		}
		ATTS = {items: await fetcher()}
	} catch (error) {
		if(error) {
			createLog(error, 'Fetching/Scraping')
		}
	} finally {
		brow.close()
        let message = "	📃 Fetching done 📃	📃\n"
		if (ATTS.items.length) message += ATTS.items.length + ' new patches\n'	
        return callback([ATTS, localATTS], message)
	}
}