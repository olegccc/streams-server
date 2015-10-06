///<reference path='../interfaces/IServerConfiguration.ts'/>
///<reference path='../interfaces/IConfiguration.ts'/>

import fs = require('fs');

export class Configuration implements IConfiguration {
    getServerConfiguration(callback: (error: Error, configuration?: IServerConfiguration) => void) {
        fs.readFile(__dirname + '/server.json', {
            encoding: 'utf8'
        }, (error: Error, data: string) => {
            if (error) {
                callback(error);
            } else {
                var file = JSON.parse(data);
                callback(error, file);
            }
        });
    }
}
