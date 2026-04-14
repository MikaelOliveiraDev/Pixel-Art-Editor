const Bucket = {
    LIMIT: 1000,

    click(e) {
        const coords = ArtBoard.getGridCoords(getMousePos(e, ArtBoard.dom));

        const startX = coords.x;
        const startY = coords.y;

        const startKey = `${startX},${startY}`;
        const targetColorIndex = ArtBoard.pixels.get(startKey);
        const fillColorIndex = ArtBoard.getColorIndex(
            ColorPicker.selectedColor,
            true,
        );

        if (targetColorIndex === fillColorIndex) return;

        const result = this.floodFill(startX, startY, targetColorIndex);

        if (result.leacked) {
            alert("A área não está fechada ou é muito grande!");
            return;
        }

        History.saveState();

        result.toFill.forEach((coords) => {
            ArtBoard.paintPixel(coords, ColorPicker.selectedColor);
        });
    },

    floodFill(startX, startY, targetColorIndex) {
        const stack = [{ x: startX, y: startY }];
        const visited = new Set();
        const toFill = [];

        let leacked = false;

        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            if (
                visited.size > 50000 ||
                Math.abs(x) > 2000 ||
                Math.abs(y) > 2000
            ) {
                leacked = true;
                continue;
            }

            const currentColorIndex = ArtBoard.pixels.get(key);
            console.log(key, currentColorIndex, targetColorIndex);

            if (currentColorIndex === targetColorIndex) {
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
