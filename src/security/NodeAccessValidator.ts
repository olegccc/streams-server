///<reference path='../interfaces/INodeAccess.ts'/>
///<reference path='../interfaces/IUserGroupMembership.ts'/>

import { SynchronizedTree } from '../structure/SynchronizedTree';
import { SynchronizedDictionary } from '../structure/SynchronizedDictionary';
import _ = require('lodash');

export class NodeAccessValidator {

    private nodes: SynchronizedTree;
    private rights: SynchronizedDictionary;
    private userMembership: SynchronizedDictionary;

    constructor(nodes: SynchronizedTree, rights: SynchronizedDictionary, userMembership: SynchronizedDictionary) {
        this.nodes = nodes;
        this.rights = rights;
        this.userMembership = userMembership;
    }

    private static isValid(nodeAccess: INodeAccess, userId: string, groups: { [key: string]: boolean }) {
        if (nodeAccess.userId) {
            return userId === nodeAccess.userId;
        }
        if (nodeAccess.userGroupId) {
            return groups.hasOwnProperty(nodeAccess.userGroupId);
        }
        return true;
    }

    private fillRightsForNode(userId: string, groups: { [key: string]: boolean }, access: INodeAccess[], rights: { [key: string]: boolean }) {
        _.each(access, (access: INodeAccess) => {
            if (NodeAccessValidator.isValid(access, userId, groups)) {
                rights[access.rightId] = access.allow;
            }
        });
    }

    private effectiveRightsForNodeAndAccessList(node: INode, userId: string, groups: { [key: string]: boolean }, access: INodeAccess[], callback: (error: Error, rights?: { [key: string]: boolean }) => void) {
        if (node.parent) {
            this.effectiveRightsForNodeAndGroupList(node.parent, userId, groups, (error: Error, rights?: { [key: string] : boolean}) => {
                if (error) {
                    callback(error);
                } else {
                    this.fillRightsForNode(userId, groups, access, rights);
                    callback(error, rights);
                }
            });
        } else {
            var rights = <any> {};
            this.fillRightsForNode(userId, groups, access, rights);
            callback(null, rights);
        }
    }

    private effectiveRightsForNodeAndGroupList(node: INode, userId: string, groups: { [key: string]: boolean }, callback: (error: Error, rights?: { [key: string]: boolean }) => void) {
        this.rights.get(node.id, (error: Error, access: INodeAccess[]) => {
            if (error) {
                callback(error);
                return;
            }
            this.effectiveRightsForNodeAndAccessList(node, userId, groups, access, callback);
        });
    }

    private getRightsList(rights: { [key: string]: boolean }): string[] {
        var rightsList = [];
        _.each(rights, (value: boolean, key: string) => {
            if (value) {
                rightsList.push(key);
            }
        });
        return rightsList;
    }

    private effectiveRightsForNode(userId: string, node: INode, callback: (error: Error, rights?: string[]) => void) : void {
        if (!node) {
            callback(null, []);
            return;
        }
        if (!userId) {
            this.effectiveRightsForNodeAndGroupList(node, userId, {}, (error: Error, rights?: { [key: string]: boolean}) => {
                if (error) {
                    callback(error);
                } else {
                    callback(error, this.getRightsList(rights));
                }
            });
        } else {
            this.userMembership.get(userId, (error:Error, records:IRecord[]) => {
                if (error) {
                    callback(error);
                    return;
                }
                var groups = <any>{};
                _.each(records, (record:IUserGroupMembership) => {
                    groups[record.groupId] = true;
                });
                this.effectiveRightsForNodeAndGroupList(node, userId, groups, (error: Error, rights?: { [key: string]: boolean}) => {
                    if (error) {
                        callback(error);
                    } else {
                        callback(error, this.getRightsList(rights));
                    }
                });
            });
        }
    }

    effectiveRights(userId: string, nodeId: string, callback: (error: Error, rights?: string[]) => void): void {
        if (nodeId) {
            this.nodes.getNodeById(nodeId, (error: Error, node: INode) => {
                if (error) {
                    callback(error);
                    return;
                }
                this.effectiveRightsForNode(userId, node, callback);
            });
        } else {
            this.nodes.getRootNode((error: Error, node: INode) => {
                if (error) {
                    callback(error);
                    return;
                }
                this.effectiveRightsForNode(userId, node, callback);
            });
        }
    }
}
