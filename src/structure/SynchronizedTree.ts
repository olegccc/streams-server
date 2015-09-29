///<reference path='../interfaces/INode.ts'/>

import { DataStorage } from '../dataChannels/DataStorage';
import { Constants } from '../interfaces/Constants';
import _ = require('lodash');

export class SynchronizedTree {

    private nodeChannel: IDataChannel;
    private cacheUpdateInterval: number;
    private tree: INode;
    private lastUpdate: number;
    private lastVersion: string;
    private records: INode[];
    private recordMap: { [key: string] : INode };

    constructor(dataStorage: DataStorage) {
        this.nodeChannel = dataStorage.getChannel(Constants.DATA_CHANNEL_NODES);
        this.cacheUpdateInterval = Constants.DEFAULT_CACHE_UPDATE_INTERVAL;
        this.tree = null;
        this.lastUpdate = 0;
        this.lastVersion = null;
        this.records = [];
        this.recordMap = {};
    }

    setCacheUpdateInterval(interval: number) {
        this.cacheUpdateInterval = interval;
    }

    private fillChildren(node: INode, treeMap: { [key: string]: INode[] }) {
        node.children = treeMap[node.id] || [];
        this.recordMap[node.id] = node;
        if (node.children.length) {
            _.each(node.children, (child: INode) => {
                this.fillChildren(child, treeMap);
            });
        }
    }

    private buildTree() {
        var treeMap: { [key: string]: INode[] } = {};
        this.tree = null;
        this.recordMap = {};
        _.each(this.records, (record: INode) => {
            if (record.parentId === null) {
                if (!this.tree) {
                    this.tree = record;
                }
            } else {
                if (!treeMap.hasOwnProperty(record.parentId)) {
                    treeMap[record.parentId] = [];
                }
                treeMap[record.parentId].push(record);
            }
        });

        if (this.tree) {
            this.fillChildren(this.tree, treeMap);
        }
    }

    private readAll(version: string, callback: (error: Error) => void) {
        this.nodeChannel.readMany(null, (error: Error, records: IRecord[]) => {
            if (error) {
                callback(error);
                return;
            }
            this.records = <INode[]> records;
            this.lastVersion = version;
            this.buildTree();
            this.lastUpdate = Date.now();
            callback(null);
        });
    }

    private updateStatus(callback: (error: Error) => void) {
        if (Date.now()-this.lastUpdate < this.cacheUpdateInterval) {
            callback(null);
            return;
        }

        if (this.lastVersion === null) {
            this.nodeChannel.getVersion((error: Error, version: string) => {
                if (error) {
                    callback(error);
                    return;
                }
                this.readAll(version, callback);
            });
        } else {
            this.nodeChannel.getUpdates(this.lastVersion, null, null, (error: Error, updates: IUpdate[]) => {
                if (error) {
                    callback(error);
                    return;
                }
                if (updates.length) {
                    this.readAll(_.last(updates).version, callback);
                } else {
                    callback(error);
                }
            });
        }
    }

    getRootNode(callback: (error: Error, node?: INode) => void): void {
        this.updateStatus((error: Error) => {
            if (error) {
                callback(error);
            } else {
                callback(null, this.tree);
            }
        });
    }

    getNodeById(id: string, callback: (error: Error, node?: INode) => void): void {
        this.updateStatus((error: Error) => {
            if (error) {
                callback(error);
            } else {
                callback(error, this.recordMap[id]);
            }
        });
    }
}
