const axios = require('axios')
const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')

const attURL = 'https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-4'

axios.defaults.headers.common['User-Agent'] =
	'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'
const d = new Date()

const errorsDir = 'erros'
const patchesDir = 'patches'
var folder

function createLog(e, frag = '') {
	fs.mkdir(path.join(patchesDir, errorsDir), { recursive: true }, (err) => {
		if (err) { throw err }
		let logFile = d.toLocaleDateString().replace(/\//g, '_').concat('_scrap_log.txt')
		fs.appendFile(path.join(patchesDir, errorsDir, logFile), `(${new Date().toLocaleTimeString()}): ${frag ? " - " + frag : ""}\r\n${e}\r\n🔚🔚🔚🔚\r\n`, 'utf8', (err) => {
			if (err) { throw err }
			console.log('\nErro :T	log do erro: ' + path.join(patchesDir, errorsDir, logFile))
		})
	})
}
exports.scrap = async function (url = '', callback = (data, message) => {
	console.log(message)
	return data
}) {
	let SCRAP = {
		note: "",
		ft: {},
		champs: [],
		runes: [],
		fixes: []
	}
	let msg = "	📜 Scraping	📜\n"
	axios
		.get(url, {
			transformResponse: axios.defaults.transformResponse.concat(function (
				data,
				headers
			) {
				let page = cheerio.load(data)
				// create path for scrap data
				let title = page('h1').text()
				folder = title.replace(/\s(?=\d)/, "").replace(/\s/g, "_").toLowerCase()
				if (/\d{3}/.test(folder)) {
					let err = new Error(title);
					throw createLog(err, "Page formatting")
				}
				msg += title + ':\n'
				// slice page content
				page = page('#patch-notes-container').html()
				return page
			})
		})
		.then((res) => {
			const $ = cheerio.load(res.data)
			// --Note--
			SCRAP.note = $('#patch-top').next().text().trim().replace(/\r\n|\r|\n|\t/gm, "").replace(/\s{2,}/g, " ")
			msg += 'note length: ' + SCRAP.note.length + '\n'

			// --Featured--
			let patchFeatured = $('h2[id*="highlights"]').filter((i, title) => { let txt = $(title).text().toLowerCase(); return txt.includes('destaques') || txt.includes('highlights') }).parent().next().not(':not(div)').first()
			try {
				SCRAP.ft.img = patchFeatured.find('img').first().attr('src')
				SCRAP.ft.mod = patchFeatured.text().trim()
			} catch (error) {
				createLog(error, 'Featured')
			}
			msg += 'featured img: ' + /(?<=\.)[a-z]*$/.exec(SCRAP.ft.img)[0] + '\n'

			// --Champions--
			patchFeatured = $('h3[id^="patch-"]')
			// filter by patch id with only a followed name that's the champ
			const champions = patchFeatured.toArray().filter((cEl) => $(cEl).attr('id').indexOf('-') == $(cEl).attr('id').lastIndexOf('-'))
			msg += $(champions).length + ' champions\n'
			// format data for each note
			champions.reduce((champs, champ, i) => {
				try {
					champs.push({
						campeao: $(champ).text(),
						img: $(champ).siblings('a').first().children('img').attr('src'),
						mod: $(champ).siblings('p').first().text(),
						nota: $(champ).siblings('blockquote').text().trim().replace(/\r\n|\r|\n|\t/gm, "").replace(/\s{2,}/g, " ")
					})
				} catch (error) {
					createLog(error, "Champion introduce scraping")
				}

				// possible change content
				// links list
				if ($(champ).siblings('ul').find('a').length) {
					let refs
					try {
						refs = $(champ).siblings('ul').find('a').map((i, ref) => {
							return { item: $(ref).text(), link: $(ref).attr('href') }
						}).toArray()
						refs.forEach(ref => {
							if (!(ref.item) || !(ref.link)) {
								throw new Error('not content assign')
							}
						})
					} catch (error) {
						createLog(error, 'Champion list references scraping')
					}
					champs[i].links = refs
				}
				// skills changes
				if ($(champ).siblings('h4').length) {
					let skills
					try {
						skills = $(champ).siblings('h4').map((i, title) => {
							// all followed divs and not any other tag
							let attrs = $(title).nextUntil('div+:not(div)').not(':not(div)').map((i, atr) => {
								let tag = $(atr).children(':first-child').text().match(/^[a-z]{2,}/)
								let befr = $(atr).children(':nth-child(2)')
								atr = {
									atributo: tag ? tag.input.split(tag[0])[1] : $(atr).children(':first-child').text(),
									rotulo: tag ? tag[0] : undefined,
									antes: befr.is(':last-of-type') ? undefined : befr.text(),
									depois: $(atr).children(':last-child').text(),
								}
								if (!atr.atributo && atr.depois) {
									// changed must be first word
									atr.atributo = atr.depois.slice(0, atr.depois.indexOf(' '))
									atr.depois = atr.depois.slice(atr.depois.indexOf(' ') + 1)
								}
								return atr
							}).toArray()
							attrs.forEach((atr) => {
								if (!(atr.depois)) {
									throw new Error('not content assign')
								}
							})
							let img = $(title).children('img').attr('src')
							let tag = $(title).text().match(/^[a-z]{2,}/)
							let change = { nome: tag ? tag.input.split(tag[0])[1] : $(title).text(), atributos: attrs }
							if (img) change.img = img
							if (tag) change.rotulo = tag[0]
							return change
						}).toArray()
					} catch (error) {
						createLog(error, 'Champion skills scraping')
					}
					champs[i].habilidades = skills
					// self champ changes (effects)
				} else if ($(champ).next('[class*="change"]').length) {
					let fxs
					try {
						fxs = $(champ).nextUntil('div+:not(div)').not(':not([class*="change"])').map((i, atr) => {
							return {
								atributo: $(atr).children(':first-child').text(),
								agora: $(atr).children(':last-child').text(),
							}
						}).toArray()
						fxs.forEach(fx => {
							if (!(fx.atributo) || !(fx.agora)) {
								throw new Error('not content assign')
							}
						})
					} catch (error) {
						createLog(error, 'Champion effects scraping')
					}
					champs[i].efeitos = fxs
				}
				return champs
			}, SCRAP.champs)

			// --Runas--
			patchFeatured = $("[id*='runes']").parent()
			// select runes block wrapper
			const runes = patchFeatured.nextUntil('div+:not(div)').not(':not(div)').map((i, cEl) => {
				return $('h3', cEl).parent()
			}).toArray()
			msg += runes.length + ' runes\n'
			runes.reduce((runs, run, i) => {
				try {
					runs.push({
						runa: $('h3', run).text(),
						img: $('a > img', run).attr('src'),
						mod: $('p', run).first().text(),
						nota: $('blockquote', run).text().trim()
					})
				} catch (error) {
					createLog(error, "Rune introduce scraping")
				}

				let changes
				try {
					changes = $('div', run).map((i, chng) => {
						let tag = $(chng).children(':first-child').text().match(/^[a-z]{2,}/)
						let befr = $(chng).children(':nth-child(2)')
						return {
							atributo: tag ? tag.input.split(tag[0])[1] : $(chng).children(':first-child').text(),
							rotulo: tag ? tag[0] : undefined,
							antes: befr.is(':last-of-type') ? undefined : befr.text(),
							depois: $(chng).children(':last-child').text()
						}
					}).toArray()
				} catch (error) {
					createLog(error, "Rune attributes scraping")
				}
				runs[i].alteracoes = changes
				return runs
			}, SCRAP.runes)

			// --Fixes--
			patchFeatured = $("[id*='bugfixes']").parent().next('div').first()
			const fixes = $('ul > li', patchFeatured)
			msg += fixes.length + ' bug fixes\n'
			try {
				SCRAP.fixes = fixes.map((i, fix) => {
					fix = { note: $(fix).text().trim() }
					let related = []
					// looks for related champ changed in the patch
					SCRAP.champs.forEach(champ => {
						if (fix.note.includes(champ.campeao)) {
							related.push(champ.campeao)
						}
					})
					if (related.length) fix.champs = related
					return fix
				}).toArray()
			} catch (error) {
				createLog(error, 'Bug fixes')
			}

		})
		.then(() => {
			msg += '📰	📰 Scraping done 📰\n'
			fs.mkdir(path.join(patchesDir, folder), { recursive: true }, (err) => {
				if (err) { throw err }
				fs.writeFile(path.join(patchesDir, folder, 'data.json'), JSON.stringify(SCRAP, null, 2), (err) => {
					if (err) { throw err }
					msg += `Writed data at path: ${path.join(patchesDir, folder, "data.json")}`
				})
			})
		})
		.catch(e => {
			if (e) createLog(e)
		})
		.finally(() => {
			callback([SCRAP, folder], msg)
		})
}
