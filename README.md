![Logo](admin/suedwind-ambientika.png)
# ioBroker.suedwind-ambientika

[![NPM version](https://img.shields.io/npm/v/iobroker.suedwind-ambientika.svg)](https://www.npmjs.com/package/iobroker.suedwind-ambientika)
[![Downloads](https://img.shields.io/npm/dm/iobroker.suedwind-ambientika.svg)](https://www.npmjs.com/package/iobroker.suedwind-ambientika)
![Number of Installations](https://iobroker.live/badges/suedwind-ambientika-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/suedwind-ambientika-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.suedwind-ambientika.png?downloads=true)](https://nodei.co/npm/iobroker.suedwind-ambientika/)

**Tests:** ![Test and Release](https://github.com/baeriwiliwonka/ioBroker.suedwind-ambientika/workflows/Test%20and%20Release/badge.svg)

## suedwind-ambientika adapter for ioBroker

Integration for Südwind Ambientika Smart decentral ventilation systems

# Getting started

## Settings

Enter your Ambientika Username (E-Mail) and Password. 

Click "+" to add a new device. 

Enter the serial number of the device. It is the device's Wifi-name, so you can find it in your router. 

It starts with VMC-xxxxxxxxxxxx. 

Enter the number without the leading VMC, just the 12 digits. 

If needed you can adapt the refresh intervall. 



## Changelog

### 0.0.1
* (baeriwiliwonka) initial release
* supports multi device handling
* supports reading the status of the device
* supports writing for mode, fanspeed and humidity_level
* refresh intervall can be modified

### DISCLAIMER

Please make sure that you consider copyrights and trademarks when you use names or logos of a company and add a disclaimer to your README.
You can check other adapters for examples or ask in the developer community. Using a name or logo of a company without permission may cause legal problems for you.

## License
MIT License

Copyright (c) 2026 baeriwiliwonka <soerenmilimonka@gmx.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
