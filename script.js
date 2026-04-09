const pixels = new Map();
let selectedTool = null;
let showTutorial = false;

const Input = {
    activeTarget: null, // "artboard" | "colorpicker"
    hoverTarget: null,
    pointerId: null,
    isPointerDown: false,
};

const ArtBoard = {
    dom: document.querySelector("canvas.canvas"),
    ctx: document.querySelector("canvas.canvas").getContext("2d"),
    pixelSize: 20,
    lastMousePos: { x: null, y: null },
    camera: {
        x: 0,
        y: 0,
        scale: 1,
    },

    init() {
        // Canvas setting
        this.dom.width = 600;
        this.dom.height = 500;
        this.dom.tabIndex = 1;

        this.dom.addEventListener("pointerdown", (e) => this.pointerDown(e));
        this.dom.addEventListener("wheel", (e) => this.wheel(e));
        this.dom.addEventListener("keydown", (e) => this.keyDown(e));
    },

    keyDown(e) {
        if (!(e.ctrlKey && e.shiftKey && e.key === "I")) e.preventDefault();

        const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        const numberKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

        if (numberKeys.includes(e.key)) selectedTool.numberKeyDown?.(e.key);
        else if (arrowKeys.includes(e.key)) selectedTool.arrowKeyDown?.(e.key);
        console.log(e.key);
    },
    wheel(e) {
        e.preventDefault();
        const zoomSensitivity = 0.02;
        const delta = e.deltaY < 0 ? 1 + zoomSensitivity : 1 - zoomSensitivity;

        const { x, y } = getMousePos(e, this.dom);
        this.camera.scale *= delta;
        this.camera.x = x - (x - this.camera.x) * delta;
        this.camera.y = y - (y - this.camera.y) * delta;
    },

    pointerDown(e) {
        const { x, y } = getMousePos(e, this.dom);

        Input.activeTarget = "artboard";
        Input.pointerId = e.pointerId;
        Input.isPointerDown = true;

        this.dom.setPointerCapture(e.pointerId);

        if (!e.ctrlKey) {
            const coords = this.getGridCoords(x, y);
            selectedTool.pointerDown(coords.x, coords.y);
        }
    },
    pointerMove(e) {
        const { x, y } = getMousePos(e, this.dom);

        if (this.lastMousePos.x === null) {
            this.lastMousePos = { x, y };
        }

        const dx = x - this.lastMousePos.x;
        const dy = y - this.lastMousePos.y;

        if (e.ctrlKey) {
            this.camera.x += dx;
            this.camera.y += dy;
            this.dom.style.cursor = "grabbing";
        } else {
            this.dom.style.cursor = "default";
        }

        this.lastMousePos = { x, y };
    },
    pointerUp() {
        this.lastMousePos = { x: null, y: null };
    },

    isPointInside(x, y) {
        return x >= 0 && x <= this.dom.width && y >= 0 && y <= this.dom.height;
    },

    // Convert element coords into pixel coords
    getGridCoords(relX, relY) {
        //const rect = this.dom.getBoundingClientRect();
        //const mouseX = clientX - rect.left;
        //const mouseY = clientY - rect.top;

        const worldX = (relX - this.camera.x) / this.camera.scale;
        const worldY = (relY - this.camera.y) / this.camera.scale;

        return {
            x: Math.floor(worldX / this.pixelSize),
            y: Math.floor(worldY / this.pixelSize),
        };
    },

    paintPixel(x, y, color) {
        const key = `${x},${y}`;
        pixels.set(key, rgbArrayToString(color));
    },

    // Centraliza o desenho no canvas
    draw() {
        const { ctx, dom, camera, pixelSize } = this;

        // Reset da transformação para limpar a tela inteira
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, dom.width, dom.height);

        // Aplica Transformações de Câmera (Pan e Zoom)
        ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);

        // Cálculo da área visível para otimização do Grid
        const startX = Math.floor(-camera.x / (camera.scale * pixelSize));
        const startY = Math.floor(-camera.y / (camera.scale * pixelSize));
        const endX = startX + Math.ceil(dom.width / (camera.scale * pixelSize));
        const endY =
            startY + Math.ceil(dom.height / (camera.scale * pixelSize));

        // Draw Grid

        for (let x = startX; x <= endX; x++) {
            if (x % 100 === 0) {
                // Helper lines on each 100 pixels
                ctx.lineWidth = 2 / camera.scale;
                ctx.strokeStyle = "#555";
            } else if (x % 10 === 0) {
                // Helper lines on each 10 pixels
                ctx.lineWidth = 1 / camera.scale;
                ctx.strokeStyle = "#888";
            } else {
                ctx.strokeStyle = "#ccc";
                ctx.lineWidth = 0.5 / camera.scale;
            }

            ctx.beginPath();
            ctx.moveTo(x * pixelSize, startY * pixelSize);
            ctx.lineTo(x * pixelSize, endY * pixelSize);
            ctx.stroke();
        }
        for (let y = startY; y <= endY; y++) {
            if (y % 100 === 0) {
                // Helper lines on each 100 pixels
                ctx.lineWidth = 2 / camera.scale;
                ctx.strokeStyle = "#555";
            } else if (y % 10 === 0) {
                // Helper lines on each 10 pixel
                ctx.lineWidth = 1 / camera.scale;
                ctx.strokeStyle = "#888";
            } else {
                ctx.strokeStyle = "#ccc";
                ctx.lineWidth = 0.5 / camera.scale;
            }
            ctx.beginPath();
            ctx.moveTo(startX * pixelSize, y * pixelSize);
            ctx.lineTo(endX * pixelSize, y * pixelSize);
            ctx.stroke();
        }

        // Desenha os pixels do Map global
        pixels.forEach((color, key) => {
            const [px, py] = key.split(",").map(Number);
            ctx.fillStyle = color;
            ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
        });

        // Desenha o feedback da ferramenta selecionada
        selectedTool?.draw?.(ctx);
    },
};
const ColorPicker = {
    dom: document.querySelector("canvas.color-picker"),
    ctx: document
        .querySelector("canvas.color-picker")
        .getContext("2d", { willReadFrequently: true }),
    selectedColor: null,

    init() {
        this.dom.addEventListener("pointerdown", this.pointerDown.bind(this));
        this.pin.placeAt(50, 50)
    },

    pin: {
        x: null,
        y: null,
        radius: 10,

        draw() {
            if (this.x === null || this.y === null) return;

            const { dom, ctx } = ColorPicker;

            ctx.save();

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

            // Convert color array to string
            const r = ColorPicker.selectedColor[0];
            const g = ColorPicker.selectedColor[1];
            const b = ColorPicker.selectedColor[2];

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();

            // Outline
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Opcional: Adicionar um segundo outline preto bem fininho por fora
            // garante visibilidade total se o fundo for branco puro
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 0.5;
            ctx.stroke();

            ctx.restore();
            console.log("Draw");
        },

        placeAt(rawX, rawY) {
            const { width, height } = ColorPicker.triangle;

            let x = Math.max(0, Math.min(rawX, width));
            let y = Math.max(0, Math.min(rawY, height));

            // Topo (Cor Pura)
            const ax = width / 2;
            const ay = 0;
            // Esquerda (Preto)
            const bx = 0;
            const by = height;
            // Direita (Branco)
            const cx = width;
            const cy = height;

            const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
            let w1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denom;
            let w2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denom;
            let w3 = 1 - w1 - w2;
            const pixel = ColorPicker.ctx.getImageData(x, y, 1, 1).data;

            if (w1 < 0 || w2 < 0 || w3 < 0) {
                w1 = Math.max(0, Math.min(1, w1));
                w2 = Math.max(0, Math.min(1, w2));
                w3 = Math.max(0, Math.min(1, w3));

                // Normalizar para que a soma seja 1
                const sum = w1 + w2 + w3;
                w1 /= sum;
                w2 /= sum;
                w3 /= sum;

                // Recalcular X e Y baseados nos pesos limitados
                x = w1 * ax + w2 * bx + w3 * cx;
                y = w1 * ay + w2 * by + w3 * cy;
            }

            // Set color pin positions
            this.x = x;
            this.y = y;

            // Get color form triangle cache
            //const tempCtx = ColorPicker.triangle.cache.getContext("2d")
            //selectedColor = tempCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data()
            ColorPicker.selectedColor = ColorPicker.ctx.getImageData(x, y, 1, 1).data;
        },
    },
    triangle: {
        width: 200,
        height: 200,
        cache: null, // save img data
        lastHue: null,
        isHovering: false,
        isPointInside(x, y) {
            const { width, height } = this;

            // Vertices (mesmos usados no render)
            const ax = width / 2,
                ay = 0;
            const bx = 0,
                by = height;
            const cx = width,
                cy = height;

            const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
            const w1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denom;
            const w2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denom;
            const w3 = 1 - w1 - w2;

            // Se todos os pesos forem positivos, o ponto está dentro
            return w1 >= 0 && w2 >= 0 && w3 >= 0;
        },

        render(hue) {
            if (this.lastHue === hue) return;

            this.lastHue = hue;
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const tempCtx = tempCanvas.getContext("2d");

            const img = tempCtx.createImageData(this.width, this.height);
            const pureColor = hslToRgb([hue, 100, 50]);

            // Vertices
            const ax = this.width / 2,
                ay = 0;
            const bx = 0,
                by = this.height;
            const cx = this.width,
                cy = this.height;
            const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);

            const white = [255, 255, 255];
            const black = [0, 0, 0];

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const i = (y * this.width + x) * 4;

                    const w1 =
                        ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denom;
                    const w2 =
                        ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denom;
                    const w3 = 1 - w1 - w2;

                    if (w1 >= 0 && w2 >= 0 && w3 >= 0) {
                        img.data[i] =
                            w1 * pureColor[0] + w2 * black[0] + w3 * white[0];
                        img.data[i + 1] =
                            w1 * pureColor[1] + w2 * black[1] + w3 * white[1];
                        img.data[i + 2] =
                            w1 * pureColor[2] + w2 * black[2] + w3 * white[2];
                        img.data[i + 3] = 255;
                    } else {
                        img.data[i + 3] = 0;
                    }
                }
            }

            tempCtx.putImageData(img, 0, 0);
            this.cache = tempCanvas;
        },

        draw() {
            if (!this.cache) return;

            const ctx = ColorPicker.ctx;
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.drawImage(this.cache, 0, 0);
            console.log("Draw trigangel");
        },
    },

    pointerDown(e) {
        Input.activeTarget = "colorpicker";
        Input.pointerId = e.pointerId;
        Input.isPointerDown = true;

        this.dom.setPointerCapture(e.pointerId);

        const pos = getMousePos(e, this.dom);
        this.pin.placeAt(pos.x, pos.y);
        this.triangle.draw();
        this.pin.draw();
    },
    pointerMove(e) {
        const { x, y } = getMousePos(e, this.dom);

        this.triangle.draw();
        this.pin.placeAt(x, y);
        this.pin.draw();
    },
    pointerUp() {},
};

