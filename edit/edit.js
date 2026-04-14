let selectedTool = null;
let showTutorial = false;
let autoSaveIntervalSec = 20;

const Input = {
    activeTarget: null, // "artboard" | "colorpicker"
    hoverTarget: null,
    pointerId: null,
    isPointerDown: false,
    clientX: null,
    clientY: null,
};

const ArtBoard = {
    dom: document.querySelector("canvas.canvas"),
    ctx: document.querySelector("canvas.canvas").getContext("2d"),
    pixels: new Map([]),
    pixelSize: 20,
    drawingBoudingCorners: {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    lastMousePos: { x: null, y: null },
    camera: {
        x: 0,
        y: 0,
        scale: 1,
    },
    palette: [], // Array com string de cores ["rgb(0, 0, 0)"]

    __resize() {
        const parent = this.dom.parentElement;
        this.dom.width = parent.clientWidth;
        this.dom.height = parent.clientHeight;
    },
    updateDimensionsUI() {
        const corners = this.drawingBoudingCorners;
        const width =
            this.pixels.size === 0 ? 0 : corners.right - corners.left + 1;
        const height =
            this.pixels.size === 0 ? 0 : corners.bottom - corners.top + 1;

        const dimEl = document.querySelector(".canvas-container .dimentions");
        if (dimEl) {
            dimEl.innerText = `${width} × ${height}`;
        }
    },

    init() {
        // Canvas setting
        this.__resize();
        this.dom.tabIndex = 1;

        window.addEventListener("resize", () => this.__resize());

        this.dom.addEventListener("pointerdown", (e) => this.pointerDown(e));
        this.dom.addEventListener("click", (e) => this.click(e));
        this.dom.addEventListener("wheel", (e) => this.wheel(e));
        this.dom.addEventListener("keydown", (e) => this.keyDown(e));
    },

    keyDown(e) {},
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
        } else if (selectedTool !== Eraser) {
            this.dom.style.cursor = "default";
        }

        this.lastMousePos = { x, y };
    },
    pointerUp(e) {
        this.lastMousePos = { x: null, y: null };

        if (selectedTool !== Eraser) this.dom.style.cursor = "default";
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
        const colorString = ColorPicker.rgbArrayToString(color);
        let index = this.palette.indexOf(colorString);

        if (index === -1) {
            if (!add) return;

            this.palette.push(colorString);
            index = this.palette.length - 1;
        }

        return index;
    },
    paintPixel(coords, color) {
        if (!color) return;

        const { x, y } = coords;
        const key = `${x},${y}`;

        // Check if painting outside the known borders of the drawing
        const corners = this.drawingBoudingCorners;
        if (corners.left ?? corners.top ?? corners.right ?? corners.bottom) {
            console.log("Opa");
        }

        if (this.pixels.size === 0)
            this.drawingBoudingCorners = {
                top: y,
                left: x,
                right: x,
                bottom: y,
            };
        else {
            corners.left = Math.min(corners.left, x);
            corners.right = Math.max(corners.right, x);
            corners.top = Math.min(corners.top, y);
            corners.bottom = Math.max(corners.bottom, y);
        }

        const colorIndex = this.getColorIndex(color, true);
        this.pixels.set(key, colorIndex);

        this.updateDimensionsUI();
    },
    clearPixel(coords, recalculateBounds) {
        this.pixels.delete(`${coords.x},${coords.y}`);

        if (recalculateBounds) {
            const c = this.drawingBoudingCorners;
            if (
                coords.x === c.left ||
                coords.x === c.right ||
                coords.y === c.top ||
                coords.y === c.bottom
            ) {
                this.recalculateBounds();
            }
            this.updateDimensionsUI();
        }
    },

    recalculateBounds() {
        if (this.pixels.size === 0) {
            this.drawingBoudingCorners = {
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            };
            return;
        }

        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        this.pixels.forEach((_, key) => {
            const [x, y] = key.split(",").map(Number);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });

        this.drawingBoudingCorners = {
            top: minY,
            left: minX,
            right: maxX,
            bottom: maxY,
        };
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

            const actualColor = this.palette[colorIndex] || "darkgray";

            ctx.fillStyle = actualColor;
            ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
        });

        // Desenha o feedback da ferramenta selecionada
        selectedTool?.draw?.(ctx);
    },

    exportAsPNG(scale = 1, download = true) {
        // 1. Encontrar os limites do desenho (para não salvar um canvas infinito)
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        if (this.pixels.size === 0) return console.warn("Drawing is empty!");

        this.pixels.forEach((_, key) => {
            const [x, y] = key.split(",").map(Number);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        // 2. Criar um canvas temporário do tamanho exato do desenho
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        const exportScale = this.pixelSize;
        tempCanvas.width = width * scale;
        tempCanvas.height = height * scale;

        // 3. Desenhar os pixels no canvas temporário
        this.pixels.forEach((colorIndex, key) => {
            const [x, y] = key.split(",").map(Number);
            const actualColor = this.palette[colorIndex] || "transparent";

            tempCtx.fillStyle = actualColor;
            tempCtx.fillRect(
                (x - minX) * scale,
                (y - minY) * scale,
                scale,
                scale,
            );
        });

        // 4. Transformar em imagem e baixar
        if (download) {
            const link = document.createElement("a");
            link.download = Project.name + ".png";
            link.href = tempCanvas.toDataURL("image/png");
            link.click();
        } else {
            return tempCanvas.toDataURL("image/png");
        }
    },
};
const ColorPicker = {
    dom: document.querySelector("input#selected-color"),
    selectedColor: [0, 0, 0],
    MAX_RECENT_COLORS: 15,

    init() {
        this.dom.addEventListener("change", this.change.bind(this));
    },

    change(e) {
        const value = this.dom.value;
        // Create recent color
        const container = document.querySelector(".recent-colors");

        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.backgroundColor = value;
        swatch.dataset.color = value;

        swatch.addEventListener("click", () => {
            ColorPicker.dom.value = value;
            ColorPicker.selectedColor = ColorPicker.hexToRgb(value);
        });

        container.prepend(swatch);
        if (container.children.length > this.MAX_RECENT_COLORS) {
            container.removeChild(container.lastChild);
        }

        // Define color
        this.selectedColor = this.hexToRgb(value);

        console.log(e);
    },

    hexToRgb(hex) {
        console.log("hex", hex);
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    },
    rgbToHex(r, g, b) {
        const toHex = (n) => n.toString(16).padStart(2, "0");
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    },
    rgbStringToHex(rgb) {
        const [r, g, b] = rgb.match(/\d+/g).map(Number);
        return this.rgbToHex(r, g, b);
    },
    hslToRgb([h, s, l]) {
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
    },
    rgbArrayToString(color) {
        if (color instanceof Array || ArrayBuffer.isView(color))
            return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        else if (typeof color === "string") return color;
    },

    draw() {},
};

// TOOLS OBJECTS
const Move = {};



// WINDOW EVENTS
window.addEventListener("load", windowLoad);
window.addEventListener("pointermove", windowPointerMove);
window.addEventListener("pointerup", windowPointerUp);
window.addEventListener("keydown", windowKeyDown);
// WINDOW EVENTS FUNCTIONS
function windowKeyDown(e) {
    const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    const numberKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    if (numberKeys.includes(e.key)) {
        selectedTool.numberKeyDown?.(e.key);
    } else if (arrowKeys.includes(e.key)) {
        selectedTool.arrowKeyDown?.(e.key);
    }

    console.log(e.key);

    if (e.key === "m") buttonMove.click();
    else if (e.key === "t") buttonTypePolyline.click();
    else if (e.key === "b") buttonBucket.click();
    else if (e.key === "p") buttonPen.click();
    else if (e.key === "e") buttonEraser.click();
    else if (e.ctrlKey && e.key === "z") History.undo();
    else if (e.ctrlKey && e.key === "y") History.redo();
}
function windowPointerMove(e) {
    Input.clientX = e.clientX;
    Input.clientY = e.clientY;

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

    // Get project name
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const nameFromURL = urlParams.get("name");

    if (nameFromURL && nameFromURL.trim() !== "") {
        Project.name = nameFromURL;
        const loaded = Storage.load(Project.name);

        if (!loaded) {
            console.warn("Project not found in local storage");
        }
    } else {
        Project.createNew();
    }

    // Put the project name at the header
    h2ProjectName.innerText = Project.name;

    // Save in an interval
    setInterval(() => {
        if (ArtBoard.pixels.size > 50) Storage.save();
    }, autoSaveIntervalSec * 1000);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            Storage.save();
            console.log("Salvamento preventivo: usuário saiu da aba.");
        }
    });
}

