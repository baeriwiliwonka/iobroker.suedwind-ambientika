"use strict";

const utils = require("@iobroker/adapter-core");
const axios = require("axios");

class SuedwindAmbientika extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: "suedwind-ambientika" });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
        this.refreshInterval = null;
    }

    async onReady() {
        this.log.info("Südwind Ambientika Adapter wird gestartet (Dropdowns für Speed & Humidity aktiv)...");

        let interval = parseInt(this.config.refreshInterval) || 60;
        if (interval < 10) interval = 10;

        await this.subscribeStatesAsync("*");
        await this.updateData();

        this.refreshInterval = setInterval(() => {
            this.updateData().catch(err => this.log.error("Fehler im Intervall: " + err.message));
        }, interval * 1000);
    }

    async updateData() {
        const username = this.config.Username;
        const password = this.config.Password;
        const devices = this.config.devices;

        if (!username || !password || !devices || !Array.isArray(devices)) return;

        try {
            const authRes = await axios.post("https://app.ambientika.eu:4521/users/authenticate", {
                username: username, password: password
            }, { timeout: 10000 });

            const token = authRes.data.jwtToken;
            const fanMap = { Low: 1, Medium: 2, High: 3 };

            for (const device of devices) {
                const serial = device.serial?.trim();
                if (!serial) continue;

                await this.setObjectNotExistsAsync(serial, {
                    type: "device",
                    common: { name: device.name || serial },
                    native: {},
                });

                const states = [
                    { 
                        id: "operatingMode", 
                        name: "Betriebsmodus", 
                        type: "string", 
                        role: "level.mode.fan", 
                        write: true, 
                        states: { 
                            "Off": "Aus", 
                            "Smart": "Smart", 
                            "Auto": "Auto", 
                            "Night": "Nachtmodus", 
                            "AwayHome": "Abwesend", 
                            "ManualHeatRecovery": "Wärmerückgewinnung", 
                            "Expulsion": "Abluft", 
                            "Intake": "Zuluft",
                            "MasterSlave": "Master-Slave", 
                            "SlaveMaster": "Slave-Master", 
                            "TimedExpulsion": "Zeit-Abluft", 
                            "Surveillance": "Überwachung"
                            }
                    },
                    { 
                        id: "fanSpeed", 
                        name: "Lüfterstufe", 
                        type: "number", 
                        role: "level.speed", 
                        write: true, 
                        min: 1, 
                        max: 3, 
                        states: { 1: "Stufe 1 (Niedrig)", 2: "Stufe 2 (Mittel)", 3: "Stufe 3 (Hoch)" } 
                    },
                    { 
                        id: "humidityLevel", 
                        name: "Feuchtigkeitsschwelle", 
                        type: "number", 
                        role: "level.humidity", 
                        write: true, 
                        min: 1, 
                        max: 3, 
                        states: { 1: "Niedrig", 2: "Mittel", 3: "Hoch" } 
                    },
                    { id: "temperature", name: "Temperatur", type: "number", role: "value.temperature", unit: "°C", write: false },
                    { id: "humidity", name: "Luftfeuchtigkeit", type: "number", role: "value.humidity", unit: "%", write: false },
                    { id: "airQuality", name: "Luftqualität", type: "number", role: "value", write: false },
                    { id: "filtersStatus", name: "Filterstatus", type: "string", role: "state", write: false },
                    { id: "humidityAlarm", name: "Feuchtigkeitsalarm", type: "boolean", role: "indicator.alarm", write: false },
                    { id: "nightAlarm", name: "Nachtalarm / Lichtsensor", type: "boolean", role: "indicator.alarm", write: false },
                    { id: "lightSensorLevel", name: "Lichtsensor Level", type: "string", role: "state", write: false },
                    { id: "deviceRole", name: "Geräterolle (Master/Slave)", type: "string", role: "state", write: false },
                    { id: "lastOperatingMode", name: "Letzter Modus", type: "string", role: "state", write: false },
                    { id: "deviceType", name: "Gerätetyp", type: "string", role: "state", write: false },
                    { id: "authStatus", name: "Verbindung zur Cloud", type: "string", role: "indicator.connected", write: false }
                ];

                for (const s of states) {
                    await this.setObjectNotExistsAsync(`${serial}.${s.id}`, {
                        type: "state",
                        common: { ...s, read: true },
                        native: {},
                    });
                }

                try {
                    const statusRes = await axios.get("https://app.ambientika.eu:4521/device/device-status", {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { deviceSerialNumber: serial },
                        timeout: 10000
                    });

                    const d = statusRes.data;
                    if (d) {
                        await this.setStateAsync(`${serial}.operatingMode`, d.operatingMode || "Off", true);
                        await this.setStateAsync(`${serial}.fanSpeed`, fanMap[d.fanSpeed] || 1, true);
                        await this.setStateAsync(`${serial}.humidityLevel`, parseInt(d.humidityLevel) || 1, true);
                        await this.setStateAsync(`${serial}.temperature`, d.temperature || 0, true);
                        await this.setStateAsync(`${serial}.humidity`, d.humidity || 0, true);
                        await this.setStateAsync(`${serial}.airQuality`, d.airQuality || 0, true);
                        await this.setStateAsync(`${serial}.filtersStatus`, d.filtersStatus || "OK", true);
                        await this.setStateAsync(`${serial}.humidityAlarm`, !!d.humidityAlarm, true);
                        await this.setStateAsync(`${serial}.nightAlarm`, !!d.nightAlarm, true);
                        await this.setStateAsync(`${serial}.lightSensorLevel`, d.lightSensorLevel || "", true);
                        await this.setStateAsync(`${serial}.deviceRole`, d.deviceRole || "", true);
                        await this.setStateAsync(`${serial}.lastOperatingMode`, d.lastOperatingMode || "", true);
                        await this.setStateAsync(`${serial}.deviceType`, d.deviceType || "", true);
                        await this.setStateAsync(`${serial}.authStatus`, "Verbunden", true);
                    }
                } catch (e) {
                    this.log.error(`Fehler bei Gerät ${serial}: ${e.message}`);
                }
            }
        } catch (err) {
            this.log.error(`Globaler Fehler: ${err.message}`);
        }
    }

    async onStateChange(id, state) {
        if (!state || state.ack) return;

        const parts = id.split(".");
        const serial = parts[2];
        const stateName = parts[3];

        try {
            const authRes = await axios.post("https://app.ambientika.eu:4521/users/authenticate", {
                username: this.config.Username, password: this.config.Password
            });
            const token = authRes.data.jwtToken;

            const statusRes = await axios.get("https://app.ambientika.eu:4521/device/device-status", {
                headers: { Authorization: `Bearer ${token}` },
                params: { deviceSerialNumber: serial }
            });
            const cur = statusRes.data;
            const fanMapRev = { 1: "Low", 2: "Medium", 3: "High" };

            let payload = {
                deviceSerialNumber: serial,
                operatingMode: cur.operatingMode,
                fanSpeed: cur.fanSpeed, // Bereits im richtigen String-Format von API
                humidityLevel: parseInt(cur.humidityLevel) || 1
            };

            if (stateName === "operatingMode") payload.operatingMode = state.val;
            if (stateName === "fanSpeed") payload.fanSpeed = fanMapRev[state.val] || "Low";
            if (stateName === "humidityLevel") payload.humidityLevel = parseInt(state.val);

            if (["operatingMode", "fanSpeed", "humidityLevel"].includes(stateName)) {
                await axios.post("https://app.ambientika.eu:4521/device/change-mode", payload, {
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
                });

                await this.setStateAsync(id, state.val, true);
                this.log.info(`${serial}: ${stateName} auf ${state.val} gesetzt.`);
                setTimeout(() => this.updateData(), 2500);
            }
            
        } catch (err) {
            this.log.error(`Steuerungsfehler für ${serial}: ${err.message}`);
        }
    }

    onUnload(callback) {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        callback();
    }
}

if (require.main !== module) {
    module.exports = (options) => new SuedwindAmbientika(options);
} else {
    new SuedwindAmbientika();
}