// TOOLS OBJECTS
const Move = {};
const TypePolyline = {
    lineDirection: null,
    curveDirection: null,
    posX: null,
    posY: null,
    isLineStarted: false,
    isBlinking: false,
    __blinkColor: null,
    __blinkInterval: null,
    __arrowAngle: null,
    __arrowColor: null,

    getState() {
        const keys = [
            "posX",
            "posY",
            "lineDirection",
            "curveDirection",
            "isLineStarted",
            "__arrowAngle",
            "__arrowColor",
        ];

        return Object.fromEntries(keys.map((key) => [key, this[key]]));
    },
    applyState(state) {
        Object.assign(this, state);
    },

    pointerDown(posX, posY) {
        this.posX = posX;
        this.posY = posY;
        this.lineDirection = null;
        this.curveDirection = null;
        this.isLineStarted = false;
        this.__arrowAngle = null;

        this.__activateBlink(posX, posY, ColorPicker.selectedColor);

        // Controle do Popup
        if (showTutorial) {
            applyTemporaryClass(".pop-up.set-line-direction", "show", 3000);
        }
    },

    reset(key) {
        this.lineDirection = null;
        this.curveDirection = null;
        this.__arrowAngle = null;
        this.__arrowColor = "red";
        this.arrowKeyDown(key);
    },

    arrowKeyDown(key) {
        if (this.posX === null || this.posY === null) return;

        const direction = key.toLowerCase().replace("arrow", "");

        // Fase 1: Definir a direção da linha
        if (!this.lineDirection) {
            this.lineDirection = direction;

            if (showTutorial)
                applyTemporaryClass(".pop-up.type-number", "show", 3000);

            const baseAngles = { right: 0, down: 90, left: 180, up: 270 };
            this.__arrowAngle = baseAngles[direction];
            this.__arrowColor = "blue";
            return;
        }

        // Fase 2: Definir a direção do passo (combinação)
        if (!this.curveDirection) {
            this.curveDirection = direction;

            const combo = `${this.lineDirection}-${this.curveDirection}`;
            const combinations1 = [
                "right-down",
                "down-left",
                "left-up",
                "up-right",
            ];
            const combinations2 = [
                "right-up",
                "up-left",
                "left-down",
                "down-right",
            ];

            if (combinations1.includes(combo)) {
                this.__arrowAngle += 14;
                this.__arrowColor = "blue";
            } else if (combinations2.includes(combo)) {
                this.__arrowAngle -= 14;
                this.__arrowColor = "blue";
            } else if (this.lineDirection === this.curveDirection) {
                console.warn(
                    "Não é possível usar a mesma direção para linha e passo.",
                );
            } else {
                // opposite directions
                this.reset(key);
            }

            return;
        }

        // Fase 3: reset
        this.reset(key);
    },

    numberKeyDown(key) {
        if (!this.lineDirection) return;
        if (this.__arrowColor === "red") return;

        History.saveState();

        // Utility function
        function moveTo(self, dir) {
            if (dir === "right") self.posX++;
            else if (dir === "down") self.posY++;
            else if (dir === "left") self.posX--;
            else if (dir === "up") self.posY--;
        }

        // user can type "0" for 10
        const pixelsToPaint = key === "0" ? 10 : parseInt(key);
        let paintedPixels = 0;

        if (this.isLineStarted) {
            moveTo(this, this.curveDirection);
            moveTo(this, this.lineDirection);
        } else {
            this.isLineStarted = true;
            this.__arrowColor = "orange";
        }

        // Paint sub-line
        while (true) {
            ArtBoard.paintPixel(this.posX, this.posY, ColorPicker.selectedColor);
            paintedPixels++;

            if (paintedPixels < pixelsToPaint) {
                moveTo(this, this.lineDirection);
            } else {
                break;
            }
        }

        if (!this.curveDirection) {
            // Show popup
            if (showTutorial)
                applyTemporaryClass(
                    ".pop-up.set-curve-direction",
                    "show",
                    3000,
                );

            return;
        }
    },

    draw(ctx) {
        // draw arrow
        if (this.__arrowAngle !== null && this.posX !== null) {
            this.__drawArrow(ctx, this.__arrowAngle);
        }

        // draw blink
        if (this.isBlinking) {
            ctx.globalAlpha = this.isLineStarted ? 0.5 : 1;
            ctx.fillStyle = this.__blinkColor;
            ctx.fillRect(
                this.posX * ArtBoard.pixelSize,
                this.posY * ArtBoard.pixelSize,
                ArtBoard.pixelSize,
                ArtBoard.pixelSize,
            );
            ctx.globalAlpha = 1;
        }
    },

    __drawArrow(ctx, angle) {
        const rad = angle * (Math.PI / 180);
        const { pixelSize } = ArtBoard;

        ctx.save();
        // Translada para o centro do pixel selecionado
        ctx.translate(
            this.posX * pixelSize + pixelSize / 2,
            this.posY * pixelSize + pixelSize / 2,
        );
        ctx.rotate(rad);

        ctx.strokeStyle = this.__arrowColor;
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Desenha o corpo da seta
        ctx.moveTo(pixelSize / 2, 0);
        ctx.lineTo(3 * pixelSize, 0);

        // Desenha a ponta da seta
        ctx.lineTo(2.5 * pixelSize, -0.25 * pixelSize);
        ctx.moveTo(3 * pixelSize, 0);
        ctx.lineTo(2.5 * pixelSize, 0.25 * pixelSize);

        ctx.stroke();
        ctx.restore();
    },

    __activateBlink(posX, posY, color) {
        if (this.__blinkInterval) clearInterval(this.__blinkInterval);

        this.isBlinking = true;
        this.__blinkColor = rgbArrayToString(color);

        const constrastColor = "white";
        let isContrastColor = false;

        this.__blinkInterval = setInterval(() => {
            this.__blinkColor = isContrastColor
                ? constrastColor
                : rgbArrayToString(ColorPicker.selectedColor);
            isContrastColor = !isContrastColor;
        }, 500);
    },
};
const Pen = {
    lastX: null,
    lastY: null,

    pointerDown(x, y) {
        History.saveState();

        this.lastX = x;
        this.lastY = y;

        ArtBoard.paintPixel(x, y, ColorPicker.selectedColor);
    },
    pointerMove(e) {
        if (this.lastX === null) return;

        let { x, y } = getMousePos(e, ArtBoard.dom);
        const coords = ArtBoard.getGridCoords(x, y);
        x = coords.x 
        y = coords.y

        if (x === this.lastX && y === this.lastY) return;
        this.drawLine(this.lastX, this.lastY, x, y);

        this.lastX = x;
        this.lastY = y;
    },
    pointerUp() {
        this.lastX = null;
        this.lastY = null;
    },

    drawLine(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);

        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;

        let err = dx - dy;

        while (true) {
            ArtBoard.paintPixel(x0, y0, ColorPicker.selectedColor);

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;

            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }

            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
    },
};
const Bucket = {
    
}

