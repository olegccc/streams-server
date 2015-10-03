///<reference path='IRecord.ts'/>

interface INodeAccess extends IRecord {
    nodeId: string;
    order: number;
    userId?: string;
    userGroupId?: string;
    rightId: string;
    allow: boolean;
}
