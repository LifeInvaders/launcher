// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
// const {
//   contextBridge,
//   ipcRenderer
// } = require("electron");
const ipc = require('electron').ipcRenderer
// var $ = require('jquery');
// $ = require('electron').remote.require('jquery');
// require('jquery').globalPaths.push(__dirname + '/node_modules');
// require('module').globalPaths.push(__dirname + '/node_modules');
// window.$ = window.jQuery = require("jquery");
var notif;
window.addEventListener('DOMContentLoaded', () => {
    let playButton = document.getElementById("playBtn");

    let progressBar = $(".progress");

    progressBar.hide()


    playButton.addEventListener('click', function () {
        playButton.disabled = true;
        ipc.send("start");
    })

    document.getElementById("MAJ").addEventListener("click", function () {
        playButton.innerHTML = "Updating...";
        playButton.disabled = true;
        ipc.send("download-game");
    })

})

ipc.on("notification", function (event, args) {
    // SendDownloadNotification()
    // $("#toast").toast('show');
    document.getElementById("playBtn").disabled = false;
    document.getElementById('game-version').innerHTML = args
    console.log("show notif", notif, args)
    $('.toast').toast("show")

})
ipc.on("start_progressBar",function (event, args) {
    $('.toast').toast("hide")
    $(".progress").fadeIn(100)
})
ipc.on("end_progressBar",function (event, args) {
    $(".progress").fadeOut(100)
})

ipc.on("progressBar", function (event, value) {

    let progressBar = $("#progressBar");
    progressBar.attr("aria-valuenow", value)
    progressBar.attr("style", "width: " + value + '%')
    progressBar.text(value + '%')
})

