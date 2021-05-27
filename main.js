// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, Notification} = require('electron')
const path = require('path')
const fetch = require('node-fetch');
const fs = require('fs')
const  dns = require('dns')

var AdmZip = require("adm-zip");
const request = require("request");
const os = require('os')
const child_process = require('child_process');
var progress = require('request-progress');
var release;
var offline = false;

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 625,
        backgroundColor: '#2c3034',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('index.html').then(/*mainWindow.setResizable(false)*/)
    mainWindow.setResizable(false)
    mainWindow.setMenuBarVisibility(false)

    // mainWindow.setMinimumSize(800, 600)
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()


}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

    console.log(app.getPath('userData'));
    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

function parse(file) {
    console.log(fs.existsSync(file))

    return new Promise((resolve, reject) => {
        if (fs.existsSync(file))
            resolve(JSON.parse(fs.readFileSync('version.json', 'utf8')))
        else
            reject("test erreur");
    })

}

function IsConnectedToInternet() {
    return new Promise((resolve, reject) => {
        dns.resolve('www.google.com', function (err) {
            if (err) {
                return reject("You are not connected to internet")
            } else {
                return resolve("connected");
            }
        })
    })

}

function editVersionJSON(id) {
    fs.writeFileSync("version.json", JSON.stringify({"version": id, "inherit": true}));
}

function ExtractZip() {
    return new Promise((resolve, reject) => {
        resolve(new AdmZip(path.join(os.tmpdir(), "game.zip"), {}).extractAllTo(path.join(process.env.APPDATA, 'PanicAtTortuga', "game"), true))
    })
}

function GetAsset() {
    for (i = 0; i < release.assets.length; i++) {
        console.log(release.assets[i])
        if (release.assets[i].name.startsWith(process.platform))
            return release.assets[i]
    }
}

ipcMain.on("download-game", function (event, args) {
    event.sender.send("start_progressBar")
    progress(request(GetAsset().browser_download_url))
        .on('progress', function (state) {
            event.sender.send("progressBar", Math.trunc(state.percent * 100))

            console.log(state);
        })
        .pipe(fs.createWriteStream(path.join(os.tmpdir(), "game.zip")))
        .on('close', function () {
            event.sender.send("progressBar", 100)

            ExtractZip().then(function () {
                editVersionJSON(release.id)
                event.sender.send("end_progressBar")
                console.log("finished unzip files")
                RunGame()
            })
        })
})

ipcMain.on("start", function (event, args) {
    IsConnectedToInternet()
        .then(
            fetch("https://api.github.com/repos/LifeInvaders/game/releases/latest", {method: "Get"})
            .then(res => res.json())
            .then((json) => {
                release = json
                parse("version.json")
                    .then(data => {
                        if (data.version < json.id) {
                            event.sender.send("notification", json.tag_name)
                        } else RunGame()
                    })
                    .catch(data => event.sender.send("notification", json.tag_name))
            }))
        .catch(t => event.sender.send("error_notif", t))

})

ipcMain.on('online-status-changed', (event, status) => {
    console.log("online :", status)
    offline = status;
    if (!offline) {
        new Notification({
            title: 'Erreur',
            body: 'Vous êtes hors ligne'
        }).show()
    }
})

function RunGame() {
    let file;
    switch (process.platform) {
        case "win32":
            file = "Panic At Tortuga.exe";
            break;
        case "linux":
            file = "Panic At Tortuga.x86_64";
            break;
    }
    console.log(path.join(process.env.APPDATA, 'PanicAtTortuga', "game", file))
    child_process.spawn(path.join(process.env.APPDATA, 'PanicAtTortuga', "game", file), {detached: true})
    app.quit()


}
