'use strict';

const N = 81;

// [colour, shape, shading, countMinus1]
function cardToArray (n) {
    const result = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        result[i] = n % 3;
        n -= result[i];
        n /= 3;
    }
    return result;
}

function arrayToCard (a) {
    return a[0] + 3 * a[1] + 9 * a[2] + 27 * a[3];
}

function complete(a, b) {
    let result = 0;
    let multiplier = 1;
    for (let i = 0; i < 4; i++) {
        let ax = a % 3;
        let bx = b % 3;
        result += ((6 - ax - bx) % 3) * multiplier;
        multiplier *= 3;
        a = (a - ax) / 3;
        b = (b - bx) / 3;
    }
    return result;
}

// Pre-compute the completion of all pairs.
const completions = Array(N).fill(0).map((_, i) =>
    Array(N).fill(0).map((_, j) => complete(i, j)));

const allCards = Array(N).fill(0).map((_, i) => i);

function pickRandom(s) {
    if (s.length === 0) {
        throw new Error('Cannot pick from empty array');
    }
    const i = Math.floor(Math.random() * s.length);
    const result = s[i];
    s.splice(i, 1);
    return result;
}

function countSets(cards) {
    const cardSet = new Set(cards);
    if (cardSet.size !== cards.length) {
        throw new Error('Duplicate cards in set');
    }
    let count = 0;
    for (let i = 0; i < cards.length - 1; i++) {
        for (let j = i + 1; j < cards.length; j++) {
            const k = completions[cards[i]][cards[j]];
            if (cardSet.has(k)) {
                count++;
            }
        }
    }
    return count / 3;
}

function randomTwelveGame () {
    let iterations = 0;
    while (true) {
        iterations++;
        const deck = [...allCards];
        const selection = [];
        while (selection.length < 12) {
            selection.push(pickRandom(deck));
            if (countSets(selection) > 6) {
                break;
            }
        }
        if (countSets(selection) === 6) {
            return selection;
        }
    }
}

// normalized to a 100×50 box (so scaleX = w/100, scaleY = h/50)
const shapePaths = [
    // diamond
    'M50,0   L100,25  L50,50   L0,25   Z',
    // pill
    'M25,0 L75,0 A25,25 0 0 1 75,50 L25,50 A25,25 0 0 1 25,0 Z',
    // squiggle
    `M 17.1283,3.7498035
C 30.090699,0.17911898 39.724489,4.9782516 48.102816,7.7379073 56.481143,10.497563 69.327048,13.061292 79.61011,6.5244546 89.893173,-0.01238256 90.043588,-0.66457041 93.909469,0.42800516 101.25245,2.503288 105.94596,32.002207 83.704341,41.151016 75.021548,44.722577 61.032928,46.056944 51.040935,42.383011 41.048941,38.709077 34.18853,35.900849 24.97381,41.373385 15.75909,46.845918 11.435618,54.270589 5.2727647,46.926235 -3.4115138,36.577068 -2.6093754,9.1868235 17.1283,3.7498035
Z`,
];

const colours = ['red', 'green', 'purple'];

/**
 * Draw one Set-card symbol.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x     top-left x
 * @param {number} y     top-left y
 * @param {number} w     width of one symbol
 * @param {number} h     height of one symbol
 * @param {number} shape
 * @param {number} colour
 * @param {number} shading
 */
function drawSetSymbol(ctx, x, y, w, h, shape, colour, shading) {
    const path = new Path2D(shapePaths[shape]);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(w / 100, h / 50);
    ctx.lineWidth = 3;
    ctx.strokeStyle = colours[colour];
    ctx.fillStyle = colours[colour];

    if (shading === 0) {
        ctx.fill(path);
    }
    else if (shading === 1) {
        ctx.stroke(path);
    }
    else if (shading === 2) {
        // 1) clip to the shape
        ctx.save();
        ctx.clip(path);
        const spacing = 5;     // adjust density
        ctx.lineWidth = 1;
        for (let i = -100; i < 200; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(i, -100);
            ctx.lineTo(i, 100);
            ctx.stroke();
        }
        // 3) draw an outline on top
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(x, y);
        ctx.scale(w / 100, h / 50);
        ctx.restore();
        ctx.stroke(path);
    }

    ctx.restore();
}

