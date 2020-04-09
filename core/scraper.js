const axios = require('axios')
const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')

const attURL =
	'https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-9-1/'

axios.defaults.headers.common['User-Agent'] =
	'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'

var patchesDir = 'patches'

axios
	.get(attURL, {
		transformResponse: axios.defaults.transformResponse.concat(function (
			data,
			headers
		) {
			let page = cheerio.load(data)
			// create path for patch data
			let title = page('h1').text()
			let folder = title.replace(/\s(?=\d)/, "").replace(/\s/g, "_").toLowerCase()
			fs.mkdir(patchesDir, {recursive: true}, (err) => {
				if(err) console.error(err)
				fs.mkdir(path.join(patchesDir, folder), {recursive: true}, (err) => {
					if(err) console.error(err)
					console.log(`Gonna write ${title} at path: ${path.join(__dirname, patchesDir, folder)}`)
				})
			})
			// slice page content
			page = page('#patch-notes-container').html()
			return page
		})
	})
	.then((res) => {
		const $ = cheerio.load(res.data)

		// Champions section
		let patchFeatured = $('h3[id^="patch-"]')
		// filter by patch id with only a followed name that's the champ
		const champions = patchFeatured.toArray().filter((cEl) => $(cEl).attr('id').indexOf('-') == $(cEl).attr('id').lastIndexOf('-'))
		console.log($(champions).length + ' Champions')
	})
	.catch(console.error)
