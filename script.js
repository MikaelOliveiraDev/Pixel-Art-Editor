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
    pixels: new Map([]),
    pixelSize: 20,
    lastMousePos: { x: null, y: null },
    camera: {
        x: 0,
        y: 0,
        scale: 1,
    },
    palette: [], // Array com string de cores ["rgb(0, 0, 0)"]

    init() {
        // Canvas setting
        this.dom.width = 700;
        this.dom.height = 500;
        this.dom.tabIndex = 1;

        this.dom.addEventListener("pointerdown", (e) => this.pointerDown(e));
        this.dom.addEventListener("click", (e) => this.click(e));
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

    click(e) {
        selectedTool.click?.(e);
    },
    pointerDown(e) {
        Input.activeTarget = "artboard";
        Input.pointerId = e.pointerId;
        Input.isPointerDown = true;

        this.dom.setPointerCapture(e.pointerId);

        if (!e.ctrlKey) {
            selectedTool.pointerDown?.(e);
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
    getGridCoords(coords) {
        const { x, y } = coords;

        const worldX = (x - this.camera.x) / this.camera.scale;
        const worldY = (y - this.camera.y) / this.camera.scale;

        return {
            x: Math.floor(worldX / this.pixelSize),
            y: Math.floor(worldY / this.pixelSize),
        };
    },

    getColorIndex(color, add) {
        const colorString = rgbArrayToString(color)
        let index = this.palette.indexOf(colorString)

        if (index === -1) {
            if (!add) return 

            this.palette.push(colorString)
            index = this.palette.length - 1
        }

        return index
    },
    paintPixel(coords, color) {
        if (!color) return;

        const { x, y } = coords;
        const key = `${x},${y}`;
        const colorIndex = this.getColorIndex(color, true)
        this.pixels.set(key, (colorIndex));
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
        const SHOW_HELPER_LINE_100 = camera.scale < 0.2;
        for (let x = startX; x <= endX; x++) {
            if (x % 100 === 0 && SHOW_HELPER_LINE_100) {
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
            if (y % 100 === 0 && SHOW_HELPER_LINE_100) {
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
        this.pixels.forEach((colorIndex, key) => {
            const [px, py] = key.split(",").map(Number);

            const actualColor = this.palette[colorIndex] || "darkgray"

            ctx.fillStyle = actualColor;
            ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
        });

        // Desenha o feedback da ferramenta selecionada
        selectedTool?.draw?.(ctx);
    },
};
const ColorPicker = {
    dom: document.querySelector("input#selected-color"),
    selectedColor: [0, 0, 0],
    MAX_RECENT_COLORS: 15,

    init() {
        this.dom.addEventListener("change", this.change.bind(this))
    },

    change(e) {
        const value = this.dom.value
        // Create recent color
        const container = document.querySelector(".recent-colors")

        const swatch = document.createElement("div")
        swatch.className = "color-swatch"
        swatch.style.backgroundColor = value
        swatch.dataset.color = value

        swatch.addEventListener("click", () => {
            ColorPicker.dom.value = value
            ColorPicker.selectedColor = ColorPicker.hexToRgb(value)
        })

        container.prepend(swatch)
        if (container.children.length > this.MAX_RECENT_COLORS) {
            container.removeChild(container.lastChild)
        }

        // Define color
        this.selectedColor = this.hexToRgb(value)

        console.log(e)
    },

    hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    },

    draw() {} 
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

    click(e) {
        const coords = ArtBoard.getGridCoords(getMousePos(e, this.dom));
        this.posX = coords.x;
        this.posY = coords.y;
        this.lineDirection = null;
        this.curveDirection = null;
        this.isLineStarted = false;
        this.__arrowAngle = null;

        this.__activateBlink(this.posX, this.posY, ColorPicker.selectedColor);

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

        // First keydown: set lineDirection
        if (this.lineDirection === null) {
            const ANGLES_MAP = {
                right: 0,
                down: 90,
                left: 180,
                up: 270,
            };
            this.lineDirection = direction;
            this.__arrowAngle = ANGLES_MAP[direction];
            this.__arrowColor = "blue";
            return;
        }

        const SA = 14; // a short angle
        const ANGLES_ON_RIGHT = [90, 90 - SA, 0 + SA, 0, 0 - SA, 270 + SA, 270];
        const ANGLES_ON_BOTTOM = [
            180,
            180 - SA,
            90 + SA,
            90,
            90 - SA,
            0 + SA,
            0,
        ];
        const ANGLES_ON_LEFT = [
            90,
            90 + SA,
            180 - SA,
            180,
            180 + SA,
            270 - SA,
            270,
        ];
        const ANGLES_ON_TOP = [
            180,
            180 + SA,
            270 - SA,
            270,
            270 + SA,
            0 - SA,
            0,
        ];

        const jumpAngle = function (angles, clockwise) {
            let index = angles.indexOf(this.__arrowAngle);
            if (index === -1) return false;

            const jump = clockwise ? 1 : -1;
            const newAngle = angles[index + jump];
            console.log(newAngle);

            if (newAngle !== undefined) this.__arrowAngle = newAngle;
        }.bind(this);

        // SECOND KEYDOWN: set arrowAngle
        if (direction === "right") {
            jumpAngle(ANGLES_ON_TOP, true) || jumpAngle(ANGLES_ON_BOTTOM, true);
        } else if (direction === "down") {
            jumpAngle(ANGLES_ON_RIGHT, false) ||
                jumpAngle(ANGLES_ON_LEFT, false);
        } else if (direction === "left") {
            jumpAngle(ANGLES_ON_TOP, false) ||
                jumpAngle(ANGLES_ON_BOTTOM, false);
        } else {
            jumpAngle(ANGLES_ON_RIGHT, true) || jumpAngle(ANGLES_ON_LEFT, true);
        }

        // Set curveDirection
        const ANGLES_DIRS_MAP = new Map([
            [0 - SA, ["right", "up"]],
            [0, ["right", null]],
            [0 + SA, ["right", "down"]],

            [90 - SA, ["down", "right"]],
            [90, ["down", null]],
            [90 + SA, ["down", "left"]],

            [180 - SA, ["left", "down"]],
            [180, ["left", null]],
            [180 + SA, ["left", "up"]],

            [270 - SA, ["up", "left"]],
            [270, ["up", null]],
            [270 + SA, ["up", "right"]],
        ]);

        const dir = ANGLES_DIRS_MAP.get(this.__arrowAngle);
        if (!dir) return

        this.lineDirection = dir[0];
        this.curveDirection = dir[1];

        console.log(this.lineDirection, this.curveDirection);

        return;
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
            ArtBoard.paintPixel(
                { x: this.posX, y: this.posY },
                ColorPicker.selectedColor,
            );
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

        const constrastColor = "rgb(255,255, 255)";
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

    pointerDown(e) {
        History.saveState();

        const coords = ArtBoard.getGridCoords(getMousePos(e, this.dom));

        this.lastX = coords.x;
        this.lastY = coords.y;

        ArtBoard.paintPixel(coords, ColorPicker.selectedColor);
    },
    pointerMove(e) {
        if (this.lastX === null) return;

        const { x, y } = ArtBoard.getGridCoords(getMousePos(e, ArtBoard.dom));
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
            ArtBoard.paintPixel({ x: x0, y: y0 }, ColorPicker.selectedColor);

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
    LIMIT: 1000,

    click(e) {
        const coords = ArtBoard.getGridCoords(getMousePos(e, ArtBoard.dom));

        const startX = coords.x;
        const startY = coords.y;

        const startKey = `${startX},${startY}`;
        const targetColor = ArtBoard.pixels.get(startKey) || null;
        const fillColor = rgbArrayToString(ColorPicker.selectedColor);

        if (targetColor === fillColor) return;

        const result = this.floodFill(startX, startY, targetColor, fillColor);

        if (result.leacked) {
            alert("A área não está fechada!");
            return;
        }

        History.saveState();

        result.toFill.forEach((coords) => {
            ArtBoard.paintPixel(coords, ColorPicker.selectedColor);
        });
    },

    floodFill(startX, startY, targetColor, fillColor) {
        const stack = [{ x: startX, y: startY }];
        const visited = new Set();
        const toFill = [];

        let leacked = false;

        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            if (Math.abs(x) > 2000 || Math.abs(y) > 2000) continue;

            const currentColor = ArtBoard.pixels.get(key) || null;

            if (
                x < -this.LIMIT ||
                x > this.LIMIT ||
                y < -this.LIMIT ||
                y > this.LIMIT
            ) {
                leacked = true;
                continue;
            }

            if (currentColor === targetColor) {
                toFill.push({ x, y });
                visited.add(key);

                stack.push({ x: x + 1, y: y });
                stack.push({ x: x - 1, y: y });
                stack.push({ x: x, y: y + 1 });
                stack.push({ x: x, y: y - 1 });
            }
        }

        return { toFill, leacked };
    },
};

const History = {
    undoStack: [],
    redoStack: [],
    __MAX_HISTORY: 50,

    __takeSnapshot() {
        return {
            pixels: new Map(ArtBoard.pixels),
            palette: [...ArtBoard.palette],
            selectedTool: selectedTool,
            toolState: selectedTool?.getState?.(),
        };
    },

    __apply(snapshot) {
        ArtBoard.pixels.clear();
        snapshot.pixels.forEach((color, key) => ArtBoard.pixels.set(key, color));

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
    const artPos = getMousePos(e, ArtBoard.dom);


    if (ArtBoard.isPointInside(artPos.x, artPos.y)) {
        Input.hoverTarget = "artboard";
    } else {
        Input.hoverTarget = null;
    }

    // IF is pressing
    if (Input.isPointerDown) {
        if (Input.activeTarget === "artboard") {
            ArtBoard.pointerMove(e);
            selectedTool.pointerMove?.(e);
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
const buttonBucket = document.querySelector("button.tool.bucket");

buttonMove.addEventListener("click", (e) => handleClickTool(e, Move));
buttonTypePolyline.addEventListener("click", (e) =>
    handleClickTool(e, TypePolyline),
);
buttonPen.addEventListener("click", (e) => handleClickTool(e, Pen));
buttonBucket.addEventListener("click", (e) => handleClickTool(e, Bucket));
// TOOL BUTTONS EVENTS

function handleClickTool(e, tool) {
    const button = e.target;

    selectedTool = tool;

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