// TOOL BUTTONS
const buttonMove = document.querySelector("button.move");
const buttonTypePolyline = document.querySelector("button.type-polyline");
const buttonPen = document.querySelector("button.tool.pen");
const buttonBucket = document.querySelector("button.tool.bucket");
const buttonPipette = document.querySelector("button.pipette");
const buttonEraser = document.querySelector("button.tool.eraser");

buttonMove.addEventListener("click", (e) => handleClickTool(e, Move));
buttonTypePolyline.addEventListener("click", (e) =>
    handleClickTool(e, TypePolyline),
);
buttonPen.addEventListener("click", (e) => handleClickTool(e, Pen));
buttonBucket.addEventListener("click", (e) => handleClickTool(e, Bucket));
buttonPipette.addEventListener("click", (e) => handleClickTool(e, Pipette));
buttonEraser.addEventListener("click", (e) => handleClickTool(e, Eraser));
// TOOL BUTTONS EVENTS
function handleClickTool(e, tool) {
    const button = e.target;

    selectedTool?.unselect?.(e);
    selectedTool = tool;
    selectedTool.select?.(e);

    document.querySelectorAll(".tools-container button").forEach((b) => {
        // Press this button
        if (b === button) return b.classList.add("pressed");

        // Other buttons
        b.classList.remove("pressed");
    });
}

// TOOL CONTROLS
const eraserRange = document.querySelector("#eraser-size");

eraserRange.addEventListener("input", (e) => {
    Eraser.size = e.target.value;
});

// HEADER AND NAV
const h2ProjectName = document.querySelector("h2.project-name");
h2ProjectName.addEventListener("click", clickProjectName);

function clickProjectName(e) {
    const el = e.target;

    el.contentEditable = true;
    el.focus();
    el.onkeydown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Impede o "Enter" de criar uma nova linha
            el.blur(); // Remove o foco, disparando o evento de salvar
        }
    };

    el.onblur = () => {
        el.contentEditable = false;
        const newName = el.innerText.trim();

        if (newName && newName !== Project.name) {
            Project.rename(newName);
        }
    };
}

// UTILITY FUNCTIONS

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
