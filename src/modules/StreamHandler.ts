///<reference path='../interfaces/IDataChannel.ts'/>
///<reference path='../interfaces/IRequest.ts'/>
///<reference path='../interfaces/IResponse.ts'/>
///<reference path='../interfaces/IRecord.ts'/>

import { Constants } from '../interfaces/Constants';

export class StreamHandler {
    private dataChannel: IDataChannel;

    constructor(dataChannel?: IDataChannel) {
        this.dataChannel = dataChannel;
    }

    processRequest(request: IRequest, callback: (response: IResponse) => void){
        try {
            switch (request.command) {
                case Constants.COMMAND_IDS:
                    this.processCommandIds(callback);
                    return;
                case Constants.COMMAND_READ:
                    this.processRead(request.id, callback);
                    return;
                case Constants.COMMAND_UPDATE:
                    this.processUpdate(request.record, request.echo, callback);
                    return;
                case Constants.COMMAND_CREATE:
                    this.processCreate(request.record, callback);
                    return;
                case Constants.COMMAND_DELETE:
                    this.processDelete(request.id, callback);
                    return;
                case Constants.COMMAND_VERSION:
                    this.processVersion(callback);
                    return;
                case Constants.COMMAND_CHANGES:
                    this.processChanges(request.version, callback);
                    return;
            }
        } catch (error) {
            callback(StreamHandler.createError(error.toString()));
        }

        callback(StreamHandler.createError("Unknown command"));
    }

    private static createError(message: string): IResponse {
        var ret: IResponse = <any>{};
        ret.error = message;
        return ret;
    }

    private processCommandIds(callback: (response: IResponse) => void): void {
        this.dataChannel.getIds(null, (error: Error, ids) => {
            if (error) {
                callback(StreamHandler.createError(error.toString()));
                return;
            }
            var ret: IResponse = <any>{};
            ret.ids = ids;
            callback(ret);
        });
    }

    private processRead(id: string, callback: (response: IResponse) => void): void {

        this.dataChannel.read(id, (error: Error, record: IRecord) => {
            if (error) {
                callback(StreamHandler.createError(error.toString()));
                return;
            }
            var ret: IResponse = <any>{};
            ret.record = record;
            callback(ret);
        });
    }

    private processUpdate(record: IRecord, echo: boolean, callback: (response: IResponse) => void): void {

        this.dataChannel.update(record, (error: Error, record: IRecord) => {
            if (error) {
                callback(StreamHandler.createError(error.toString()));
                return;
            }
            var ret: IResponse = <any>{};
            ret.record = echo ? record : <any>true;
            callback(ret);
        });
    }

    private processCreate(record: IRecord, callback: (response: IResponse) => void): void {

        this.dataChannel.create(record, (error: Error, record: IRecord) => {
            if (error) {
                callback(StreamHandler.createError(error.toString()));
                return;
            }
            callback(<any>{});
        });
    }

    private processDelete(id: string, callback: (response: IResponse) => void): void {

        this.dataChannel.remove(id, (error: Error) => {
            if (error) {
                callback(StreamHandler.createError(error.toString()));
                return;
            }
            callback(<any>{});
        });
    }

    private processVersion(callback: (response: IResponse) => void): void {
        this.dataChannel.getVersion((error: Error, version: string) => {
            if (error) {
                callback(StreamHandler.createError(error.toString()));
                return;
            }
            var ret: IResponse = <any>{};
            ret.version = version;
            callback(ret);
        });
    }

    private processChanges(version: string, callback: (response: IResponse) => void): void {

        this.dataChannel.getUpdates(version, null, (error: Error, updates: IUpdate[]) => {
            if (error) {
                callback(StreamHandler.createError(error.toString()));
                return;
            }
            var ret: IResponse = <any>{};
            ret.changes = updates;
            callback(ret);
        });
    }
}
