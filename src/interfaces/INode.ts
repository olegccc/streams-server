///<reference path='IRecord.ts'/>

interface INode extends IRecord {
    parentId: string;
    children: INode[];
    parent: INode;
}
