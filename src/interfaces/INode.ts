///<reference path='IRecord.ts'/>

interface INode extends IRecord {
    parentId: string;
    path: string;
    children: INode[];
    parent: INode;
}
