///<reference path='IRecord.ts'/>

interface INode extends IRecord {
    parentId: string;
    name: string;
    description: string;
    children: INode[];
}
