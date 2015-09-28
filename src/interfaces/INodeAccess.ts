///<reference path='IRecord.ts'/>

interface INodeAccess extends IRecord {
    nodeId: string;
    order: number;
    userId?: string;
    userGroupId?: string;
    allow: boolean;
}