const History = {
    undoStack: [],
    redoStack: [],
    __MAX_HISTORY: 50,

    __takeSnapshot() {
        return {
            pixels: new Map(pixels),
            selectedTool: selectedTool,
            toolState: selectedTool?.getState?.(),
        };
    },

    __apply(snapshot) {
        pixels.clear();
        snapshot.pixels.forEach((color, key) => pixels.set(key, color));

        selectedTool = snapshot.selectedTool;

        if (selectedTool && selectedTool.applyState && snapshot.toolState) {
            selectedTool.applyState(snapshot.toolState);
        }
    },

    saveState() {
        this.undoStack.push(this.__takeSnapshot());
        this.redoStack.length = 0;

        // Keep limmit
        if (this.undoStack.length > this.__MAX_HISTORY) {
            this.undoStack.shift();
        }
    },

    undo() {
        if (this.undoStack.length === 0) return;

        this.redoStack.push(this.__takeSnapshot());
        this.__apply(this.undoStack.pop());
    },
    redo() {
        if (this.redoStack.length === 0) return;

        this.undoStack.push(this.__takeSnapshot());
        this.__apply(this.redoStack.pop());
    },
};

// WINDOW EVENTS
window.addEventListener("load", windowLoad);
window.addEventListener("pointermove", windowPointerMove);
window.addEventListener("pointerup", windowPointerUp);
window.addEventListener("keydown", windowKeyDown);
// WINDOW EVENTS FUNCTIONS
function windowKeyDown(e) {
    if (e.key === "m") buttonMove.click();
    else if (e.key === "d") buttonTypePolyline.click();
    else if (e.ctrlKey && e.key === "z") History.undo();
    else if (e.ctrlKey && e.key === "y") History.redo();
}
function windowPointerMove(e) {
    const artPos = getMousePos(e, ArtBoard.dom)
    const colorPos = getMousePos(e, ColorPicker.dom)

    if (ColorPicker.triangle.isPointInside(colorPos.x, colorPos.y)) {
        Input.hoverTarget = "colorpicker"
    }else if (ArtBoard.isPointInside(artPos.x, artPos.y)) {
        Input.hoverTarget = "artboard"
    } else {
        Input.hoverTarget = null
    }

    // IF is pressing
    if (Input.isPointerDown) {
        if (Input.activeTarget === "artboard") {
            ArtBoard.pointerMove(e);
            selectedTool.pointerMove?.(e);
        } else if (Input.activeTarget === "colorpicker") {
            ColorPicker.pointerMove(e);
        }
    }
}
function windowPointerUp(e) {
    if (!Input.isPointerDown) return;

    if (Input.activeTarget === "artboard") {
        ArtBoard.pointerUp(e);
        selectedTool.pointerUp?.();

        try {
            ArtBoard.dom.releasePointerCapture(Input.pointerId);
        } catch {}
    }

    if (Input.activeTarget === "colorpicker") {
        ColorPicker.pointerUp(e);
        try {
            ColorPicker.dom.releasePointerCapture(Input.pointerId);
        } catch {}
    }

    Input.activeTarget = null;
    Input.pointerId = null;
    Input.isPointerDown = false;
}

