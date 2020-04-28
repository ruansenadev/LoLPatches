const vision = require('@google-cloud/vision')

// const imageFt = 'imagens/testVision.jpg'
const imageFt = 'imagens/inlineVision.jpg'
// const imageFt = 'imagens/noTitleVision.jpg'

const client = new vision.ImageAnnotatorClient()
const marginX = 16;
const marginY = 12;

function isInline(texts = [], titles = {}) {
    if (!Object.keys(titles).length) {
        return null
    }
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
                    txts.push([txt, d.boundingPoly.vertices[0].x - marginX])
                    return txts
                }
                // right X vertice + m
                txts.push([txt, d.boundingPoly.vertices[1].x + marginX])
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
            if (!title) {
                title = 'novidades'
                ft[title] = []
            }
            ft[title].push(txt)
        }
    })
    return ft
}
// compare Y axis of items them join if its near
function joinY(array, detections) {
    let phraseBox
    return array.reduce((txts, txt) => {
        let txtBox
        // word with a space followed by anything gets box
        if (!(/(\w.+\s).+/i.test(txt))) {
            txts.push(txt)
            return txts
        } else {
            let lastInclude = 0
            detections.forEach((d, i) => {
                // map txt box
                if (txt.includes(d.description)) {
                    let box = d.boundingPoly.vertices
                    // [{lx, ty}, {rx, ty}, {rx, by}, {lx,by}]
                    if (txt.startsWith(d.description)) {
                        txtBox = box;
                        lastInclude = i
                        return;
                    } else if(lastInclude && lastInclude == (i - 1)) {
                        // expands box X
                        txtBox = [txtBox[0], box[1], box[2], txtBox[3]]
                        lastInclude = i
                    }
                }
            })

            let joining = false
            let midPoint = phraseBox ? phraseBox[3].x + (Math.round((phraseBox[2].x - phraseBox[3].x) / 2)) : null
            // same Y column
            if (midPoint && (midPoint > txtBox[0].x && midPoint < txtBox[1].x)) {
                // margin Y matches concats
                if ((txtBox[1].y - phraseBox[2].y) <= marginY) {
                    txts[txts.length - 1] += ' ' + txt
                    joining = true
                }
            }
            // starts new sentence
            if (!joining) txts.push(txt)
            phraseBox = txtBox

            return txts
        }
    }, [])
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
    console.log(textArray)
    // concats Y near prhases
    textArray = joinY(textArray, detections)
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