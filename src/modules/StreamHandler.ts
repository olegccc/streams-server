///<reference path='../interfaces/IDataChannel.ts'/>
///<reference path='../interfaces/IRequest.ts'/>
///<reference path='../interfaces/IResponse.ts'/>
///<reference path='../interfaces/IRecord.ts'/>
///<reference path='../interfaces/IUser.ts'/>
///<reference path='../interfaces/IServerConfiguration.ts'/>

import { Constants } from '../interfaces/Constants';
import { NodeAccessValidator } from '../security/NodeAccessValidator';
import _ = require('lodash');

export class StreamHandler {
    private dataChannel: IDataChannel;
    private nodeAccessValidator: NodeAccessValidator;
    private serverConfiguration: IServerConfiguration;

    constructor(nodeAccessValidator: NodeAccessValidator, dataChannel: IDataChannel, serverConfiguration: IServerConfiguration) {
        this.dataChannel = dataChannel;
        this.nodeAccessValidator = nodeAccessValidator;
        this.serverConfiguration = serverConfiguration;
    }

    processRequest(request: IRequest, user: IUser, callback: (error: Error, response?: IResponse) => void) {

        if (!this.nodeAccessValidator) {
            this.processRequestWithRights(request, callback);
            return;
        }

        this.nodeAccessValidator.effectiveRights(user ? user.id : null, request.nodeId || null, (error: Error, rights?: string[]) => {
            if (error) {
                callback(error);
                return;
            }

            request.rights = {};
            request.access = {};

            _.each(rights, (right: string) => {
                request.rights[right] = true;
                _.each(this.serverConfiguration.access[right], (access: string) => {
                    request.access[access] = true;
                })
            });

            this.processRequestWithRights(request, callback);
        });
    }

    private checkAccess(request: IRequest, access: string, callback: (error: Error, response?: IResponse) => void): boolean {
        if (!this.nodeAccessValidator) {
            return true;
        }
        if (request.access[access]) {
            return true;
        }
        callback(new Error('No ' + access + ' access'));
        return false;
    }

    private checkReadAccess(request: IRequest, callback: (error: Error, response?: IResponse) => void): boolean {
        return this.checkAccess(request, 'read', callback);
    }

    private checkWriteAccess(request: IRequest, callback: (error: Error, response?: IResponse) => void): boolean {
        return this.checkAccess(request, 'write', callback);
    }

    processRequestWithRights(request: IRequest, callback: (error: Error, response?: IResponse) => void){
        try {
            switch (request.command) {
                case Constants.COMMAND_IDS:
                    if (!this.checkReadAccess(request, callback)) {
                        return;
                    }
                    this.processCommandIds(callback);
                    return;
                case Constants.COMMAND_READ:
                    if (!this.checkReadAccess(request, callback)) {
                        return;
                    }
                    this.processRead(request.id, callback);
                    return;
                case Constants.COMMAND_UPDATE:
                    if (!this.checkWriteAccess(request, callback)) {
                        return;
                    }
                    this.processUpdate(request.record, request.echo, callback);
                    return;
                case Constants.COMMAND_CREATE:
                    if (!this.checkWriteAccess(request, callback)) {
                        return;
                    }
                    this.processCreate(request.record, callback);
                    return;
                case Constants.COMMAND_DELETE:
                    if (!this.checkWriteAccess(request, callback)) {
                        return;
                    }
                    this.processDelete(request.id, callback);
                    return;
                case Constants.COMMAND_VERSION:
                    if (!this.checkReadAccess(request, callback)) {
                        return;
                    }
                    this.processVersion(callback);
                    return;
                case Constants.COMMAND_CHANGES:
                    if (!this.checkReadAccess(request, callback)) {
                        return;
                    }
                    this.processChanges(request.version, callback);
                    return;
            }
        } catch (error) {
            callback(error);
            return;
        }

        callback(new Error("Unknown command"));
    }

    private processCommandIds(callback: (error: Error, response?: IResponse) => void): void {
        this.dataChannel.getIds(null, null, (error: Error, ids) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.ids = ids;
            callback(null, ret);
        });
    }

    private processRead(id: string, callback: (error: Error, response?: IResponse) => void): void {

        this.dataChannel.read(id, (error: Error, record: IRecord) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.record = record;
            callback(null, ret);
        });
    }

    private processUpdate(record: IRecord, echo: boolean, callback: (error: Error, response?: IResponse) => void): void {

        this.dataChannel.update(record, (error: Error, record: IRecord) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.record = echo ? record : <any>true;
            callback(null, ret);
        });
    }

    private processCreate(record: IRecord, callback: (error: Error, response?: IResponse) => void): void {

        this.dataChannel.create(record, (error: Error) => {
            if (error) {
                callback(error);
                return;
            }
            callback(null, <any>{});
        });
    }

    private processDelete(id: string, callback: (error: Error, response?: IResponse) => void): void {

        this.dataChannel.remove(id, (error: Error) => {
            if (error) {
                callback(error);
                return;
            }
            callback(null, <any>{});
        });
    }

    private processVersion(callback: (error: Error, response?: IResponse) => void): void {
        this.dataChannel.getVersion((error: Error, version: string) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.version = version;
            callback(null, ret);
        });
    }

    private processChanges(version: string, callback: (error: Error, response?: IResponse) => void): void {

        this.dataChannel.getUpdates(version, null, null, (error: Error, updates: IUpdate[]) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.changes = updates;
            callback(null, ret);
        });
    }
}