/**
 * Draws an entire Set‐card (up to 3 symbols) into a <canvas>.
 * @param {HTMLCanvasElement} canvas
 * @param {number} card
 */
function drawSetCard(canvas, card) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const [colour, shape, shading, countMinus1] = cardToArray(card);
    const count = countMinus1 + 1;

    // clear previous
    ctx.clearRect(0, 0, W, H);

    // symbol sizing: 70% of card width, maintaining 2∶1 ratio
    const symbolW = W * 0.70;
    const symbolH = symbolW * 0.5;
    const x = (W - symbolW) / 2;

    // Space of 6% between symbols vertically.
    const vSeparation = 0.06 * H;
    const combinedSymbolH = count * symbolH + (count - 1) * vSeparation;
    const firstSymbolY = (H - combinedSymbolH) / 2 + symbolH / 2;

    for (let i = 0; i < count; i++) {
        const yCenter = firstSymbolY + i * (symbolH + vSeparation);
        const y = yCenter - symbolH / 2;
        drawSetSymbol(ctx, x, y, symbolW, symbolH, shape, colour, shading);
    }
}

const selectedWrappers = [];
const foundSets = [];

/**
 * Handles a click on one card wrapper.
 * @param {HTMLDivElement} wrapper
 * @param {HTMLDivElement} found
 */
function onCardClick(wrapper, found) {
    // toggle off
    if (wrapper.classList.contains('selected')) {
        wrapper.classList.remove('selected');
        const i = selectedWrappers.indexOf(wrapper);
        selectedWrappers.splice(i, 1);
        return;
    }

    // only allow up to 3
    if (selectedWrappers.length >= 3) return;

    // select
    wrapper.classList.add('selected');
    selectedWrappers.push(wrapper);

    // if we have three, check!
    if (selectedWrappers.length === 3) {
        // pull out the card numbers
        const specs = selectedWrappers.map(w => parseInt(w.dataset.card, 10));
        const isSet = countSets(specs) === 1;

        if (!isSet) {
            alert('❌ Not a Set');
        } else {
            const specSet = new Set(specs);

            if (foundSets.some(s => specs.every(card => s.has(card)))) {
                alert('Already found!');
            } else {
                foundSets.push(specSet);
                // Create a div with the found set and display it.
                const newFoundDiv = document.createElement('div');
                specs.forEach(card => {
                    const cardWrapper = document.createElement('div');
                    cardWrapper.className = 'card';
                    const cvs = document.createElement('canvas');
                    cvs.width = 200;
                    cvs.height = 300;
                    cardWrapper.appendChild(cvs);
                    newFoundDiv.appendChild(cardWrapper);
                    drawSetCard(cvs, card);
                });
                found.appendChild(newFoundDiv);

                document.getElementById('found-count').textContent =
                    foundSets.length === 1 ? 'Found 1 set' :
                    `Found ${foundSets.length} sets`;
            }
        }

        // clear selection for next round
        selectedWrappers.forEach(w => w.classList.remove('selected'));
        selectedWrappers.length = 0;
    }
}

/**
 * Draws 12 cards, tags them, and wires up click selection.
 * @param {HTMLElement} board
 * @param {HTMLElement} found
 * @param {number[]} cards
 */
function loadGame(board, found, cards) {
    board.innerHTML = '';         // clear any old cards
    selectedWrappers.length = 0;  // reset selection

    cards.forEach(spec => {
        const wrapper = document.createElement('div');
        wrapper.className = 'card';
        wrapper.dataset.card = spec;       // store which card it is
        wrapper.addEventListener('click', () => onCardClick(wrapper, found));

        const cvs = document.createElement('canvas');
        cvs.width = 200;
        cvs.height = 300;

        wrapper.appendChild(cvs);
        board.appendChild(wrapper);

        drawSetCard(cvs, spec);
    });
}
