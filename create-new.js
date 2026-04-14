// create-new.js

const createNewSubpage = document.querySelector(".page.create-new");
const projectNameInput = createNewSubpage.querySelector("input#project-name");

const buttonScratch = createNewSubpage.querySelector("button")

createNewSubpage.addEventListener("click", hideCreateNewScreen)
buttonScratch.addEventListener("click", goToEditPage)

function goToEditPage(e) {
    if (!projectNameInput.value) return
    
    location.href = "/edit/edit.html?name="+projectNameInput.value
}

function showCreateNewScreen(e) {
    
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
    
    projectNameInput.value = "Untitled_" + nowString;
    projectNameInput.focus()
    
    createNewSubpage.style.display = "flex";
}
function hideCreateNewScreen(e) {
    if (e.target !== createNewSubpage) return

    createNewSubpage.style.display = "none";
}
