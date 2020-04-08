const pupp = require('puppeteer')
const path = require('path')
const fs = require('fs')

const baseURL = 'https://br.leagueoflegends.com/pt-br/news/game-updates'

var localATTS = []
var lastATT
var ATTS


exports.fetch = async function(patches_path = 'patches.json', callback = (err, message) => {
    if (err) {return console.error(err)}
    return console.log(message)
}) {
    fs.access(patches_path, (err) => {
        if(err) {
            patches_path = 'patches.json'
            console.log('No such path, gonna write at '+ path.join(__dirname, patches_path))
        }
        fs.readFile(patches_path, 'utf-8', (err, data) => {
            if(err) {
                console.log('No local file, gonna fetch all..')
            } else {
                localATTS = JSON.parse(data)
                lastATT = localATTS[0]
            }
        })
    })
    const brow = await pupp.launch({ headless: false })
	const [pagina] = await brow.pages()
	await pagina.goto(baseURL, { timeout: 90000 })
    const LOAD = "[class*='LoadMoreButton']"
	try {
		await pagina.$eval('body', (body) => {
			// format page
			let content = body.querySelector("[class*='Body']")
			body.appendChild(content)
			body.querySelector('#___gatsby').remove()

			// open att tab
			body.querySelector('ol').querySelector('li:nth-child(2) button').click()
		})

        // recursive async fx
		async function fetcher() {
			// timeout for receive ajax
			await pagina.waitFor(5000)

			let agg = await pagina.$$eval('a', (atts) =>
				atts.map((att) => {
					let autor = att.querySelector("[class*='Author']")
					let prev = {
						uri: att.href,
						img: att.querySelector('img').src,
						titulo: att.querySelector('h2').innerText,
						autor: autor ? autor.innerText : '',
						data: att.querySelector('time').dateTime,
					}
					att.remove()
					return prev
				})
			)
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
		ATTS = await fetcher()
	} catch (error) {
		brow.close()
		callback(error)
	} finally {
        let message = ""
		if (ATTS.length) {
			message += ATTS.length + ' new patches\n'
			ATTS = ATTS.concat(localATTS)
			lastATT = ATTS[0]
			fs.writeFile(
				patches_path,
				JSON.stringify(ATTS, null, 2),
				'utf-8',
				(e) => {
					if (e) {
						callback(e)
					}
				}
            )
            message += `Patches updated at "${patches_path}" with success ^-^\n`
		} else {
			message += 'Apparently you already have all patches saved, nice!\n'
		}
        message += `Last patch date: ${new Date(lastATT.data).toLocaleDateString()}`
        callback(null, message)
	}
}