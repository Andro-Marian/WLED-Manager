"use strict";
const Options = {
    HideOffDevices: false,
    OnlineDevicesFirst: false,
    AutoRefreshOnline: 0,
    AutoRefreshOffline: 0,
    LedFx: {
        Ip: '192.168.1.144',
        Port: '8888',
        Page: ''
    }
};
const Devices = [];
// Creating the database:
// indexedDB.deleteDatabase('Storage');
const DB = indexedDB.open("Storage", 1);
DB.onupgradeneeded = (ev) => {
    const i = ev.target.result;
    const options = i.createObjectStore('options');
    const devices = i.createObjectStore('devices');
    devices.createIndex('ip', '', { unique: true });
    options.add(1, 2);
    /*for (const name in Options) {
        options.add(Options[name as keyof OptionsType], name);
    }*/
};
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });
}
function getRequest(ip) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `http://${ip}/json/si`);
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
        xhr.timeout = 4000;
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status <= 299) {
                resolve(JSON.parse(xhr.response));
            }
            else {
                resolve(null);
            }
        };
        xhr.ontimeout = () => { resolve(null); };
        xhr.onerror = () => { resolve(null); };
        xhr.send();
    });
}
function sendRequest(ip, api, json, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', "http://" + ip + "/" + api);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status <= 299) {
            callback(xhr.response);
        }
        else {
            callback(null);
        }
    };
    xhr.ontimeout = () => { callback(null); };
    xhr.onerror = () => { callback(null); };
    xhr.send(JSON.stringify(json));
}
function getPresets(ip) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `http://${ip}/presets.json`);
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
        xhr.timeout = 4000;
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status <= 299) {
                resolve(JSON.parse(xhr.response));
            }
            else {
                resolve(null);
            }
        };
        xhr.ontimeout = () => { resolve(null); };
        xhr.onerror = () => { resolve(null); };
        xhr.send();
    });
}
function hasValue(obj) {
    if (obj === null || obj === undefined) {
        return '';
    }
    return obj;
}
function loadOptions(callback) {
    /*var db = DB.result;
    var tx = db.transaction("options").objectStore("options");
    const a = tx.getAll();

    a.onsuccess = () => {
        console.log(a.result);
    };*/
    const data = localStorage.getItem('options');
    if (data === null) {
        saveOptions();
        return;
    }
    Object.assign(Options, JSON.parse(data));
    callback.call(Options);
}
function saveOptions(callback) {
    localStorage.setItem('options', JSON.stringify(Options));
    callback();
}
const Device = class {
    constructor(i) {
        this.i = i;
        this.isRefresh = false;
        this.isOnline = null;
        this.refreshTimer = null;
        const UI = document.createElement("div");
        const name = (i.customName === '') ? i.name : i.customName;
        let icon = null;
        if (this.i.Icon) {
            icon = `<img src="${this.i.Icon}" alt="icon">`;
        }
        else {
            icon = `<p>${this.i.id}</p>`;
        }
        let content = `
            <div class="row c3">
                <div>
                    <img class="status" src="images/loading.svg" alt="Status">
                </div>
                <div>
                    <img class="wled" src="images/wled.svg" alt="WLED">
                </div>
                <p class="title">` + name + `</p>
                <div>
                    <img class="ledFx" src="images/ledfx.svg" alt="LedFx">
                </div>
                <div>
                    <img class="options" src="images/options.svg" alt="Options">
                </div>
            </div>
            <div class="row_2">
                <div class='icon'>${icon}</div>
                <div>
                    <div class="row details">
                        <div>
                            <img class="signal_icon" src="images/unknown.svg" alt="State">
                        </div>
                        <div></div>
                    </div>
                    <div class="row details">
                        <div>
                            <p class="signal">Offline</p>
                        </div>
                        <div>
                            <p class="ip">` + this.i.ip + `</p>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="toggle primary">
                        <input class="state" type="checkbox">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            <div class="row">
                <select class="select">
                    <option disabled selected>Preset</option>
                </select>
            </div>
            <div class="row r2">
                <input class="brightness" type="range" min="1" max="255" value="0">
                <input class="brightness_label" type="number" min="1" max="255" value="0">
            </div>`;
        if (this.i['relays'] !== undefined && this.i['relays'].length > 0) {
            content += '<div class="row"><div class="relays">';
            for (let i = 0; i < this.i['relays'].length; i++) {
                content += `<div class="relay` + (this.i['relays'][i].hidden ? ' hidden' : '') + `">
                        <label class="toggle">
                            <input type="checkbox"` + (this.i['relays'][i].on ? " checked" : "") + `>
                            <span class="slider"></span>
                        </label>
                        <p class="name">` + this.i['relays'][i].name + `</p>
                </div>`;
            }
            content += "</div></div>";
        }
        UI.classList.add("device");
        UI.classList.add("offline");
        if (this.i.HideRelaysName) {
            UI.classList.add("hide_relays_name");
        }
        UI.style.order = (this.i.id).toString();
        UI.innerHTML = content;
        if (Options.HideOffDevices && !this.i.ShowOffline) {
            UI.classList.add("hide");
        }
        else {
            UI.classList.remove("hide");
        }
        const title = UI.getElementsByClassName("title")[0];
        const options = UI.getElementsByClassName("options")[0];
        const wled = UI.getElementsByClassName("wled")[0];
        const ledFx = UI.getElementsByClassName("ledFx")[0];
        const state = UI.getElementsByClassName("state")[0];
        const brightness = UI.getElementsByClassName("brightness")[0];
        const bLabel = UI.getElementsByClassName("brightness_label")[0];
        wled.addEventListener("click", (e) => {
            e.preventDefault();
            const page = window.open("http://" + this.i.ip + "/", "wled_manager-window");
            const timer = setInterval(() => { if (page.closed) {
                clearInterval(timer);
                this.refresh();
            } }, 1000);
        });
        ledFx.addEventListener("click", (e) => {
            e.preventDefault();
            const fx = Options.LedFx.Ip + ':' + Options.LedFx.Port;
            const page = window.open("http://" + fx + "/#/device/" + this.i.name.toLowerCase(), "wled_manager-window");
            const timer = setInterval(() => { if (page.closed) {
                clearInterval(timer);
                this.refresh();
            } }, 1000);
        });
        options.addEventListener("click", (e) => {
            e.preventDefault();
            this.contextmenu.call(this, e);
        });
        state.addEventListener("change", () => {
            sendRequest(this.i.ip, "json/state", { on: state.checked }, () => {
                console.log("State send:", state.checked);
            });
        });
        brightness.addEventListener("change", (ev) => {
            bLabel.value = ev.target.value;
            // on: state.checked, 
            sendRequest(this.i.ip, "json/state", { bri: brightness.value }, () => {
                console.log("Brightness send:", brightness.value);
            });
        });
        brightness.addEventListener("input", (ev) => {
            bLabel.value = ev.target.value;
        });
        bLabel.addEventListener('focus', () => {
            bLabel.select();
        });
        bLabel.addEventListener('keypress', (ev) => {
            if (ev.keyCode === 13) {
                ev.preventDefault();
                const event = new Event('change');
                brightness.value = bLabel.value;
                brightness.dispatchEvent(event);
            }
        });
        if (this.i['relays']) {
            const relays = UI.querySelectorAll(".relay input");
            for (let i = 0; i < relays.length; i++) {
                relays[i].addEventListener("change", (ev) => {
                    sendRequest(this.i.ip, "json", { MultiRelay: { relay: i, on: ev.target.checked } }, () => {
                        console.log("Relay state send:", i, ev.target.checked);
                        this.i['relays'][i].on = ev.target.checked ? 1 : 0;
                    });
                });
            }
        }
        this.UI = UI;
    }
    openOptions(parent, callback) {
        let content = `
            <div class="option">
                <div class="row">
                    <p class="title">${this.i.name}</p>
                </div>
            </div>
            <div class="option">
                <div class="row">
                    <input type="number" name="id" placeholder="Order: > 0" min="0" value="${this.i.id}">
                </div>
                <div class="row">
                    <input type="text" name="ip" placeholder="${this.i.name}" value="${this.i.ip}" readonly>
                </div>
                <div class="row">
                    <input type="text" name="name" placeholder="${this.i.name}" value="${this.i.customName}">
                </div>
                <div class="row">
                    <div class="left">
                        <img class="iconPreview" src="` + (this.i.Icon ? this.i.Icon : 'images/empty_icon.png') + `" alt="icon">
                    </div>
                    <div class="right">
                        <input name="Icon" type="file" accept="image/png, image/jpeg">
                    </div>
                </div>
                <div class="row">
                    <div class="left">
                        <p class="label">Show device if offline:</p>
                    </div>
                    <div class="right">
                        <label class="toggle">
                            <input class="state" type="checkbox" name="ShowOffline"` + (this.i.ShowOffline ? "checked" : "") + `>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>`;
        if (this.i['relays']) {
            content += `<div class="option">
                <div class="row">
                    <div class="left">
                        <p class="label">Hide relays names:</p>
                    </div>
                    <div class="right">
                        <label class="toggle">
                            <input class="state" type="checkbox" name="HideRelaysName"` + (this.i.HideRelaysName ? "checked" : "") + `>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>`;
            for (let i = 0; i < this.i['relays'].length; i++) {
                content += `
                <div class="row">
                    <div class="left">
                        <p class="label">Relay ${i}:</p>
                    </div>
                    <div class="right">
                        <div class="row">
                            <div class="left space">
                                <input type="text" name="relay_${i}" placeholder="Name" value="${hasValue(this.i['relays'][i].name)}">
                            </div>
                            <div class="right">
                                <label class="toggle">
                                    <input class="state" type="checkbox" name="relay_${i}_hidden"` + (this.i['relays'][i].hidden ? "checked" : "") + `>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>`;
            }
            content += '</div>';
        }
        content += `
            <div class="option">
                <div class="row">
                    <div class="left"></div>
                    <div class="right space_bw">
                        <button class="save">Save</button>
                        <button class="delete">Delete</button>
                    </div>
                </div>
            </div>`;
        parent.innerHTML = content;
        const save = parent.getElementsByClassName('save')[0];
        const remove = parent.getElementsByClassName('delete')[0];
        const icon = parent.getElementsByClassName('iconPreview')[0];
        save.addEventListener('click', async (ev) => {
            ev.preventDefault();
            this.i.customName = parent.name.value;
            this.i.ShowOffline = parent.ShowOffline.checked;
            if (parent.Icon.files.length > 0) {
                this.i.Icon = await toBase64(parent.Icon.files[0]);
                icon.src = this.i.Icon;
            }
            else {
                this.i.Icon = null;
            }
            if (this.i['relays']) {
                const relaysName = this.UI.querySelectorAll('.relays .name');
                this.i.HideRelaysName = parent.HideRelaysName.checked;
                for (let i = 0; i < this.i['relays'].length; i++) {
                    const name = parent['relay_' + i].value;
                    const hidden = parent['relay_' + i + '_hidden'].checked;
                    this.i['relays'][i].name = name;
                    this.i['relays'][i].hidden = hidden;
                    relaysName[i].innerText = name;
                    if (hidden) {
                        relaysName[i].parentElement.classList.add('hidden');
                    }
                    else {
                        relaysName[i].parentElement.classList.remove('hidden');
                    }
                }
                if (this.i.HideRelaysName) {
                    this.UI.classList.add("hide_relays_name");
                }
                else {
                    this.UI.classList.remove("hide_relays_name");
                }
            }
            callback(true);
        });
        remove.addEventListener('click', (ev) => {
            ev.preventDefault();
            callback(false);
        });
    }
    async refresh() {
        if (this.isRefresh) {
            return;
        }
        this.isRefresh = true;
        const title = this.UI.getElementsByClassName("title")[0];
        const state = this.UI.getElementsByClassName("state")[0];
        const brightness = this.UI.getElementsByClassName("brightness")[0];
        const sText = this.UI.getElementsByClassName("signal")[0];
        const sIcon = this.UI.getElementsByClassName("signal_icon")[0];
        const bLabel = this.UI.getElementsByClassName("brightness_label")[0];
        const status = this.UI.getElementsByClassName("status")[0];
        const relays = this.UI.querySelectorAll(".relay input");
        const dIcon = this.UI.getElementsByClassName("icon")[0];
        const presets = this.UI.getElementsByClassName("select")[0];
        status.src = "images/loading.svg";
        this.UI.classList.add("loading");
        if (this.i.Icon) {
            dIcon.innerHTML = `<img src="${this.i.Icon}" alt="icon">`;
        }
        else {
            dIcon.innerHTML = `<p>${this.i.id}</p>`;
        }
        await getRequest(this.i.ip).then(async (di) => {
            this.isRefresh = false;
            status.src = "images/none.svg";
            if (di === null) {
                sIcon.src = "images/offline.svg";
                sText.innerText = "Offline";
                this.UI.classList.remove("online");
                this.UI.classList.add("offline");
                this.UI.classList.remove("loading");
                if (Options.HideOffDevices && !this.i.ShowOffline) {
                    this.UI.classList.add("hide");
                }
                else {
                    this.UI.classList.remove("hide");
                }
                this.UI.style.order = (this.i.id).toString();
                if ((this.isOnline === true || this.isOnline === null) && Options.AutoRefreshOffline > 0) {
                    clearInterval(this.refreshTimer);
                    this.refreshTimer = setInterval(() => { this.refresh(); }, Options.AutoRefreshOffline * 1000);
                    console.log('Offline timer set!');
                }
                this.isOnline = false;
                return;
            }
            if (this.i.name !== di.info.name) {
                this.i.name = di.info.name;
            }
            this.UI.classList.remove("hide");
            state.checked = di.state.on;
            brightness.value = di.state.bri;
            bLabel.value = di.state.bri;
            if (di.state.MultiRelay) {
                for (let i = 0; i < relays.length; i++) {
                    relays[i].checked = di.state.MultiRelay.relays[i].state;
                }
            }
            await getPresets(this.i.ip).then(async (pi) => {
                let keys = Object.keys(pi);
                console.log(keys);
                for (let i = 1; i < keys.length; i++) {
                    let option = document.createElement('option');
                    option.innerText = pi[keys[i]]['n'];
                    option.dataset['id'] = i.toString();
                    if (di.state.ps == keys[i]) {
                        option.selected = true;
                    }
                    presets.add(option);
                }
                presets.onchange = (ev) => {
                    let target = ev.target;
                    let index = target.selectedIndex;
                    sendRequest(this.i.ip, "json", { 'ps': target.options[index].dataset['id'] }, () => {
                        console.log("Preset send:", target.options[index].innerText);
                    });
                    console.log(ev);
                };
            });
            const lvl = Math.ceil(di.info.wifi.signal / 20);
            sIcon.src = 'images/online-' + lvl + '.svg';
            sText.innerText = di.info.wifi.signal + "%";
            this.UI.classList.remove("offline");
            this.UI.classList.remove("live");
            this.UI.classList.add("online");
            if (di.info.live) {
                this.UI.classList.add("live");
            }
            this.UI.classList.remove("loading");
            if (Options.OnlineDevicesFirst) {
                this.UI.style.order = ((Devices.length * -1) + this.i.id).toString();
            }
            else {
                this.UI.style.order = (this.i.id).toString();
            }
            if ((this.isOnline === false || this.isOnline === null) && Options.AutoRefreshOnline > 0) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = setInterval(() => { this.refresh(); }, Options.AutoRefreshOnline * 1000);
                console.log('Online timer set!');
            }
            this.isOnline = true;
        });
        title.innerText = (this.i.customName === '') ? this.i.name : this.i.customName;
    }
    toString() {
        return JSON.stringify(this.i);
    }
};
function loadDevices(dList, dOptions, uMenu, uRefresh, callback) {
    const data = localStorage.getItem('devices');
    if (data === null) {
        saveDevices();
        return;
    }
    const list = JSON.parse(data);
    for (const data of list) {
        const device = new Device(data);
        Devices.push(device);
        dList.appendChild(device.UI);
        device.contextmenu = () => {
            device.openOptions(dOptions, (action) => {
                const data = dOptions.getElementsByTagName('input');
                if (action === false) {
                    device.UI.remove();
                    removeItemOnce(Devices, device);
                    uMenu.click();
                }
                else {
                    let from = device.i.id;
                    let to = data.id.valueAsNumber;
                    device.i.customName = data.name.value;
                    device.i.ShowOffline = data.ShowOffline.checked;
                    if (to !== from && to >= 0 && to < Devices.length) {
                        let tmp = Devices[from];
                        tmp.i.id = to;
                        if (from < to) {
                            for (let index = from; index < to; index++) {
                                Devices[index] = Devices[index + 1];
                                Devices[index].i.id = index;
                            }
                        }
                        else {
                            for (let index = from; index > to; index--) {
                                Devices[index] = Devices[index - 1];
                                Devices[index].i.id = index;
                            }
                        }
                        Devices[to] = tmp;
                        uRefresh.click();
                    }
                    device.refresh();
                }
                saveDevices();
                dOptions.classList.remove('open');
                dList.classList.add('open');
                uMenu.firstElementChild.src = './images/back.svg';
            });
            dList.classList.remove('open');
            dOptions.classList.add('open');
            uMenu.firstElementChild.src = './images/back.svg';
        };
    }
    callback();
}
function clearDevices(dList) {
    dList.innerText = '';
    Devices.length = 0;
}
function saveDevices() {
    let data = '[';
    for (let i = 0; i < Devices.length; i++) {
        if (i !== 0) {
            data += ',';
        }
        data += Devices[i].toString();
    }
    data += ']';
    console.log(data);
    localStorage.setItem('devices', data);
}
function findDevice(data) {
    for (let i = 0; i < Devices.length; i++) {
        if (Devices[i].i.ip === data.ip) {
            return true;
        }
    }
    return false;
}
function removeItemOnce(arr, value) {
    const index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}
