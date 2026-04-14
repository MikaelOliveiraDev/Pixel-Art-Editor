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
        if (!dir) return;

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
        this.__blinkColor = ColorPicker.rgbArrayToString(color);

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