///<reference path='../interfaces/IDataChannel.ts'/>
///<reference path='../interfaces/IDataChannelFactory.ts'/>
///<reference path='../interfaces/IRequest.ts'/>
///<reference path='../interfaces/IResponse.ts'/>
///<reference path='../interfaces/IRecord.ts'/>
///<reference path='../interfaces/IUser.ts'/>
///<reference path='../interfaces/IServerConfiguration.ts'/>

import { Constants } from '../interfaces/Constants';
import { NodeAccessValidator } from '../security/NodeAccessValidator';
import _ = require('lodash');

export class StreamHandler {
    private dataChannelFactory: IDataChannelFactory;
    private nodeAccessValidator: NodeAccessValidator;
    private serverConfiguration: IServerConfiguration;

    constructor(nodeAccessValidator: NodeAccessValidator, dataChannelFactory: IDataChannelFactory, serverConfiguration: IServerConfiguration) {
        this.dataChannelFactory = dataChannelFactory;
        this.nodeAccessValidator = nodeAccessValidator;
        this.serverConfiguration = serverConfiguration;
    }

    private processNextRequest(requests: IRequest[], responses: IResponse[], user: IUser, callback: (error: Error, responses?: IResponse[]) => void) {
        this.processRequest(requests[0], user, (error: Error, response: IResponse) => {
            if (error) {
                callback(error);
            } else {
                if (requests[0].command === Constants.COMMAND_CHANGES) {
                    if (response.changes.length > 0) {
                        response.streamId = requests[0].streamId;
                        responses.push(response);
                    }
                } else {
                    responses.push(response);
                }
                if (requests.length === 1) {
                    callback(null, responses);
                } else {
                    requests.splice(0, 1);
                    this.processNextRequest(requests, responses, user, callback);
                }
            }
        });
    }

    processRequests(requests: IRequest[], user: IUser, callback: (error: Error, responses?: IResponse[]) => void) {
        if (requests.length === 0) {
            callback(null, []);
        } else {
            this.processNextRequest(requests, [], user, callback);
        }
    }

    processRequest(request: IRequest, user: IUser, callback: (error: Error, response?: IResponse) => void) {

        if (!this.nodeAccessValidator) {
            this.dataChannelFactory.getDataChannel(request.streamId, (error: Error, dataChannel?: IDataChannel) => {
                if (error) {
                    callback(error);
                } else {
                    this.processRequestWithRights(request, dataChannel, callback);
                }
            });
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

            this.dataChannelFactory.getDataChannel(request.streamId, (error: Error, dataChannel?: IDataChannel) => {
                if (error) {
                    callback(error);
                } else {
                    this.processRequestWithRights(request, dataChannel, callback);
                }
            });
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

    processRequestWithRights(request: IRequest, dataChannel: IDataChannel, callback: (error: Error, response?: IResponse) => void){
        try {
            switch (request.command) {
                case Constants.COMMAND_IDS:
                    if (!this.checkReadAccess(request, callback)) {
                        return;
                    }
                    this.processCommandIds(request.filter, request.options, dataChannel, callback);
                    return;
                case Constants.COMMAND_READ:
                    if (!this.checkReadAccess(request, callback)) {
                        return;
                    }
                    this.processRead(request.id, dataChannel, callback);
                    return;
                case Constants.COMMAND_UPDATE:
                    if (!this.checkWriteAccess(request, callback)) {
                        return;
                    }
                    this.processUpdate(request.record, request.echo, dataChannel, callback);
                    return;
                case Constants.COMMAND_CREATE:
                    if (!this.checkWriteAccess(request, callback)) {
                        return;
                    }
                    this.processCreate(request.record, request.echo, dataChannel, callback);
                    return;
                case Constants.COMMAND_DELETE:
                    if (!this.checkWriteAccess(request, callback)) {
                        return;
                    }
                    this.processDelete(request.id, dataChannel, callback);
                    return;
                case Constants.COMMAND_VERSION:
                    if (!this.checkReadAccess(request, callback)) {
                        return;
                    }
                    this.processVersion(dataChannel, callback);
                    return;
                case Constants.COMMAND_CHANGES:
                    if (!this.checkReadAccess(request, callback)) {
                        return;
                    }
                    this.processChanges(request.version, request.filter, request.options, dataChannel, callback);
                    return;
            }
        } catch (error) {
            callback(error);
            return;
        }

        callback(new Error("Unknown command"));
    }

    private processCommandIds(filter: any, options: IQueryOptions, dataChannel: IDataChannel, callback: (error: Error, response?: IResponse) => void): void {
        dataChannel.getIds(filter, options, (error: Error, ids) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.ids = ids;
            callback(null, ret);
        });
    }

    private processRead(id: string, dataChannel: IDataChannel, callback: (error: Error, response?: IResponse) => void): void {

        dataChannel.read(id, (error: Error, record: IRecord) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.record = record;
            callback(null, ret);
        });
    }

    private processUpdate(record: IRecord, echo: boolean, dataChannel: IDataChannel, callback: (error: Error, response?: IResponse) => void): void {

        dataChannel.update(record, (error: Error, record: IRecord) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.record = echo ? record : <any>true;
            callback(null, ret);
        });
    }

    private processCreate(record: IRecord, echo: boolean, dataChannel: IDataChannel, callback: (error: Error, response?: IResponse) => void): void {

        dataChannel.create(record, (error: Error, record?: IRecord) => {
            if (error) {
                callback(error);
                return;
            }
            var response = <IResponse>{};
            response.record = echo ? record : <IRecord>{ id: record.id };
            callback(null, response);
        });
    }

    private processDelete(id: string, dataChannel: IDataChannel, callback: (error: Error, response?: IResponse) => void): void {

        dataChannel.remove(id, (error: Error) => {
            if (error) {
                callback(error);
                return;
            }
            callback(null, <any>{});
        });
    }

    private processVersion(dataChannel: IDataChannel, callback: (error: Error, response?: IResponse) => void): void {
        dataChannel.getVersion((error: Error, version: string) => {
            if (error) {
                callback(error);
                return;
            }
            var ret: IResponse = <any>{};
            ret.version = version;
            callback(null, ret);
        });
    }

    private processChanges(version: string, filter: any, options: IQueryOptions, dataChannel: IDataChannel, callback: (error: Error, response?: IResponse) => void): void {

        dataChannel.getUpdates(version, filter, options, (error: Error, updates: IUpdate[]) => {
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