function windowLoad(e) {
    // Select tool
    document.querySelector("button.tool.pen").click();
    ColorPicker.selectedColor = [0, 0, 0, 0];

    ArtBoard.init();
    ColorPicker.init();
    ColorPicker.triangle.render(0);
    ColorPicker.triangle.draw();
    ColorPicker.pin.draw();

    renderLoop();

    function renderLoop() {
        ArtBoard.draw();

        requestAnimationFrame(renderLoop);
    }
}

// TOOL BUTTONS
const buttonMove = document.querySelector("button.move");
const buttonTypePolyline = document.querySelector("button.type-polyline");
const buttonPen = document.querySelector("button.tool.pen");
buttonMove.addEventListener("click", handleMoveClick);
buttonTypePolyline.addEventListener("click", handlePolylineClick);
buttonPen.addEventListener("click", handlePenClick);
// TOOL BUTTONS EVENTS
function handleMoveClick(e) {
    unpressOtherButtons(e);
    selectedTool = Move;
}
function handlePolylineClick(e) {
    unpressOtherButtons(e);
    selectedTool = TypePolyline;
}
function handlePenClick(e) {
    unpressOtherButtons(e);
    selectedTool = Pen;
}
function unpressOtherButtons(e) {
    const button = e.target;

    document.querySelectorAll(".tools-container button").forEach((b) => {
        if (b === button) return b.classList.add("pressed");
        b.classList.remove("pressed");
    });
}

// UTILITY FUNCTIONS
function hslToRgb([h, s, l]) {
    // Normaliza os valores para a escala 0-1
    s /= 100;
    l /= 100;

    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

    // Converte de volta para a escala 0-255 e arredonda
    const r = Math.round(255 * f(0));
    const g = Math.round(255 * f(8));
    const b = Math.round(255 * f(4));

    return [r, g, b];
}

function rgbArrayToString(color) {
    if (color instanceof Array || ArrayBuffer.isView(color))
        return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    else if (typeof color === "string") return color;
}
function getMousePos(e, element = e.target) {
    const rect = element.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    };
}
function applyTemporaryClass(param0, className, time, className1) {
    let element;
    if (typeof param0 === "string") element = document.querySelector(param0);
    else element = param0;

    if (!element)
        return console.error(`Cannot select element with '${element}'`);

    element.classList.add(className);
    setTimeout(() => {
        element.classList.remove(className);
        if (className1) element.classList.add(className1);
    }, time);
}
function getMousePosRelative(e, element) {
    const rect = element.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    };
}
