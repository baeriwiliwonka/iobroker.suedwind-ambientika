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
        this.log.info("Südwind Ambientika v0.0.3: Sync-Modus & Signalstärke Fix.");
        let interval = parseInt(this.config.refreshInterval) || 60;
        if (interval < 10) interval = 10;

        await this.subscribeStatesAsync("*");
        await this.updateData();

        this.refreshInterval = setInterval(() => {
            this.updateData().catch(err => this.log.error("Update Fehler: " + err.message));
        }, interval * 1000);
    }

    async updateData() {
        const { Username, Password, devices } = this.config;
        if (!Username || !Password || !devices || !Array.isArray(devices)) return;

        try {
            const authRes = await axios.post("https://app.ambientika.eu:4521/users/authenticate", {
                username: Username, password: Password
            }, { timeout: 10000 });

            const token = authRes.data.jwtToken;

            for (const device of devices) {
                const serial = device.serial?.trim();
                if (!serial) continue;

                try {
                    const statusRes = await axios.get("https://app.ambientika.eu:4521/device/device-status", {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { deviceSerialNumber: serial },
                        timeout: 10000
                    });

                    const d = statusRes.data;
                    if (d) {
                        const isMaster = (d.deviceRole === "Master");
                        
                        await this.setObjectNotExistsAsync(serial, {
                            type: "device",
                            common: { name: device.name || serial },
                            native: {},
                        });

                        // Definition der States: Keys = Values für einfaches Blockly
                        const states = [
                            { 
                                id: "operatingMode", 
                                name: "Betriebsmodus", 
                                type: "string", 
                                role: "level.mode.fan", 
                                write: isMaster, 
                                states: { 
                                    "Off": "Off", "Auto": "Auto", "Night": "Night", "AwayHome": "AwayHome", 
                                    "ManualHeatRecovery": "ManualHeatRecovery", "Expulsion": "Expulsion", 
                                    "Intake": "Intake", "TimedExpulsion": "TimedExpulsion", 
                                    "Surveillance": "Surveillance", "Smart": "Smart" 
                                } 
                            },
                            { 
                                id: "fanSpeed", 
                                name: "Lüfterstufe", 
                                type: "string", 
                                role: "level.speed", 
                                write: isMaster, 
                                states: { "Low": "Low", "Medium": "Medium", "High": "High" } 
                            },
                            { 
                                id: "humidityLevel", 
                                name: "Feuchtigkeitsschwelle", 
                                type: "string", 
                                role: "level.humidity", 
                                write: isMaster, 
                                states: { "Low": "Low", "Normal": "Normal", "High": "High" } 
                            },
                            { id: "lastOperatingMode", name: "Letzter Modus", type: "string", role: "state", write: false },
                            { id: "temperature", name: "Temperatur", type: "number", role: "value.temperature", unit: "°C", write: false },
                            { id: "humidity", name: "Luftfeuchtigkeit", type: "number", role: "value.humidity", unit: "%", write: false },
                            { id: "airQuality", name: "Luftqualität", type: "string", role: "text", write: false },
                            { id: "signalStrength", name: "WiFi Signalstärke", type: "number", role: "value.signal", write: false },
                            { id: "isOnline", name: "Gerät Online (Cloud)", type: "boolean", role: "indicator.reachable", write: false },
                            { id: "deviceRole", name: "Rolle", type: "string", role: "state", write: false },
                            { id: "deviceType", name: "Gerätetyp", type: "string", role: "state", write: false },
                            { id: "humidityAlarm", name: "Feuchtigkeits-Alarm", type: "boolean", role: "indicator.alarm", write: false },
                            { id: "nightAlarm", name: "Lichtsensor/Nacht-Alarm", type: "boolean", role: "indicator.alarm", write: false },
                            { id: "lightSensorLevel", name: "Lichtsensor Level", type: "string", role: "state", write: false }
                        ];

                        if (isMaster) {
                            states.push({ id: "filtersStatus", name: "Filterstatus", type: "string", role: "state", write: false });
                            states.push({ id: "resetFilter", name: "Filter-Timer zurücksetzen", type: "boolean", role: "button", write: true, read: false });
                        }

                        for (const s of states) {
                            await this.extendObjectAsync(`${serial}.${s.id}`, {
                                type: "state", common: s, native: {}
                            });
                        }

                        // WERTE BEFÜLLEN
                        await this.setStateAsync(`${serial}.operatingMode`, d.operatingMode || "Off", true);
                        await this.setStateAsync(`${serial}.fanSpeed`, d.fanSpeed || "Low", true);
                        await this.setStateAsync(`${serial}.humidityLevel`, d.humidityLevel || "Normal", true);
                        await this.setStateAsync(`${serial}.lastOperatingMode`, d.lastOperatingMode || "", true);
                        await this.setStateAsync(`${serial}.temperature`, d.temperature || 0, true);
                        await this.setStateAsync(`${serial}.humidity`, d.humidity || 0, true);
                        await this.setStateAsync(`${serial}.airQuality`, d.airQuality || "N/A", true);
                        
                        // FIX: Hier wird d.signalStrenght (mit Fehler) von der API gelesen, 
                        // aber in unseren korrekt benannten Datenpunkt .signalStrength geschrieben.
                        await this.setStateAsync(`${serial}.signalStrength`, d.signalStrenght || 0, true);
                        
                        await this.setStateAsync(`${serial}.isOnline`, true, true);
                        await this.setStateAsync(`${serial}.deviceRole`, d.deviceRole || "", true);
                        await this.setStateAsync(`${serial}.deviceType`, d.deviceType || "", true);
                        await this.setStateAsync(`${serial}.humidityAlarm`, !!d.humidityAlarm, true);
                        await this.setStateAsync(`${serial}.nightAlarm`, !!d.nightAlarm, true);
                        await this.setStateAsync(`${serial}.lightSensorLevel`, d.lightSensorLevel || "", true);

                        if (isMaster) {
                            await this.setStateAsync(`${serial}.filtersStatus`, d.filtersStatus || "OK", true);
                        }
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

        const obj = await this.getObjectAsync(id);
        if (obj && obj.common && obj.common.write === false) {
            this.log.warn(`Steuerung ignoriert: ${id} ist schreibgeschützt.`);
            return;
        }

        try {
            const authRes = await axios.post("https://app.ambientika.eu:4521/users/authenticate", {
                username: this.config.Username, password: this.config.Password
            });
            const token = authRes.data.jwtToken;

            if (stateName === "resetFilter") {
                await axios.post("https://app.ambientika.eu:4521/device/reset-filter", { deviceSerialNumber: serial }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                await this.setStateAsync(id, false, true);
                return;
            }

            const statusRes = await axios.get("https://app.ambientika.eu:4521/device/device-status", {
                headers: { Authorization: `Bearer ${token}` },
                params: { deviceSerialNumber: serial }
            });
            const cur = statusRes.data;

            let payload = {
                deviceSerialNumber: serial,
                operatingMode: stateName === "operatingMode" ? state.val : cur.operatingMode,
                fanSpeed: stateName === "fanSpeed" ? state.val : cur.fanSpeed,
                humidityLevel: stateName === "humidityLevel" ? state.val : cur.humidityLevel
            };

            await axios.post("https://app.ambientika.eu:4521/device/change-mode", payload, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
            });

            await this.setStateAsync(id, state.val, true);
            this.log.info(`Änderung erfolgreich: ${stateName} -> ${state.val}`);

        } catch (err) {
            this.log.error(`Steuerungsfehler bei ${stateName}: ${err.message}`);
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