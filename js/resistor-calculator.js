// resistor-calculator.js

// Color Code Definitions
const colorData = [
    { name: 'black',  label: 'Black',  digit: 0, mult: 1,          tol: null, temp: 250 },
    { name: 'brown',  label: 'Brown',  digit: 1, mult: 10,         tol: 1,    temp: 100 },
    { name: 'red',    label: 'Red',    digit: 2, mult: 100,        tol: 2,    temp: 50 },
    { name: 'orange', label: 'Orange', digit: 3, mult: 1000,       tol: 0.05, temp: 15 },
    { name: 'yellow', label: 'Yellow', digit: 4, mult: 10000,      tol: 0.02, temp: 25 },
    { name: 'green',  label: 'Green',  digit: 5, mult: 100000,     tol: 0.5,  temp: 20 },
    { name: 'blue',   label: 'Blue',   digit: 6, mult: 1000000,    tol: 0.25, temp: 10 },
    { name: 'violet', label: 'Violet', digit: 7, mult: 10000000,   tol: 0.1,  temp: 5 },
    { name: 'grey',   label: 'Grey',   digit: 8, mult: 100000000,  tol: 0.01, temp: 1 },
    { name: 'white',  label: 'White',  digit: 9, mult: 1000000000, tol: null, temp: null },
    { name: 'gold',   label: 'Gold',   digit: null, mult: 0.1,     tol: 5,    temp: null },
    { name: 'silver', label: 'Silver', digit: null, mult: 0.01,    tol: 10,   temp: null }
];

// Current State
let currentBands = 4;
let selectedColors = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    buildReferenceTable();
    updateBandUI();
});

function switchCalcType() {
    const type = document.getElementById('calc-type').value;
    if (type === 'color') {
        document.getElementById('section-color').classList.add('active');
        document.getElementById('section-smd').classList.remove('active');
    } else {
        document.getElementById('section-color').classList.remove('active');
        document.getElementById('section-smd').classList.add('active');
        calculateSMD();
    }
}

