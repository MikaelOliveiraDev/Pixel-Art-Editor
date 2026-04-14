// SAVING OBJECTS
const Project = {
    name: null,
    lastSeen: null,

    createNew() {
        const now = new Date();

        const pad = (num) => String(num).padStart(2, "0");

        const nowString =
            now.getFullYear() +
            "-" +
            pad(now.getMonth() + 1) +
            "-" +
            pad(now.getDate()) +
            "_" +
            pad(now.getHours()) +
            ":" +
            pad(now.getMinutes()) +
            ":" +
            pad(now.getSeconds());

        this.name = "Untitled_" + nowString;
        this.lastSeen = now

        Storage.save();
        location.href = "/edit/edit.html?name=" + this.name;
    },

    rename(newName) {
        const data = localStorage.getItem(this.name);
        const projects = JSON.parse(
            localStorage.getItem("active-projects") || "[]",
        );

        const newProjectsList = projects.filter((name) => name !== this.name);
        newProjectsList.push(newName);

        localStorage.setItem(
            "active-projects",
            JSON.stringify(newProjectsList),
        );
        localStorage.setItem(newName, data);
        localStorage.removeItem(this.name);

        Project.name = newName;
        const newUrl = `${window.location.pathname}?name=${encodeURIComponent(newName)}`;
        window.history.replaceState({}, "", newUrl);

        console.log(`Projeto renomeado para: ${newName}`);
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
            drawingBoudingCorners: { ...ArtBoard.drawingBoudingCorners },
        };
    },

    __apply(snapshot) {
        ArtBoard.pixels.clear();
        snapshot.pixels.forEach((color, key) =>
            ArtBoard.pixels.set(key, color),
        );

        selectedTool = snapshot.selectedTool;

        if (selectedTool && selectedTool.applyState && snapshot.toolState) {
            selectedTool.applyState(snapshot.toolState);
        }

        ArtBoard.drawingBoudingCorners = snapshot.drawingBoudingCorners;
        ArtBoard.updateDimensionsUI();
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
const Storage = {
    save() {
        const SAVE_KEY = Project.name;
        if (!SAVE_KEY) return console.error("Projeto sem nome!");

        const data = {
            // Converte o Map em um Array de entradas [[key, value], ...]
            pixels: Array.from(ArtBoard.pixels.entries()),
            palette: ArtBoard.palette,
            camera: ArtBoard.camera,
            pixelSize: ArtBoard.pixelSize,
            dataURL: ArtBoard.exportAsPNG(1, false),
            drawingBoudingCorners: { ...ArtBoard.drawingBoudingCorners },
            lastSeen: new Date().toISOString()
        };

        const projectsListJSON =
            localStorage.getItem("active-projects") || "[]";
        const projectsList = JSON.parse(projectsListJSON);
        if (!projectsList.includes(SAVE_KEY)) {
            projectsList.push(SAVE_KEY);
            localStorage.setItem(
                "active-projects",
                JSON.stringify(projectsList),
            );
        }

        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            console.log(`Desenho salvo com sucesso em ${SAVE_KEY}!`);
        } catch (e) {
            console.error(
                "Falha ao salvar: possivelmente o desenho é grande demais para o localStorage",
                e,
            );
        }
    },

    load(name) {
        const rawData = localStorage.getItem(name);
        if (!rawData) return false;

        const data = JSON.parse(rawData);

        // Restaura os pixels convertendo o Array de volta para Map
        ArtBoard.pixels = new Map(data.pixels);
        ArtBoard.palette = data.palette || [];
        ArtBoard.camera = data.camera || ArtBoard.camera;
        ArtBoard.pixelSize = data.pixelSize || ArtBoard.pixelSize;
        ArtBoard.drawingBoudingCorners = data.drawingBoudingCorners;

        return true;
    },
};
