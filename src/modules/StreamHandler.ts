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

    processRequest(request: IRequest): IResponse {
        try {
            switch (request.command) {
                case Constants.COMMAND_IDS:
                    return this.processCommandIds();
                case Constants.COMMAND_READ:
                    return this.processRead(request.id);
                case Constants.COMMAND_UPDATE:
                    return this.processUpdate(request.record, request.echo);
                case Constants.COMMAND_CREATE:
                    return this.processCreate(request.record);
                case Constants.COMMAND_DELETE:
                    return this.processDelete(request.id);
            }
        } catch (error) {
            return StreamHandler.createError(error.toString());
        }

        return StreamHandler.createError("Unknown command");
    }

    private static createError(message: string): IResponse {
        var ret: IResponse = <any>{};
        ret.error = message;
        return ret;
    }

    private processCommandIds(): IResponse {
        var ret: IResponse = <any>{};
        ret.ids = this.dataChannel.getIds();
        return ret;
    }

    private processRead(id: string): IResponse {
        var record = this.dataChannel.read(id);

        if (record === null) {
            return StreamHandler.createError("Unknown record");
        }

        var ret: IResponse = <any>{};
        ret.record = record;
        return ret;
    }

    private processUpdate(record: IRecord, echo: boolean): IResponse {
        var updated = this.dataChannel.update(record);
        if (!updated) {
            return StreamHandler.createError("Unknown record");
        }
        var ret: IResponse = <any>{};
        ret.record = echo ? updated : <any>true;
        return ret;
    }

    private processCreate(record: IRecord): IResponse {
        this.dataChannel.create(record);
        return <any>{};
    }

    private processDelete(id: string): IResponse {
        this.dataChannel.remove(id);
        return <any>{};
    }
}
