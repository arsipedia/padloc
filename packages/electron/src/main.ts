import { app, shell, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";
import * as os from "os";
import ElectronStore from "electron-store";

declare var global: any;

const settings = (global.settings = new ElectronStore({
    name: "settings",
    defaults: {
        autoDownloadUpdates: false,
        allowPrerelease: autoUpdater.allowPrerelease,
        windowBounds: {
            width: 800,
            height: 600
        },
        fullscreen: false
    }
}));

let win: BrowserWindow;
let updateOnQuit = false;

async function updateReady(updateInfo: UpdateInfo) {
    const { response } = await dialog.showMessageBox(win, {
        message: "Install Update",
        detail:
            `Padlock version ${updateInfo.version} has been downloaded. The update will be installed ` +
            `the next time the app is launched.`,
        buttons: ["Install Later", "Install And Restart"],
        defaultId: 1
    });

    if (response === 1) {
        autoUpdater.quitAndInstall();
    } else {
        updateOnQuit = true;
    }
}

autoUpdater.on("update-downloaded", updateReady);

// function htmlToText(html: string) {
//     return html
//         .replace(/<p>([\w\W]*?)<\/p>/g, "$1")
//         .replace(/<\/?ul>/g, "")
//         .replace(/<li>([\w\W]*?)<\/li>/g, "\u2022 $1");
// }

// async function updateAvailable(versionInfo) {
//     if (autoUpdater.autoDownload) {
//         return;
//     }
//
//     const { response, checkboxChecked } = await dialog.showMessageBox(null, {
//         type: "info",
//         message: `A new version of Padlock is available! (v${versionInfo.version})`,
//         detail: htmlToText(versionInfo.releaseNotes),
//         checkboxLabel: "Automatically download and install updates in the future (recommended)",
//         buttons: ["Remind Me Later", "Download And Install"],
//         defaultId: 1
//     });
//
//     settings.set("autoDownloadUpdates", checkboxChecked);
//
//     if (response === 1) {
//         autoUpdater.downloadUpdate();
//
//         dialog.showMessageBox({
//             message: "Downloading Update...",
//             detail: "The new version is being downloaded. You'll be notified when it is ready to be installed!"
//         });
//     }
// }

async function checkForUpdates(_manual = false) {
    autoUpdater.autoDownload = settings.get("autoDownloadUpdates") as boolean;
    autoUpdater.allowPrerelease = settings.get("allowPrerelease") as boolean;

    const result = await autoUpdater.checkForUpdates();
    // @ts-ignore
    console.log("update available: ", result, autoUpdater.updateAvailable);
    // if (autoUpdater.updateAvailable) {
    //     updateAvailable(result.versionInfo);
    // } else if (manual) {
    //     const { checkboxChecked } = await dialog.showMessageBox(null, {
    //         type: "info",
    //         message: "No Updates Available",
    //         detail: "Your version of Padlock is up to date.",
    //         checkboxLabel: "Automatically download and install updates in the future (recommended)",
    //         checkboxChecked: settings.get("autoDownloadUpdates") as boolean
    //     });
    //
    //     settings.set("autoDownloadUpdates", checkboxChecked);
    // }
}

function createWindow() {
    // Create the browser window.
    const { width, height, x, y } = settings.get("windowBounds") as any;
    win = new BrowserWindow({
        width,
        height,
        x,
        y,
        fullscreen: settings.get("fullscreen") as boolean,
        fullscreenable: true,
        backgroundColor: "#59c6ff",
        frame: false,
        transparent: false,
        hasShadow: true,
        show: false,
        webPreferences: {
            devTools: true
        }
    });

    win.loadFile("index.html");

    win.once("ready-to-show", () => {
        console.log("showing window");
        win.show();
        win.webContents.openDevTools();
    });

    win.on("close", () => {
        settings.set("windowBounds", win.getBounds());
        settings.set("fullscreen", win.isFullScreen());
    });

    // win.on("closed", () => {
    //     win = null;
    // });

    // Open links in browser
    win.webContents.on("new-window", function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });
}

function createApplicationMenu() {
    const checkForUpdatesItem = {
        label: "Check for Updates...",
        click() {
            checkForUpdates(true);
        }
    };

    const appSubMenu: any[] =
        os.platform() === "darwin" ? [{ role: "about" }] : [{ label: `Padlock v${app.getVersion()}`, enabled: false }];

    appSubMenu.push(checkForUpdatesItem);

    if (os.platform() == "darwin") {
        appSubMenu.push({ type: "separator" }, { role: "hide" }, { role: "hideothers" }, { role: "unhide" });
    }

    // if (debug) {
    //     appSubMenu.push(
    //         { type: "separator" },
    //         {
    //             label: "Debug",
    //             submenu: [
    //                 {
    //                     label: "Open Dev Tools",
    //                     accelerator: "CmdOrCtrl+Shift+I",
    //                     click: () => win.webContents.toggleDevTools()
    //                 }
    //             ]
    //         }
    //     );
    // }

    appSubMenu.push({ type: "separator" }, { role: "quit" });

    // Set up menu
    const template = [
        {
            label: "Application",
            submenu: appSubMenu
        },
        {
            label: "Settings",
            submenu: [
                {
                    label: "Updates",
                    submenu: [
                        checkForUpdatesItem,
                        { type: "separator" },
                        {
                            type: "checkbox",
                            label: "Automatically Download and Install Updates",
                            checked: settings.get("autoDownloadUpdates"),
                            click(item: any) {
                                settings.set("autoDownloadUpdates", item.checked);
                            }
                        },
                        { type: "separator" },
                        {
                            type: "radio",
                            label: "Only Download Stable Releases (recommended)",
                            checked: !settings.get("allowPrerelease"),
                            click(item: any) {
                                settings.set("allowPrerelease", !item.checked);
                            }
                        },
                        {
                            type: "radio",
                            label: "Download Stable and Beta Releases",
                            checked: settings.get("allowPrerelease"),
                            click(item: any) {
                                settings.set("allowPrerelease", item.checked);
                            }
                        }
                    ]
                },
                { type: "separator" }
            ]
        },
        {
            label: "Edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
                { role: "selectall" }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
    console.log("ready");
    createWindow();
    createApplicationMenu();

    app.setAsDefaultProtocolClient("padloc");

    checkForUpdates();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    app.quit();
});

app.on("activate", () => {
    if (win === null) {
        createWindow();
    }
});

app.on("before-quit", e => {
    if (updateOnQuit) {
        updateOnQuit = false;
        e.preventDefault();
        autoUpdater.quitAndInstall();
    }
});

ipcMain.on("check-updates", () => checkForUpdates(true));