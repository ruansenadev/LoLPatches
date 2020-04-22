const vision = require('@google-cloud/vision')

const imageFt = 'imagens/testVision.jpg'
const imageFt = 'imagens/inlineVision.jpg'

const client = new vision.ImageAnnotatorClient()
const margin = 16;

function isInline(texts = [], titles = {}) {
    let iTitles = []
    let lastTitle
    for (let i = 0; i < texts.length; i++) {
        if (texts[i].toLowerCase() in titles) {
            if (lastTitle === (i - 1)) {
                iTitles.push(texts[lastTitle], texts[i])
            } else if (iTitles.includes(texts[lastTitle])) {
                iTitles.push(texts[i])
                break
            }
            lastTitle = i
        }
    }
    return iTitles.length ? iTitles : null
}
function formatInline(textArray, iTitles, detections) {
    // group interval values
    let index = textArray.indexOf(iTitles[0])
    let interval = textArray.splice(index, iTitles[2] ? textArray.indexOf(iTitles[2]) : textArray.length - 1)
    interval = interval.reduce((txts, txt) => {
        for (let d of detections) {
            if (txt.includes(d.description)) {
                if (iTitles.includes(txt)) {
                    // left X vertice - m
                    txts.push([txt, d.boundingPoly.vertices[0].x - margin])
                    return txts
                }
                // right X vertice + m
                txts.push([txt, d.boundingPoly.vertices[1].x + margin])
                return txts
            }
        }
    }, []).sort((t1, t2) => t1[1] > t2[1] ? 1 : t1[1] == t2[1] ? 0 : -1).map(t => t[0])
    return textArray.slice(0, index).concat(interval).concat(textArray.slice(index))
}
function mapFeatured(array, ft) {
    let title = ''
    array.forEach(txt => {
        if (/[A-Z]{2,}/.test(txt)) {
            title = txt.toLowerCase()
        } else {
            ft[title].push(txt)
        }
    })
    return ft
}

async function extractData(img) {
    const [result] = await client.textDetection(img)
    const detections = result.textAnnotations
    let textArray = detections[0].description.trim().split('\n')
    // sanitize texts
    textArray.forEach((txt, i) => {
        if (/nota|atualização|\d+.\d*[a-z]*/ig.test(txt)) {
            textArray.splice(i, 1)
        }
    })
    // list titles
    let featured = textArray.filter((txt) => {
        return /[A-Z]{2,}/.test(txt)
    }).reduce((tts, tt) => {
        tts[tt.toLowerCase()] = []
        return tts
    }, {})
    // filter X axis titles
    let inlineTitles = isInline(textArray, featured)
    if (inlineTitles) {
        textArray = formatInline(textArray, inlineTitles, detections)
    }

    return mapFeatured(textArray, featured)
}

extractData(imageFt).then(console.log).catch(console.error)