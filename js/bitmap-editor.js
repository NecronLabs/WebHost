/**
 * Necronlabs Pixel-Grid Bitmap Editor
 * Inspired by and modeled after pkolt/bitmap_editor (https://github.com/pkolt/bitmap_editor)
 * Tailored for 1-bit OLED displays (SSD1306, SH1106, U8g2, Adafruit_GFX)
 */

class BitmapModel {
    constructor(width, height, data) {
        this.width = width || 128;
        this.height = height || 64;
        if (data && data.length === this.width * this.height) {
            this.data = new Uint8Array(data);
        } else {
            this.data = new Uint8Array(this.width * this.height);
        }
    }

    getPixel(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.data[y * this.width + x];
    }

    setPixel(x, y, value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.data[y * this.width + x] = value ? 1 : 0;
    }

    clear() {
        this.data.fill(0);
    }

    invert() {
        for (let i = 0; i < this.data.length; i++) {
            this.data[i] = this.data[i] ? 0 : 1;
        }
    }

    move(dx, dy) {
        const next = new Uint8Array(this.width * this.height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    next[ny * this.width + nx] = this.data[y * this.width + x];
                }
            }
        }
        this.data = next;
    }

    resize(newWidth, newHeight) {
        const next = new Uint8Array(newWidth * newHeight);
        const minW = Math.min(this.width, newWidth);
        const minH = Math.min(this.height, newHeight);
        for (let y = 0; y < minH; y++) {
            for (let x = 0; x < minW; x++) {
                next[y * newWidth + x] = this.data[y * this.width + x];
            }
        }
        this.width = newWidth;
        this.height = newHeight;
        this.data = next;
    }

    clone() {
        return new BitmapModel(this.width, this.height, this.data);
    }

    countActive() {
        let count = 0;
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i]) count++;
        }
        return count;
    }

    floodFill(startX, startY, fillVal) {
        const targetVal = this.getPixel(startX, startY);
        if (targetVal === fillVal) return;

        const queue = [[startX, startY]];
        const visited = new Uint8Array(this.width * this.height);

        while (queue.length > 0) {
            const [x, y] = queue.pop();
            const idx = y * this.width + x;
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
            if (visited[idx]) continue;
            visited[idx] = 1;

            if (this.getPixel(x, y) === targetVal) {
                this.setPixel(x, y, fillVal);
                if (x + 1 < this.width) queue.push([x + 1, y]);
                if (x - 1 >= 0) queue.push([x - 1, y]);
                if (y + 1 < this.height) queue.push([x, y + 1]);
                if (y - 1 >= 0) queue.push([x, y - 1]);
            }
        }
    }

    drawLine(x0, y0, x1, y1, val) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        let curX = x0;
        let curY = y0;
        while (true) {
            this.setPixel(curX, curY, val);
            if (curX === x1 && curY === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                curX += sx;
            }
            if (e2 < dx) {
                err += dx;
                curY += sy;
            }
        }
    }

    drawRect(x0, y0, x1, y1, val, filled = false) {
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (filled || x === minX || x === maxX || y === minY || y === maxY) {
                    this.setPixel(x, y, val);
                }
            }
        }
    }

    toCanvas() {
        const c = document.createElement('canvas');
        c.width = this.width;
        c.height = this.height;
        const ctx = c.getContext('2d');
        const imgData = ctx.createImageData(this.width, this.height);
        for (let i = 0; i < this.data.length; i++) {
            const idx = i * 4;
            const val = this.data[i] ? 0 : 255; // White background, black ink for standard image2cpp
            imgData.data[idx] = val;
            imgData.data[idx + 1] = val;
            imgData.data[idx + 2] = val;
            imgData.data[idx + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return c;
    }

    loadFromImageData(imgData, threshold = 128) {
        this.width = imgData.width;
        this.height = imgData.height;
        this.data = new Uint8Array(this.width * this.height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                const r = imgData.data[idx];
                const g = imgData.data[idx + 1];
                const b = imgData.data[idx + 2];
                const a = imgData.data[idx + 3];
                // Luminance: if dark or transparent, treat accordingly
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                // If pixel is dark or opaque and dark
                const isInk = (a > 50 && lum < threshold);
                this.setPixel(x, y, isInk ? 1 : 0);
            }
        }
    }

    toArduinoCode(identifier = 'epd_bitmap') {
        const safeName = identifier.replace(/[^a-zA-Z0-9_]/g, '_');
        const bytesPerRow = Math.ceil(this.width / 8);
        const totalBytes = bytesPerRow * this.height;
        let out = `// '${safeName}', ${this.width}x${this.height}px\n`;
        out += `const unsigned char ${safeName} [] PROGMEM = {\n`;

        for (let y = 0; y < this.height; y++) {
            out += '  ';
            for (let b = 0; b < bytesPerRow; b++) {
                let byteVal = 0;
                for (let bit = 0; bit < 8; bit++) {
                    const x = b * 8 + bit;
                    if (x < this.width && this.getPixel(x, y)) {
                        byteVal |= (1 << (7 - bit));
                    }
                }
                const hex = byteVal.toString(16).padStart(2, '0');
                out += `0x${hex}, `;
            }
            out += '\n';
        }
        out = out.replace(/,\s*\n$/, '\n');
        out += '};\n';
        return { code: out, totalBytes };
    }
}