function buildReferenceTable() {
    const tbody = document.getElementById('reference-table-body');
    let html = '';
    colorData.forEach(c => {
        let multStr = c.mult !== null ? (c.mult >= 1000000 ? (c.mult/1000000)+'M' : c.mult >= 1000 ? (c.mult/1000)+'K' : c.mult) : '-';
        if (c.mult === 0.1) multStr = '0.1';
        if (c.mult === 0.01) multStr = '0.01';
        
        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.25rem;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <div class="color-box c-${c.name}"></div> ${c.label}
                    </div>
                </td>
                <td style="padding: 0.25rem;">${c.digit !== null ? c.digit : '-'}</td>
                <td style="padding: 0.25rem;">×${multStr}</td>
                <td style="padding: 0.25rem;">${c.tol !== null ? '±'+c.tol+'%' : '-'}</td>
                <td style="padding: 0.25rem;">${c.temp !== null ? c.temp+' ppm' : '-'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function updateBandUI() {
    currentBands = parseInt(document.getElementById('band-count').value);
    
    // Set default colors based on bands
    if (currentBands === 4) {
        selectedColors = ['brown', 'black', 'red', 'gold']; // 1k 5%
    } else if (currentBands === 5) {
        selectedColors = ['brown', 'black', 'black', 'brown', 'brown']; // 1k 1%
    } else if (currentBands === 6) {
        selectedColors = ['brown', 'black', 'black', 'brown', 'brown', 'red']; // 1k 1% 50ppm
    }

    const container = document.getElementById('band-controls');
    let html = '';

    for (let i = 0; i < currentBands; i++) {
        let title = '';
        let validColors = [];
        
        if (i < currentBands - 2 && !(currentBands === 4 && i === 2)) {
            // Digit bands
            title = `${i + 1}${getOrdinalIndicator(i + 1)} Band (Digit)`;
            validColors = colorData.filter(c => c.digit !== null);
        } else if (i === currentBands - 2 || (currentBands === 4 && i === 2)) {
            // Multiplier
            title = 'Multiplier Band';
            validColors = colorData.filter(c => c.mult !== null);
        } else if (i === currentBands - 1 && currentBands !== 6) {
            // Tolerance for 4/5
            title = 'Tolerance Band';
            validColors = colorData.filter(c => c.tol !== null);
        } else if (currentBands === 6 && i === 4) {
            // Tolerance for 6
            title = 'Tolerance Band';
            validColors = colorData.filter(c => c.tol !== null);
        } else if (currentBands === 6 && i === 5) {
            // Temp Coeff
            title = 'Temp. Coefficient';
            validColors = colorData.filter(c => c.temp !== null);
        }

        html += `
            <div class="band-selector">
                <h4>${title}</h4>
                <div class="color-radio-group">
        `;
        
        validColors.forEach(c => {
            const isChecked = selectedColors[i] === c.name ? 'checked' : '';
            html += `
                <label>
                    <input type="radio" name="band-${i}" value="${c.name}" ${isChecked} onchange="onColorChange(${i}, this.value)">
                    <div class="color-label">
                        <div class="color-box c-${c.name}"></div>
                        ${c.label}
                    </div>
                </label>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
    updateGraphicAndCalculate();
}

function getOrdinalIndicator(n) {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
}

function onColorChange(index, colorName) {
    selectedColors[index] = colorName;
    updateGraphicAndCalculate();
}

function formatResistance(value) {
    if (value >= 1000000000) return (value / 1000000000).toPrecision(3).replace(/\.0+$/, '') + ' GΩ';
    if (value >= 1000000) return (value / 1000000).toPrecision(3).replace(/\.0+$/, '') + ' MΩ';
    if (value >= 1000) return (value / 1000).toPrecision(3).replace(/\.0+$/, '') + ' kΩ';
    return value.toPrecision(3).replace(/\.0+$/, '') + ' Ω';
}

function updateGraphicAndCalculate() {
    const graphic = document.getElementById('resistor-graphic');
    const output = document.getElementById('color-output');
    
    // Change body color slightly based on bands
    if (currentBands >= 5) {
        graphic.classList.add('blue-body');
    } else {
        graphic.classList.remove('blue-body');
    }

    // Graphic
    let graphicHtml = '';
    selectedColors.forEach((colorName, idx) => {
        let cssColor = colorData.find(c => c.name === colorName).name;
        // Make the gap between bands look better
        let margin = '0';
        if (idx === currentBands - 1) {
            margin = '0 0 0 10%'; // gap before tolerance/last band
        }
        graphicHtml += `<div class="band-line c-${cssColor}" style="margin: ${margin}"></div>`;
    });
    graphic.innerHTML = graphicHtml;

    // Calculation
    let value = 0;
    let multiplier = 1;
    let tolerance = '';
    let temp = '';

    if (currentBands === 4) {
        let d1 = colorData.find(c => c.name === selectedColors[0]).digit;
        let d2 = colorData.find(c => c.name === selectedColors[1]).digit;
        multiplier = colorData.find(c => c.name === selectedColors[2]).mult;
        tolerance = colorData.find(c => c.name === selectedColors[3]).tol;
        value = ((d1 * 10) + d2) * multiplier;
    } else if (currentBands >= 5) {
        let d1 = colorData.find(c => c.name === selectedColors[0]).digit;
        let d2 = colorData.find(c => c.name === selectedColors[1]).digit;
        let d3 = colorData.find(c => c.name === selectedColors[2]).digit;
        multiplier = colorData.find(c => c.name === selectedColors[3]).mult;
        tolerance = colorData.find(c => c.name === selectedColors[4]).tol;
        value = ((d1 * 100) + (d2 * 10) + d3) * multiplier;
        
        if (currentBands === 6) {
            temp = colorData.find(c => c.name === selectedColors[5]).temp;
        }
    }

    let outStr = `${formatResistance(value)} ±${tolerance}%`;
    if (currentBands === 6) {
        outStr += ` <span style="font-size: 1rem; color: #aaa;">${temp}ppm/K</span>`;
    }
    
    output.innerHTML = outStr;
}

// SMD Code Logic
const eia96_values = [
    100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174,
    178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309,
    316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549,
    562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976
];

const eia96_multipliers = {
    'Z': 0.001,
    'Y': 0.01, 'R': 0.01,
    'X': 0.1,  'S': 0.1,
    'A': 1,
    'B': 10,   'H': 10,
    'C': 100,
    'D': 1000,
    'E': 10000,
    'F': 100000
};

function calculateSMD() {
    let code = document.getElementById('smd-code').value.trim().toUpperCase();
    const output = document.getElementById('smd-output');

    if (!code) {
        output.innerHTML = "---";
        return;
    }

    // 'R' indicates decimal point (e.g. 4R7 = 4.7)
    if (code.includes('R')) {
        let valStr = code.replace('R', '.');
        if (!isNaN(parseFloat(valStr))) {
            output.innerHTML = parseFloat(valStr) + " Ω";
            return;
        }
    }
    
    // 'M' indicates decimal point for milliohms (e.g. 5M0 = 0.005)
    if (code.includes('M')) {
         let valStr = code.replace('M', '.');
         if (!isNaN(parseFloat(valStr))) {
             output.innerHTML = (parseFloat(valStr) / 1000) + " Ω";
             return;
         }
    }

    // 0 jumper
    if (code === "0" || code === "000" || code === "0000") {
        output.innerHTML = "0 Ω (Jumper)";
        return;
    }

    // EIA-96 check (2 digits + 1 letter)
    if (code.length === 3 && isNaN(code[2])) {
        let numPart = parseInt(code.substring(0, 2));
        let letter = code[2];
        if (numPart >= 1 && numPart <= 96 && eia96_multipliers[letter] !== undefined) {
            let val = eia96_values[numPart - 1] * eia96_multipliers[letter];
            output.innerHTML = formatResistance(val) + " ±1%";
            return;
        }
    }

    // Standard 3-digit (e.g., 103 -> 10 * 10^3)
    if (code.length === 3 && !isNaN(code)) {
        let base = parseInt(code.substring(0, 2));
        let mult = Math.pow(10, parseInt(code[2]));
        output.innerHTML = formatResistance(base * mult) + " ±5%";
        return;
    }

    // Standard 4-digit (e.g., 1002 -> 100 * 10^2)
    if (code.length === 4 && !isNaN(code)) {
        let base = parseInt(code.substring(0, 3));
        let mult = Math.pow(10, parseInt(code[3]));
        output.innerHTML = formatResistance(base * mult) + " ±1%";
        return;
    }

    output.innerHTML = "Invalid Code";
}
