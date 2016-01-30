///<reference path='IRecord.ts'/>
///<reference path='IUpdate.ts'/>

interface IResponse {
    ids: string[];
    streamId: string;
    nodeId: string;
    record: IRecord;
    version: string;
    changes: IUpdate[];
}
