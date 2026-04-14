const Pipette = {
    click(e) {
        const pos = getMousePos(Input, ArtBoard.dom);
        const color = this.getColorAtMousePos(pos);
        if (color)
            document.querySelector("input#selected-color").value =
                ColorPicker.rgbStringToHex(color);
    },

    getColorAtMousePos({ x, y }) {
        const coords = ArtBoard.getGridCoords({ x, y });
        const colorIndex = ArtBoard.pixels.get(`${coords.x},${coords.y}`);
        const color =
            ArtBoard.palette[colorIndex] || "rgba(255, 255, 255, 0.5)";

        return color;
    },

    draw(ctx) {
        const { x, y } = getMousePos(Input, ArtBoard.dom);
        if (x === null || y === null) return;

        const marginBottom = 5;
        const radius = 25;

        const drawX = x;
        const drawY = y - marginBottom - radius;

        // Remove camera zoom and pan transformations
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Draw circle
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
        // Fill
        ctx.fillStyle = this.getColorAtMousePos({ x, y });
        ctx.fill();
        // Stroke
        ctx.lineWidth = 2;
        ctx.strokeStyle = "white";
        ctx.stroke();

        ctx.closePath();
    },
};