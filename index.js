const projectsList = JSON.parse(
    localStorage.getItem("active-projects") || "[]",
);
const trashedList = JSON.parse(
    localStorage.getItem("trashed-projects") || "[]",
);
const projectsContainer = document.querySelector(".projects-container");
const trashContainer = document.querySelector(".trash-container");
const NOW = new Date();

// Keep trash open when refresh
const isTrashOpen = sessionStorage.getItem("isTrashOpen")
if (isTrashOpen) {
    expandTrash()
}




projectsList.sort(sortFromLastest).forEach((projectName) => {
    const projectData = JSON.parse(localStorage.getItem(projectName));
    const lastSeen = new Date(projectData.lastSeen);

    const templ = document.querySelector(".projects-container template");
    const clone = templ.content.cloneNode(true);

    const projectEl = clone.querySelector(".project");
    const titleEl = clone.querySelector("h3");
    const imgEl = clone.querySelector("img");
    const pEl = clone.querySelector("p");
    const deleteButt = clone.querySelector("button.delete");

    // Set interactivity
    projectEl.onclick = () => {
        location.href = `/edit/edit.html?name=${projectName}`;
    };
    deleteButt.onclick = (e) => {
        e.stopPropagation();
        deleteProject(projectName, projectEl, projectData)
    }
;

    // Set title
    const TITLE_LIMIT = 35;
    projectName.length > TITLE_LIMIT
        ? (titleEl.innerText = projectName.substring(0, TITLE_LIMIT) + "...")
        : (titleEl.innerText = projectName);

    // Set date
    if (projectData.lastSeen) {
        if (NOW.toLocaleDateString() === lastSeen.toLocaleDateString()) {
            const timeString = lastSeen.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
            pEl.innerText = "Seen today, at " + timeString;
        } else pEl.innerText = "Seen at " + lastSeen.toLocaleDateString();
    }

    if (projectData.dataURL) imgEl.src = projectData.dataURL;
    else imgEl.parentElement.removeChild(imgEl);

    projectsContainer.appendChild(clone);
});

trashedList.sort(sortFromLastest).forEach((projectName) => {
    const projectData = JSON.parse(localStorage.getItem(projectName) || "[]");

    // Check if should be deleted
    const LIMIT_DAYS_IN_TRASH = 30;
    let lastSeen = new Date(projectData.lastSeen);
    const msDifference = NOW - lastSeen;
    const daysDifference = Math.floor(msDifference / (1000 * 60 * 60 * 24));
    if (daysDifference > LIMIT_DAYS_IN_TRASH || isNaN(daysDifference)) {
        // Remove from list
        const newList = trashedList.filter((name) => name !== projectName);
        localStorage.setItem("trashed-projects", JSON.stringify(newList));

        // Remove from localStorage
        localStorage.removeItem(projectName);
        return;
    }

    const templ = document.querySelector(".projects-container template");
    const clone = templ.content.cloneNode(true);

    const projectEl = clone.querySelector(".project");
    const titleEl = clone.querySelector("h3");
    const imgEl = clone.querySelector("img");
    const restoreButton = clone.querySelector("button.restore");
    const pEl = clone.querySelector("p");

    projectEl.onclick = (e) => {
        e.stopPropagation();

        // Update active list
        projectsList.push(projectName);
        localStorage.setItem("active-projects", JSON.stringify(projectsList));

        // Upadte inactive list
        const newList = trashedList.filter((name) => name !== projectName);
        localStorage.setItem("trashed-projects", JSON.stringify(newList));

        // Switch parents
        trashContainer.removeChild(projectEl);
        projectsContainer.prepend(projectEl);
    };
    restoreButton.onclick = (e) => {
        e.stopPropagation()
        restoreProject(projectName, projectEl)
    }

    titleEl.innerText = projectName;

    // Set date
    if (projectData.lastSeen) {
        if (NOW.toLocaleDateString() === lastSeen.toLocaleDateString()) {
            const timeString = lastSeen.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
            pEl.innerText = "Deleted today, at " + timeString;
        } else pEl.innerText = "Deleted at " + lastSeen.toLocaleDateString();
    }

    if (projectData.dataURL) imgEl.src = projectData;
    else imgEl.parentElement.removeChild(imgEl);

    trashContainer.appendChild(clone);
});

function sortFromLastest(projectNameA, projectNameB) {
    const dataA = JSON.parse(localStorage.getItem(projectNameA));
    const dataB = JSON.parse(localStorage.getItem(projectNameB));

    if (!dataA?.lastSeen) return 1;
    if (!dataB?.lastSeen) return -1;

    const dateA = new Date(dataA.lastSeen);
    const dateB = new Date(dataB.lastSeen);

    // Lastest seen projects first
    if (dateA < dateB) return 1;
    else return -1;
}

function expandTrash() {
    trashContainer.style.display = "grid";
    document.querySelector(".contract").style.display = "flex";
    document.querySelector(".expand").style.display = "none";

    sessionStorage.setItem("isTrashOpen", true)
}
function contractTrash() {
    trashContainer.style.display = "none";
    document.querySelector(".contract").style.display = "none";
    document.querySelector(".expand").style.display = "flex";

    sessionStorage.removeItem("isTrashOpen")
}


function deleteProject(projectName, projectEl, projectData) {

        // Update active list
        const newList = projectsList.filter((name) => name !== projectName);
        localStorage.setItem("active-projects", JSON.stringify(newList));

        // Upadte inactive list
        trashedList.push(projectName);
        localStorage.setItem("trashed-projects", JSON.stringify(trashedList));

        // Update last seen
        projectData.lastSeen = new Date().toISOString();
        localStorage.setItem(projectName, JSON.stringify(projectData));

        projectsContainer.removeChild(projectEl);
        trashContainer.prepend(projectEl);
    
}
function restoreProject(projectName, projectEl) {
    // Update list
    projectsList.push(projectName);
    localStorage.setItem("active-projects", JSON.stringify(projectsList));

    // Remove from trash
    const newTrashedList = trashedList.filter((name) => name !== projectName);
    localStorage.setItem("trashed-projects", JSON.stringify(newTrashedList));

    trashContainer.removeChild(projectEl);
    projectsContainer.prepend(projectEl)
}