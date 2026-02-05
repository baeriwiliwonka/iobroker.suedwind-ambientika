"use strict";
const utils = require("@iobroker/adapter-core");

class SuedwindAmbientika extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: "suedwind-ambientika" });
        this.on("ready", this.onReady.bind(this));
    }

    async onReady() {
        // Wir nehmen die Seriennummer oder "TestGerät" als Fallback
        const folderName = this.config.SerialNumber || "TestGeraet_123";
        this.log.info(`Erstelle Struktur für: ${folderName}`);

        // 1. Erstelle den Ordner (Channel)
        await this.setObjectNotExistsAsync(folderName, {
            type: "channel",
            common: { name: "Mein Lüfter" },
            native: {},
        });

        // 2. Erstelle einen Test-Datenpunkt im Ordner
        await this.setObjectNotExistsAsync(`${folderName}.testState`, {
            type: "state",
            common: {
                name: "Test Punkt",
                type: "string",
                role: "state",
                read: true,
                write: true
            },
            native: {},
        });

        // 3. Wert schreiben
        await this.setStateAsync(`${folderName}.testState`, "Hallo Struktur", true);
        
        this.log.info("Test-Struktur wurde angelegt. Bitte prüfe jetzt den Reiter 'Objekte'.");
    }
}

if (require.main !== module) {
    module.exports = (options) => new SuedwindAmbientika(options);
} else {
    new SuedwindAmbientika();
}