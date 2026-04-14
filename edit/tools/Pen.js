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