class BitmapEditorUI {
    constructor() {
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.miniCanvas = null;
        this.miniCtx = null;
        this.model = new BitmapModel(128, 64);
        
        // Tool state
        this.currentTool = 'draw'; // 'draw', 'erase', 'bucket', 'line', 'rect'
        this.showGrid = true;
        this.showByteGrid = true;
        this.cellSize = 9; // Size of each pixel cell on grid
        this.theme = 'oled'; // 'oled' (cyan on dark) or 'bw' (black on white)

        // Mouse drawing state
        this.isMouseDown = false;
        this.dragStart = null;
        this.mousePos = { x: -1, y: -1 };

        // Undo / Redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        // Current image being edited (if loaded from existing list)
        this.editingName = 'drawing.png';

        this.init();
    }

    init() {
        this.modal = document.getElementById('paintModal');
        this.canvas = document.getElementById('drawingCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.miniCanvas = document.getElementById('miniOledPreview');
        if (this.miniCanvas) {
            this.miniCtx = this.miniCanvas.getContext('2d');
        }

        this.saveHistory();
        this.bindEvents();
        this.updateDimensionsUI();
        this.resizeGridCanvas();
        this.render();
    }

    bindEvents() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => {
            this.mousePos = { x: -1, y: -1 };
            this.updateStatus();
        });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (!this.modal || this.modal.style.display === 'none') return;
            // Prevent interference with input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) this.redo();
                else this.undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.move(0, -1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.move(0, 1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.move(-1, 0);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.move(1, 0);
            } else if (e.key.toLowerCase() === 'd') {
                this.setTool('draw');
            } else if (e.key.toLowerCase() === 'e') {
                this.setTool('erase');
            } else if (e.key.toLowerCase() === 'b') {
                this.setTool('bucket');
            } else if (e.key.toLowerCase() === 'i') {
                this.invert();
            }
        });

        // Tools buttons
        const toolDraw = document.getElementById('paintToolDraw');
        if (toolDraw) toolDraw.onclick = () => this.setTool('draw');

        const toolErase = document.getElementById('paintToolErase');
        if (toolErase) toolErase.onclick = () => this.setTool('erase');

        const toolBucket = document.getElementById('paintToolBucket');
        if (toolBucket) toolBucket.onclick = () => this.setTool('bucket');

        const toolLine = document.getElementById('paintToolLine');
        if (toolLine) toolLine.onclick = () => this.setTool('line');

        const toolRect = document.getElementById('paintToolRect');
        if (toolRect) toolRect.onclick = () => this.setTool('rect');

        const toolClear = document.getElementById('paintToolClear');
        if (toolClear) toolClear.onclick = () => this.clear();

        const toolInvert = document.getElementById('paintToolInvert');
        if (toolInvert) toolInvert.onclick = () => this.invert();

        const btnUndo = document.getElementById('paintUndoBtn');
        if (btnUndo) btnUndo.onclick = () => this.undo();

        const btnRedo = document.getElementById('paintRedoBtn');
        if (btnRedo) btnRedo.onclick = () => this.redo();

        // Move controls
        const btnUp = document.getElementById('paintMoveUp');
        if (btnUp) btnUp.onclick = () => this.move(0, -1);
        const btnDown = document.getElementById('paintMoveDown');
        if (btnDown) btnDown.onclick = () => this.move(0, 1);
        const btnLeft = document.getElementById('paintMoveLeft');
        if (btnLeft) btnLeft.onclick = () => this.move(-1, 0);
        const btnRight = document.getElementById('paintMoveRight');
        if (btnRight) btnRight.onclick = () => this.move(1, 0);

        // Zoom slider
        const zoomInput = document.getElementById('paintZoomSlider');
        if (zoomInput) {
            zoomInput.oninput = (e) => {
                this.cellSize = parseInt(e.target.value) || 9;
                const zoomValEl = document.getElementById('paintZoomValue');
                if (zoomValEl) zoomValEl.textContent = `${this.cellSize}px`;
                this.resizeGridCanvas();
                this.render();
            };
        }

        // Grid toggles
        const gridCheck = document.getElementById('paintToggleGrid');
        if (gridCheck) {
            gridCheck.onchange = (e) => {
                this.showGrid = e.target.checked;
                this.render();
            };
        }
        const byteGridCheck = document.getElementById('paintToggleByteGrid');
        if (byteGridCheck) {
            byteGridCheck.onchange = (e) => {
                this.showByteGrid = e.target.checked;
                this.render();
            };
        }

        // Theme toggle
        const themeSelect = document.getElementById('paintThemeSelect');
        if (themeSelect) {
            themeSelect.onchange = (e) => {
                this.theme = e.target.value;
                this.render();
            };
        }

        // Dimension inputs & Presets
        const wInput = document.getElementById('paintCanvasWidth');
        const hInput = document.getElementById('paintCanvasHeight');
        const btnApplySize = document.getElementById('paintApplySizeBtn');
        if (btnApplySize) {
            btnApplySize.onclick = () => {
                const w = parseInt(wInput.value) || 128;
                const h = parseInt(hInput.value) || 64;
                this.resizeDimensions(w, h);
            };
        }

        const presetSelect = document.getElementById('paintPresetSelect');
        if (presetSelect) {
            presetSelect.onchange = (e) => {
                if (!e.target.value) return;
                const [pw, ph] = e.target.value.split('x').map(Number);
                if (pw && ph) {
                    if (wInput) wInput.value = pw;
                    if (hInput) hInput.value = ph;
                    this.resizeDimensions(pw, ph);
                }
            };
        }

        // Send to Image2cpp Converter
        const sendBtn = document.getElementById('paintSendBtn');
        if (sendBtn) {
            sendBtn.onclick = () => {
                this.sendToConverter();
            };
        }

        // Direct C Export button
        const exportBtn = document.getElementById('paintExportBtn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                this.exportCCode();
            };
        }
    }

    setTool(tool) {
        this.currentTool = tool;
        const tools = ['draw', 'erase', 'bucket', 'line', 'rect'];
        tools.forEach((t) => {
            const btn = document.getElementById(`paintTool${t.charAt(0).toUpperCase() + t.slice(1)}`);
            if (btn) {
                if (t === tool) {
                    btn.classList.add('active-tool');
                    btn.style.background = 'var(--accent-red)';
                    btn.style.color = '#fff';
                } else {
                    btn.classList.remove('active-tool');
                    btn.style.background = '#1f1f23';
                    btn.style.color = 'var(--accent-red)';
                }
            }
        });
    }

    getGridCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const x = Math.floor(clientX / this.cellSize);
        const y = Math.floor(clientY / this.cellSize);
        return { x, y };
    }

    onMouseDown(e) {
        this.isMouseDown = true;
        const { x, y } = this.getGridCoords(e);
        if (x < 0 || x >= this.model.width || y < 0 || y >= this.model.height) return;

        // Right-click always erases
        const tool = e.button === 2 ? 'erase' : this.currentTool;
        this.dragStart = { x, y, tool };

        if (tool === 'draw') {
            this.model.setPixel(x, y, 1);
            this.render();
        } else if (tool === 'erase') {
            this.model.setPixel(x, y, 0);
            this.render();
        } else if (tool === 'bucket') {
            this.model.floodFill(x, y, e.button === 2 ? 0 : 1);
            this.saveHistory();
            this.render();
        }
    }

    onMouseMove(e) {
        const { x, y } = this.getGridCoords(e);
        this.mousePos = { x, y };
        this.updateStatus();

        if (!this.isMouseDown || !this.dragStart) return;
        if (x < 0 || x >= this.model.width || y < 0 || y >= this.model.height) return;

        const tool = this.dragStart.tool;
        if (tool === 'draw') {
            this.model.setPixel(x, y, 1);
            this.render();
        } else if (tool === 'erase') {
            this.model.setPixel(x, y, 0);
            this.render();
        } else if (tool === 'line' || tool === 'rect') {
            // Render with temporary shape preview
            this.render({ previewTool: tool, x0: this.dragStart.x, y0: this.dragStart.y, x1: x, y1: y });
        }
    }

    onMouseUp() {
        if (!this.isMouseDown) return;
        this.isMouseDown = false;

        if (this.dragStart) {
            const { x, y } = this.mousePos;
            const tool = this.dragStart.tool;
            if (tool === 'line' && x >= 0 && y >= 0) {
                this.model.drawLine(this.dragStart.x, this.dragStart.y, x, y, 1);
            } else if (tool === 'rect' && x >= 0 && y >= 0) {
                this.model.drawRect(this.dragStart.x, this.dragStart.y, x, y, 1, false);
            }
            this.saveHistory();
            this.dragStart = null;
            this.render();
        }
    }

    saveHistory() {
        // Truncate future redo states
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(this.model.clone());
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        this.updateHistoryButtons();
        this.updateStatus();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.model = this.history[this.historyIndex].clone();
            this.updateDimensionsUI();
            this.resizeGridCanvas();
            this.render();
            this.updateHistoryButtons();
            this.updateStatus();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.model = this.history[this.historyIndex].clone();
            this.updateDimensionsUI();
            this.resizeGridCanvas();
            this.render();
            this.updateHistoryButtons();
            this.updateStatus();
        }
    }

    updateHistoryButtons() {
        const btnUndo = document.getElementById('paintUndoBtn');
        const btnRedo = document.getElementById('paintRedoBtn');
        if (btnUndo) btnUndo.disabled = this.historyIndex <= 0;
        if (btnRedo) btnRedo.disabled = this.historyIndex >= this.history.length - 1;
    }

    clear() {
        this.model.clear();
        this.saveHistory();
        this.render();
    }

    invert() {
        this.model.invert();
        this.saveHistory();
        this.render();
    }

    move(dx, dy) {
        this.model.move(dx, dy);
        this.saveHistory();
        this.render();
    }

    resizeDimensions(w, h) {
        if (w === this.model.width && h === this.model.height) return;
        this.model.resize(w, h);
        this.saveHistory();
        this.updateDimensionsUI();
        this.resizeGridCanvas();
        this.render();
    }

    updateDimensionsUI() {
        const wInput = document.getElementById('paintCanvasWidth');
        const hInput = document.getElementById('paintCanvasHeight');
        if (wInput) wInput.value = this.model.width;
        if (hInput) hInput.value = this.model.height;
    }

    resizeGridCanvas() {
        this.canvas.width = this.model.width * this.cellSize;
        this.canvas.height = this.model.height * this.cellSize;
        this.canvas.style.width = `${this.canvas.width}px`;
        this.canvas.style.height = `${this.canvas.height}px`;

        if (this.miniCanvas) {
            this.miniCanvas.width = this.model.width;
            this.miniCanvas.height = this.model.height;
        }
    }

    render(preview = null) {
        if (!this.ctx) return;
        const w = this.model.width;
        const h = this.model.height;
        const cs = this.cellSize;

        // Background
        const isOled = this.theme === 'oled';
        const bgColor = isOled ? '#0a0a0d' : '#ffffff';
        const pixelOnColor = isOled ? '#00f0ff' : '#000000';
        const pixelOffColor = isOled ? '#121217' : '#f5f5f7';
        const gridColor = isOled ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)';
        const byteGridColor = isOled ? 'rgba(0, 240, 255, 0.35)' : 'rgba(201, 24, 43, 0.4)';

        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw pixel cells
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const on = this.model.getPixel(x, y);
                this.ctx.fillStyle = on ? pixelOnColor : pixelOffColor;
                this.ctx.fillRect(x * cs + 1, y * cs + 1, cs - 1, cs - 1);
            }
        }

        // Draw preview shape if active
        if (preview) {
            const previewModel = this.model.clone();
            if (preview.previewTool === 'line') {
                previewModel.drawLine(preview.x0, preview.y0, preview.x1, preview.y1, 1);
            } else if (preview.previewTool === 'rect') {
                previewModel.drawRect(preview.x0, preview.y0, preview.x1, preview.y1, 1, false);
            }
            this.ctx.fillStyle = isOled ? '#ffbd2e' : '#c9182b';
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (previewModel.getPixel(x, y) && !this.model.getPixel(x, y)) {
                        this.ctx.fillRect(x * cs + 1, y * cs + 1, cs - 1, cs - 1);
                    }
                }
            }
        }

        // Draw 1px pixel border grid
        if (this.showGrid && cs >= 4) {
            this.ctx.strokeStyle = gridColor;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let x = 0; x <= w; x++) {
                this.ctx.moveTo(x * cs + 0.5, 0);
                this.ctx.lineTo(x * cs + 0.5, h * cs);
            }
            for (let y = 0; y <= h; y++) {
                this.ctx.moveTo(0, y * cs + 0.5);
                this.ctx.lineTo(w * cs, y * cs + 0.5);
            }
            this.ctx.stroke();
        }

        // Draw 8-pixel byte boundary lines (Modeled after pkolt/bitmap_editor)
        if (this.showByteGrid) {
            this.ctx.strokeStyle = byteGridColor;
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            for (let x = 8; x < w; x += 8) {
                this.ctx.moveTo(x * cs + 0.5, 0);
                this.ctx.lineTo(x * cs + 0.5, h * cs);
            }
            for (let y = 8; y < h; y += 8) {
                this.ctx.moveTo(0, y * cs + 0.5);
                this.ctx.lineTo(w * cs, y * cs + 0.5);
            }
            this.ctx.stroke();
        }

        // Render 1:1 Mini OLED Preview
        if (this.miniCtx) {
            this.miniCtx.fillStyle = isOled ? '#000' : '#fff';
            this.miniCtx.fillRect(0, 0, w, h);
            this.miniCtx.fillStyle = isOled ? '#00f0ff' : '#000';
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (this.model.getPixel(x, y)) {
                        this.miniCtx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }

        this.updateStatus();
    }

    updateStatus() {
        const statusEl = document.getElementById('paintStatusInfo');
        if (!statusEl) return;
        const totalBytes = Math.ceil(this.model.width / 8) * this.model.height;
        const activeCount = this.model.countActive();
        const coordText = (this.mousePos.x >= 0 && this.mousePos.x < this.model.width && this.mousePos.y >= 0 && this.mousePos.y < this.model.height)
            ? `X: ${this.mousePos.x}, Y: ${this.mousePos.y}`
            : `X: --, Y: --`;
        statusEl.textContent = `${this.model.width}x${this.model.height} px | ${coordText} | Active: ${activeCount} px | Memory: ${totalBytes} bytes`;
    }

    sendToConverter() {
        const c = this.model.toCanvas();
        const dataUrl = c.toDataURL('image/png');
        if (window.addImageFromDataUrl) {
            window.addImageFromDataUrl(dataUrl, this.editingName, this.model.width, this.model.height);
        }
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    exportCCode() {
        const { code, totalBytes } = this.model.toArduinoCode(this.editingName.split('.')[0] || 'epd_bitmap');
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('paintExportBtn');
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = 'Copied to Clipboard!';
                setTimeout(() => { btn.textContent = orig; }, 2000);
            }
        });
    }

    loadFromCanvas(canvas, name) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.model = new BitmapModel(canvas.width, canvas.height);
        this.model.loadFromImageData(imgData);
        this.editingName = name || 'edited_bitmap.png';
        this.saveHistory();
        this.updateDimensionsUI();
        this.resizeGridCanvas();
        this.render();
        if (this.modal) {
            this.modal.style.display = 'flex';
        }
    }
}

// Global modal instance
window.addEventListener('DOMContentLoaded', () => {
    window.BitmapEditorModal = new BitmapEditorUI();
});