function Initialize() {
    const content = document.getElementsByClassName("content")[0];
    const uMenu = document.getElementById("user_menu");
    const uRefresh = document.getElementById("user_refresh");
    const uAdd = document.getElementById("user_add");
    const uLedFx = document.getElementById("user_ledfx");
    const gOptions = document.getElementById("global_options");
    const gOptionsSave = document.getElementById("options_save");
    const dAdd = document.getElementById("device_add");
    const dList = document.getElementById("device_list");
    const dOptions = document.getElementById("device_options");
    const oImport = document.getElementById("options_import");
    const oExport = document.getElementById("options_export");
    const bOnline = document.getElementById("button_online");
    const bOffline = document.getElementById("button_offline");
    uMenu.addEventListener('click', (e) => {
        if (dList.classList.contains('open')) {
            dList.classList.remove('open');
            gOptions.classList.add('open');
            uMenu.firstElementChild.src = './images/back.svg';
        }
        else if (gOptions.classList.contains('open')) {
            gOptions.classList.remove('open');
            dList.classList.add('open');
            uMenu.firstElementChild.src = './images/menu.svg';
        }
        else if (dAdd.classList.contains('open')) {
            dAdd.classList.remove('open');
            dList.classList.add('open');
            uMenu.firstElementChild.src = './images/menu.svg';
        }
        else if (dOptions.classList.contains('open')) {
            dOptions.classList.remove('open');
            dList.classList.add('open');
            uMenu.firstElementChild.src = './images/menu.svg';
        }
    });
    uRefresh.addEventListener('click', async () => {
        if (!Devices.length || uRefresh.classList.contains('loading')) {
            return;
        }
        let devicesLoaded = 0;
        uRefresh.firstElementChild.onanimationiteration = () => {
            if (devicesLoaded >= Devices.length) {
                uRefresh.classList.remove('loading');
            }
        };
        uRefresh.classList.add('loading');
        for (const device of Devices) {
            device.refresh().finally(() => {
                devicesLoaded++;
            });
        }
    });
    uAdd.addEventListener('click', (e) => {
        if (dList.classList.contains('open')) {
            dList.classList.remove('open');
        }
        else if (gOptions.classList.contains('open')) {
            gOptions.classList.remove('open');
        }
        else if (dOptions.classList.contains('open')) {
            dOptions.classList.remove('open');
        }
        dAdd.classList.add('open');
        uMenu.firstElementChild.src = './images/back.svg';
    });
    dAdd.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const data = {
            ip: ev.target[0].value,
            customName: ev.target[1].value,
            ShowOffline: ev.target[3].checked
        };
        if (findDevice(data)) {
            alert('Device already exists with: ' + data.ip);
            return;
        }
        const device = new Device(data);
        dList.appendChild(device.UI);
        uMenu.click();
        device.refresh().then(() => {
            Devices.push(device);
            saveDevices();
        });
    });
    uLedFx.addEventListener('click', () => {
        const page = 'http://' + Options.LedFx.Ip + ':' + Options.LedFx.Port + '/' + Options.LedFx.Page;
        window.open(page, "wled_manager-window");
    });
    /*hod.addEventListener("click", (ev) => {
        Options.HideOffDevices = ev.target.checked;
asdasdasda asd asd
        saveOptions();asdasdasd asdasdasdasdasd
    });*/
    oImport.addEventListener("click", (ev) => {
        const input = document.createElement('input');
        const reader = new FileReader();
        input.type = 'file';
        input.multiple = false;
        input.onchange = e => {
            const file = e.target.files[0];
            reader.readAsText(file, 'UTF-8');
        };
        reader.onload = readerEvent => {
            const content = readerEvent.target.result.toString();
            localStorage.setItem('devices', content);
            clearDevices(dList);
            loadDevices(dList, dOptions, uMenu, uRefresh, function () {
                uRefresh.click();
            });
            console.log(content);
        };
        input.click();
    });
    oExport.addEventListener("click", (ev) => {
        const link = document.createElement("a");
        const devices = localStorage.getItem('devices');
        const file = new File([devices], 'Devices.json', { type: 'application/json' });
        link.setAttribute("download", "Devices.json");
        link.href = URL.createObjectURL(file);
        link.click();
        URL.revokeObjectURL(link.href);
    });
    bOnline.addEventListener('click', (e) => {
        const state = dList.classList.toggle('show_offline');
        console.log(state);
        bOnline.lastElementChild.textContent = state ? 'Offline' : 'Online';
    });
    gOptionsSave.addEventListener("click", (ev) => {
        const g = gOptions.getElementsByTagName('input');
        Options.HideOffDevices = g.HideOffDevices.checked;
        Options.OnlineDevicesFirst = g.OnlineDevicesFirst.checked;
        Options.LedFx.Ip = g.LedFxIp.value;
        Options.LedFx.Port = g.LedFxPort.value;
        Options.LedFx.Page = g.LedFxPage.value;
        Options.AutoRefreshOnline = g.AutoRefreshOnline.value;
        Options.AutoRefreshOffline = g.AutoRefreshOffline.value;
        saveOptions(() => {
            uMenu.click();
            uRefresh.click();
        });
        ev.preventDefault();
    });
    // Initialize the list of devices:
    loadOptions(function () {
        const g = gOptions.getElementsByTagName('input');
        g.HideOffDevices.checked = this.HideOffDevices;
        g.OnlineDevicesFirst.checked = this.OnlineDevicesFirst;
        g.LedFxIp.value = this.LedFx.Ip;
        g.LedFxPort.value = this.LedFx.Port;
        g.LedFxPage.value = this.LedFx.Page;
        g.AutoRefreshOnline.value = this.AutoRefreshOnline;
        g.AutoRefreshOffline.value = this.AutoRefreshOffline;
    });
    content.scrollTop = 0;
    loadDevices(dList, dOptions, uMenu, uRefresh, function () {
        uRefresh.click();
    });
    function reorderDiv() {
        const elements = [...dList.children];
        elements.sort((elementA, elementB) => {
            const is1Online = elementA.classList.contains('online') ? 0 : 1;
            const is2Online = elementB.classList.contains('online') ? 0 : 1;
            /*if (is1Online) {
                return 1;
            } else if (is2Online) {
                return 2;
            }*/
            return is1Online - is2Online;
        }).forEach(element => dList.appendChild(element));
    }
}
window.addEventListener("load", () => {
    Initialize();
});
