const Eraser = {
    lastX: null,
    lastY: null,
    size: 1,

    select() {
        const eraserRange = document.querySelector("#eraser-size");
        eraserRange.style.display = "block";

        ArtBoard.dom.style.cursor = "none";
    },
    unselect() {
        const eraserRange = document.querySelector("#eraser-size");
        eraserRange.style.display = "none";

        ArtBoard.dom.style.cursor = "pointer";
    },

    pointerDown(e) {
        History.saveState();

        const coords = ArtBoard.getGridCoords(getMousePos(e, this.dom));

        this.lastX = coords.x;
        this.lastY = coords.y;

        this.eraseArea(coords)
    },
    pointerMove(e) {
        if (this.lastX === null || this.lastY === null) return;

        const { x, y } = ArtBoard.getGridCoords(getMousePos(e, ArtBoard.dom));
        if (x === this.lastX && y === this.lastY) return;

        this.eraseLine(this.lastX, this.lastY, x, y);

        this.lastX = x;
        this.lastY = y;
    },
    pointerUp() {
        this.lastX = null;
        this.lastY = null;


        ArtBoard.recalculateBounds()
        ArtBoard.updateDimensionsUI()
    },
    eraseArea(centerCoords) {
        const offset = Math.floor(this.size / 2)
        const startX = centerCoords.x - offset
        const startY = centerCoords.y - offset

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                ArtBoard.clearPixel({x: startX + i, y: startY + j}, false)
            }
        }
    },
    eraseLine(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);

        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;

        let err = dx - dy;

        while (true) {
            this.eraseArea({ x: x0, y: y0 });

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

    draw(ctx) {
        const mousePos = getMousePos(Input, ArtBoard.dom);

        const coords = ArtBoard.getGridCoords(mousePos);

        let offset = Math.floor(this.size / 2)
        let sizePx = ArtBoard.pixelSize * this.size

        let x = (coords.x - offset) * ArtBoard.pixelSize 
        let y = (coords.y - offset) * ArtBoard.pixelSize 

        ctx.lineWidth = 2 / ArtBoard.camera.scale; // Linha constante independente do zoom
        ctx.strokeStyle = "white";
        ctx.strokeRect(
            x,y,
            sizePx,
            sizePx,
        );

        ctx.strokeStyle = "black";
        ctx.lineWidth = 1 / ArtBoard.camera.scale;
        ctx.strokeRect(
            x,y,
            sizePx,
            sizePx,
        );
    },
};
